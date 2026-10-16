import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../worker/index";
import { createAgentToken } from "../worker/lib/agent-auth";
import { createTestD1, type TestD1 } from "./helpers/sqlite-d1";

let db: TestD1;
let token: string;
let objects: Map<string, Uint8Array>;
const bucket = {
  put: async (key: string, value: ArrayBuffer) => { objects.set(key, new Uint8Array(value)); },
  delete: async (key: string) => { objects.delete(key); },
};

function env() {
  return { DB: db, ASSET_BUCKET: bucket } as unknown as Cloudflare.Env;
}

let nextId = 1;
async function mcp(method: string, params: unknown, authorization: string | null = `Bearer ${token}`, extraHeaders: Record<string, string> = {}) {
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json, text/event-stream", ...extraHeaders };
  if (authorization) headers.Authorization = authorization;
  return app.request("http://test/api/mcp", { method: "POST", headers, body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }) }, env());
}

async function callTool(name: string, args: Record<string, unknown> = {}) {
  const response = await mcp("tools/call", { name, arguments: args });
  expect(response.status).toBe(200);
  const body = await response.json() as { result: { isError?: boolean; content: { text: string }[] } };
  return { isError: Boolean(body.result.isError), value: JSON.parse(body.result.content[0].text) };
}

function auditRows() {
  return db.raw.prepare("SELECT actor_type, actor_name, action, entity_type, entity_id FROM audit_log ORDER BY id").all();
}

const bilingual = (en: string) => ({ ar: `${en} بالعربية`, en });

beforeEach(async () => {
  db = createTestD1();
  objects = new Map();
  token = (await createAgentToken(db as unknown as D1Database, "claude-code"))!.token;
});

describe("MCP agent authentication", () => {
  it("rejects a request without a bearer token using the standard error shape", async () => {
    const response = await mcp("tools/list", {}, null);
    expect(response.status).toBe(401);
    expect(response.headers.get("WWW-Authenticate")).toContain("Bearer");
    await expect(response.json()).resolves.toEqual({ error: { code: "AGENT_AUTH_REQUIRED", message: "A valid agent token is required" } });
  });

  it("does not accept a browser session cookie instead of a token", async () => {
    const response = await mcp("tools/list", {}, null, { Cookie: "pai_session=anything" });
    expect(response.status).toBe(401);
  });

  it("rejects an unknown or revoked token and records last use of a valid one", async () => {
    expect((await mcp("tools/list", {}, "Bearer pai_agent_not-a-real-token")).status).toBe(401);
    expect((await mcp("tools/list", {})).status).toBe(200);
    expect(db.raw.prepare("SELECT last_used_at FROM agent_tokens").get()).toEqual({ last_used_at: expect.any(String) });
    db.raw.exec("UPDATE agent_tokens SET revoked_at = CURRENT_TIMESTAMP");
    expect((await mcp("tools/list", {})).status).toBe(401);
  });

  it("lists the authoring tools", async () => {
    const response = await mcp("tools/list", {});
    const body = await response.json() as { result: { tools: { name: string }[] } };
    expect(body.result.tools.map((tool) => tool.name)).toEqual(expect.arrayContaining(["get_content_guide", "list_courses", "replace_lesson_blocks", "create_questions_bulk", "set_status", "upload_asset"]));
    expect(body.result.tools.map((tool) => tool.name)).not.toContain("delete_course");
  });
});

