import { calloutTones, type Course, type Lesson, type LessonBlock, type LessonSummary, type LocalizedText, type Question, type QuestionDifficulty, type QuestionQueryOptions, type QuestionType, type SearchLessonResult, type SearchQuestionResult, type SearchResults } from "../../src/lib/types";
import { z } from "zod";
import { parseJson } from "../lib/json";

interface CourseRow extends Record<string, unknown> {
  id: number;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string;
  description_en: string;
  sort_order: number;
}

interface LessonRow extends Record<string, unknown> {
  id: number;
  course_id: number;
  slug: string;
  title_ar: string;
  title_en: string;
  youtube_video_id: string | null;
  sort_order: number;
}

interface BlockRow extends Record<string, unknown> {
  id: number;
  type: string;
  data_json: string;
}

interface QuestionRow extends Record<string, unknown> {
  id: number;
  course_id: number;
  type: string;
  prompt_json: string;
  answer_json: string;
  explanation_json: string;
  difficulty: string;
}

interface SearchLessonRow extends LessonRow {
  course_slug: string;
  course_title_ar: string;
  course_title_en: string;
}

interface SearchQuestionRow extends Record<string, unknown> {
  id: number;
  prompt_json: string;
  difficulty: string;
  course_slug: string;
  course_title_ar: string;
  course_title_en: string;
}

export interface SitemapEntry {
  courseSlug: string;
  lessonSlug: string | null;
}

const localizedTextSchema = z.object({ ar: z.string(), en: z.string() });
const lessonBlockTypeSchema = z.enum(["rich-text", "image", "file", "code", "callout", "interactive"]);
const blockDataSchemas = {
  "rich-text": localizedTextSchema,
  image: z.object({
    src: z.string(),
    assetId: z.number().int().positive().optional(),
    alt: localizedTextSchema.optional(),
    caption: localizedTextSchema.optional(),
  }),
  file: z.object({
    assetId: z.number().int().positive(),
    title: localizedTextSchema,
    description: localizedTextSchema.optional(),
  }),
  code: z.object({ language: z.string().optional(), code: z.string() }),
  // `info` was used by the original development fixture. Normalize it on read
  // so old local D1 state remains usable while new admin writes use the five
  // supported tones below.
  callout: localizedTextSchema.extend({
    tone: z.union([z.enum(calloutTones), z.literal("info")]).optional()
      .transform((tone) => tone === "info" ? "key-concept" : tone),
  }),
  interactive: z.object({ component: z.string(), props: z.record(z.string(), z.unknown()).optional() }),
} satisfies Record<z.infer<typeof lessonBlockTypeSchema>, z.ZodType>;

const questionTypeSchema = z.enum(["mcq", "true_false", "short_answer"]);
const questionDifficultySchema = z.enum(["easy", "medium", "hard"]);
const mcqAnswerSchema = z.object({
  choices: z.object({ ar: z.array(z.string()).min(1), en: z.array(z.string()).min(1) }),
  correctIndex: z.number().int().nonnegative(),
}).superRefine((answer, context) => {
  if (answer.correctIndex >= answer.choices.ar.length || answer.correctIndex >= answer.choices.en.length) {
    context.addIssue({ code: "custom", message: "correctIndex must exist in both localized choice lists" });
  }
});
const answerSchemas = {
  mcq: mcqAnswerSchema,
  true_false: z.object({ correct: z.boolean() }),
  short_answer: z.object({ acceptedAnswers: z.array(z.string()).min(1) }),
} satisfies Record<QuestionType, z.ZodType>;

export function toCourse(row: CourseRow): Course {
  return {
    id: row.id,
    slug: row.slug,
    title: { ar: row.title_ar, en: row.title_en },
    description: { ar: row.description_ar, en: row.description_en },
    sortOrder: row.sort_order,
  };
}

