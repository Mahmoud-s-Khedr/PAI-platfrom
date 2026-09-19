import { describe, expect, it } from "vitest";
import { app } from "../worker/index";
import { listAdminDashboard } from "../worker/db/admin";

class AdminDb {
  constructor(private readonly role: "admin" | "student") {}
  queries: string[] = [];
  values: unknown[][] = [];
  prepare(query: string) {
    this.queries.push(query);
    return { bind: (...values: unknown[]) => {
      this.values.push(values);
      return {
        first: async () => query.includes("FROM sessions") ? ({ id: 1, email: "person@example.com", display_name: "Person", role: this.role }) : null,
        all: async () => query.includes("FROM question_lessons") ? { results: [] } : { results: [{ id: 3, course_id: 1, type: "true_false", prompt_json: '{"ar":"س","en":"Question"}', answer_json: '{"correct":true}', explanation_json: '{"ar":"ش","en":"Explanation"}', difficulty: "beginner", status: "draft", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-02 00:00:00" }] },
      };
    } };
  }
}

const sessionHeaders = { Cookie: "pai_session=test-session" };

class InvariantDb {
  prepare(query: string) {
    return { bind: () => ({
      first: async () => {
        if (query.includes("FROM sessions")) return { id: 1, email: "admin@example.com", display_name: "Admin", role: "admin" };
        if (query.includes("FROM lessons WHERE id")) return { id: 4, course_id: 1, slug: "lesson", title_ar: "درس", title_en: "Lesson", youtube_video_id: null, sort_order: 1, status: "draft", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" };
        if (query.includes("FROM courses WHERE id")) return { id: 2 };
        if (query.includes("FROM question_lessons WHERE lesson_id")) return { 1: 1 };
        if (query.includes("FROM lesson_blocks WHERE lesson_id") && query.includes("sort_order")) return { 1: 1 };
        return null;
      },
      all: async () => ({ results: [] }),
      run: async () => ({}),
    }) };
  }
}

describe("admin API protection", () => {
  it("returns 401 without a session", async () => {
    const response = await app.request("http://test/api/admin/courses");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: { code: "ADMIN_AUTH_REQUIRED", message: "Administrator authentication is required" } });
  });

  it("returns 403 to an authenticated student", async () => {
    const response = await app.request("http://test/api/admin/courses", { headers: sessionHeaders }, { DB: new AdminDb("student") } as unknown as Cloudflare.Env);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "ADMIN_ACCESS_DENIED", message: "Administrator access is required" } });
  });

  it("denies the Worker-first admin shell to a signed-in student", async () => {
    const response = await app.request("http://test/admin", { headers: sessionHeaders }, { DB: new AdminDb("student") } as unknown as Cloudflare.Env);
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain("Access denied");
  });

  it("allows an admin session and validates writes after authorization", async () => {
    const env = { DB: new AdminDb("admin") } as unknown as Cloudflare.Env;
    const response = await app.request("http://test/api/admin/courses", { method: "POST", headers: { ...sessionHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ slug: "Invalid Capitalization" }) }, env);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "INVALID_REQUEST_BODY", message: "Request body is invalid" } });
  });

  it("supports escaped prompt search only for an admin session", async () => {
    const db = new AdminDb("admin");
    const response = await app.request("http://test/api/admin/questions?search=100%_match", { headers: sessionHeaders }, { DB: db } as unknown as Cloudflare.Env);
    expect(response.status).toBe(200);
    const searchIndex = db.queries.findIndex((query) => query.includes("LIKE ? ESCAPE"));
    expect(db.queries[searchIndex]).toContain("LIKE ? ESCAPE");
    expect(db.values[searchIndex]).toEqual(["%100\\%\\_match%"]);
    await expect(response.json()).resolves.toEqual([expect.objectContaining({ id: 3, status: "draft", lessonIds: [] })]);
  });

  it("rejects moving a lesson with mapped questions to another course", async () => {
    const response = await app.request("http://test/api/admin/lessons/4", {
      method: "PATCH",
      headers: { ...sessionHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ courseId: 2 }),
    }, { DB: new InvariantDb() } as unknown as Cloudflare.Env);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT", message: "Unmap lesson questions before moving this lesson to another course" } });
  });

  it("returns a conflict instead of a database error for an occupied block sort order", async () => {
    const response = await app.request("http://test/api/admin/lessons/4/blocks", {
      method: "POST",
      headers: { ...sessionHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rich-text", data: { ar: "نص", en: "Text" }, sortOrder: 1 }),
    }, { DB: new InvariantDb() } as unknown as Cloudflare.Env);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "BLOCK_SORT_ORDER_CONFLICT", message: "Another block already uses this sort order" } });
  });
});

describe("admin dashboard mapping", () => {
  it("keeps course and lesson ordering while separating course-wide and lesson-mapped counts", async () => {
    const db = {
      prepare: (query: string) => ({ query }),
      batch: async () => [{ results: [{ id: 2, slug: "second", title_ar: "الثاني", title_en: "Second", description_ar: "", description_en: "", status: "draft", sort_order: 2, lesson_count: 1, question_count: 5, created_at: "2026-01-01 00:00:00", updated_at: "2026-01-03 00:00:00" }] }, { results: [{ id: 8, course_id: 2, slug: "lesson", title_ar: "درس", title_en: "Lesson", youtube_video_id: null, sort_order: 1, status: "archived", direct_question_count: 2, created_at: "2026-01-01 00:00:00", updated_at: "2026-01-02 00:00:00" }] }],
    } as unknown as D1Database;
    const dashboard = await listAdminDashboard(db);
    expect(dashboard).toEqual({ courses: [expect.objectContaining({ questionCount: 5, status: "draft", lessons: [expect.objectContaining({ directQuestionCount: 2, status: "archived" })] })] });
  });
});
