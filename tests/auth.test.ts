import { describe, expect, it } from "vitest";
import { authenticatePasswordUser, createOAuthState, createSession, getSessionUser, readOAuthState, revokeSession, upsertGoogleUser, verifyGoogleIdentity, verifyPasswordHash } from "../worker/lib/auth";

const secret = "a session secret that is safely longer than thirty two characters";
const env = { SESSION_SECRET: secret } as Cloudflare.Env & { SESSION_SECRET: string };
const tokenPart = (value: object) => btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");

describe("authentication primitives", () => {
  it("signs OAuth state and rejects a mismatched state", async () => {
    const request = new Request("http://localhost/api/auth/google");
    const state = await createOAuthState(request, env, "/admin");
    const callback = new Request("http://localhost/api/auth/google/callback", { headers: { Cookie: state.cookie.split(";", 1)[0] } });
    await expect(readOAuthState(callback, env, state.state)).resolves.toMatchObject({ returnTo: "/admin" });
    await expect(readOAuthState(callback, env, "different")).resolves.toBeNull();
  });

  it("rejects expired and unverified Google identities", async () => {
    const header = tokenPart({ alg: "RS256", kid: "key" });
    const expired = `${header}.${tokenPart({ iss: "https://accounts.google.com", aud: "client", exp: 1, sub: "subject", email: "x@example.com", email_verified: true })}.signature`;
    const unverified = `${header}.${tokenPart({ iss: "https://accounts.google.com", aud: "client", exp: Math.floor(Date.now() / 1000) + 3600, sub: "subject", email: "x@example.com", email_verified: false })}.signature`;
    const fetcher = async () => { throw new Error("JWKS must not be fetched"); };
    await expect(verifyGoogleIdentity(expired, "client", fetcher as typeof fetch)).resolves.toBeNull();
    await expect(verifyGoogleIdentity(unverified, "client", fetcher as typeof fetch)).resolves.toBeNull();
  });

  it("links by immutable Google subject and assigns a normalized email grant role", async () => {
    const calls: Array<{ query: string; values: unknown[] }> = [];
    const db = { prepare(query: string) { return { bind: (...values: unknown[]) => { calls.push({ query, values }); return { first: async () => {
      if (query.includes("role_grants")) return { role: "admin" };
      if (query.includes("WHERE google_sub = ? OR email")) return null;
      return { id: 7, google_sub: "google-subject", email: "admin@example.com", display_name: "Admin", role: "admin" };
    }, run: async () => ({}) }; } }; } } as unknown as D1Database;
    const user = await upsertGoogleUser(db, { sub: "google-subject", email: "ADMIN@example.com", name: "Admin" });
    expect(user).toMatchObject({ id: 7, role: "admin", email: "admin@example.com" });
    expect(calls.find((call) => call.query.includes("INSERT INTO users"))?.values).toContain("google-subject");
    expect(calls.find((call) => call.query.includes("role_grants"))?.values).toEqual(["admin@example.com"]);
  });

  it("verifies salted PBKDF2 password hashes without accepting the wrong password", async () => {
    const hash = "pbkdf2-sha256$600000$MDEyMzQ1Njc4OWFiY2RlZg$bEpkaq0Q0Get1ft52QeKFtqD1Q-BZwqOdZOySebZSTY";
    await expect(verifyPasswordHash("correct horse battery staple", hash)).resolves.toBe(true);
    await expect(verifyPasswordHash("incorrect", hash)).resolves.toBe(false);
  });

  it("authenticates only a user that has a valid stored password hash", async () => {
    const hash = "pbkdf2-sha256$600000$MDEyMzQ1Njc4OWFiY2RlZg$bEpkaq0Q0Get1ft52QeKFtqD1Q-BZwqOdZOySebZSTY";
    const db = { prepare: () => ({ bind: () => ({ first: async () => ({ id: 9, google_sub: null, email: "admin@example.com", display_name: "Admin", role: "admin", password_hash: hash }) }) }) } as unknown as D1Database;
    await expect(authenticatePasswordUser(db, "ADMIN@example.com", "correct horse battery staple")).resolves.toMatchObject({ id: 9, email: "admin@example.com", role: "admin" });
    await expect(authenticatePasswordUser(db, "admin@example.com", "incorrect")).resolves.toBeNull();
  });

  it("creates opaque session storage, ignores expired sessions, and revokes on logout", async () => {
    const queries: string[] = [];
    const db = { prepare(query: string) { queries.push(query); return { bind: () => ({ run: async () => ({}), first: async () => null }) }; } } as unknown as D1Database;
    const request = new Request("http://localhost", { headers: { Cookie: "pai_session=expired" } });
    await expect(createSession(request, db, 4)).resolves.toContain("pai_session=");
    await expect(getSessionUser(request, db)).resolves.toBeNull();
    await revokeSession(request, db);
    expect(queries.some((query) => query.includes("expires_at > CURRENT_TIMESTAMP"))).toBe(true);
    expect(queries.some((query) => query.includes("role_grants"))).toBe(true);
    expect(queries.some((query) => query.startsWith("DELETE FROM sessions"))).toBe(true);
  });
});