export function toLessonSummary(row: LessonRow): LessonSummary {
  return {
    id: row.id,
    courseId: row.course_id,
    slug: row.slug,
    title: { ar: row.title_ar, en: row.title_en },
    youtubeVideoId: row.youtube_video_id,
    sortOrder: row.sort_order,
  };
}

export function toBlock(row: BlockRow): LessonBlock {
  const rawType = typeof row.type === "string" ? row.type : "unknown";
  const type = lessonBlockTypeSchema.safeParse(rawType);
  if (!type.success) return { id: row.id, type: rawType, data: null };
  const data = blockDataSchemas[type.data].safeParse(parseJson(row.data_json));
  return { id: row.id, type: type.data, data: data.success ? data.data : null };
}

export function toLesson(row: LessonRow, blocks: BlockRow[]): Lesson {
  return { ...toLessonSummary(row), blocks: blocks.map(toBlock) };
}

export function toQuestion(row: QuestionRow): Question | null {
  const type = questionTypeSchema.safeParse(row.type);
  if (!type.success) return null;
  const prompt = localizedTextSchema.safeParse(parseJson(row.prompt_json));
  const answer = answerSchemas[type.data].safeParse(parseJson(row.answer_json));
  const explanation = localizedTextSchema.safeParse(parseJson(row.explanation_json));
  const difficulty = questionDifficultySchema.safeParse(row.difficulty);
  if (!prompt.success || !answer.success || !explanation.success || !difficulty.success) return null;
  return {
    id: row.id,
    courseId: row.course_id,
    type: type.data,
    prompt: prompt.data,
    answer: answer.data,
    explanation: explanation.data,
    difficulty: difficulty.data,
  };
}

function toSearchQuestion(row: SearchQuestionRow): SearchQuestionResult | null {
  const prompt = localizedTextSchema.safeParse(parseJson(row.prompt_json));
  const difficulty = questionDifficultySchema.safeParse(row.difficulty);
  if (!prompt.success || !difficulty.success) return null;
  return {
    id: row.id,
    courseSlug: row.course_slug,
    courseTitle: { ar: row.course_title_ar, en: row.course_title_en },
    prompt: prompt.data,
    difficulty: difficulty.data,
  };
}

function validQuestions(rows: QuestionRow[]): Question[] {
  return rows.flatMap((row) => {
    const question = toQuestion(row);
    return question ? [question] : [];
  });
}

interface QuestionQuery {
  from: string;
  conditions: string[];
  values: unknown[];
  distinct?: boolean;
}

const questionColumns = "q.id, q.course_id, q.type, q.prompt_json, q.answer_json, q.explanation_json, q.difficulty";

function questionWhere(query: QuestionQuery, difficulty?: QuestionDifficulty) {
  return difficulty ? [...query.conditions, "q.difficulty = ?"] : query.conditions;
}

function questionValues(query: QuestionQuery, difficulty?: QuestionDifficulty) {
  return difficulty ? [...query.values, difficulty] : query.values;
}

function questionSelect(query: QuestionQuery, where: string[], suffix = "") {
  return `SELECT ${query.distinct ? "DISTINCT " : ""}${questionColumns}\n    ${query.from}\n    WHERE ${where.join(" AND ")} ${suffix}`;
}

