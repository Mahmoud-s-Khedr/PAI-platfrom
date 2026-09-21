import { Hono } from "hono";
import { z } from "zod";
import { findStoredAsset } from "../db/admin";
import { errorResponse } from "../lib/http";

type Bindings = Cloudflare.Env;
export const assets = new Hono<{ Bindings: Bindings }>();
const positiveInteger = z.coerce.number().int().positive();

/**
 * Assets are deliberately served through the Worker rather than a public R2
 * bucket. D1 decides which generated key is reachable and non-image content is
 * always downloaded, never rendered in the application's origin.
 */
assets.get("/assets/:id", async (c) => {
  const parsed = positiveInteger.safeParse(c.req.param("id"));
  if (!parsed.success) return errorResponse(c, 400, "INVALID_ASSET_ID", "Asset id must be a positive integer");
  const asset = await findStoredAsset(c.env.DB, parsed.data);
  if (!asset) return errorResponse(c, 404, "ASSET_NOT_FOUND", "Asset not found");
  const object = await c.env.ASSET_BUCKET.get(asset.key);
  if (!object) return errorResponse(c, 404, "ASSET_NOT_FOUND", "Asset not found");
  const headers = new Headers({
    "Content-Type": asset.mimeType,
    "Content-Disposition": asset.kind === "image" ? `inline; filename=\"${asset.fileName}\"` : `attachment; filename=\"${asset.fileName}\"`,
    "Cache-Control": "public, max-age=31536000, immutable",
    "ETag": object.httpEtag,
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "sandbox",
    "Cross-Origin-Resource-Policy": "same-site",
  });
  return new Response(object.body, { headers });
});
