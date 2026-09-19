import type { Context } from "hono";
import type { AuthUser, UserRole } from "../../src/lib/types";

export type AuthBindings = Cloudflare.Env & {
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  SESSION_SECRET?: string;
};

export interface GoogleIdentity {
  sub: string;
  email: string;
  name: string;
}

interface OAuthState {
  state: string;
  verifier: string;
  returnTo: string;
  expiresAt: number;
}

interface SessionRow extends Record<string, unknown> {
  id: number;
  email: string;
  display_name: string;
  role: UserRole;
}

interface UserRow extends Record<string, unknown> {
  id: number;
  google_sub: string | null;
  email: string;
  display_name: string;
  role: UserRole;
}

interface PasswordUserRow extends UserRow {
  password_hash: string | null;
}

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const SESSION_COOKIE = "pai_session";
const OAUTH_COOKIE = "pai_oauth";
const SESSION_SECONDS = 7 * 24 * 60 * 60;
const OAUTH_SECONDS = 10 * 60;
const PASSWORD_HASH_VERSION = "pbkdf2-sha256";

function base64Url(bytes: Uint8Array): string {
  let value = "";
  for (const byte of bytes) value += String.fromCharCode(byte);
  return btoa(value).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) return null;
  try {
    const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat((4 - value.length % 4) % 4);
    const decoded = atob(padded);
    return Uint8Array.from(decoded, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function randomToken(bytes = 32): string {
  const value = new Uint8Array(bytes);
  crypto.getRandomValues(value);
  return base64Url(value);
}

async function hmac(value: string, secret: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function equalBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let different = 0;
  for (let index = 0; index < left.length; index += 1) different |= left[index] ^ right[index];
  return different === 0;
}

async function sha256(value: string): Promise<string> {
  return base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value))));
}

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const derived = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: salt.slice().buffer as ArrayBuffer, iterations }, key, 256);
  return new Uint8Array(derived);
}

/** The stored form is `pbkdf2-sha256$iterations$salt$derived-key`, all base64url encoded. */
export async function verifyPasswordHash(password: string, stored: string | null): Promise<boolean> {
  if (!stored || password.length > 1024) return false;
  const [version, iterationValue, saltValue, expectedValue, extra] = stored.split("$");
  const iterations = Number(iterationValue);
  if (version !== PASSWORD_HASH_VERSION || extra || !Number.isInteger(iterations) || iterations < 100_000 || iterations > 1_000_000) return false;
  const salt = decodeBase64Url(saltValue ?? "");
  const expected = decodeBase64Url(expectedValue ?? "");
  if (!salt || salt.length < 16 || !expected || expected.length !== 32) return false;
  return equalBytes(await pbkdf2(password, salt, iterations), expected);
}

function cookie(request: Request, name: string): string | null {
  const value = request.headers.get("Cookie");
  if (!value) return null;
  for (const item of value.split(";")) {
    const [key, ...parts] = item.trim().split("=");
    if (key === name) return parts.join("=");
  }
  return null;
}

function cookieOptions(request: Request, maxAge: number, path: string): string {
  const url = new URL(request.url);
  const secure = url.hostname !== "localhost" ? "; Secure" : "";
  return `Path=${path}; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${secure}`;
}

function deleteCookie(request: Request, name: string, path: string): string {
  return `${name}=; ${cookieOptions(request, 0, path)}`;
}