async function questionRows(db: D1Database, query: QuestionQuery, options: QuestionQueryOptions): Promise<QuestionRow[]> {
  const where = questionWhere(query, options.difficulty);
  const values = questionValues(query, options.difficulty);
  const limit = options.limit;

  if (!options.random) {
    const suffix = `ORDER BY q.id${limit ? " LIMIT ?" : ""}`;
    const result = await db.prepare(questionSelect(query, where, suffix)).bind(...values, ...(limit ? [limit] : [])).all<QuestionRow>();
    return result.results;
  }

  // This deliberately uses a random ID pivot plus two bounded, ordered seeks.
  // Unlike ORDER BY RANDOM(), it never sorts the entire matching question set.
  const max = await db.prepare(`SELECT q.id AS max_id\n    ${query.from}\n    WHERE ${where.join(" AND ")}\n    ORDER BY q.id DESC LIMIT 1`).bind(...values).first<{ max_id: number | null }>();
  if (!max?.max_id || !limit) return [];
  const pivot = Math.floor((crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32) * (max.max_id + 1));
  const after = await db.prepare(questionSelect(query, [...where, "q.id >= ?"], "ORDER BY q.id LIMIT ?"))
    .bind(...values, pivot, limit).all<QuestionRow>();
  if (after.results.length >= limit) return after.results;
  const before = await db.prepare(questionSelect(query, [...where, "q.id < ?"], "ORDER BY q.id LIMIT ?"))
    .bind(...values, pivot, limit - after.results.length).all<QuestionRow>();
  return [...after.results, ...before.results];
}

export async function listPublishedCourses(db: D1Database): Promise<Course[]> {
  const result = await db.prepare(`SELECT id, slug, title_ar, title_en, description_ar, description_en, sort_order
    FROM courses WHERE status = 'published' ORDER BY sort_order, id`).all<CourseRow>();
  return result.results.map(toCourse);
}

export async function findPublishedCourse(db: D1Database, slug: string): Promise<Course | null> {
  const row = await db.prepare(`SELECT id, slug, title_ar, title_en, description_ar, description_en, sort_order
    FROM courses WHERE slug = ? AND status = 'published'`).bind(slug).first<CourseRow>();
  return row ? toCourse(row) : null;
}

export async function listPublishedLessons(db: D1Database, courseId: number): Promise<LessonSummary[]> {
  const result = await db.prepare(`SELECT id, course_id, slug, title_ar, title_en, youtube_video_id, sort_order
    FROM lessons WHERE course_id = ? AND status = 'published' ORDER BY sort_order, id`).bind(courseId).all<LessonRow>();
  return result.results.map(toLessonSummary);
}

function escapedLikeTerm(query: string): string {
  // Use ! as the SQL escape character. SQLite string literals do not treat a
  // backslash specially, so using it here is easy to get subtly wrong.
  return `%${query.replace(/[!%_]/g, "!$&")}%`;
}

/**
 * A deliberately bounded D1 search for navigation. It is not a separate search
 * service: titles, descriptions, lesson blocks, and prompts remain the source
 * of truth, and only published content is returned.
 */
export async function searchPublishedContent(db: D1Database, query: string): Promise<SearchResults> {
  const term = escapedLikeTerm(query);
  const courseMatches = await db.prepare(`SELECT id, slug, title_ar, title_en, description_ar, description_en, sort_order
    FROM courses
    WHERE status = 'published'
      AND (title_ar LIKE ? ESCAPE '!' OR title_en LIKE ? ESCAPE '!' OR description_ar LIKE ? ESCAPE '!' OR description_en LIKE ? ESCAPE '!')
    ORDER BY sort_order, id LIMIT 12`).bind(term, term, term, term).all<CourseRow>();
  const lessonMatches = await db.prepare(`SELECT DISTINCT l.id, l.course_id, l.slug, l.title_ar, l.title_en, l.youtube_video_id, l.sort_order,
      c.slug AS course_slug, c.title_ar AS course_title_ar, c.title_en AS course_title_en
    FROM lessons l
    INNER JOIN courses c ON c.id = l.course_id
    LEFT JOIN lesson_blocks b ON b.lesson_id = l.id
    WHERE l.status = 'published' AND c.status = 'published'
      AND (l.title_ar LIKE ? ESCAPE '!' OR l.title_en LIKE ? ESCAPE '!' OR b.data_json LIKE ? ESCAPE '!')
    ORDER BY l.sort_order, l.id LIMIT 20`).bind(term, term, term).all<SearchLessonRow>();
  const questionMatches = await db.prepare(`SELECT q.id, q.prompt_json, q.difficulty,
      c.slug AS course_slug, c.title_ar AS course_title_ar, c.title_en AS course_title_en
    FROM questions q
    INNER JOIN courses c ON c.id = q.course_id
    WHERE q.status = 'published' AND c.status = 'published'
      AND q.prompt_json LIKE ? ESCAPE '!'
    ORDER BY q.id LIMIT 20`).bind(term).all<SearchQuestionRow>();
  return {
    courses: courseMatches.results.map(toCourse),
    lessons: lessonMatches.results.map((row) => ({
      ...toLessonSummary(row),
      courseSlug: row.course_slug,
      courseTitle: { ar: row.course_title_ar, en: row.course_title_en },
    })),
    questions: questionMatches.results.flatMap((row) => {
      const question = toSearchQuestion(row);
      return question ? [question] : [];
    }),
  };
}

