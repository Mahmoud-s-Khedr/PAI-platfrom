import { createMiddleware } from "hono/factory";
import type { AuthBindings } from "./auth";
import { errorResponse } from "./http";

// Keep these baseline headers in sync with public/_headers. Asset responses
// bypass this middleware; uploaded files retain their stricter CSP sandbox.
export const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
};

export const secureResponses = createMiddleware(async (c, next) => {
  await next();
  for (const [name, value] of Object.entries(securityHeaders)) {
    if (!c.res.headers.has(name)) c.header(name, value);
  }
  if (new URL(c.req.url).protocol === "https:") {
    c.header("Strict-Transport-Security", "max-age=31536000");
  }
  if (/^\/api\/(auth|admin|mcp)(\/|$)/.test(c.req.path) || /^\/admin(\/|$)/.test(c.req.path)) {
    c.header("Cache-Control", "no-store");
  }
});

export const limitSensitiveRequests = createMiddleware<{ Bindings: AuthBindings }>(async (c, next) => {
  const path = c.req.path;
  const signIn = (path === "/api/auth/password" && c.req.method === "POST") ||
    path === "/api/auth/google" || path === "/api/auth/google/callback";
  const authoring = path === "/api/mcp" ||
    (path.startsWith("/api/admin/") && !["GET", "HEAD", "OPTIONS"].includes(c.req.method));
  if (!signIn && !authoring) return next();

  // Cloudflare supplies this header at the edge. Never trust X-Forwarded-For.
  // No raw IP, credentials, or limiter key is logged or written to D1/R2.
  // Rotate the hash daily; these transient abuse counters are not analytics.
  const address = c.req.header("CF-Connecting-IP") ?? "local";
  const day = new Date().toISOString().slice(0, 10);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${day}:${address}`));
  const key = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  const limiter = signIn ? c.env.AUTH_RATE_LIMITER : c.env.AUTHORING_RATE_LIMITER;
  const { success } = await limiter.limit({ key });
  if (!success) {
    c.header("Retry-After", "60");
    c.header("Cache-Control", "no-store");
    return errorResponse(c, 429, "RATE_LIMITED", "Too many requests. Try again in one minute.");
  }
  return next();
});
