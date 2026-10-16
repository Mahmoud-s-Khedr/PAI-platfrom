import { Hono, type Context } from "hono";
import { z } from "zod";
import { listAdminDashboard } from "../db/admin";
import { requireAdmin } from "../lib/admin-auth";
import { createAgentToken, listAgentTokens, revokeAgentToken } from "../lib/agent-auth";
import { errorResponse } from "../lib/http";
import * as authoring from "../services/authoring";
import type { Actor, Result } from "../services/authoring";

type Bindings = import("../lib/auth").AuthBindings;
type Variables = { adminUser: import("../../src/lib/types").AuthUser };
type AdminContext = Context<{ Bindings: Bindings; Variables: Variables }>;
const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();

/** The browser CMS is a thin HTTP adapter over the shared authoring service. */

function actor(c: AdminContext): Actor {
  const user = c.get("adminUser");
  return { type: "admin", id: user.id, name: user.displayName };
}

function requestId(value: string, c: AdminContext, name: string): number | Response {
  const parsed = authoring.positiveInteger.safeParse(value);
  return parsed.success ? parsed.data : errorResponse(c, 400, `INVALID_${name.toUpperCase()}_ID`, `${name} id must be a positive integer`);
}

/** Invalid JSON becomes `undefined`, which the service reports as an invalid body. */
async function body(c: AdminContext): Promise<unknown> {
  try { return await c.req.json(); } catch { return undefined; }
}

function respond<T>(c: AdminContext, result: Result<T>, status: 200 | 201 | 204 = 200): Response {
  if (!result.ok) return errorResponse(c, result.status, result.code, result.message);
  return status === 204 ? c.body(null, 204) : c.json(result.value, status);
}

admin.use("*", requireAdmin);

admin.get("/dashboard", async (c) => c.json(await listAdminDashboard(c.env.DB)));

admin.get("/assets", async (c) => c.json(await authoring.listAssets(c.env.DB)));

admin.post("/assets", async (c) => {
  const contentLength = Number(c.req.header("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > authoring.MAX_ASSET_REQUEST_BYTES) return errorResponse(c, 413, "ASSET_TOO_LARGE", "The uploaded file is too large");
  let form: FormData;
  try { form = await c.req.raw.formData(); } catch { return errorResponse(c, 400, "INVALID_ASSET_UPLOAD", "Upload must be multipart form data"); }
  const file = form.get("file");
  if (!(file instanceof File)) return errorResponse(c, 400, "INVALID_ASSET_UPLOAD", "A supported asset type and file are required");
  return respond(c, await authoring.uploadAsset(c.env.DB, c.env.ASSET_BUCKET, actor(c), { kind: form.get("kind"), fileName: file.name, mimeType: file.type, size: file.size, body: file }), 201);
});

admin.delete("/assets/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "asset");
  if (id instanceof Response) return id;
  return respond(c, await authoring.deleteAsset(c.env.DB, c.env.ASSET_BUCKET, actor(c), id), 204);
});

admin.get("/courses", async (c) => c.json(await authoring.listCourses(c.env.DB)));

admin.get("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  return respond(c, await authoring.getCourse(c.env.DB, id));
});

admin.get("/courses/:id/lessons", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  return respond(c, await authoring.listLessons(c.env.DB, id));
});

admin.post("/courses", async (c) => respond(c, await authoring.createCourse(c.env.DB, actor(c), await body(c)), 201));

admin.patch("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  return respond(c, await authoring.updateCourse(c.env.DB, actor(c), id, await body(c)));
});

admin.delete("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  return respond(c, await authoring.deleteCourse(c.env.DB, actor(c), id), 204);
});

admin.get("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  return respond(c, await authoring.getLesson(c.env.DB, id));
});

admin.get("/lessons/:id/preview", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  return respond(c, await authoring.previewLesson(c.env.DB, id));
});

admin.post("/lessons", async (c) => respond(c, await authoring.createLesson(c.env.DB, actor(c), await body(c)), 201));

admin.patch("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  return respond(c, await authoring.updateLesson(c.env.DB, actor(c), id, await body(c)));
});

admin.delete("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  return respond(c, await authoring.archiveLesson(c.env.DB, actor(c), id), 204);
});

admin.post("/lessons/:lessonId/blocks", async (c) => {
  const lessonId = requestId(c.req.param("lessonId"), c, "lesson");
  if (lessonId instanceof Response) return lessonId;
  return respond(c, await authoring.addBlock(c.env.DB, actor(c), lessonId, await body(c)), 201);
});

admin.patch("/blocks/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "block");
  if (id instanceof Response) return id;
  return respond(c, await authoring.updateBlock(c.env.DB, actor(c), id, await body(c)));
});

admin.delete("/blocks/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "block");
  if (id instanceof Response) return id;
  return respond(c, await authoring.deleteBlock(c.env.DB, actor(c), id), 204);
});

admin.put("/lessons/:lessonId/blocks/order", async (c) => {
  const lessonId = requestId(c.req.param("lessonId"), c, "lesson");
  if (lessonId instanceof Response) return lessonId;
  return respond(c, await authoring.reorderBlocks(c.env.DB, actor(c), lessonId, await body(c)));
});

admin.get("/questions", async (c) => respond(c, await authoring.searchQuestions(c.env.DB, c.req.query())));

admin.get("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  return respond(c, await authoring.getQuestion(c.env.DB, id));
});

admin.post("/questions", async (c) => respond(c, await authoring.createQuestion(c.env.DB, actor(c), await body(c)), 201));

admin.patch("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  return respond(c, await authoring.updateQuestion(c.env.DB, actor(c), id, await body(c)));
});

admin.post("/questions/:id/duplicate", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  return respond(c, await authoring.duplicateQuestion(c.env.DB, actor(c), id), 201);
});

admin.delete("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  return respond(c, await authoring.archiveQuestion(c.env.DB, actor(c), id), 204);
});

admin.get("/agent-tokens", async (c) => c.json(await listAgentTokens(c.env.DB)));

admin.post("/agent-tokens", async (c) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(80) }).strict().safeParse(await body(c));
  if (!parsed.success) return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Request body is invalid");
  const created = await createAgentToken(c.env.DB, parsed.data.name);
  if (!created) return errorResponse(c, 409, "AGENT_NAME_CONFLICT", "Another agent token already uses this name");
  await authoring.recordAudit(c.env.DB, actor(c), "create", "agent_token", created.agent.id, created.agent.name);
  return c.json(created, 201);
});

admin.post("/agent-tokens/:id/revoke", async (c) => {
  const id = requestId(c.req.param("id"), c, "agent token");
  if (id instanceof Response) return id;
  const revoked = await revokeAgentToken(c.env.DB, id);
  if (!revoked) return errorResponse(c, 404, "AGENT_TOKEN_NOT_FOUND", "Agent token not found");
  await authoring.recordAudit(c.env.DB, actor(c), "revoke", "agent_token", id, revoked.name);
  return c.json(revoked);
});

admin.get("/audit", async (c) => {
  const limit = z.coerce.number().int().min(1).max(500).default(100).safeParse(c.req.query("limit"));
  if (!limit.success) return errorResponse(c, 400, "INVALID_QUERY", "limit must be an integer from 1 to 500");
  return c.json(await authoring.listAudit(c.env.DB, limit.data));
});

export { admin };