export async function listPublishedSitemapEntries(db: D1Database): Promise<SitemapEntry[]> {
  const result = await db.prepare(`SELECT c.slug AS course_slug, l.slug AS lesson_slug
    FROM courses c
    LEFT JOIN lessons l ON l.course_id = c.id AND l.status = 'published'
    WHERE c.status = 'published'
    ORDER BY c.sort_order, c.id, l.sort_order, l.id`).all<{ course_slug: string; lesson_slug: string | null }>();
  return result.results.map((row) => ({ courseSlug: row.course_slug, lessonSlug: row.lesson_slug }));
}

export async function findPublishedLesson(db: D1Database, id: number): Promise<Lesson | null> {
  const lesson = await db.prepare(`SELECT l.id, l.course_id, l.slug, l.title_ar, l.title_en, l.youtube_video_id, l.sort_order
    FROM lessons l INNER JOIN courses c ON c.id = l.course_id
    WHERE l.id = ? AND l.status = 'published' AND c.status = 'published'`).bind(id).first<LessonRow>();
  if (!lesson) return null;
  const blocks = await db.prepare(`SELECT id, type, data_json FROM lesson_blocks
    WHERE lesson_id = ? ORDER BY sort_order, id`).bind(id).all<BlockRow>();
  return toLesson(lesson, blocks.results);
}

export async function findPublishedLessonBySlug(db: D1Database, courseId: number, slug: string): Promise<LessonSummary | null> {
  const row = await db.prepare(`SELECT l.id, l.course_id, l.slug, l.title_ar, l.title_en, l.youtube_video_id, l.sort_order
    FROM lessons l INNER JOIN courses c ON c.id = l.course_id
    WHERE l.course_id = ? AND l.slug = ? AND l.status = 'published' AND c.status = 'published'`).bind(courseId, slug).first<LessonRow>();
  return row ? toLessonSummary(row) : null;
}

export async function listQuestionsForLessons(db: D1Database, lessonIds: number[], options: QuestionQueryOptions = {}): Promise<Question[]> {
  const placeholders = lessonIds.map(() => "?").join(", ");
  const rows = await questionRows(db, {
    from: `FROM questions q
    INNER JOIN question_lessons ql ON ql.question_id = q.id
    INNER JOIN lessons l ON l.id = ql.lesson_id
    INNER JOIN courses c ON c.id = l.course_id`,
    conditions: ["q.status = 'published'", "l.status = 'published'", "c.status = 'published'", "q.course_id = l.course_id", `ql.lesson_id IN (${placeholders})`],
    values: lessonIds,
    distinct: true,
  }, options);
  return validQuestions(rows);
}

// Course queries intentionally include both mapped questions and zero-mapping (course-wide) questions.
export async function listQuestionsForCourse(db: D1Database, courseId: number, options: QuestionQueryOptions = {}): Promise<Question[]> {
  const rows = await questionRows(db, {
    from: "FROM questions q",
    conditions: ["q.course_id = ?", "q.status = 'published'"],
    values: [courseId],
  }, options);
  return validQuestions(rows);
}
