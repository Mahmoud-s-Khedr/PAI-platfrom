import type { Context, Next } from "hono";
import type { AuthUser } from "../../src/lib/types";
import { getSessionUser, type AuthBindings } from "./auth";
import { errorResponse } from "./http";

export async function requireAdmin(c: Context<{ Bindings: AuthBindings; Variables: { adminUser: AuthUser } }>, next: Next) {
  if (!c.env?.DB) return errorResponse(c, 401, "ADMIN_AUTH_REQUIRED", "Administrator authentication is required");
  const user = await getSessionUser(c.req.raw, c.env.DB);
  if (!user) return errorResponse(c, 401, "ADMIN_AUTH_REQUIRED", "Administrator authentication is required");
  if (user.role !== "admin") return errorResponse(c, 403, "ADMIN_ACCESS_DENIED", "Administrator access is required");
  c.set("adminUser", user);
  return next();
}
