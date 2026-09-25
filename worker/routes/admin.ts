import { Hono } from "hono";
import { z } from "zod";
import type { ContentStatus, LessonBlockType, QuestionDifficulty, QuestionType } from "../../src/lib/types";
import {
  archiveAdminLesson,
  archiveAdminQuestion,
  assetIsLinked,
  blockSortOrderConflict,
  blockSortOrderExists,
  courseExists,
  createAdminBlock,
  createAdminCourse,
  createAdminLesson,
  createAdminQuestion,
  createAdminAsset,
  deleteAdminCourse,
  deleteAdminAsset,
  deleteAdminBlock,
  findAdminBlock,
  findAdminCourse,
  findAdminLesson,
  findAdminQuestion,
  findStoredAsset,
  lessonIdsBelongToCourse,
  lessonHasQuestionMappings,
  listAdminBlockIds,
  listAdminCourses,
  listAdminDashboard,
  listAdminLessons,
  listAdminQuestions,
  listAdminAssets,
  reorderAdminBlocks,
  updateAdminBlock,
  updateAdminCourse,
  updateAdminLesson,
  updateAdminQuestion,
  type BlockInput,
  type CourseInput,
  type LessonInput,
  type QuestionInput,
} from "../db/admin";
import { requireAdmin } from "../lib/admin-auth";
import { errorResponse } from "../lib/http";

type Bindings = import("../lib/auth").AuthBindings;
type Variables = { adminUser: import("../../src/lib/types").AuthUser };
const admin = new Hono<{ Bindings: Bindings; Variables: Variables }>();
const positiveInteger = z.coerce.number().int().positive();
const statusSchema = z.enum(["draft", "published", "archived"]);
const blockTypeSchema = z.enum(["rich-text", "image", "file", "code", "callout", "interactive"]);
const questionTypeSchema = z.enum(["mcq", "true_false", "short_answer"]);
const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens").max(120);
const textSchema = z.string().trim().min(1).max(20_000);
const localizedTextSchema = z.object({ ar: textSchema, en: textSchema }).strict();
const difficultySchema = z.enum(["easy", "medium", "hard"]);
const blockDataSchemas = {
  "rich-text": localizedTextSchema,
  image: z.object({ src: z.string().trim().min(1).max(2_000), assetId: positiveInteger.optional(), alt: localizedTextSchema.optional(), caption: localizedTextSchema.optional() }).strict(),
  file: z.object({ assetId: positiveInteger, title: localizedTextSchema, description: localizedTextSchema.optional() }).strict(),
  code: z.object({ language: z.string().trim().min(1).max(80).optional(), code: z.string().max(100_000) }).strict(),
  callout: localizedTextSchema.extend({ tone: z.string().trim().min(1).max(40).optional() }).strict(),
  interactive: z.object({ component: z.string().trim().min(1).max(120), props: z.record(z.string(), z.unknown()).optional() }).strict(),
} satisfies Record<LessonBlockType, z.ZodType>;

const courseInputSchema = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  description: z.object({ ar: z.string().max(20_000), en: z.string().max(20_000) }).strict(),
  status: statusSchema,
  sortOrder: z.number().int().min(0).max(1_000_000),
}).strict();

const lessonInputSchema = z.object({
  courseId: positiveInteger,
  slug: slugSchema,
  title: localizedTextSchema,
  youtubeVideoId: z.string().trim().min(1).max(100).nullable(),
  status: statusSchema,
  sortOrder: z.number().int().min(0).max(1_000_000),
}).strict();

const blockInputSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("rich-text"), data: blockDataSchemas["rich-text"], sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
  z.object({ type: z.literal("image"), data: blockDataSchemas.image, sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
  z.object({ type: z.literal("file"), data: blockDataSchemas.file, sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
  z.object({ type: z.literal("code"), data: blockDataSchemas.code, sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
  z.object({ type: z.literal("callout"), data: blockDataSchemas.callout, sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
  z.object({ type: z.literal("interactive"), data: blockDataSchemas.interactive, sortOrder: z.number().int().min(0).max(1_000_000) }).strict(),
]);

const mcqAnswerSchema = z.object({
  choices: z.object({ ar: z.array(textSchema).min(1).max(20), en: z.array(textSchema).min(1).max(20) }).strict(),
  correctIndex: z.number().int().nonnegative(),
}).strict().superRefine((answer, context) => {
  if (answer.choices.ar.length !== answer.choices.en.length || answer.correctIndex >= answer.choices.ar.length) {
    context.addIssue({ code: "custom", message: "Choices must have matching lengths and correctIndex must exist" });
  }
});

const questionFields = {
  courseId: positiveInteger,
  prompt: localizedTextSchema,
  explanation: localizedTextSchema,
  difficulty: difficultySchema,
  status: statusSchema,
  lessonIds: z.array(positiveInteger).max(100).transform((ids) => [...new Set(ids)]),
};
const questionInputSchema = z.discriminatedUnion("type", [
  z.object({ ...questionFields, type: z.literal("mcq"), answer: mcqAnswerSchema }).strict(),
  z.object({ ...questionFields, type: z.literal("true_false"), answer: z.object({ correct: z.boolean() }).strict() }).strict(),
  z.object({ ...questionFields, type: z.literal("short_answer"), answer: z.object({ acceptedAnswers: z.array(textSchema).min(1).max(50) }).strict() }).strict(),
]);

const questionPatchSchema = z.object({
  courseId: positiveInteger.optional(),
  type: questionTypeSchema.optional(),
  prompt: localizedTextSchema.optional(),
  answer: z.unknown().optional(),
  explanation: localizedTextSchema.optional(),
  difficulty: difficultySchema.optional(),
  status: statusSchema.optional(),
  lessonIds: z.array(positiveInteger).max(100).transform((ids) => [...new Set(ids)]).optional(),
}).strict();

function requestId(value: string, c: Parameters<typeof errorResponse>[0], name: string): number | Response {
  const parsed = positiveInteger.safeParse(value);
  return parsed.success ? parsed.data : errorResponse(c, 400, `INVALID_${name.toUpperCase()}_ID`, `${name} id must be a positive integer`);
}

async function parseBody<T extends z.ZodType>(c: Parameters<typeof errorResponse>[0], schema: T): Promise<z.output<T> | Response> {
  try {
    const parsed = schema.safeParse(await c.req.json());
    if (parsed.success) return parsed.data;
  } catch {
    // The response below intentionally keeps parser details out of the API contract.
  }
  return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Request body is invalid");
}

async function validateQuestionLinks(c: Parameters<typeof errorResponse>[0], input: QuestionInput): Promise<Response | null> {
  if (!await courseExists(c.env.DB, input.courseId)) return errorResponse(c, 400, "COURSE_NOT_FOUND", "Course not found");
  if (!await lessonIdsBelongToCourse(c.env.DB, input.lessonIds, input.courseId)) {
    return errorResponse(c, 400, "INVALID_QUESTION_LESSONS", "Each question lesson must belong to the selected course");
  }
  return null;
}

async function validateBlockAsset(c: Parameters<typeof errorResponse>[0], input: BlockInput): Promise<Response | null> {
  if ((input.type !== "image" && input.type !== "file") || !input.data || typeof input.data !== "object") return null;
  const data = input.data as { assetId?: unknown; src?: unknown };
  if (typeof data.assetId !== "number") return null;
  const asset = await findStoredAsset(c.env.DB, data.assetId);
  if (!asset || (input.type === "image" && (asset.kind !== "image" || data.src !== asset.url))) return errorResponse(c, 400, "INVALID_BLOCK_ASSET", "The selected asset is not available for this block");
  if (input.type === "file" && asset.kind === "image") return errorResponse(c, 400, "INVALID_FILE_ASSET", "The selected file asset is not available");
  return null;
}

const assetRules = {
  image: { mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]), maxBytes: 8 * 1024 * 1024 },
  worksheet: { mimeTypes: new Set(["application/pdf"]), maxBytes: 20 * 1024 * 1024 },
  dataset: { mimeTypes: new Set(["text/csv", "application/json"]), maxBytes: 20 * 1024 * 1024 },
  resource: { mimeTypes: new Set(["application/pdf", "application/zip", "application/x-zip-compressed", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv", "application/json", "application/x-yaml", "text/yaml", "text/x-yaml", "application/toml"]), maxBytes: 20 * 1024 * 1024 },
} as const;

const mimeTypesByExtension: Record<string, string> = { pdf: "application/pdf", zip: "application/zip", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", csv: "text/csv", json: "application/json", yaml: "application/x-yaml", yml: "application/x-yaml", toml: "application/toml" };

function uploadMimeType(file: File): string {
  if (file.type && file.type !== "application/octet-stream") return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension ? mimeTypesByExtension[extension] ?? file.type : file.type;
}

function safeFileName(name: string): string {
  const normalized = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || "upload").slice(0, 120);
}

function extensionForMimeType(mimeType: string): string {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf", "application/zip": "zip", "application/x-zip-compressed": "zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "text/csv": "csv", "application/json": "json", "text/plain": "txt", "application/x-yaml": "yaml", "text/yaml": "yaml", "text/x-yaml": "yaml", "application/toml": "toml" } as Record<string, string>)[mimeType]!;
}

admin.use("*", requireAdmin);

admin.get("/dashboard", async (c) => c.json(await listAdminDashboard(c.env.DB)));

admin.get("/assets", async (c) => c.json(await listAdminAssets(c.env.DB)));

admin.post("/assets", async (c) => {
  const contentLength = Number(c.req.header("Content-Length"));
  if (Number.isFinite(contentLength) && contentLength > 21 * 1024 * 1024) return errorResponse(c, 413, "ASSET_TOO_LARGE", "The uploaded file is too large");
  let form: FormData;
  try { form = await c.req.raw.formData(); } catch { return errorResponse(c, 400, "INVALID_ASSET_UPLOAD", "Upload must be multipart form data"); }
  const kind = form.get("kind");
  const file = form.get("file");
  if ((kind !== "image" && kind !== "worksheet" && kind !== "dataset" && kind !== "resource") || !(file instanceof File)) return errorResponse(c, 400, "INVALID_ASSET_UPLOAD", "A supported asset type and file are required");
  const rule = assetRules[kind];
  const mimeType = uploadMimeType(file);
  if (!rule.mimeTypes.has(mimeType) || file.size < 1) return errorResponse(c, 400, "INVALID_ASSET_MIME_TYPE", "This file type is not allowed for the selected asset type");
  if (file.size > rule.maxBytes) return errorResponse(c, 413, "ASSET_TOO_LARGE", "The uploaded file is too large");
  const key = `assets/${kind}/${crypto.randomUUID()}.${extensionForMimeType(mimeType)}`;
  const fileName = safeFileName(file.name);
  const disposition = kind === "image" ? `inline; filename=\"${fileName}\"` : `attachment; filename=\"${fileName}\"`;
  await c.env.ASSET_BUCKET.put(key, file, { httpMetadata: { contentType: mimeType, contentDisposition: disposition, cacheControl: "public, max-age=31536000, immutable" } });
  try {
    const id = await createAdminAsset(c.env.DB, { key, kind, fileName, mimeType, size: file.size });
    const asset = await findStoredAsset(c.env.DB, id);
    return c.json(asset && { id: asset.id, kind: asset.kind, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size, url: asset.url, createdAt: asset.createdAt, linkedBlockCount: asset.linkedBlockCount }, 201);
  } catch (error) {
    await c.env.ASSET_BUCKET.delete(key);
    throw error;
  }
});

admin.delete("/assets/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "asset");
  if (id instanceof Response) return id;
  const asset = await findStoredAsset(c.env.DB, id);
  if (!asset) return errorResponse(c, 404, "ASSET_NOT_FOUND", "Asset not found");
  if (await assetIsLinked(c.env.DB, id)) return errorResponse(c, 409, "ASSET_IN_USE", "Remove the asset from its lesson block before deleting it");
  await c.env.ASSET_BUCKET.delete(asset.key);
  await deleteAdminAsset(c.env.DB, id);
  return c.body(null, 204);
});

admin.get("/courses", async (c) => c.json(await listAdminCourses(c.env.DB)));

admin.get("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  const course = await findAdminCourse(c.env.DB, id);
  return course ? c.json(course) : errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
});

admin.get("/courses/:id/lessons", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  if (!await findAdminCourse(c.env.DB, id)) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  return c.json(await listAdminLessons(c.env.DB, id));
});

admin.post("/courses", async (c) => {
  const input = await parseBody(c, courseInputSchema);
  if (input instanceof Response) return input;
  const id = await createAdminCourse(c.env.DB, input);
  return c.json(await findAdminCourse(c.env.DB, id), 201);
});

admin.patch("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  const current = await findAdminCourse(c.env.DB, id);
  if (!current) return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  const patch = await parseBody(c, courseInputSchema.partial().strict());
  if (patch instanceof Response) return patch;
  const input: CourseInput = { slug: patch.slug ?? current.slug, title: patch.title ?? current.title, description: patch.description ?? current.description, status: patch.status ?? current.status, sortOrder: patch.sortOrder ?? current.sortOrder };
  await updateAdminCourse(c.env.DB, id, input);
  return c.json(await findAdminCourse(c.env.DB, id));
});

admin.delete("/courses/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "course");
  if (id instanceof Response) return id;
  if (!await findAdminCourse(c.env.DB, id)) {
    return errorResponse(c, 404, "COURSE_NOT_FOUND", "Course not found");
  }
  await deleteAdminCourse(c.env.DB, id);
  return c.body(null, 204);
});

