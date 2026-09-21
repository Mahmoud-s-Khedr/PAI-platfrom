import { Hono } from "hono";
import type { Context } from "hono";
import { admin } from "./routes/admin";
import { auth } from "./routes/auth";
import { content } from "./routes/content";
import { assets } from "./routes/assets";
import { getSessionUser, type AuthBindings } from "./lib/auth";
import { errorResponse } from "./lib/http";

type Bindings = AuthBindings;
export const app = new Hono<{ Bindings: Bindings }>();

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "api_error", message: error.message }));
  return errorResponse(c, 500, "INTERNAL_ERROR", "An unexpected error occurred");
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api/auth", auth);
app.route("/api", assets);
app.route("/api", content);
app.route("/api/admin", admin);

function deniedAdminPage(request: Request): Response {
  const arabic = request.headers.get("Accept-Language")?.toLowerCase().startsWith("ar");
  const title = arabic ? "الوصول غير مسموح" : "Access denied";
  const message = arabic ? "هذه الصفحة متاحة لمديري المنصة فقط." : "This page is available to platform administrators only.";
  const home = arabic ? "العودة إلى الصفحة الرئيسية" : "Return to home";
  return new Response(`<!doctype html><html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body><main><h1>${title}</h1><p>${message}</p><a href="/">${home}</a></main></body></html>`, { status: 403, headers: { "Content-Type": "text/html; charset=UTF-8", "Cache-Control": "no-store" } });
}

async function adminShell(c: Context<{ Bindings: Bindings }>) {
  const user = await getSessionUser(c.req.raw, c.env.DB);
  if (!user) {
    const url = new URL(c.req.url);
    return c.redirect(`/login?returnTo=${encodeURIComponent(`${url.pathname}${url.search}`)}`);
  }
  if (user.role !== "admin") return deniedAdminPage(c.req.raw);
  return c.env.ASSETS.fetch(c.req.raw);
}

app.get("/admin", adminShell);
app.get("/admin/*", adminShell);
app.notFound((c) => errorResponse(c, 404, "NOT_FOUND", "Route not found"));

export default app;
