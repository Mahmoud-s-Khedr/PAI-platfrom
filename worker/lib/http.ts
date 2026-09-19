import type { Context } from "hono";

export function errorResponse(c: Context, status: 400 | 404 | 500, code: string, message: string) {
  return c.json({ error: { code, message } }, status);
}