admin.get("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  const lesson = await findAdminLesson(c.env.DB, id);
  return lesson ? c.json(lesson) : errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
});

admin.post("/lessons", async (c) => {
  const input = await parseBody(c, lessonInputSchema);
  if (input instanceof Response) return input;
  if (!await courseExists(c.env.DB, input.courseId)) return errorResponse(c, 400, "COURSE_NOT_FOUND", "Course not found");
  const id = await createAdminLesson(c.env.DB, input);
  return c.json(await findAdminLesson(c.env.DB, id), 201);
});

admin.patch("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  const current = await findAdminLesson(c.env.DB, id);
  if (!current) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  const patch = await parseBody(c, lessonInputSchema.partial().strict());
  if (patch instanceof Response) return patch;
  const input: LessonInput = { courseId: patch.courseId ?? current.courseId, slug: patch.slug ?? current.slug, title: patch.title ?? current.title, youtubeVideoId: "youtubeVideoId" in patch ? patch.youtubeVideoId! : current.youtubeVideoId, status: patch.status ?? current.status, sortOrder: patch.sortOrder ?? current.sortOrder };
  if (!await courseExists(c.env.DB, input.courseId)) return errorResponse(c, 400, "COURSE_NOT_FOUND", "Course not found");
  if (input.courseId !== current.courseId && await lessonHasQuestionMappings(c.env.DB, id)) {
    return errorResponse(c, 409, "LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT", "Unmap lesson questions before moving this lesson to another course");
  }
  await updateAdminLesson(c.env.DB, id, input);
  return c.json(await findAdminLesson(c.env.DB, id));
});

