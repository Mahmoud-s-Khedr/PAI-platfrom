import type { Course, Lesson, LessonBlock, LessonSummary, LocalizedText, Question, QuestionDifficulty, QuestionType } from "../../src/lib/types";
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

const localizedTextSchema = z.object({ ar: z.string(), en: z.string() });
const lessonBlockTypeSchema = z.enum(["rich-text", "image", "code", "callout", "interactive"]);
const blockDataSchemas = {
  "rich-text": localizedTextSchema,
  image: z.object({
    src: z.string(),
    alt: localizedTextSchema.optional(),
    caption: localizedTextSchema.optional(),
  }),
  code: z.object({ language: z.string().optional(), code: z.string() }),
  callout: localizedTextSchema.extend({ tone: z.string().optional() }),
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

function validQuestions(rows: QuestionRow[]): Question[] {
  return rows.flatMap((row) => {
    const question = toQuestion(row);
    return question ? [question] : [];
  });
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

export async function listQuestionsForLessons(db: D1Database, lessonIds: number[]): Promise<Question[]> {
  const placeholders = lessonIds.map(() => "?").join(", ");
  const result = await db.prepare(`SELECT DISTINCT q.id, q.course_id, q.type, q.prompt_json, q.answer_json, q.explanation_json, q.difficulty
    FROM questions q
    INNER JOIN question_lessons ql ON ql.question_id = q.id
    INNER JOIN lessons l ON l.id = ql.lesson_id
    INNER JOIN courses c ON c.id = l.course_id
    WHERE q.status = 'published' AND l.status = 'published' AND c.status = 'published'
      AND q.course_id = l.course_id AND ql.lesson_id IN (${placeholders})
    ORDER BY q.id`).bind(...lessonIds).all<QuestionRow>();
  return validQuestions(result.results);
}

// Course queries intentionally include both mapped questions and zero-mapping (course-wide) questions.
export async function listQuestionsForCourse(db: D1Database, courseId: number): Promise<Question[]> {
  const result = await db.prepare(`SELECT id, course_id, type, prompt_json, answer_json, explanation_json, difficulty
    FROM questions WHERE course_id = ? AND status = 'published' ORDER BY id`).bind(courseId).all<QuestionRow>();
  return validQuestions(result.results);
}
