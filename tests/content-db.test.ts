import { describe, expect, it } from "vitest";
import { isSupportedLessonBlockType } from "../src/lesson-blocks/lesson-block";
import { findPublishedLesson, listPublishedLessons, listQuestionsForCourse, listQuestionsForLessons, toBlock, toLesson, toQuestion } from "../worker/db/content";

class CapturingDb {
  query = "";
  queries: string[] = [];
  values: unknown[] = [];
  constructor(private readonly rows: Record<string, unknown>[]) {}
  prepare(query: string) {
    this.query = query;
    this.queries.push(query);
    return {
      bind: (...values: unknown[]) => {
        this.values = values;
        return {
          all: async () => ({ results: this.rows }),
          first: async () => this.rows[0] ?? null,
        };
      },
    };
  }
}

describe("content data access", () => {
  it("requests course lessons in sort order and preserves that order", async () => {
    const db = new CapturingDb([
      { id: 2, course_id: 1, slug: "second", title_ar: "٢", title_en: "Second", youtube_video_id: null, sort_order: 1 },
      { id: 1, course_id: 1, slug: "first", title_ar: "١", title_en: "First", youtube_video_id: null, sort_order: 2 },
    ]);
    const lessons = await listPublishedLessons(db as unknown as D1Database, 1);
    expect(db.query).toContain("ORDER BY sort_order, id");
    expect(lessons.map((lesson) => lesson.slug)).toEqual(["second", "first"]);
  });
  it("returns lesson blocks in the supplied ordered sequence", () => {
    const lesson = toLesson({ id: 1, course_id: 1, slug: "demo", title_ar: "تجريبي", title_en: "Demo", youtube_video_id: null, sort_order: 1 }, [
      { id: 2, type: "code", data_json: '{"code":"print(1)"}' },
      { id: 3, type: "interactive", data_json: '{"component":"binary-converter","props":{}}' },
    ]);
    expect(lesson.blocks.map((block) => block.type)).toEqual(["code", "interactive"]);
  });
  it("contains malformed block JSON instead of exposing it as trusted data", () => {
    expect(toBlock({ id: 1, type: "code", data_json: '{"code":false}' }).data).toBeNull();
    expect(toBlock({ id: 2, type: "code", data_json: "not-json" }).data).toBeNull();
    expect(toBlock({ id: 2, type: "future-block", data_json: "{}" })).toMatchObject({ type: "future-block", data: null });
  });
  it("requires a published parent course when loading a published lesson directly", async () => {
    const db = new CapturingDb([{ id: 1, course_id: 1, slug: "demo", title_ar: "تجريبي", title_en: "Demo", youtube_video_id: null, sort_order: 1 }]);
    await findPublishedLesson(db as unknown as D1Database, 1);
    expect(db.queries[0]).toContain("INNER JOIN courses c");
    expect(db.queries[0]).toContain("c.status = 'published'");
  });
  it("uses DISTINCT for multiple lesson question scopes", async () => {
    const db = new CapturingDb([{ id: 8, course_id: 1, type: "mcq", prompt_json: '{"ar":"س","en":"Q"}', answer_json: '{"choices":{"ar":["أ"],"en":["A"]},"correctIndex":0}', explanation_json: '{"ar":"ش","en":"E"}', difficulty: "easy" }]);
    const questions = await listQuestionsForLessons(db as unknown as D1Database, [1, 2]);
    expect(db.query).toContain("SELECT DISTINCT");
    expect(db.query).toContain("INNER JOIN lessons l");
    expect(db.query).toContain("INNER JOIN courses c");
    expect(db.query).toContain("q.course_id = l.course_id");
    expect(db.query).toContain("l.status = 'published'");
    expect(db.query).toContain("c.status = 'published'");
    expect(db.values).toEqual([1, 2]);
    expect(questions).toHaveLength(1);
  });
  it("includes a course-wide question in a course query", async () => {
    const db = new CapturingDb([{ id: 4, course_id: 1, type: "true_false", prompt_json: '{"ar":"س","en":"Q"}', answer_json: '{"correct":true}', explanation_json: '{"ar":"ش","en":"E"}', difficulty: "easy" }]);
    const questions = await listQuestionsForCourse(db as unknown as D1Database, 1);
    expect(db.query).not.toContain("question_lessons");
    expect(questions[0].id).toBe(4);
  });
  it("omits questions with malformed stored JSON", () => {
    const row = { id: 1, course_id: 1, type: "mcq", prompt_json: '{"ar":"س","en":"Q"}', answer_json: '{"choices":{"ar":["أ"],"en":["A"]},"correctIndex":2}', explanation_json: '{"ar":"ش","en":"E"}', difficulty: "easy" };
    expect(toQuestion(row)).toBeNull();
    expect(toQuestion({ ...row, answer_json: "not-json" })).toBeNull();
  });
  it("marks unsupported blocks for graceful fallback", () => {
    expect(isSupportedLessonBlockType("rich-text")).toBe(true);
    expect(isSupportedLessonBlockType("video-script")).toBe(false);
  });
});
