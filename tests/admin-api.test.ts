import { rateLimitBindings } from "./helpers/rate-limit";
import { describe, expect, it } from "vitest";
import { app } from "../worker/index";
import { findPublishedStoredAsset, listAdminDashboard } from "../worker/db/admin";

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
        all: async () => query.includes("FROM question_lessons") ? { results: [] } : { results: [{ id: 3, course_id: 1, type: "true_false", prompt_json: '{"ar":"س","en":"Question"}', answer_json: '{"correct":true}', explanation_json: '{"ar":"ش","en":"Explanation"}', difficulty: "easy", status: "draft", created_at: "2026-01-01 00:00:00", updated_at: "2026-01-02 00:00:00" }] },
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

class PublishingDb {
  private status = "draft";
  prepare(query: string) {
    return { bind: (...values: unknown[]) => ({
      first: async () => {
        if (query.includes("FROM sessions")) return { id: 1, email: "admin@example.com", display_name: "Admin", role: "admin" };
        if (query.includes("FROM lessons WHERE id")) return { id: 4, course_id: 1, slug: "pilot", title_ar: "درس", title_en: "Lesson", youtube_video_id: "abc123", sort_order: 1, status: this.status, created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" };
        if (query.includes("FROM courses WHERE id")) return { id: 1 };
        return null;
      },
      all: async () => {
        if (query.includes("FROM lesson_blocks")) return { results: [] };
        return { results: [] };
      },
      run: async () => { if (query.startsWith("UPDATE lessons SET")) this.status = String(values[6]); return {}; },
    }) };
  }
}

class CourseDeleteDb {
  queries: string[] = [];
  prepare(query: string) {
    this.queries.push(query);
    return {
      bind: () => ({
        first: async () => {
          if (query.includes("FROM sessions")) {
            return { id: 1, email: "admin@example.com", display_name: "Admin", role: "admin" };
          }
          if (query.includes("FROM courses c WHERE c.id")) {
            return { id: 7, slug: "removable", title_ar: "مقرر", title_en: "Course", description_ar: "", description_en: "", status: "draft", sort_order: 1, lesson_count: 0, question_count: 0, created_at: "2026-01-01 00:00:00", updated_at: "2026-01-01 00:00:00" };
          }
          return null;
        },
        run: async () => ({}),
      }),
    };
  }
}

describe("admin API protection", () => {
  it("returns 401 without a session", async () => {
    const response = await app.request("http://test/api/admin/courses");
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: { code: "ADMIN_AUTH_REQUIRED", message: "Administrator authentication is required" } });
  });

  it("returns 403 to an authenticated student", async () => {
    const response = await app.request("http://test/api/admin/courses", { headers: sessionHeaders }, { ...rateLimitBindings, DB: new AdminDb("student") } as unknown as Cloudflare.Env);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: { code: "ADMIN_ACCESS_DENIED", message: "Administrator access is required" } });
  });

  it("denies the Worker-first admin shell to a signed-in student", async () => {
    const response = await app.request("http://test/admin", { headers: sessionHeaders }, { ...rateLimitBindings, DB: new AdminDb("student") } as unknown as Cloudflare.Env);
    expect(response.status).toBe(403);
    await expect(response.text()).resolves.toContain("Access denied");
  });

  it("allows an admin session and validates writes after authorization", async () => {
    const env = { ...rateLimitBindings, DB: new AdminDb("admin") } as unknown as Cloudflare.Env;
    const response = await app.request("http://test/api/admin/courses", { method: "POST", headers: { ...sessionHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ slug: "Invalid Capitalization" }) }, env);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "INVALID_REQUEST_BODY", message: "Request body is invalid" } });
  });

  it("rejects an invalid asset upload before it can reach R2", async () => {
    const response = await app.request("http://test/api/admin/assets", { method: "POST", headers: { ...sessionHeaders, "Content-Type": "application/json" }, body: "{}" }, { ...rateLimitBindings, DB: new AdminDb("admin") } as unknown as Cloudflare.Env);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: { code: "INVALID_ASSET_UPLOAD", message: "Upload must be multipart form data" } });
  });

  it("supports escaped prompt search only for an admin session", async () => {
    const db = new AdminDb("admin");
    const response = await app.request("http://test/api/admin/questions?search=100%_match", { headers: sessionHeaders }, { ...rateLimitBindings, DB: db } as unknown as Cloudflare.Env);
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
    }, { ...rateLimitBindings, DB: new InvariantDb() } as unknown as Cloudflare.Env);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT", message: "Unmap lesson questions before moving this lesson to another course" } });
  });

  it("permanently deletes an existing course for an admin", async () => {
    const db = new CourseDeleteDb();
    const response = await app.request("http://test/api/admin/courses/7", {
      method: "DELETE",
      headers: sessionHeaders,
    }, { ...rateLimitBindings, DB: db } as unknown as Cloudflare.Env);
    expect(response.status).toBe(204);
    expect(db.queries).toContain("DELETE FROM courses WHERE id = ?");
  });

  it("returns a conflict instead of a database error for an occupied block sort order", async () => {
    const response = await app.request("http://test/api/admin/lessons/4/blocks", {
      method: "POST",
      headers: { ...sessionHeaders, "Content-Type": "application/json" },
      body: JSON.stringify({ type: "rich-text", data: { ar: "نص", en: "Text" }, sortOrder: 1 }),
    }, { ...rateLimitBindings, DB: new InvariantDb() } as unknown as Cloudflare.Env);
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: { code: "BLOCK_SORT_ORDER_CONFLICT", message: "Another block already uses this sort order" } });
  });

  it("rejects unsupported difficulty", async () => {
    const badDifficulty = await app.request("http://test/api/admin/questions", { method: "POST", headers: { ...sessionHeaders, "Content-Type": "application/json" }, body: JSON.stringify({ courseId: 1, type: "true_false", prompt: { ar: "س", en: "Q" }, answer: { correct: true }, explanation: { ar: "ش", en: "E" }, difficulty: "beginner", status: "draft", lessonIds: [] }) }, { ...rateLimitBindings, DB: new AdminDb("admin") } as unknown as Cloudflare.Env);
    expect(badDifficulty.status).toBe(400);
  });

  it("lets the sole admin publish a lesson without editorial self-approval", async () => {
    const base = { courseId: 1, slug: "pilot", title: { ar: "درس", en: "Lesson" }, youtubeVideoId: "abc123", status: "published", sortOrder: 1 };
    const published = await app.request("http://test/api/admin/lessons/4", { method: "PATCH", headers: { ...sessionHeaders, "Content-Type": "application/json" }, body: JSON.stringify(base) }, { ...rateLimitBindings, DB: new PublishingDb() } as unknown as Cloudflare.Env);
    expect(published.status).toBe(200);
    await expect(published.json()).resolves.toEqual(expect.objectContaining({ status: "published" }));
  });
});

