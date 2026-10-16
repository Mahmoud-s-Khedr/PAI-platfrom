import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import * as authoring from "../services/authoring";
import type { Actor, Result } from "../services/authoring";
import { contentGuide } from "./content-guide";

/**
 * Remote MCP server for the teacher's authoring agents. It is stateless: each
 * HTTP request gets a fresh server bound to the authenticated agent. Every tool
 * is a thin call into the shared authoring service, so agents get exactly the
 * same validation and invariants as the browser CMS.
 */

type ToolResult = { content: { type: "text"; text: string }[]; isError?: boolean };

const id = z.number().int().positive();
const payload = z.record(z.string(), z.unknown());
const status = z.enum(["draft", "published", "archived"]);
const MAX_BASE64_LENGTH = Math.ceil((20 * 1024 * 1024) / 3) * 4 + 4;

function text(value: unknown): ToolResult {
  return { content: [{ type: "text", text: JSON.stringify(value, null, 2) }] };
}

function result<T>(outcome: Result<T>, success?: (value: T) => unknown): ToolResult {
  if (outcome.ok) return text(success ? success(outcome.value) : outcome.value);
  return { isError: true, content: [{ type: "text", text: JSON.stringify({ error: { code: outcome.code, message: outcome.message, ...(outcome.issues ? { issues: outcome.issues } : {}) } }, null, 2) }] };
}

