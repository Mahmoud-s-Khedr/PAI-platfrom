import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { app } from "../worker";
import { securityHeaders } from "../worker/lib/security";

function environment(success = true) {
  const auth = vi.fn<RateLimit["limit"]>(async () => ({ success }));
  const authoring = vi.fn<RateLimit["limit"]>(async () => ({ success }));
  const prepare = vi.fn(() => { throw new Error("Database should not be reached"); });
  return {
    env: { AUTH_RATE_LIMITER: { limit: auth }, AUTHORING_RATE_LIMITER: { limit: authoring }, DB: { prepare } } as unknown as Cloudflare.Env,
    auth, authoring, prepare,
  };
}

describe("response security", () => {
  it("protects API successes, errors, and admin redirects", async () => {
    for (const path of ["/api/health", "/api/missing", "/admin"]) {
      const response = await app.request(`https://test${path}`);
      for (const [name, value] of Object.entries(securityHeaders)) expect(response.headers.get(name)).toBe(value);
      expect(response.headers.get("Strict-Transport-Security")).toBe("max-age=31536000");
    }
  });

  it("keeps static asset headers consistent with Worker responses", () => {
    const headers = readFileSync(new URL("../public/_headers", import.meta.url), "utf8");
    for (const [name, value] of Object.entries(securityHeaders)) expect(headers).toContain(`${name}: ${value}`);
  });

  it("does not cache authentication responses", async () => {
    const response = await app.request("https://test/api/auth/session");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

describe("sensitive request rate limits", () => {
  it.each([
    ["/api/auth/password", "POST", "auth"],
    ["/api/auth/google", "GET", "auth"],
    ["/api/auth/google/callback?code=secret", "GET", "auth"],
    ["/api/admin/courses", "POST", "authoring"],
    ["/api/admin/lessons/1", "PATCH", "authoring"],
    ["/api/mcp", "POST", "authoring"],
  ] as const)("rejects %s before authentication or DB work", async (path, method, binding) => {
    const fixture = environment(false);
    const response = await app.request(`https://test${path}`, { method }, fixture.env);
    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await expect(response.json()).resolves.toEqual({ error: { code: "RATE_LIMITED", message: expect.any(String) } });
    expect(fixture[binding]).toHaveBeenCalledOnce();
    expect(fixture.prepare).not.toHaveBeenCalled();
  });

  it("lets allowed requests reach existing bearer authentication", async () => {
    const fixture = environment();
    const response = await app.request("https://test/api/mcp", { method: "POST" }, fixture.env);
    expect(response.status).toBe(401);
    expect(fixture.authoring).toHaveBeenCalledOnce();
  });

  it("uses the edge address, ignores forwarded addresses, and never passes raw addresses to the limiter", async () => {
    const fixture = environment(false);
    for (const forwarded of ["forged-a", "forged-b"]) {
      await app.request("https://test/api/auth/password", { method: "POST", headers: { "CF-Connecting-IP": "192.0.2.1", "X-Forwarded-For": forwarded } }, fixture.env);
    }
    const [first, second] = fixture.auth.mock.calls;
    expect(first[0].key).toMatch(/^[a-f0-9]{64}$/);
    expect(first).toEqual(second);
  });

  it("keeps public reads and session checks outside sensitive limits", async () => {
    const fixture = environment(false);
    for (const path of ["/api/health", "/api/auth/session"]) {
      expect((await app.request(`https://test${path}`, undefined, fixture.env)).status).toBe(200);
    }
    expect(fixture.auth).not.toHaveBeenCalled();
    expect(fixture.authoring).not.toHaveBeenCalled();
  });

  it("fails closed when the limiter is unavailable", async () => {
    const fixture = environment();
    fixture.auth.mockRejectedValueOnce(new Error("Unavailable"));
    expect((await app.request("https://test/api/auth/password", { method: "POST" }, fixture.env)).status).toBe(500);
    expect(fixture.prepare).not.toHaveBeenCalled();
  });
});
