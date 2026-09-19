import type { Course, Lesson, LessonBlock, LessonSummary, LocalizedText, Question, QuestionType } from "../../src/lib/types";
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
  type: QuestionType;
  prompt_json: string;
  answer_json: string;
  explanation_json: string;
  difficulty: string;
}

function localized(value: unknown): LocalizedText {
  if (typeof value !== "object" || value === null) return { ar: "", en: "" };
  const input = value as Record<string, unknown>;
  return {
    ar: typeof input.ar === "string" ? input.ar : "",
    en: typeof input.en === "string" ? input.en : "",
  };
}

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
  return { id: row.id, type: row.type, data: parseJson(row.data_json) };
}

export function toLesson(row: LessonRow, blocks: BlockRow[]): Lesson {
  return { ...toLessonSummary(row), blocks: blocks.map(toBlock) };
}

export function toQuestion(row: QuestionRow): Question {
  return {
    id: row.id,
    courseId: row.course_id,
    type: row.type,
    prompt: localized(parseJson(row.prompt_json)),
    answer: parseJson(row.answer_json),
    explanation: localized(parseJson(row.explanation_json)),
    difficulty: row.difficulty,
  };
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
  return result.results.map(toQuestion);
}

// Course queries intentionally include both mapped questions and zero-mapping (course-wide) questions.
export async function listQuestionsForCourse(db: D1Database, courseId: number): Promise<Question[]> {
  const result = await db.prepare(`SELECT id, course_id, type, prompt_json, answer_json, explanation_json, difficulty
    FROM questions WHERE course_id = ? AND status = 'published' ORDER BY id`).bind(courseId).all<QuestionRow>();
  return result.results.map(toQuestion);
}
