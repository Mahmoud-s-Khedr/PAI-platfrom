import { z } from "zod";
import { calloutTones, type AuditEntry, type LessonPageData, type AdminAsset, type AdminCourse, type AdminLesson, type AdminLessonBlock, type AdminQuestion, type AssetKind, type ContentStatus, type LessonBlockType } from "../../src/lib/types";
import { registeredInteractiveComponentIds } from "../../src/interactives/component-ids";
import {
  archiveAdminLesson,
  archiveAdminQuestion,
  assetIsLinked,
  blockSortOrderConflict,
  blockSortOrderExists,
  courseExists,
  createAdminAsset,
  createAdminBlock,
  createAdminCourse,
  createAdminLesson,
  createAdminQuestion,
  deleteAdminAsset,
  deleteAdminBlock,
  deleteAdminCourse,
  findAdminBlock,
  findAdminCourse,
  findAdminLesson,
  findAdminQuestion,
  findStoredAsset,
  lessonHasQuestionMappings,
  lessonIdsBelongToCourse,
  listAdminAssets,
  listAdminBlockIds,
  listAdminCourses,
  listAdminLessons,
  listAdminQuestions,
  reorderAdminBlocks,
  replaceAdminLessonBlocks,
  createAdminQuestionsBatch,
  updateAdminBlock,
  updateAdminCourse,
  updateAdminLesson,
  updateAdminQuestion,
  type BlockInput,
  type CourseInput,
  type LessonInput,
  type QuestionFilters,
  type QuestionInput,
} from "../db/admin";

/**
 * Shared authoring rules for every write path: the browser CMS (`/api/admin/*`)
 * and the agents' MCP tools (`/api/mcp`). Functions return plain results instead
 * of HTTP responses so both adapters map them the same way.
 */

export interface Actor {
  type: "admin" | "agent";
  id: number;
  name: string;
}

export type Failure = { ok: false; status: 400 | 404 | 409 | 413; code: string; message: string; issues?: string[] };
export type Result<T> = { ok: true; value: T } | Failure;

const ok = <T>(value: T): Result<T> => ({ ok: true, value });
const fail = (status: Failure["status"], code: string, message: string, issues?: string[]): Failure => ({ ok: false, status, code, message, ...(issues?.length ? { issues } : {}) });

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

export const positiveInteger = z.coerce.number().int().positive();
export const statusSchema = z.enum(["draft", "published", "archived"]);
export const blockTypeSchema = z.enum(["rich-text", "image", "file", "code", "callout", "interactive"]);
export const questionTypeSchema = z.enum(["mcq", "true_false", "short_answer"]);
export const difficultySchema = z.enum(["easy", "medium", "hard"]);
export const slugSchema = z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must use lowercase letters, numbers, and hyphens").max(120);
const textSchema = z.string().trim().min(1).max(20_000);
export const localizedTextSchema = z.object({ ar: textSchema, en: textSchema }).strict();
const sortOrderSchema = z.number().int().min(0).max(1_000_000);

export const blockDataSchemas = {
  "rich-text": localizedTextSchema,
  image: z.object({ src: z.string().trim().min(1).max(2_000), assetId: positiveInteger.optional(), alt: localizedTextSchema.optional(), caption: localizedTextSchema.optional() }).strict(),
  file: z.object({ assetId: positiveInteger, title: localizedTextSchema, description: localizedTextSchema.optional() }).strict(),
  code: z.object({ language: z.string().trim().min(1).max(80).optional(), code: z.string().max(100_000) }).strict(),
  callout: localizedTextSchema.extend({ tone: z.enum(calloutTones) }).strict(),
  interactive: z.object({ component: z.enum(registeredInteractiveComponentIds), props: z.record(z.string(), z.unknown()).optional() }).strict(),
} satisfies Record<LessonBlockType, z.ZodType>;

export const courseInputSchema = z.object({
  slug: slugSchema,
  title: localizedTextSchema,
  description: z.object({ ar: z.string().max(20_000), en: z.string().max(20_000) }).strict(),
  status: statusSchema,
  sortOrder: sortOrderSchema,
}).strict();

export const lessonInputSchema = z.object({
  courseId: positiveInteger,
  slug: slugSchema,
  title: localizedTextSchema,
  youtubeVideoId: z.string().trim().min(1).max(100).nullable(),
  status: statusSchema,
  sortOrder: sortOrderSchema,
}).strict();

