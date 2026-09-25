import type {
  AdminCourse,
  AdminDashboard,
  AdminDashboardLesson,
  AdminLesson,
  AdminLessonBlock,
  AdminLessonSummary,
  AdminQuestion,
  AdminAsset,
  AssetKind,
  ContentStatus,
  Course,
  LessonBlockType,
  LocalizedText,
  QuestionDifficulty,
  QuestionType,
} from "../../src/lib/types";
import { toBlock, toQuestion } from "./content";

interface AdminCourseRow extends Record<string, unknown> {
  id: number;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  status: ContentStatus;
  sort_order: number;
  lesson_count: number;
  question_count: number;
  created_at: string;
  updated_at: string;
}

interface AdminLessonRow extends Record<string, unknown> {
  id: number;
  course_id: number;
  slug: string;
  title_ar: string;
  title_en: string;
  youtube_video_id: string | null;
  sort_order: number;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

interface AdminDashboardLessonRow extends AdminLessonRow {
  direct_question_count: number;
}

interface AdminBlockRow extends Record<string, unknown> {
  id: number;
  lesson_id: number;
  type: string;
  sort_order: number;
  data_json: string;
}

interface AdminQuestionRow extends Record<string, unknown> {
  id: number;
  course_id: number;
  type: string;
  prompt_json: string;
  answer_json: string;
  explanation_json: string;
  difficulty: string;
  status: ContentStatus;
  created_at: string;
  updated_at: string;
}

interface AdminAssetRow extends Record<string, unknown> {
  id: number;
  key: string;
  mime_type: string;
  metadata_json: string;
  created_at: string;
  linked_block_count: number;
}

interface AssetMetadata {
  kind: AssetKind;
  fileName: string;
  size: number;
}

const assetMimeTypes: Record<AssetKind, readonly string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  worksheet: ["application/pdf"],
  dataset: ["text/csv", "application/json"],
  resource: ["application/pdf", "application/zip", "application/x-zip-compressed", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "text/plain", "text/csv", "application/json", "application/x-yaml", "text/yaml", "text/x-yaml", "application/toml"],
};
const assetExtensions: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "application/pdf": "pdf", "application/zip": "zip", "application/x-zip-compressed": "zip", "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx", "text/csv": "csv", "application/json": "json", "text/plain": "txt", "application/x-yaml": "yaml", "text/yaml": "yaml", "text/x-yaml": "yaml", "application/toml": "toml" };

export interface AssetInput extends AssetMetadata {
  key: string;
  mimeType: string;
}

export interface StoredAsset extends AdminAsset {
  key: string;
}

export interface CourseInput {
  slug: string;
  title: LocalizedText;
  description: LocalizedText;
  status: ContentStatus;
  sortOrder: number;
}

export interface LessonInput {
  courseId: number;
  slug: string;
  title: LocalizedText;
  youtubeVideoId: string | null;
  status: ContentStatus;
  sortOrder: number;
}

export interface BlockInput {
  type: LessonBlockType;
  data: unknown;
  sortOrder: number;
}

export interface QuestionInput {
  courseId: number;
  type: QuestionType;
  prompt: LocalizedText;
  answer: unknown;
  explanation: LocalizedText;
  difficulty: QuestionDifficulty;
  status: ContentStatus;
  lessonIds: number[];
}

export interface QuestionFilters {
  courseId?: number;
  lessonId?: number;
  type?: QuestionType;
  difficulty?: QuestionDifficulty;
  status?: ContentStatus;
  search?: string;
}