export function appendCookie(response: Response, value: string): Response {
  const headers = new Headers(response.headers);
  headers.append("Set-Cookie", value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function requiredSecret(env: AuthBindings): string {
  if (!env.SESSION_SECRET || env.SESSION_SECRET.length < 32) throw new Error("SESSION_SECRET must be configured with at least 32 characters");
  return env.SESSION_SECRET;
}

export function safeReturnTo(raw: string | undefined, origin: string): string {
  if (!raw) return "/";
  try {
    const target = new URL(raw, origin);
    if (target.origin !== origin || !target.pathname.startsWith("/") || target.pathname.startsWith("//")) return "/";
    return `${target.pathname}${target.search}${target.hash}`;
  } catch {
    return "/";
  }
}

export async function createOAuthState(request: Request, env: AuthBindings, returnTo: string): Promise<{ state: string; verifier: string; cookie: string }> {
  const payload: OAuthState = { state: randomToken(), verifier: randomToken(48), returnTo, expiresAt: Date.now() + OAUTH_SECONDS * 1000 };
  const encoded = base64Url(encoder.encode(JSON.stringify(payload)));
  const signature = base64Url(await hmac(encoded, requiredSecret(env)));
  return { state: payload.state, verifier: payload.verifier, cookie: `${OAUTH_COOKIE}=${encoded}.${signature}; ${cookieOptions(request, OAUTH_SECONDS, "/api/auth/google")}` };
}

export async function readOAuthState(request: Request, env: AuthBindings, suppliedState: string | undefined): Promise<OAuthState | null> {
  const raw = cookie(request, OAUTH_COOKIE);
  if (!raw || !suppliedState) return null;
  const [encoded, signature, extra] = raw.split(".");
  if (!encoded || !signature || extra) return null;
  const signatureBytes = decodeBase64Url(signature);
  if (!signatureBytes || !equalBytes(signatureBytes, await hmac(encoded, requiredSecret(env)))) return null;
  const decoded = decodeBase64Url(encoded);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoder.decode(decoded)) as Partial<OAuthState>;
    if (typeof parsed.state !== "string" || typeof parsed.verifier !== "string" || typeof parsed.returnTo !== "string" || typeof parsed.expiresAt !== "number") return null;
    if (parsed.state !== suppliedState || parsed.expiresAt <= Date.now()) return null;
    return parsed as OAuthState;
  } catch {
    return null;
  }
}

export function clearOAuthCookie(request: Request): string {
  return deleteCookie(request, OAUTH_COOKIE, "/api/auth/google");
}

export async function exchangeGoogleCode(code: string, redirectUri: string, verifier: string, env: AuthBindings): Promise<string | null> {
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) throw new Error("Google OAuth credentials are not configured");
  const body = new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID, client_secret: env.GOOGLE_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: "authorization_code", code_verifier: verifier });
  const response = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
  if (!response.ok) return null;
  const data = await response.json().catch(() => null) as { id_token?: unknown } | null;
  return typeof data?.id_token === "string" ? data.id_token : null;
}

interface GoogleJwk { kty: string; kid?: string; n?: string; e?: string; alg?: string; use?: string; }
interface GoogleClaims { iss?: unknown; aud?: unknown; azp?: unknown; exp?: unknown; sub?: unknown; email?: unknown; email_verified?: unknown; name?: unknown; }

export async function verifyGoogleIdentity(idToken: string, clientId: string, fetcher: typeof fetch = fetch): Promise<GoogleIdentity | null> {
  const parts = idToken.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedClaims, encodedSignature] = parts;
  const headerBytes = decodeBase64Url(encodedHeader);
  const claimsBytes = decodeBase64Url(encodedClaims);
  const signature = decodeBase64Url(encodedSignature);
  if (!headerBytes || !claimsBytes || !signature) return null;
  let header: { alg?: unknown; kid?: unknown };
  let claims: GoogleClaims;
  try {
    header = JSON.parse(decoder.decode(headerBytes)) as { alg?: unknown; kid?: unknown };
    claims = JSON.parse(decoder.decode(claimsBytes)) as GoogleClaims;
  } catch { return null; }
  if (header.alg !== "RS256" || typeof header.kid !== "string") return null;
  if (claims.iss !== "https://accounts.google.com" && claims.iss !== "accounts.google.com") return null;
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(clientId) || (audiences.length > 1 && claims.azp !== clientId)) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 <= Date.now()) return null;
  if (typeof claims.sub !== "string" || !claims.sub || typeof claims.email !== "string" || !claims.email || claims.email_verified !== true) return null;
  const keysResponse = await fetcher("https://www.googleapis.com/oauth2/v3/certs");
  if (!keysResponse.ok) return null;
  const keys = await keysResponse.json().catch(() => null) as { keys?: GoogleJwk[] } | null;
  const jwk = keys?.keys?.find((candidate) => candidate.kid === header.kid && candidate.kty === "RSA" && candidate.n && candidate.e && (!candidate.use || candidate.use === "sig"));
  if (!jwk) return null;
  try {
    const key = await crypto.subtle.importKey("jwk", jwk, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", key, signature.slice().buffer as ArrayBuffer, encoder.encode(`${encodedHeader}.${encodedClaims}`));
    if (!valid) return null;
  } catch { return null; }
  return { sub: claims.sub, email: claims.email.trim().toLowerCase(), name: typeof claims.name === "string" && claims.name.trim() ? claims.name.trim().slice(0, 240) : claims.email };
}