describe("asset delivery", () => {
  it("streams only a D1-tracked image with defensive response headers", async () => {
    const db = {
      prepare: (query: string) => ({ bind: () => ({ first: async () => query.includes("FROM assets") ? ({ id: 9, key: "assets/image/00000000-0000-0000-0000-000000000000.png", mime_type: "image/png", metadata_json: '{"kind":"image","fileName":"safe.png","size":4}', created_at: "2026-01-01 00:00:00", linked_block_count: 0 }) : null }) }),
    } as unknown as D1Database;
    const bucket = { get: async () => ({ body: new Blob(["safe"]).stream(), httpEtag: '"etag"' }) } as unknown as R2Bucket;
    const response = await app.request("http://test/api/assets/9", undefined, { ...rateLimitBindings, DB: db, ASSET_BUCKET: bucket } as unknown as Cloudflare.Env);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toBe('inline; filename="safe.png"');
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    await expect(response.text()).resolves.toBe("safe");
  });

  it("limits anonymous delivery to assets linked from published content", async () => {
    const queries: string[] = [];
    const row = { id: 9, key: "assets/image/00000000-0000-0000-0000-000000000000.png", mime_type: "image/png", metadata_json: '{"kind":"image","fileName":"safe.png","size":4}', created_at: "2026-01-01 00:00:00", linked_block_count: 1 };
    const db = {
      prepare: (query: string) => {
        queries.push(query);
        return { bind: () => ({ first: async () => row }) };
      },
    } as unknown as D1Database;
    const asset = await findPublishedStoredAsset(db, 9);
    expect(asset).toMatchObject({ id: 9 });
    expect(queries[0]).toContain("FROM asset_links al");
    expect(queries[0]).toContain("l.status = 'published'");
    expect(queries[0]).toContain("c.status = 'published'");
  });

  it("does not read R2 for an anonymous request when no published link exists", async () => {
    let bucketRead = false;
    const db = {
      prepare: () => ({ bind: () => ({ first: async () => null }) }),
    } as unknown as D1Database;
    const bucket = { get: async () => { bucketRead = true; return null; } } as unknown as R2Bucket;
    const response = await app.request("http://test/api/assets/9", undefined, { ...rateLimitBindings, DB: db, ASSET_BUCKET: bucket } as unknown as Cloudflare.Env);
    expect(response.status).toBe(404);
    expect(bucketRead).toBe(false);
  });

  it("allows an authenticated administrator to preview an unlinked asset", async () => {
    const row = { id: 9, key: "assets/image/00000000-0000-0000-0000-000000000000.png", mime_type: "image/png", metadata_json: '{"kind":"image","fileName":"safe.png","size":4}', created_at: "2026-01-01 00:00:00", linked_block_count: 0 };
    const db = {
      prepare: (query: string) => ({ bind: () => ({ first: async () => {
        if (query.includes("INNER JOIN courses c")) return null;
        if (query.includes("FROM sessions")) return { id: 1, email: "admin@example.com", display_name: "Admin", role: "admin" };
        if (query.includes("FROM assets a")) return row;
        return null;
      } }) }),
    } as unknown as D1Database;
    const bucket = { get: async () => ({ body: new Blob(["safe"]).stream(), httpEtag: '"etag"' }) } as unknown as R2Bucket;
    const response = await app.request("http://test/api/assets/9", { headers: sessionHeaders }, { ...rateLimitBindings, DB: db, ASSET_BUCKET: bucket } as unknown as Cloudflare.Env);
    expect(response.status).toBe(200);
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
