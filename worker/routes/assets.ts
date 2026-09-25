import { Hono } from "hono";
import { z } from "zod";
import { findPublishedStoredAsset, findStoredAsset } from "../db/admin";
import { getSessionUser } from "../lib/auth";
import { errorResponse } from "../lib/http";

type Bindings = Cloudflare.Env;
export const assets = new Hono<{ Bindings: Bindings }>();
const positiveInteger = z.coerce.number().int().positive();

/**
 * Assets are deliberately served through the Worker rather than a public R2
 * bucket. Public requests can reach only assets used by published lessons;
 * authenticated administrators can still preview draft and orphaned uploads.
 * Non-image content is always downloaded, never rendered in the application's
 * origin.
 */
assets.get("/assets/:id", async (c) => {
  const parsed = positiveInteger.safeParse(c.req.param("id"));
  if (!parsed.success) return errorResponse(c, 400, "INVALID_ASSET_ID", "Asset id must be a positive integer");
  let asset = await findPublishedStoredAsset(c.env.DB, parsed.data);
  if (!asset) {
    const user = await getSessionUser(c.req.raw, c.env.DB);
    if (user?.role === "admin") asset = await findStoredAsset(c.env.DB, parsed.data);
  }
  if (!asset) return errorResponse(c, 404, "ASSET_NOT_FOUND", "Asset not found");
  const object = await c.env.ASSET_BUCKET.get(asset.key);
  if (!object) return errorResponse(c, 404, "ASSET_NOT_FOUND", "Asset not found");
  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Content-Disposition": asset.kind === "image" ? `inline; filename=\"${asset.fileName}\"` : `attachment; filename=\"${asset.fileName}\"`,
    // Publication state can change, so a cached public response must not keep
    // an asset reachable after its course or lesson is archived.
    "Cache-Control": "private, no-store",
    "ETag": object.httpEtag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "Cross-Origin-Resource-Policy": "same-site",
  });
  return new Response(object.body, { headers });
});
