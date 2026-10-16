import { Hono } from "hono";
import type { Context } from "hono";
import { admin } from "./routes/admin";
import { auth } from "./routes/auth";
import { content } from "./routes/content";
import { assets } from "./routes/assets";
import { listPublishedSitemapEntries } from "./db/content";
import { getSessionUser, type AuthBindings } from "./lib/auth";
import { errorResponse } from "./lib/http";
import { requireAgent } from "./lib/agent-auth";
import { handleMcpRequest } from "./mcp/server";
import type { Actor } from "./services/authoring";
import { limitSensitiveRequests, secureResponses } from "./lib/security";

type Bindings = AuthBindings;
export const app = new Hono<{ Bindings: Bindings; Variables: { agent: Actor } }>();
app.use("*", secureResponses);

// Keep request logs useful for operations without recording cookies, query strings, or student input.
app.use("/api/*", async (c, next) => {
  const startedAt = Date.now();
  try {
    await next();
  } finally {
    console.log(JSON.stringify({
      event: "api_request",
      method: c.req.method,
      path: new URL(c.req.url).pathname,
      status: c.res.status,
      durationMs: Date.now() - startedAt,
    }));
  }
});

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "api_error", message: error.message }));
  return errorResponse(c, 500, "INTERNAL_ERROR", "An unexpected error occurred");
});

app.use("/api/*", limitSensitiveRequests);

app.get("/api/health", (c) => c.json({ ok: true }));
// Remote MCP for authoring agents: bearer agent tokens only, never browser cookies.
app.all("/api/mcp", requireAgent, (c) => handleMcpRequest(c.req.raw, c.env, c.get("agent")));
app.route("/api/auth", auth);
app.route("/api", assets);
app.route("/api", content);
app.route("/api/admin", admin);

function xml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&apos;" })[character]!);
}

app.get("/robots.txt", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /api/\nDisallow: /login\nDisallow: /search\n\nSitemap: ${origin}/sitemap.xml\n`, 200, {
    "Cache-Control": "public, max-age=3600",
  });
});

app.get("/sitemap.xml", async (c) => {
  const origin = new URL(c.req.url).origin;
  const entries = await listPublishedSitemapEntries(c.env.DB);
  const paths = new Set<string>(["/"]);
  for (const entry of entries) {
    const course = `/courses/${encodeURIComponent(entry.courseSlug)}`;
    paths.add(course);
    if (entry.lessonSlug) paths.add(`${course}/lessons/${encodeURIComponent(entry.lessonSlug)}`);
  }
  const urls = [...paths].map((path) => `  <url><loc>${xml(`${origin}${path}`)}</loc></url>`).join("\n");
  return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`, {
    headers: { "Content-Type": "application/xml; charset=UTF-8", "Cache-Control": "public, max-age=3600" },
  });
});

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