admin.delete("/lessons/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "lesson");
  if (id instanceof Response) return id;
  if (!await findAdminLesson(c.env.DB, id)) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  await archiveAdminLesson(c.env.DB, id);
  return c.body(null, 204);
});

admin.post("/lessons/:lessonId/blocks", async (c) => {
  const lessonId = requestId(c.req.param("lessonId"), c, "lesson");
  if (lessonId instanceof Response) return lessonId;
  if (!await findAdminLesson(c.env.DB, lessonId)) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  const input = await parseBody(c, blockInputSchema);
  if (input instanceof Response) return input;
  if (await blockSortOrderExists(c.env.DB, lessonId, input.sortOrder)) {
    return errorResponse(c, 409, "BLOCK_SORT_ORDER_CONFLICT", "Another block already uses this sort order");
  }
  const assetError = await validateBlockAsset(c, input as BlockInput);
  if (assetError) return assetError;
  const id = await createAdminBlock(c.env.DB, lessonId, input as BlockInput);
  return c.json(await findAdminBlock(c.env.DB, id), 201);
});

admin.patch("/blocks/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "block");
  if (id instanceof Response) return id;
  const current = await findAdminBlock(c.env.DB, id);
  if (!current) return errorResponse(c, 404, "BLOCK_NOT_FOUND", "Lesson block not found");
  const patch = await parseBody(c, z.object({ type: blockTypeSchema.optional(), data: z.unknown().optional(), sortOrder: z.number().int().min(0).max(1_000_000).optional() }).strict());
  if (patch instanceof Response) return patch;
  const candidate = blockInputSchema.safeParse({ type: patch.type ?? current.type, data: patch.data ?? current.data, sortOrder: patch.sortOrder ?? current.sortOrder });
  if (!candidate.success) return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Request body is invalid");
  if (await blockSortOrderConflict(c.env.DB, id, candidate.data.sortOrder)) {
    return errorResponse(c, 409, "BLOCK_SORT_ORDER_CONFLICT", "Another block already uses this sort order");
  }
  const assetError = await validateBlockAsset(c, candidate.data as BlockInput);
  if (assetError) return assetError;
  await updateAdminBlock(c.env.DB, id, candidate.data as BlockInput);
  return c.json(await findAdminBlock(c.env.DB, id));
});