function toAdminCourse(row: AdminCourseRow): AdminCourse {
  return {
    id: row.id,
    slug: row.slug,
    title: { ar: row.title_ar, en: row.title_en },
    description: { ar: row.description_ar, en: row.description_en },
    status: row.status,
    sortOrder: row.sort_order,
    lessonCount: row.lesson_count,
    questionCount: row.question_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdminBlock(row: AdminBlockRow): AdminLessonBlock {
  const block = toBlock(row);
  return { ...block, sortOrder: row.sort_order };
}

function toAdminLesson(row: AdminLessonRow, blocks: AdminBlockRow[]): AdminLesson {
  return { ...toAdminLessonSummary(row), blocks: blocks.map(toAdminBlock) };
}

function toAdminLessonSummary(row: AdminLessonRow): AdminLessonSummary {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: { ar: row.title_ar, en: row.title_en },
    youtubeVideoId: row.youtube_video_id,
    sortOrder: row.sort_order,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toAdminQuestion(row: AdminQuestionRow, lessonIds: number[]): AdminQuestion | null {
  const question = toQuestion(row);
  return question ? { ...question, status: row.status, lessonIds, createdAt: row.created_at, updatedAt: row.updated_at } : null;
}

function parseAssetMetadata(value: string): AssetMetadata | null {
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object" || !["image", "worksheet", "dataset", "resource"].includes(String(parsed.kind)) || typeof parsed.fileName !== "string" || !/^[a-zA-Z0-9._-]{1,120}$/.test(parsed.fileName) || typeof parsed.size !== "number" || !Number.isInteger(parsed.size) || parsed.size < 0) return null;
    return { kind: parsed.kind as AssetKind, fileName: parsed.fileName, size: parsed.size };
  } catch {
    return null;
  }
}

function toAdminAsset(row: AdminAssetRow): StoredAsset | null {
  const metadata = parseAssetMetadata(row.metadata_json);
  if (!metadata || !assetMimeTypes[metadata.kind].includes(row.mime_type)) return null;
  const extension = assetExtensions[row.mime_type];
  if (!extension || !new RegExp(`^assets/${metadata.kind}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.${extension}$`).test(row.key)) return null;
  return { id: row.id, ...metadata, mimeType: row.mime_type, url: `/api/assets/${row.id}`, createdAt: row.created_at, linkedBlockCount: row.linked_block_count, key: row.key };
}

const courseColumns = `c.id, c.slug, c.title_ar, c.title_en, c.description_ar, c.description_en,
  c.status, c.sort_order, c.created_at, c.updated_at,
  (SELECT COUNT(*) FROM lessons l WHERE l.course_id = c.id) AS lesson_count,
  (SELECT COUNT(*) FROM questions q WHERE q.course_id = c.id) AS question_count`;

export async function listAdminCourses(db: D1Database): Promise<AdminCourse[]> {
  const result = await db.prepare(`SELECT ${courseColumns} FROM courses c ORDER BY c.sort_order, c.id`).all<AdminCourseRow>();
  return result.results.map(toAdminCourse);
}

export async function listAdminDashboard(db: D1Database): Promise<AdminDashboard> {
  const [coursesResult, lessonsResult] = await db.batch([
    db.prepare(`SELECT ${courseColumns} FROM courses c ORDER BY c.sort_order, c.id`),
    db.prepare(`SELECT l.id, l.course_id, l.slug, l.title_ar, l.title_en, l.youtube_video_id, l.sort_order, l.status, l.created_at, l.updated_at,
      (SELECT COUNT(DISTINCT ql.question_id) FROM question_lessons ql WHERE ql.lesson_id = l.id) AS direct_question_count
      FROM lessons l ORDER BY l.course_id, l.sort_order, l.id`),
  ]);
  const lessonsByCourse = new Map<number, AdminDashboardLesson[]>();
  for (const row of (lessonsResult as D1Result<AdminDashboardLessonRow>).results) {
    const lesson: AdminDashboardLesson = { ...toAdminLessonSummary(row), directQuestionCount: row.direct_question_count };
    lessonsByCourse.set(row.course_id, [...(lessonsByCourse.get(row.course_id) ?? []), lesson]);
  }
  return { courses: (coursesResult as D1Result<AdminCourseRow>).results.map((course) => ({ ...toAdminCourse(course), lessons: lessonsByCourse.get(course.id) ?? [] })) };
}

export async function findAdminCourse(db: D1Database, id: number): Promise<AdminCourse | null> {
  const row = await db.prepare(`SELECT ${courseColumns} FROM courses c WHERE c.id = ?`).bind(id).first<AdminCourseRow>();
  return row ? toAdminCourse(row) : null;
}

export async function createAdminCourse(db: D1Database, input: CourseInput): Promise<number> {
  const row = await db.prepare(`INSERT INTO courses
    (slug, title_ar, title_en, description_ar, description_en, status, sort_order, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`)
    .bind(input.slug, input.title.ar, input.title.en, input.description.ar, input.description.en, input.status, input.sortOrder)
    .first<{ id: number }>();
  return row!.id;
}

export async function updateAdminCourse(db: D1Database, id: number, input: CourseInput): Promise<void> {
  await db.prepare(`UPDATE courses SET slug = ?, title_ar = ?, title_en = ?, description_ar = ?, description_en = ?,
    status = ?, sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.slug, input.title.ar, input.title.en, input.description.ar, input.description.en, input.status, input.sortOrder, id).run();
}

export async function deleteAdminCourse(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM courses WHERE id = ?").bind(id).run();
}

export async function findAdminLesson(db: D1Database, id: number): Promise<AdminLesson | null> {
  const lesson = await db.prepare(`SELECT id, course_id, slug, title_ar, title_en, youtube_video_id, sort_order, status, created_at, updated_at
    FROM lessons WHERE id = ?`).bind(id).first<AdminLessonRow>();
  if (!lesson) return null;
  const blocks = await db.prepare(`SELECT id, lesson_id, type, sort_order, data_json FROM lesson_blocks
    WHERE lesson_id = ? ORDER BY sort_order, id`).bind(id).all<AdminBlockRow>();
  return toAdminLesson(lesson, blocks.results);
}

export async function listAdminLessons(db: D1Database, courseId: number): Promise<AdminLessonSummary[]> {
  const result = await db.prepare(`SELECT id, course_id, slug, title_ar, title_en, youtube_video_id, sort_order, status, created_at, updated_at
    FROM lessons WHERE course_id = ? ORDER BY sort_order, id`).bind(courseId).all<AdminLessonRow>();
  return result.results.map(toAdminLessonSummary);
}

export async function createAdminLesson(db: D1Database, input: LessonInput): Promise<number> {
  const row = await db.prepare(`INSERT INTO lessons
    (course_id, slug, title_ar, title_en, youtube_video_id, sort_order, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`)
    .bind(input.courseId, input.slug, input.title.ar, input.title.en, input.youtubeVideoId, input.sortOrder, input.status)
    .first<{ id: number }>();
  return row!.id;
}

export async function updateAdminLesson(db: D1Database, id: number, input: LessonInput): Promise<void> {
  await db.prepare(`UPDATE lessons SET course_id = ?, slug = ?, title_ar = ?, title_en = ?, youtube_video_id = ?,
    sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.courseId, input.slug, input.title.ar, input.title.en, input.youtubeVideoId, input.sortOrder, input.status, id).run();
}

export async function lessonHasQuestionMappings(db: D1Database, lessonId: number): Promise<boolean> {
  return Boolean(await db.prepare("SELECT 1 FROM question_lessons WHERE lesson_id = ? LIMIT 1").bind(lessonId).first<{ 1: number }>());
}

export async function archiveAdminLesson(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE lessons SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
}

export async function findAdminBlock(db: D1Database, id: number): Promise<AdminLessonBlock | null> {
  const row = await db.prepare("SELECT id, lesson_id, type, sort_order, data_json FROM lesson_blocks WHERE id = ?").bind(id).first<AdminBlockRow>();
  return row ? toAdminBlock(row) : null;
}

export async function createAdminBlock(db: D1Database, lessonId: number, input: BlockInput): Promise<number> {
  const row = await db.prepare(`INSERT INTO lesson_blocks (lesson_id, type, sort_order, data_json, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`)
    .bind(lessonId, input.type, input.sortOrder, JSON.stringify(input.data)).first<{ id: number }>();
  const id = row!.id;
  await replaceBlockAssetLink(db, id, input);
  return id;
}

export async function blockSortOrderExists(db: D1Database, lessonId: number, sortOrder: number, exceptId?: number): Promise<boolean> {
  const query = exceptId === undefined
    ? "SELECT 1 FROM lesson_blocks WHERE lesson_id = ? AND sort_order = ? LIMIT 1"
    : "SELECT 1 FROM lesson_blocks WHERE lesson_id = ? AND sort_order = ? AND id != ? LIMIT 1";
  const values = exceptId === undefined ? [lessonId, sortOrder] : [lessonId, sortOrder, exceptId];
  return Boolean(await db.prepare(query).bind(...values).first<{ 1: number }>());
}

export async function blockSortOrderConflict(db: D1Database, blockId: number, sortOrder: number): Promise<boolean> {
  return Boolean(await db.prepare(`SELECT 1 FROM lesson_blocks
    WHERE lesson_id = (SELECT lesson_id FROM lesson_blocks WHERE id = ?)
      AND sort_order = ? AND id != ? LIMIT 1`).bind(blockId, sortOrder, blockId).first<{ 1: number }>());
}

export async function updateAdminBlock(db: D1Database, id: number, input: BlockInput): Promise<void> {
  await db.prepare("UPDATE lesson_blocks SET type = ?, sort_order = ?, data_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(input.type, input.sortOrder, JSON.stringify(input.data), id).run();
  await replaceBlockAssetLink(db, id, input);
}

export async function deleteAdminBlock(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM lesson_blocks WHERE id = ?").bind(id).run();
}

function linkedAssetId(input: BlockInput): number | null {
  if ((input.type !== "image" && input.type !== "file") || !input.data || typeof input.data !== "object") return null;
  const value = (input.data as Record<string, unknown>).assetId;
  return typeof value === "number" && Number.isInteger(value) && value > 0 ? value : null;
}

async function replaceBlockAssetLink(db: D1Database, blockId: number, input: BlockInput): Promise<void> {
  const assetId = linkedAssetId(input);
  const statements = [db.prepare("DELETE FROM asset_links WHERE lesson_block_id = ?").bind(blockId)];
  if (assetId) statements.push(db.prepare("INSERT INTO asset_links (asset_id, lesson_block_id) VALUES (?, ?)").bind(assetId, blockId));
  await db.batch(statements);
}

export async function listAdminBlockIds(db: D1Database, lessonId: number): Promise<number[]> {
  const result = await db.prepare("SELECT id FROM lesson_blocks WHERE lesson_id = ? ORDER BY sort_order, id").bind(lessonId).all<{ id: number }>();
  return result.results.map((row) => row.id);
}

export async function reorderAdminBlocks(db: D1Database, orderedIds: number[]): Promise<void> {
  // Use an unused negative range first so the per-lesson UNIQUE sort constraint is never transiently violated.
  await db.batch(orderedIds.map((id) => db.prepare("UPDATE lesson_blocks SET sort_order = -1000000000 - id WHERE id = ?").bind(id)));
  await db.batch(orderedIds.map((id, sortOrder) => db.prepare("UPDATE lesson_blocks SET sort_order = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(sortOrder + 1, id)));
}

export async function listAdminQuestions(db: D1Database, filters: QuestionFilters): Promise<AdminQuestion[]> {
  const clauses: string[] = [];
  const values: unknown[] = [];
  if (filters.courseId) { clauses.push("q.course_id = ?"); values.push(filters.courseId); }
  if (filters.type) { clauses.push("q.type = ?"); values.push(filters.type); }
  if (filters.difficulty) { clauses.push("q.difficulty = ?"); values.push(filters.difficulty); }
  if (filters.status) { clauses.push("q.status = ?"); values.push(filters.status); }
  if (filters.search) {
    clauses.push("q.prompt_json LIKE ? ESCAPE '\\'");
    values.push(`%${filters.search.replace(/[\\%_]/g, "\\$&")}%`);
  }
  if (filters.lessonId) {
    clauses.push("EXISTS (SELECT 1 FROM question_lessons filter_ql WHERE filter_ql.question_id = q.id AND filter_ql.lesson_id = ?)");
    values.push(filters.lessonId);
  }
  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const result = await db.prepare(`SELECT q.id, q.course_id, q.type, q.prompt_json, q.answer_json, q.explanation_json,
    q.difficulty, q.status, q.created_at, q.updated_at FROM questions q ${where} ORDER BY q.updated_at DESC, q.id DESC`)
    .bind(...values).all<AdminQuestionRow>();
  const mappings = await questionLessonIds(db, result.results.map((row) => row.id));
  return result.results.flatMap((row) => {
    const question = toAdminQuestion(row, mappings.get(row.id) ?? []);
    return question ? [question] : [];
  });
}

async function questionLessonIds(db: D1Database, questionIds: number[]): Promise<Map<number, number[]>> {
  const mappings = new Map<number, number[]>();
  if (!questionIds.length) return mappings;
  const placeholders = questionIds.map(() => "?").join(", ");
  const result = await db.prepare(`SELECT question_id, lesson_id FROM question_lessons
    WHERE question_id IN (${placeholders}) ORDER BY question_id, lesson_id`).bind(...questionIds).all<{ question_id: number; lesson_id: number }>();
  for (const row of result.results) mappings.set(row.question_id, [...(mappings.get(row.question_id) ?? []), row.lesson_id]);
  return mappings;
}

export async function findAdminQuestion(db: D1Database, id: number): Promise<AdminQuestion | null> {
  const row = await db.prepare(`SELECT id, course_id, type, prompt_json, answer_json, explanation_json, difficulty, status, created_at, updated_at
    FROM questions WHERE id = ?`).bind(id).first<AdminQuestionRow>();
  if (!row) return null;
  const mappings = await questionLessonIds(db, [id]);
  return toAdminQuestion(row, mappings.get(id) ?? []);
}

export async function createAdminQuestion(db: D1Database, input: QuestionInput): Promise<number> {
  const row = await db.prepare(`INSERT INTO questions
    (course_id, type, prompt_json, answer_json, explanation_json, difficulty, status, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP) RETURNING id`)
    .bind(input.courseId, input.type, JSON.stringify(input.prompt), JSON.stringify(input.answer), JSON.stringify(input.explanation), input.difficulty, input.status)
    .first<{ id: number }>();
  const id = row!.id;
  await replaceQuestionLessons(db, id, input.lessonIds);
  return id;
}

export async function updateAdminQuestion(db: D1Database, id: number, input: QuestionInput): Promise<void> {
  await db.prepare(`UPDATE questions SET course_id = ?, type = ?, prompt_json = ?, answer_json = ?, explanation_json = ?,
    difficulty = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`)
    .bind(input.courseId, input.type, JSON.stringify(input.prompt), JSON.stringify(input.answer), JSON.stringify(input.explanation), input.difficulty, input.status, id).run();
  await replaceQuestionLessons(db, id, input.lessonIds);
}

async function replaceQuestionLessons(db: D1Database, questionId: number, lessonIds: number[]): Promise<void> {
  const statements = [db.prepare("DELETE FROM question_lessons WHERE question_id = ?").bind(questionId)];
  for (const lessonId of lessonIds) statements.push(db.prepare("INSERT INTO question_lessons (question_id, lesson_id) VALUES (?, ?)").bind(questionId, lessonId));
  await db.batch(statements);
}

export async function archiveAdminQuestion(db: D1Database, id: number): Promise<void> {
  await db.prepare("UPDATE questions SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id).run();
}

export async function courseExists(db: D1Database, id: number): Promise<boolean> {
  return Boolean(await db.prepare("SELECT id FROM courses WHERE id = ?").bind(id).first<{ id: number }>());
}

export async function lessonIdsBelongToCourse(db: D1Database, lessonIds: number[], courseId: number): Promise<boolean> {
  if (!lessonIds.length) return true;
  const placeholders = lessonIds.map(() => "?").join(", ");
  const result = await db.prepare(`SELECT id FROM lessons WHERE course_id = ? AND id IN (${placeholders})`).bind(courseId, ...lessonIds).all<{ id: number }>();
  return result.results.length === lessonIds.length;
}

const assetColumns = `a.id, a.key, a.mime_type, a.metadata_json, a.created_at,
  (SELECT COUNT(*) FROM asset_links al WHERE al.asset_id = a.id) AS linked_block_count`;

export async function listAdminAssets(db: D1Database): Promise<AdminAsset[]> {
  const result = await db.prepare(`SELECT ${assetColumns} FROM assets a ORDER BY a.created_at DESC, a.id DESC`).all<AdminAssetRow>();
  return result.results.flatMap((row) => {
    const asset = toAdminAsset(row);
    return asset ? [{ id: asset.id, kind: asset.kind, fileName: asset.fileName, mimeType: asset.mimeType, size: asset.size, url: asset.url, createdAt: asset.createdAt, linkedBlockCount: asset.linkedBlockCount }] : [];
  });
}

export async function findStoredAsset(db: D1Database, id: number): Promise<StoredAsset | null> {
  const row = await db.prepare(`SELECT ${assetColumns} FROM assets a WHERE a.id = ?`).bind(id).first<AdminAssetRow>();
  return row ? toAdminAsset(row) : null;
}

/**
 * Public delivery is deliberately limited to assets referenced by a published
 * lesson in a published course. Draft and orphaned uploads remain available
 * to administrators through the authenticated fallback in the asset route.
 */
export async function findPublishedStoredAsset(db: D1Database, id: number): Promise<StoredAsset | null> {
  const row = await db.prepare(`SELECT ${assetColumns} FROM assets a
    WHERE a.id = ?
      AND EXISTS (
        SELECT 1
        FROM asset_links al
        INNER JOIN lesson_blocks lb ON lb.id = al.lesson_block_id
        INNER JOIN lessons l ON l.id = lb.lesson_id
        INNER JOIN courses c ON c.id = l.course_id
        WHERE al.asset_id = a.id
          AND l.status = 'published'
          AND c.status = 'published'
      )`).bind(id).first<AdminAssetRow>();
  return row ? toAdminAsset(row) : null;
}

export async function createAdminAsset(db: D1Database, input: AssetInput): Promise<number> {
  const row = await db.prepare(`INSERT INTO assets (key, mime_type, metadata_json)
    VALUES (?, ?, ?) RETURNING id`).bind(input.key, input.mimeType, JSON.stringify({ kind: input.kind, fileName: input.fileName, size: input.size })).first<{ id: number }>();
  return row!.id;
}

export async function deleteAdminAsset(db: D1Database, id: number): Promise<void> {
  await db.prepare("DELETE FROM assets WHERE id = ?").bind(id).run();
}

export async function assetIsLinked(db: D1Database, id: number): Promise<boolean> {
  return Boolean(await db.prepare("SELECT 1 FROM asset_links WHERE asset_id = ? LIMIT 1").bind(id).first<{ 1: number }>());
}