function decodeBase64(value: string): Uint8Array | null {
  try {
    const binary = atob(value.replace(/\s+/g, ""));
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

export function createAuthoringServer(env: Cloudflare.Env, agent: Actor): McpServer {
  const db = env.DB;
  const server = new McpServer({ name: "pai-authoring", version: "1.0.0" }, {
    instructions: "Author bilingual (Arabic/English) Programming & AI lessons for the PAI Education platform. Call get_content_guide first for the exact block and question JSON shapes. Create content as draft, check it, then publish with set_status.",
  });
  const readOnly = { readOnlyHint: true, openWorldHint: false } as const;
  const write = { readOnlyHint: false, destructiveHint: false, openWorldHint: false } as const;

  // --- Read ---------------------------------------------------------------
  server.registerTool("get_content_guide", { description: "Block and question JSON shapes, safe-Markdown rules, statuses, asset limits, and the bilingual requirement. Read this before writing content.", annotations: readOnly }, async () => text(contentGuide()));

  server.registerTool("list_courses", { description: "List every course in any status, with lesson and question counts.", annotations: readOnly }, async () => text(await authoring.listCourses(db)));

  server.registerTool("get_course", { description: "Get one course by id.", inputSchema: { courseId: id }, annotations: readOnly }, async ({ courseId }) => result(await authoring.getCourse(db, courseId)));

  server.registerTool("list_lessons", { description: "List a course's lessons (any status) in display order, without blocks.", inputSchema: { courseId: id }, annotations: readOnly }, async ({ courseId }) => result(await authoring.listLessons(db, courseId)));

  server.registerTool("get_lesson", { description: "Get a lesson in any status, including its ordered blocks (with block ids and sortOrder).", inputSchema: { lessonId: id }, annotations: readOnly }, async ({ lessonId }) => result(await authoring.getLesson(db, lessonId)));

  server.registerTool("search_questions", {
    description: "Search questions in any status. All filters are optional; search matches the bilingual prompt.",
    inputSchema: { courseId: id.optional(), lessonId: id.optional(), type: z.enum(["mcq", "true_false", "short_answer"]).optional(), difficulty: z.enum(["easy", "medium", "hard"]).optional(), status: status.optional(), search: z.string().max(200).optional() },
    annotations: readOnly,
  }, async (filters) => result(await authoring.searchQuestions(db, filters)));

  server.registerTool("get_question", { description: "Get one question with its answer, explanation, status, and lesson mappings.", inputSchema: { questionId: id }, annotations: readOnly }, async ({ questionId }) => result(await authoring.getQuestion(db, questionId)));

  server.registerTool("list_assets", { description: "List uploaded assets with kind, MIME type, size, url, and how many blocks use each one.", annotations: readOnly }, async () => text(await authoring.listAssets(db)));

  // --- Courses and lessons --------------------------------------------------
  server.registerTool("create_course", { description: "Create a course. course = { slug, title{ar,en}, description{ar,en}, status, sortOrder }.", inputSchema: { course: payload }, annotations: write }, async ({ course }) => result(await authoring.createCourse(db, agent, course)));

  server.registerTool("update_course", { description: "Update some fields of a course (slug, title, description, status, sortOrder).", inputSchema: { courseId: id, changes: payload }, annotations: write }, async ({ courseId, changes }) => result(await authoring.updateCourse(db, agent, courseId, changes)));

  server.registerTool("create_lesson", { description: "Create a lesson. lesson = { courseId, slug, title{ar,en}, youtubeVideoId|null, status, sortOrder }. Add content with replace_lesson_blocks.", inputSchema: { lesson: payload }, annotations: write }, async ({ lesson }) => result(await authoring.createLesson(db, agent, lesson)));

  server.registerTool("update_lesson", { description: "Update some fields of a lesson (courseId, slug, title, youtubeVideoId, status, sortOrder).", inputSchema: { lessonId: id, changes: payload }, annotations: write }, async ({ lessonId, changes }) => result(await authoring.updateLesson(db, agent, lessonId, changes)));

  // --- Blocks -----------------------------------------------------------------
  server.registerTool("replace_lesson_blocks", {
    description: "Replace ALL blocks of a lesson with this ordered list, atomically. Each block is { type, data } (no sortOrder; array order is display order). This is the main bulk-authoring tool; read the lesson first if you only mean to change part of it.",
    inputSchema: { lessonId: id, blocks: z.array(payload).max(authoring.MAX_LESSON_BLOCKS) },
    annotations: { ...write, destructiveHint: true, idempotentHint: true },
  }, async ({ lessonId, blocks }) => result(await authoring.replaceLessonBlocks(db, agent, lessonId, { blocks })));

  server.registerTool("add_block", { description: "Add one block { type, data, sortOrder } to a lesson. sortOrder must not be used by another block in the lesson.", inputSchema: { lessonId: id, block: payload }, annotations: write }, async ({ lessonId, block }) => result(await authoring.addBlock(db, agent, lessonId, block)));

  server.registerTool("update_block", { description: "Update a block's type, data, and/or sortOrder. data replaces the whole data object.", inputSchema: { blockId: id, changes: payload }, annotations: write }, async ({ blockId, changes }) => result(await authoring.updateBlock(db, agent, blockId, changes)));

  server.registerTool("delete_block", { description: "Permanently remove one lesson block.", inputSchema: { blockId: id }, annotations: { ...write, destructiveHint: true } }, async ({ blockId }) => result(await authoring.deleteBlock(db, agent, blockId), () => ({ deleted: blockId })));

  server.registerTool("reorder_blocks", { description: "Set the display order of a lesson's blocks. blockIds must list every block of the lesson exactly once.", inputSchema: { lessonId: id, blockIds: z.array(id).max(authoring.MAX_LESSON_BLOCKS) }, annotations: { ...write, idempotentHint: true } }, async ({ lessonId, blockIds }) => result(await authoring.reorderBlocks(db, agent, lessonId, { blockIds })));

  // --- Questions --------------------------------------------------------------
  server.registerTool("create_question", { description: "Create one question. See get_content_guide for the answer shape of each type.", inputSchema: { question: payload }, annotations: write }, async ({ question }) => result(await authoring.createQuestion(db, agent, question)));

  server.registerTool("create_questions_bulk", { description: `Create 1–${authoring.MAX_BULK_QUESTIONS} questions in one all-or-nothing batch.`, inputSchema: { questions: z.array(payload).min(1).max(authoring.MAX_BULK_QUESTIONS) }, annotations: write }, async ({ questions }) => result(await authoring.createQuestionsBulk(db, agent, { questions })));

  server.registerTool("update_question", { description: "Update some fields of a question (courseId, type, prompt, answer, explanation, difficulty, status, lessonIds).", inputSchema: { questionId: id, changes: payload }, annotations: write }, async ({ questionId, changes }) => result(await authoring.updateQuestion(db, agent, questionId, changes)));

  // --- Publishing -------------------------------------------------------------
  server.registerTool("set_status", {
    description: "Publish, unpublish (draft), or archive a course, lesson, or question. Archiving replaces deletion. Students see a lesson only when it and its course are published.",
    inputSchema: { entityType: z.enum(["course", "lesson", "question"]), id, status },
    annotations: { ...write, idempotentHint: true },
  }, async ({ entityType, id: entityId, status: nextStatus }) => result(await authoring.setStatus(db, agent, entityType, entityId, nextStatus)));

  // --- Assets -----------------------------------------------------------------
  server.registerTool("upload_asset", {
    description: "Upload a file you already have (base64) to private storage. kind: image (JPEG/PNG/WebP/GIF ≤ 8 MiB) or worksheet/dataset/resource (≤ 20 MiB, see get_content_guide). Use the returned id/url in an image or file block.",
    inputSchema: { kind: z.enum(["image", "worksheet", "dataset", "resource"]), fileName: z.string().min(1).max(200), mimeType: z.string().min(1).max(200), base64: z.string().min(1).max(MAX_BASE64_LENGTH) },
    annotations: write,
  }, async ({ kind, fileName, mimeType, base64 }) => {
    const bytes = decodeBase64(base64);
    if (!bytes) return result({ ok: false, status: 400, code: "INVALID_BASE64", message: "base64 is not valid base64 data" });
    return result(await authoring.uploadAsset(db, env.ASSET_BUCKET, agent, { kind, fileName, mimeType, size: bytes.byteLength, body: bytes.buffer as ArrayBuffer }));
  });

  return server;
}

/** Handles one stateless Streamable HTTP request (JSON responses, no session). */
export async function handleMcpRequest(request: Request, env: Cloudflare.Env, agent: Actor): Promise<Response> {
  const server = createAuthoringServer(env, agent);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
  }
}