function toAuthUser(row: SessionRow | UserRow): AuthUser {
  return { id: row.id, email: row.email, displayName: row.display_name, role: row.role };
}

export async function upsertGoogleUser(db: D1Database, identity: GoogleIdentity): Promise<AuthUser> {
  const grant = await db.prepare("SELECT role FROM role_grants WHERE email = ?").bind(identity.email.toLowerCase()).first<{ role: UserRole }>();
  const role: UserRole = grant?.role === "admin" ? "admin" : "student";
  const email = identity.email.toLowerCase();
  const existing = await db.prepare(`SELECT id, google_sub, email, display_name, role FROM users
    WHERE google_sub = ? OR email = ?
    ORDER BY CASE WHEN google_sub = ? THEN 0 ELSE 1 END
    LIMIT 1`).bind(identity.sub, email, identity.sub).first<UserRow>();
  if (existing) {
    await db.prepare(`UPDATE users SET google_sub = ?, email = ?, display_name = ?, role = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`).bind(identity.sub, email, identity.name, role, existing.id).run();
  } else {
    await db.prepare(`INSERT INTO users (google_sub, email, display_name, role, updated_at)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`).bind(identity.sub, email, identity.name, role).run();
  }
  const row = await db.prepare("SELECT id, google_sub, email, display_name, role FROM users WHERE google_sub = ?").bind(identity.sub).first<UserRow>();
  if (!row) throw new Error("Signed-in user could not be loaded");
  return toAuthUser(row);
}

export async function authenticatePasswordUser(db: D1Database, email: string, password: string): Promise<AuthUser | null> {
  const normalizedEmail = email.trim().toLowerCase();
  const row = await db.prepare(`SELECT id, google_sub, email, display_name,
    COALESCE((SELECT role FROM role_grants WHERE email = users.email), 'student') AS role,
    password_hash
    FROM users WHERE email = ?`).bind(normalizedEmail).first<PasswordUserRow>();
  if (!row || !await verifyPasswordHash(password, row.password_hash)) return null;
  return toAuthUser(row);
}

export async function createSession(request: Request, db: D1Database, userId: number): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  await db.prepare("INSERT INTO sessions (token_hash, user_id, expires_at, updated_at) VALUES (?, ?, datetime('now', '+7 days'), CURRENT_TIMESTAMP)")
    .bind(tokenHash, userId).run();
  return `${SESSION_COOKIE}=${token}; ${cookieOptions(request, SESSION_SECONDS, "/")}`;
}

export async function getSessionUser(request: Request, db: D1Database): Promise<AuthUser | null> {
  const token = cookie(request, SESSION_COOKIE);
  if (!token || token.length > 300) return null;
  const tokenHash = await sha256(token);
  const row = await db.prepare(`SELECT u.id, u.email, u.display_name,
    COALESCE((SELECT role FROM role_grants WHERE email = u.email), 'student') AS role
    FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > CURRENT_TIMESTAMP`).bind(tokenHash).first<SessionRow>();
  return row ? toAuthUser(row) : null;
}

export async function revokeSession(request: Request, db: D1Database): Promise<void> {
  const token = cookie(request, SESSION_COOKIE);
  if (token && token.length <= 300) await db.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
}

export function clearSessionCookie(request: Request): string {
  return deleteCookie(request, SESSION_COOKIE, "/");
}

export async function sessionUserFromContext(c: Context<{ Bindings: AuthBindings }>): Promise<AuthUser | null> {
  return getSessionUser(c.req.raw, c.env.DB);
}