describe("MCP authoring tools", () => {
  async function seedCourseAndLesson() {
    const course = await callTool("create_course", { course: { slug: "first-secondary", title: bilingual("First Secondary"), description: bilingual("Course"), status: "draft", sortOrder: 1 } });
    expect(course.isError).toBe(false);
    const lesson = await callTool("create_lesson", { lesson: { courseId: course.value.id, slug: "binary", title: bilingual("Binary numbers"), youtubeVideoId: null, status: "draft", sortOrder: 1 } });
    expect(lesson.isError).toBe(false);
    return { courseId: course.value.id as number, lessonId: lesson.value.id as number };
  }

  it("returns the content guide", async () => {
    const guide = await callTool("get_content_guide");
    expect(guide.value.blocks.types).toHaveProperty("rich-text");
    expect(guide.value.questions.types).toHaveProperty("mcq");
  });

  it("writes a lesson's blocks in one batch, publishes it, and audits each write", async () => {
    const { courseId, lessonId } = await seedCourseAndLesson();
    const replaced = await callTool("replace_lesson_blocks", { lessonId, blocks: [
      { type: "rich-text", data: bilingual("## Objectives") },
      { type: "callout", data: { tone: "tip", ...bilingual("Count in twos") } },
      { type: "interactive", data: { component: "binary-converter" } },
    ] });
    expect(replaced.isError).toBe(false);
    expect(replaced.value.blocks.map((block: { type: string; sortOrder: number }) => [block.type, block.sortOrder])).toEqual([["rich-text", 1], ["callout", 2], ["interactive", 3]]);

    const again = await callTool("replace_lesson_blocks", { lessonId, blocks: [{ type: "code", data: { language: "python", code: "print(bin(5))" } }] });
    expect(again.value.blocks).toHaveLength(1);

    expect((await callTool("set_status", { entityType: "course", id: courseId, status: "published" })).value.status).toBe("published");
    expect((await callTool("set_status", { entityType: "lesson", id: lessonId, status: "published" })).value.status).toBe("published");

    expect(auditRows()).toEqual([
      { actor_type: "agent", actor_name: "claude-code", action: "create", entity_type: "course", entity_id: courseId },
      { actor_type: "agent", actor_name: "claude-code", action: "create", entity_type: "lesson", entity_id: lessonId },
      { actor_type: "agent", actor_name: "claude-code", action: "replace_blocks", entity_type: "lesson", entity_id: lessonId },
      { actor_type: "agent", actor_name: "claude-code", action: "replace_blocks", entity_type: "lesson", entity_id: lessonId },
      { actor_type: "agent", actor_name: "claude-code", action: "update", entity_type: "course", entity_id: courseId },
      { actor_type: "agent", actor_name: "claude-code", action: "update", entity_type: "lesson", entity_id: lessonId },
    ]);
  });

  it("returns actionable validation issues and writes nothing for an invalid block list", async () => {
    const { lessonId } = await seedCourseAndLesson();
    const invalid = await callTool("replace_lesson_blocks", { lessonId, blocks: [{ type: "rich-text", data: { en: "English only" } }, { type: "interactive", data: { component: "unknown-widget" } }] });
    expect(invalid.isError).toBe(true);
    expect(invalid.value.error.code).toBe("INVALID_REQUEST_BODY");
    expect(invalid.value.error.issues.join("\n")).toMatch(/blocks\.0\.data\.ar/);
    expect(db.raw.prepare("SELECT COUNT(*) AS count FROM lesson_blocks").get()).toEqual({ count: 0 });
  });

  it("creates questions in bulk all-or-nothing and maps them to lessons", async () => {
    const { courseId, lessonId } = await seedCourseAndLesson();
    const question = (difficulty: string, lessonIds: number[]) => ({ courseId, type: "true_false", prompt: bilingual("Binary uses two digits"), answer: { correct: true }, explanation: bilingual("0 and 1"), difficulty, status: "draft", lessonIds });

    const rejected = await callTool("create_questions_bulk", { questions: [question("easy", [lessonId]), question("beginner", [])] });
    expect(rejected.isError).toBe(true);
    expect(db.raw.prepare("SELECT COUNT(*) AS count FROM questions").get()).toEqual({ count: 0 });

    const created = await callTool("create_questions_bulk", { questions: [question("easy", [lessonId]), question("hard", []), question("medium", [lessonId])] });
    expect(created.isError).toBe(false);
    expect(created.value.map((item: { difficulty: string; lessonIds: number[] }) => [item.difficulty, item.lessonIds])).toEqual([["easy", [lessonId]], ["hard", []], ["medium", [lessonId]]]);
    const found = await callTool("search_questions", { lessonId });
    expect(found.value).toHaveLength(2);
  });

  it("returns a not-found error for a missing lesson", async () => {
    const missing = await callTool("get_lesson", { lessonId: 999 });
    expect(missing).toEqual({ isError: true, value: { error: { code: "LESSON_NOT_FOUND", message: "Lesson not found" } } });
  });

  it("reports a slug conflict instead of a database error", async () => {
    await seedCourseAndLesson();
    const duplicate = await callTool("create_course", { course: { slug: "first-secondary", title: bilingual("Again"), description: bilingual(""), status: "draft", sortOrder: 2 } });
    expect(duplicate.value.error.code).toBe("COURSE_SLUG_CONFLICT");
  });

  it("uploads a base64 asset using the asset MIME rules", async () => {
    const png = btoa(String.fromCharCode(0x89, 0x50, 0x4e, 0x47));
    const uploaded = await callTool("upload_asset", { kind: "image", fileName: "diagram.png", mimeType: "image/png", base64: png });
    expect(uploaded.value).toMatchObject({ kind: "image", mimeType: "image/png", size: 4, url: expect.stringMatching(/^\/api\/assets\/\d+$/) });
    expect(objects.size).toBe(1);
    const svg = await callTool("upload_asset", { kind: "image", fileName: "x.svg", mimeType: "image/svg+xml", base64: btoa("<svg/>") });
    expect(svg.value.error.code).toBe("INVALID_ASSET_MIME_TYPE");
  });
});