admin.delete("/blocks/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "block");
  if (id instanceof Response) return id;
  if (!await findAdminBlock(c.env.DB, id)) return errorResponse(c, 404, "BLOCK_NOT_FOUND", "Lesson block not found");
  await deleteAdminBlock(c.env.DB, id);
  return c.body(null, 204);
});

admin.put("/lessons/:lessonId/blocks/order", async (c) => {
  const lessonId = requestId(c.req.param("lessonId"), c, "lesson");
  if (lessonId instanceof Response) return lessonId;
  if (!await findAdminLesson(c.env.DB, lessonId)) return errorResponse(c, 404, "LESSON_NOT_FOUND", "Lesson not found");
  const body = await parseBody(c, z.object({ blockIds: z.array(positiveInteger).max(500) }).strict());
  if (body instanceof Response) return body;
  const existingIds = await listAdminBlockIds(c.env.DB, lessonId);
  if (new Set(body.blockIds).size !== body.blockIds.length || body.blockIds.length !== existingIds.length || body.blockIds.some((id) => !existingIds.includes(id))) {
    return errorResponse(c, 400, "INVALID_BLOCK_ORDER", "blockIds must contain every block in this lesson exactly once");
  }
  await reorderAdminBlocks(c.env.DB, body.blockIds);
  return c.json(await findAdminLesson(c.env.DB, lessonId));
});

admin.get("/questions", async (c) => {
  const query = z.object({ courseId: positiveInteger.optional(), lessonId: positiveInteger.optional(), type: questionTypeSchema.optional(), difficulty: difficultySchema.optional(), status: statusSchema.optional(), search: z.string().trim().min(1).max(200).optional() }).safeParse(c.req.query());
  if (!query.success) return errorResponse(c, 400, "INVALID_QUERY", "Question filters are invalid");
  return c.json(await listAdminQuestions(c.env.DB, query.data));
});

admin.get("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  const question = await findAdminQuestion(c.env.DB, id);
  return question ? c.json(question) : errorResponse(c, 404, "QUESTION_NOT_FOUND", "Question not found");
});

admin.post("/questions", async (c) => {
  const input = await parseBody(c, questionInputSchema);
  if (input instanceof Response) return input;
  const linkError = await validateQuestionLinks(c, input as QuestionInput);
  if (linkError) return linkError;
  const id = await createAdminQuestion(c.env.DB, input as QuestionInput);
  return c.json(await findAdminQuestion(c.env.DB, id), 201);
});

admin.patch("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  const current = await findAdminQuestion(c.env.DB, id);
  if (!current) return errorResponse(c, 404, "QUESTION_NOT_FOUND", "Question not found");
  const patch = await parseBody(c, questionPatchSchema);
  if (patch instanceof Response) return patch;
  const candidate = questionInputSchema.safeParse({ courseId: patch.courseId ?? current.courseId, type: patch.type ?? current.type, prompt: patch.prompt ?? current.prompt, answer: patch.answer ?? current.answer, explanation: patch.explanation ?? current.explanation, difficulty: patch.difficulty ?? current.difficulty, status: patch.status ?? current.status, lessonIds: patch.lessonIds ?? current.lessonIds });
  if (!candidate.success) return errorResponse(c, 400, "INVALID_REQUEST_BODY", "Request body is invalid");
  const input = candidate.data as QuestionInput;
  const linkError = await validateQuestionLinks(c, input);
  if (linkError) return linkError;
  await updateAdminQuestion(c.env.DB, id, input);
  return c.json(await findAdminQuestion(c.env.DB, id));
});

admin.post("/questions/:id/duplicate", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  const current = await findAdminQuestion(c.env.DB, id);
  if (!current) return errorResponse(c, 404, "QUESTION_NOT_FOUND", "Question not found");
  const input: QuestionInput = { courseId: current.courseId, type: current.type, prompt: current.prompt, answer: current.answer, explanation: current.explanation, difficulty: current.difficulty, status: "draft", lessonIds: current.lessonIds };
  const duplicateId = await createAdminQuestion(c.env.DB, input);
  return c.json(await findAdminQuestion(c.env.DB, duplicateId), 201);
});

admin.delete("/questions/:id", async (c) => {
  const id = requestId(c.req.param("id"), c, "question");
  if (id instanceof Response) return id;
  if (!await findAdminQuestion(c.env.DB, id)) return errorResponse(c, 404, "QUESTION_NOT_FOUND", "Question not found");
  await archiveAdminQuestion(c.env.DB, id);
  return c.body(null, 204);
});

export { admin };