const blockDataFields = (sortOrder: boolean) => [
  z.object({ type: z.literal("rich-text"), data: blockDataSchemas["rich-text"], ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
  z.object({ type: z.literal("image"), data: blockDataSchemas.image, ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
  z.object({ type: z.literal("file"), data: blockDataSchemas.file, ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
  z.object({ type: z.literal("code"), data: blockDataSchemas.code, ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
  z.object({ type: z.literal("callout"), data: blockDataSchemas.callout, ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
  z.object({ type: z.literal("interactive"), data: blockDataSchemas.interactive, ...(sortOrder ? { sortOrder: sortOrderSchema } : {}) }).strict(),
] as const;

export const blockInputSchema = z.discriminatedUnion("type", blockDataFields(true));
/** A block in a full ordered list; its position sets the sort order. */
export const orderedBlockSchema = z.discriminatedUnion("type", blockDataFields(false));

const blockPatchSchema = z.object({ type: blockTypeSchema.optional(), data: z.unknown().optional(), sortOrder: sortOrderSchema.optional() }).strict();

const mcqAnswerSchema = z.object({
  choices: z.object({ ar: z.array(textSchema).min(1).max(20), en: z.array(textSchema).min(1).max(20) }).strict(),
  correctIndex: z.number().int().nonnegative(),
}).strict().superRefine((answer, context) => {
  if (answer.choices.ar.length !== answer.choices.en.length || answer.correctIndex >= answer.choices.ar.length) {
    context.addIssue({ code: "custom", message: "Choices must have matching lengths and correctIndex must exist" });
  }
});

const lessonIdsSchema = z.array(positiveInteger).max(100).transform((ids) => [...new Set(ids)]);
const questionFields = {
  courseId: positiveInteger,
  prompt: localizedTextSchema,
  explanation: localizedTextSchema,
  difficulty: difficultySchema,
  status: statusSchema,
  lessonIds: lessonIdsSchema,
};
export const questionInputSchema = z.discriminatedUnion("type", [
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
  lessonIds: lessonIdsSchema.optional(),
}).strict();

export const questionFiltersSchema = z.object({ courseId: positiveInteger.optional(), lessonId: positiveInteger.optional(), type: questionTypeSchema.optional(), difficulty: difficultySchema.optional(), status: statusSchema.optional(), search: z.string().trim().min(1).max(200).optional() });

export const MAX_BULK_QUESTIONS = 50;
export const MAX_LESSON_BLOCKS = 500;

function issuesOf(error: z.ZodError): string[] {
  return error.issues.slice(0, 20).map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`);
}

function parse<T extends z.ZodType>(schema: T, input: unknown): Result<z.output<T>> {
  const parsed = schema.safeParse(input);
  return parsed.success ? ok(parsed.data) : fail(400, "INVALID_REQUEST_BODY", "Request body is invalid", issuesOf(parsed.error));
}

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Error && /UNIQUE constraint failed/i.test(error.message);
}

// ---------------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------------

export type EntityType = "course" | "lesson" | "block" | "question" | "asset" | "agent_token";

export async function recordAudit(db: D1Database, actor: Actor, action: string, entityType: EntityType, entityId: number | null, summary = ""): Promise<void> {
  await db.prepare(`INSERT INTO audit_log (actor_type, actor_id, actor_name, action, entity_type, entity_id, summary)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(actor.type, actor.id, actor.name, action, entityType, entityId, summary.slice(0, 500)).run();
}

export type { AuditEntry };

export async function listAudit(db: D1Database, limit: number): Promise<AuditEntry[]> {
  const result = await db.prepare(`SELECT id, actor_type, actor_id, actor_name, action, entity_type, entity_id, summary, created_at
    FROM audit_log ORDER BY created_at DESC, id DESC LIMIT ?`).bind(limit).all<Record<string, unknown>>();
  return result.results.map((row) => ({
    id: Number(row.id), actorType: row.actor_type as Actor["type"], actorId: Number(row.actor_id), actorName: String(row.actor_name),
    action: String(row.action), entityType: String(row.entity_type), entityId: row.entity_id === null ? null : Number(row.entity_id),
    summary: String(row.summary ?? ""), createdAt: String(row.created_at),
  }));
}

// ---------------------------------------------------------------------------
// Reads (any status)
// ---------------------------------------------------------------------------

export const listCourses = (db: D1Database) => listAdminCourses(db);

export async function getCourse(db: D1Database, id: number): Promise<Result<AdminCourse>> {
  const course = await findAdminCourse(db, id);
  return course ? ok(course) : fail(404, "COURSE_NOT_FOUND", "Course not found");
}

export async function listLessons(db: D1Database, courseId: number) {
  if (!await findAdminCourse(db, courseId)) return fail(404, "COURSE_NOT_FOUND", "Course not found");
  return ok(await listAdminLessons(db, courseId));
}

export async function getLesson(db: D1Database, id: number): Promise<Result<AdminLesson>> {
  const lesson = await findAdminLesson(db, id);
  return lesson ? ok(lesson) : fail(404, "LESSON_NOT_FOUND", "Lesson not found");
}

export async function searchQuestions(db: D1Database, filters: unknown): Promise<Result<AdminQuestion[]>> {
  const parsed = questionFiltersSchema.safeParse(filters);
  if (!parsed.success) return fail(400, "INVALID_QUERY", "Question filters are invalid", issuesOf(parsed.error));
  return ok(await listAdminQuestions(db, parsed.data as QuestionFilters));
}

export async function getQuestion(db: D1Database, id: number): Promise<Result<AdminQuestion>> {
  const question = await findAdminQuestion(db, id);
  return question ? ok(question) : fail(404, "QUESTION_NOT_FOUND", "Question not found");
}

export const listAssets = (db: D1Database) => listAdminAssets(db);

/** The student lesson screen's data for any lesson status, for the admin draft preview. Archived items are left out. */
export async function previewLesson(db: D1Database, id: number): Promise<Result<LessonPageData>> {
  const lesson = await findAdminLesson(db, id);
  if (!lesson) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  const [course, lessons, questions] = await Promise.all([findAdminCourse(db, lesson.courseId), listAdminLessons(db, lesson.courseId), listAdminQuestions(db, { lessonId: id })]);
  if (!course) return fail(404, "COURSE_NOT_FOUND", "Course not found");
  return ok({ course, lessons: lessons.filter((item) => item.status !== "archived" || item.id === id), lesson, questions: questions.filter((question) => question.status !== "archived") });
}

// ---------------------------------------------------------------------------
// Courses
// ---------------------------------------------------------------------------

export async function createCourse(db: D1Database, actor: Actor, body: unknown): Promise<Result<AdminCourse>> {
  const input = parse(courseInputSchema, body);
  if (!input.ok) return input;
  let id: number;
  try { id = await createAdminCourse(db, input.value); } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "COURSE_SLUG_CONFLICT", "Another course already uses this slug");
    throw error;
  }
  await recordAudit(db, actor, "create", "course", id, `${input.value.slug} (${input.value.status})`);
  return ok((await findAdminCourse(db, id))!);
}

export async function updateCourse(db: D1Database, actor: Actor, id: number, body: unknown): Promise<Result<AdminCourse>> {
  const current = await findAdminCourse(db, id);
  if (!current) return fail(404, "COURSE_NOT_FOUND", "Course not found");
  const patch = parse(courseInputSchema.partial().strict(), body);
  if (!patch.ok) return patch;
  const input: CourseInput = { slug: patch.value.slug ?? current.slug, title: patch.value.title ?? current.title, description: patch.value.description ?? current.description, status: patch.value.status ?? current.status, sortOrder: patch.value.sortOrder ?? current.sortOrder };
  try { await updateAdminCourse(db, id, input); } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "COURSE_SLUG_CONFLICT", "Another course already uses this slug");
    throw error;
  }
  await recordAudit(db, actor, "update", "course", id, changedFields(patch.value, current.status, input.status));
  return ok((await findAdminCourse(db, id))!);
}

/** Permanent deletion is a browser-CMS-only operation; agents archive instead. */
export async function deleteCourse(db: D1Database, actor: Actor, id: number): Promise<Result<null>> {
  const current = await findAdminCourse(db, id);
  if (!current) return fail(404, "COURSE_NOT_FOUND", "Course not found");
  await deleteAdminCourse(db, id);
  await recordAudit(db, actor, "delete", "course", id, current.slug);
  return ok(null);
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

export async function createLesson(db: D1Database, actor: Actor, body: unknown): Promise<Result<AdminLesson>> {
  const input = parse(lessonInputSchema, body);
  if (!input.ok) return input;
  if (!await courseExists(db, input.value.courseId)) return fail(400, "COURSE_NOT_FOUND", "Course not found");
  let id: number;
  try { id = await createAdminLesson(db, input.value); } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "LESSON_SLUG_CONFLICT", "Another lesson in this course already uses this slug");
    throw error;
  }
  await recordAudit(db, actor, "create", "lesson", id, `${input.value.slug} (${input.value.status})`);
  return ok((await findAdminLesson(db, id))!);
}

export async function updateLesson(db: D1Database, actor: Actor, id: number, body: unknown): Promise<Result<AdminLesson>> {
  const current = await findAdminLesson(db, id);
  if (!current) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  const patch = parse(lessonInputSchema.partial().strict(), body);
  if (!patch.ok) return patch;
  const value = patch.value;
  const input: LessonInput = { courseId: value.courseId ?? current.courseId, slug: value.slug ?? current.slug, title: value.title ?? current.title, youtubeVideoId: "youtubeVideoId" in value ? value.youtubeVideoId! : current.youtubeVideoId, status: value.status ?? current.status, sortOrder: value.sortOrder ?? current.sortOrder };
  if (!await courseExists(db, input.courseId)) return fail(400, "COURSE_NOT_FOUND", "Course not found");
  if (input.courseId !== current.courseId && await lessonHasQuestionMappings(db, id)) {
    return fail(409, "LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT", "Unmap lesson questions before moving this lesson to another course");
  }
  try { await updateAdminLesson(db, id, input); } catch (error) {
    if (isUniqueViolation(error)) return fail(409, "LESSON_SLUG_CONFLICT", "Another lesson in this course already uses this slug");
    throw error;
  }
  await recordAudit(db, actor, "update", "lesson", id, changedFields(value, current.status, input.status));
  return ok((await findAdminLesson(db, id))!);
}

export async function archiveLesson(db: D1Database, actor: Actor, id: number): Promise<Result<null>> {
  if (!await findAdminLesson(db, id)) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  await archiveAdminLesson(db, id);
  await recordAudit(db, actor, "archive", "lesson", id);
  return ok(null);
}

// ---------------------------------------------------------------------------
// Lesson blocks
// ---------------------------------------------------------------------------

async function validateBlockAsset(db: D1Database, input: BlockInput): Promise<Failure | null> {
  if ((input.type !== "image" && input.type !== "file") || !input.data || typeof input.data !== "object") return null;
  const data = input.data as { assetId?: unknown; src?: unknown };
  if (typeof data.assetId !== "number") return null;
  const asset = await findStoredAsset(db, data.assetId);
  if (!asset || (input.type === "image" && (asset.kind !== "image" || data.src !== asset.url))) return fail(400, "INVALID_BLOCK_ASSET", "The selected asset is not available for this block");
  if (input.type === "file" && asset.kind === "image") return fail(400, "INVALID_FILE_ASSET", "The selected file asset is not available");
  return null;
}

export async function addBlock(db: D1Database, actor: Actor, lessonId: number, body: unknown): Promise<Result<AdminLessonBlock>> {
  if (!await findAdminLesson(db, lessonId)) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  const input = parse(blockInputSchema, body);
  if (!input.ok) return input;
  const block = input.value as BlockInput;
  if (await blockSortOrderExists(db, lessonId, block.sortOrder)) return fail(409, "BLOCK_SORT_ORDER_CONFLICT", "Another block already uses this sort order");
  const assetError = await validateBlockAsset(db, block);
  if (assetError) return assetError;
  const id = await createAdminBlock(db, lessonId, block);
  await recordAudit(db, actor, "create", "block", id, `lesson ${lessonId}: ${block.type} at ${block.sortOrder}`);
  return ok((await findAdminBlock(db, id))!);
}

export async function updateBlock(db: D1Database, actor: Actor, id: number, body: unknown): Promise<Result<AdminLessonBlock>> {
  const current = await findAdminBlock(db, id);
  if (!current) return fail(404, "BLOCK_NOT_FOUND", "Lesson block not found");
  const patch = parse(blockPatchSchema, body);
  if (!patch.ok) return patch;
  const candidate = parse(blockInputSchema, { type: patch.value.type ?? current.type, data: patch.value.data ?? current.data, sortOrder: patch.value.sortOrder ?? current.sortOrder });
  if (!candidate.ok) return candidate;
  const block = candidate.value as BlockInput;
  if (await blockSortOrderConflict(db, id, block.sortOrder)) return fail(409, "BLOCK_SORT_ORDER_CONFLICT", "Another block already uses this sort order");
  const assetError = await validateBlockAsset(db, block);
  if (assetError) return assetError;
  await updateAdminBlock(db, id, block);
  await recordAudit(db, actor, "update", "block", id, `${block.type} at ${block.sortOrder}`);
  return ok((await findAdminBlock(db, id))!);
}

export async function deleteBlock(db: D1Database, actor: Actor, id: number): Promise<Result<null>> {
  const current = await findAdminBlock(db, id);
  if (!current) return fail(404, "BLOCK_NOT_FOUND", "Lesson block not found");
  await deleteAdminBlock(db, id);
  await recordAudit(db, actor, "delete", "block", id, `${current.type} at ${current.sortOrder}`);
  return ok(null);
}

export async function reorderBlocks(db: D1Database, actor: Actor, lessonId: number, body: unknown): Promise<Result<AdminLesson>> {
  if (!await findAdminLesson(db, lessonId)) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  const parsed = parse(z.object({ blockIds: z.array(positiveInteger).max(MAX_LESSON_BLOCKS) }).strict(), body);
  if (!parsed.ok) return parsed;
  const { blockIds } = parsed.value;
  const existingIds = await listAdminBlockIds(db, lessonId);
  if (new Set(blockIds).size !== blockIds.length || blockIds.length !== existingIds.length || blockIds.some((id) => !existingIds.includes(id))) {
    return fail(400, "INVALID_BLOCK_ORDER", "blockIds must contain every block in this lesson exactly once");
  }
  await reorderAdminBlocks(db, blockIds);
  await recordAudit(db, actor, "reorder_blocks", "lesson", lessonId, `${blockIds.length} blocks`);
  return ok((await findAdminLesson(db, lessonId))!);
}

/** Replaces every block of a lesson with a validated ordered list in one D1 batch. */
export async function replaceLessonBlocks(db: D1Database, actor: Actor, lessonId: number, body: unknown): Promise<Result<AdminLesson>> {
  if (!await findAdminLesson(db, lessonId)) return fail(404, "LESSON_NOT_FOUND", "Lesson not found");
  const parsed = parse(z.object({ blocks: z.array(orderedBlockSchema).max(MAX_LESSON_BLOCKS) }).strict(), body);
  if (!parsed.ok) return parsed;
  const blocks: BlockInput[] = parsed.value.blocks.map((block, index) => ({ ...(block as Omit<BlockInput, "sortOrder">), sortOrder: index + 1 }));
  for (const [index, block] of blocks.entries()) {
    const assetError = await validateBlockAsset(db, block);
    if (assetError) return { ...assetError, issues: [`blocks.${index}: ${assetError.message}`] };
  }
  await replaceAdminLessonBlocks(db, lessonId, blocks);
  await recordAudit(db, actor, "replace_blocks", "lesson", lessonId, `${blocks.length} blocks`);
  return ok((await findAdminLesson(db, lessonId))!);
}

// ---------------------------------------------------------------------------
// Questions
// ---------------------------------------------------------------------------

async function validateQuestionLinks(db: D1Database, input: QuestionInput): Promise<Failure | null> {
  if (!await courseExists(db, input.courseId)) return fail(400, "COURSE_NOT_FOUND", "Course not found");
  if (!await lessonIdsBelongToCourse(db, input.lessonIds, input.courseId)) {
    return fail(400, "INVALID_QUESTION_LESSONS", "Each question lesson must belong to the selected course");
  }
  return null;
}

export async function createQuestion(db: D1Database, actor: Actor, body: unknown): Promise<Result<AdminQuestion>> {
  const input = parse(questionInputSchema, body);
  if (!input.ok) return input;
  const question = input.value as QuestionInput;
  const linkError = await validateQuestionLinks(db, question);
  if (linkError) return linkError;
  const id = await createAdminQuestion(db, question);
  await recordAudit(db, actor, "create", "question", id, `${question.type}, ${question.difficulty} (${question.status})`);
  return ok((await findAdminQuestion(db, id))!);
}

/** All-or-nothing creation of up to MAX_BULK_QUESTIONS questions. */
export async function createQuestionsBulk(db: D1Database, actor: Actor, body: unknown): Promise<Result<AdminQuestion[]>> {
  const parsed = parse(z.object({ questions: z.array(questionInputSchema).min(1).max(MAX_BULK_QUESTIONS) }).strict(), body);
  if (!parsed.ok) return parsed;
  const questions = parsed.value.questions as QuestionInput[];
  for (const [index, question] of questions.entries()) {
    const linkError = await validateQuestionLinks(db, question);
    if (linkError) return { ...linkError, issues: [`questions.${index}: ${linkError.message}`] };
  }
  const ids = await createAdminQuestionsBatch(db, questions);
  await recordAudit(db, actor, "create_bulk", "question", null, `${ids.length} questions: ${ids.join(", ")}`);
  const created = await Promise.all(ids.map((id) => findAdminQuestion(db, id)));
  return ok(created.filter((question): question is AdminQuestion => Boolean(question)));
}

export async function updateQuestion(db: D1Database, actor: Actor, id: number, body: unknown): Promise<Result<AdminQuestion>> {
  const current = await findAdminQuestion(db, id);
  if (!current) return fail(404, "QUESTION_NOT_FOUND", "Question not found");
  const patch = parse(questionPatchSchema, body);
  if (!patch.ok) return patch;
  const value = patch.value;
  const candidate = parse(questionInputSchema, { courseId: value.courseId ?? current.courseId, type: value.type ?? current.type, prompt: value.prompt ?? current.prompt, answer: value.answer ?? current.answer, explanation: value.explanation ?? current.explanation, difficulty: value.difficulty ?? current.difficulty, status: value.status ?? current.status, lessonIds: value.lessonIds ?? current.lessonIds });
  if (!candidate.ok) return candidate;
  const input = candidate.value as QuestionInput;
  const linkError = await validateQuestionLinks(db, input);
  if (linkError) return linkError;
  await updateAdminQuestion(db, id, input);
  await recordAudit(db, actor, "update", "question", id, changedFields(value, current.status, input.status));
  return ok((await findAdminQuestion(db, id))!);
}

export async function duplicateQuestion(db: D1Database, actor: Actor, id: number): Promise<Result<AdminQuestion>> {
  const current = await findAdminQuestion(db, id);
  if (!current) return fail(404, "QUESTION_NOT_FOUND", "Question not found");
  const input: QuestionInput = { courseId: current.courseId, type: current.type, prompt: current.prompt, answer: current.answer, explanation: current.explanation, difficulty: current.difficulty, status: "draft", lessonIds: current.lessonIds };
  const duplicateId = await createAdminQuestion(db, input);
  await recordAudit(db, actor, "duplicate", "question", duplicateId, `copy of ${id}`);
  return ok((await findAdminQuestion(db, duplicateId))!);
}

export async function archiveQuestion(db: D1Database, actor: Actor, id: number): Promise<Result<null>> {
  if (!await findAdminQuestion(db, id)) return fail(404, "QUESTION_NOT_FOUND", "Question not found");
  await archiveAdminQuestion(db, id);
  await recordAudit(db, actor, "archive", "question", id);
  return ok(null);
}

// ---------------------------------------------------------------------------
// Publishing
// ---------------------------------------------------------------------------

export async function setStatus(db: D1Database, actor: Actor, entityType: "course" | "lesson" | "question", id: number, status: ContentStatus): Promise<Result<AdminCourse | AdminLesson | AdminQuestion>> {
  if (!statusSchema.safeParse(status).success) return fail(400, "INVALID_STATUS", "Status must be draft, published, or archived");
  if (entityType === "course") return updateCourse(db, actor, id, { status });
  if (entityType === "lesson") return updateLesson(db, actor, id, { status });
  return updateQuestion(db, actor, id, { status });
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------

export const assetRules = {
  image: { mimeTypes: new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]), maxBytes: 8 * 1024 * 1024 },
  worksheet: { mimeTypes: new Set(["application/pdf"]), maxBytes: 20 * 1024 * 1024 },
  dataset: { mimeTypes: new Set(["text/csv", "application/json"]), maxBytes: 20 * 1024 * 1024 },
  resource: { mimeTypes: new Set(["application/pdf", "application/zip", "application/x-zip-compressed", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv", "application/json", "application/x-yaml", "text/yaml", "text/x-yaml", "application/toml"]), maxBytes: 20 * 1024 * 1024 },
} as const;
export const MAX_ASSET_REQUEST_BYTES = 21 * 1024 * 1024;

const mimeTypesByExtension: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp", gif: "image/gif", pdf: "application/pdf", zip: "application/zip", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", txt: "text/plain", csv: "text/csv", json: "application/json", yaml: "application/x-yaml", yml: "application/x-yaml", toml: "application/toml" };

export function uploadMimeType(declared: string, fileName: string): string {
  if (declared && declared !== "application/octet-stream") return declared;
  const extension = fileName.split(".").pop()?.toLowerCase();
  return extension ? mimeTypesByExtension[extension] ?? declared : declared;
}

function safeFileName(name: string): string {
  const normalized = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return (normalized || "upload").slice(0, 120);
}

function extensionForMimeType(mimeType: string): string {
  return ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf", "application/zip": "zip", "application/x-zip-compressed": "zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "text/csv": "csv", "application/json": "json", "text/plain": "txt", "application/x-yaml": "yaml", "text/yaml": "yaml", "text/x-yaml": "yaml", "application/toml": "toml" } as Record<string, string>)[mimeType]!;
}

export interface AssetUpload {
  kind: unknown;
  fileName: string;
  mimeType: string;
  size: number;
  body: ReadableStream | ArrayBuffer | Blob;
}

export async function uploadAsset(db: D1Database, bucket: R2Bucket, actor: Actor, upload: AssetUpload): Promise<Result<AdminAsset>> {
  const { kind } = upload;
  if (kind !== "image" && kind !== "worksheet" && kind !== "dataset" && kind !== "resource") return fail(400, "INVALID_ASSET_UPLOAD", "A supported asset type and file are required");
  const rule = assetRules[kind as AssetKind];
  const mimeType = uploadMimeType(upload.mimeType, upload.fileName);
  if (!rule.mimeTypes.has(mimeType) || upload.size < 1) return fail(400, "INVALID_ASSET_MIME_TYPE", "This file type is not allowed for the selected asset type");
  if (upload.size > rule.maxBytes) return fail(413, "ASSET_TOO_LARGE", "The uploaded file is too large");
  const key = `assets/${kind}/${crypto.randomUUID()}.${extensionForMimeType(mimeType)}`;
  const fileName = safeFileName(upload.fileName);
  const disposition = kind === "image" ? `inline; filename="${fileName}"` : `attachment; filename="${fileName}"`;
  await bucket.put(key, upload.body, { httpMetadata: { contentType: mimeType, contentDisposition: disposition, cacheControl: "public, max-age=31536000, immutable" } });
  try {
    const id = await createAdminAsset(db, { key, kind: kind as AssetKind, fileName, mimeType, size: upload.size });
    await recordAudit(db, actor, "upload", "asset", id, `${fileName} (${mimeType}, ${upload.size} bytes)`);
    const asset = (await findStoredAsset(db, id))!;
    return ok({ id: asset.id, kind: asset.kind, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size, url: asset.url, createdAt: asset.createdAt, linkedBlockCount: asset.linkedBlockCount });
  } catch (error) {
    await bucket.delete(key);
    throw error;
  }
}

export async function deleteAsset(db: D1Database, bucket: R2Bucket, actor: Actor, id: number): Promise<Result<null>> {
  const asset = await findStoredAsset(db, id);
  if (!asset) return fail(404, "ASSET_NOT_FOUND", "Asset not found");
  if (await assetIsLinked(db, id)) return fail(409, "ASSET_IN_USE", "Remove the asset from its lesson block before deleting it");
  await bucket.delete(asset.key);
  await deleteAdminAsset(db, id);
  await recordAudit(db, actor, "delete", "asset", id, asset.fileName);
  return ok(null);
}

// ---------------------------------------------------------------------------

function changedFields(patch: object, previousStatus: ContentStatus, nextStatus: ContentStatus): string {
  const fields = Object.keys(patch).join(", ") || "no fields";
  return previousStatus === nextStatus ? fields : `${fields}; status ${previousStatus} → ${nextStatus}`;
}
