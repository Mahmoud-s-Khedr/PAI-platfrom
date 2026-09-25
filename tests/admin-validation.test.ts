import { describe, expect, it } from "vitest";
import { validateAdminAsset, validateAdminBlock, validateAdminLesson, validateAdminQuestion, validateLogin } from "../src/lib/admin-validation";
import type { AdminLessonInput, AdminQuestionInput } from "../src/lib/types";

const lesson: AdminLessonInput = { courseId: 1, slug: "lesson-one", title: { ar: "درس", en: "Lesson" }, youtubeVideoId: null, status: "draft", sortOrder: 1 };
const question: AdminQuestionInput = { courseId: 1, type: "mcq", prompt: { ar: "سؤال", en: "Question" }, explanation: { ar: "شرح", en: "Explanation" }, answer: {}, difficulty: "easy", status: "draft", lessonIds: [1] };

describe("admin form validators", () => {
  it("validates lessons with localized errors", () => {
    expect(validateAdminLesson(lesson, "en")).toEqual({});
    const errors = validateAdminLesson({ ...lesson, slug: "Bad slug", title: { ar: "", en: "" }, youtubeVideoId: "x".repeat(101) }, "ar");
    expect(errors.slug).toContain("أحرف");
    expect(errors["title.ar"]).toContain("العنوان");
    expect(errors.youtubeVideoId).toContain("YouTube");
  });

  it("validates every lesson block schema before saving", () => {
    expect(validateAdminBlock({ type: "rich-text", data: { ar: "نص", en: "Text" }, sortOrder: 0 }, "en")).toEqual({});
    expect(validateAdminBlock({ type: "image", data: { src: "", alt: { ar: "", en: "" } }, sortOrder: 0 }, "en")).toMatchObject({ "data.src": expect.any(String), "data.alt.ar": expect.any(String) });
    expect(validateAdminBlock({ type: "file", data: { assetId: 3, title: { ar: "ملف", en: "File" } }, sortOrder: 0 }, "en")).toEqual({});
    expect(validateAdminBlock({ type: "file", data: { assetId: 0, title: { ar: "", en: "" } }, sortOrder: 0 }, "en")).toMatchObject({ "data.assetId": expect.any(String), "data.title.ar": expect.any(String) });
    expect(validateAdminBlock({ type: "code", data: { code: "x".repeat(100_001), language: "x".repeat(81) }, sortOrder: 0 }, "en")).toMatchObject({ "data.code": expect.any(String), "data.language": expect.any(String) });
    expect(validateAdminBlock({ type: "callout", data: { ar: "", en: "", tone: "not-a-tone" }, sortOrder: 0 }, "en")).toMatchObject({ "data.ar": expect.any(String), "data.tone": expect.any(String) });
    expect(validateAdminBlock({ type: "callout", data: { ar: "ملاحظة", en: "Note", tone: "tip" }, sortOrder: 0 }, "en")).toEqual({});
    expect(validateAdminBlock({ type: "interactive", data: { component: "unknown", props: [] }, sortOrder: 0 }, "en")).toMatchObject({ "data.component": expect.any(String), "data.props": expect.any(String) });
  });

  it("checks each supported structured answer shape", () => {
    expect(validateAdminQuestion({ ...question, answer: { choices: { ar: ["أ"], en: ["A"] }, correctIndex: 0 } }, "en")).toEqual({});
    expect(validateAdminQuestion({ ...question, answer: null }, "en").answer).toContain("valid answer");
    expect(validateAdminQuestion({ ...question, answer: { choices: { ar: [""], en: ["A", "B"] }, correctIndex: 2 } }, "en").answer).toBeTruthy();
    expect(validateAdminQuestion({ ...question, type: "true_false", answer: { correct: "yes" } }, "en").answer).toBeTruthy();
    expect(validateAdminQuestion({ ...question, type: "short_answer", answer: { acceptedAnswers: [] } }, "en").answer).toBeTruthy();
  });

  it("checks upload type, empty files, and size limits", () => {
    const image = { type: "image/png", size: 1 } as File;
    expect(validateAdminAsset("image", image, "en")).toEqual({});
    expect(validateAdminAsset("worksheet", image, "en").file).toBeTruthy();
    expect(validateAdminAsset("resource", { type: "application/zip", size: 1 } as File, "en")).toEqual({});
    expect(validateAdminAsset("resource", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 1 } as File, "en")).toEqual({});
    expect(validateAdminAsset("resource", { name: "settings.yaml", type: "", size: 1 } as File, "en")).toEqual({});
    expect(validateAdminAsset("image", { type: "image/png", size: 0 } as File, "en").file).toBeTruthy();
    expect(validateAdminAsset("image", { type: "image/png", size: 8 * 1024 * 1024 + 1 } as File, "en").file).toBeTruthy();
  });

  it("checks login credentials in both languages", () => {
    expect(validateLogin("admin@example.com", "password", "en")).toEqual({});
    expect(validateLogin("not-an-email", "", "ar")).toMatchObject({ email: expect.stringMatching(/[ء-ي]/), password: expect.stringMatching(/[ء-ي]/) });
  });
});
