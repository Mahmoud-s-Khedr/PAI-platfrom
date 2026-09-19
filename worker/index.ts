import { Hono } from "hono";
import { content } from "./routes/content";
import { errorResponse } from "./lib/http";

type Bindings = Cloudflare.Env;
export const app = new Hono<{ Bindings: Bindings }>();

app.onError((error, c) => {
  console.error(JSON.stringify({ event: "api_error", message: error.message }));
  return errorResponse(c, 500, "INTERNAL_ERROR", "An unexpected error occurred");
});

app.get("/api/health", (c) => c.json({ ok: true }));
app.route("/api", content);
app.notFound((c) => errorResponse(c, 404, "NOT_FOUND", "Route not found"));

export default app;
