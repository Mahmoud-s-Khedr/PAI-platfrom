import { Hono } from "hono";
import { z } from "zod";
import { appendCookie, authenticatePasswordUser, clearOAuthCookie, clearSessionCookie, createOAuthState, createSession, exchangeGoogleCode, getSessionUser, readOAuthState, revokeSession, safeReturnTo, upsertGoogleUser, verifyGoogleIdentity, type AuthBindings } from "../lib/auth";
import { errorResponse } from "../lib/http";

const auth = new Hono<{ Bindings: AuthBindings }>();
const passwordLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(1024),
}).strict();

auth.get("/google", async (c) => {
  if (!c.env.GOOGLE_CLIENT_ID) return errorResponse(c, 500, "AUTH_CONFIGURATION_ERROR", "Google sign-in is not configured");
  const origin = new URL(c.req.url).origin;
  const returnTo = safeReturnTo(c.req.query("returnTo"), origin);
  const oauth = await createOAuthState(c.req.raw, c.env, returnTo);
  const redirectUri = `${origin}/api/auth/google/callback`;
  const google = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  google.search = new URLSearchParams({ client_id: c.env.GOOGLE_CLIENT_ID, redirect_uri: redirectUri, response_type: "code", scope: "openid email profile", state: oauth.state, code_challenge: await crypto.subtle.digest("SHA-256", new TextEncoder().encode(oauth.verifier)).then((value) => {
    const bytes = new Uint8Array(value); let result = ""; for (const byte of bytes) result += String.fromCharCode(byte); return btoa(result).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  }), code_challenge_method: "S256", prompt: "select_account" }).toString();
  return appendCookie(c.redirect(google.toString()), oauth.cookie);
});

auth.get("/google/callback", async (c) => {
  const origin = new URL(c.req.url).origin;
  const state = await readOAuthState(c.req.raw, c.env, c.req.query("state"));
  const clear = clearOAuthCookie(c.req.raw);
  if (!state || !c.req.query("code") || c.req.query("error")) return appendCookie(c.redirect("/login?error=google_signin_failed"), clear);
  const idToken = await exchangeGoogleCode(c.req.query("code")!, `${origin}/api/auth/google/callback`, state.verifier, c.env);
  const identity = idToken && c.env.GOOGLE_CLIENT_ID ? await verifyGoogleIdentity(idToken, c.env.GOOGLE_CLIENT_ID) : null;
  if (!identity) return appendCookie(c.redirect("/login?error=google_signin_failed"), clear);
  const user = await upsertGoogleUser(c.env.DB, identity);
  const session = await createSession(c.req.raw, c.env.DB, user.id);
  let response = appendCookie(c.redirect(state.returnTo), clear);
  response = appendCookie(response, session);
  return response;
});

auth.get("/session", async (c) => c.json({ user: await getSessionUser(c.req.raw, c.env.DB) }));

auth.post("/password", async (c) => {
  let credentials: z.output<typeof passwordLoginSchema>;
  try {
    const parsed = passwordLoginSchema.safeParse(await c.req.json());
    if (!parsed.success) return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Email and password are required");
    credentials = parsed.data;
  } catch {
    return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Email and password are required");
  }
  const user = await authenticatePasswordUser(c.env.DB, credentials.email, credentials.password);
  if (!user) return errorResponse(c, 401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  return appendCookie(c.json({ user }), await createSession(c.req.raw, c.env.DB, user.id));
});

auth.post("/logout", async (c) => {
  await revokeSession(c.req.raw, c.env.DB);
  return appendCookie(c.json({ ok: true }), clearSessionCookie(c.req.raw));
});

export { auth };
