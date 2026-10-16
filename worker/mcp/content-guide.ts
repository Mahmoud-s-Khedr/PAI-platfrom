import { calloutTones } from "../../src/lib/types";
import { interactiveComponentDetails, registeredInteractiveComponentIds } from "../../src/interactives/component-ids";
import { assetRules, MAX_BULK_QUESTIONS, MAX_LESSON_BLOCKS } from "../services/authoring";

/** Returned by the `get_content_guide` MCP tool so agents write valid content first time. */
export function contentGuide() {
  return {
    platform: "PAI Education — Programming & AI for Egyptian secondary-school students (First and Second Secondary).",
    rules: [
      "Every student-facing text is bilingual: { \"ar\": \"…\", \"en\": \"…\" }. Both values are required and non-empty. Arabic is shown right-to-left.",
      "Write original teaching material. Never copy, quote, or paraphrase textbook pages; do not reference the internal PDFs.",
      "rich-text blocks are safe Markdown (headings, emphasis, lists, task lists, links, inline/fenced code, GFM tables). Raw HTML is shown as text, Markdown images are not rendered — use an image block instead.",
      "Only relative, http(s), and mailto links are clickable.",
      "Keep code identifiers and keywords in English; explain them in the surrounding localized text.",
      "Slugs use lowercase letters, numbers, and hyphens (e.g. \"binary-numbers\").",
      "New content should start as draft. Use set_status to publish when the lesson, its blocks, and its questions are complete. A lesson is visible to students only if both it and its course are published.",
      "Nothing can be hard-deleted through MCP except a lesson block. Archive courses, lessons, and questions with set_status instead.",
      "A question with no lessonIds is course-wide (shown in course practice only). Map it to lessons to show it in lesson practice. Mapped lessons must belong to the question's course.",
    ],
    statuses: ["draft", "published", "archived"],
    course: { slug: "string", title: "{ar,en}", description: "{ar,en} (may be empty strings)", status: "draft|published|archived", sortOrder: "integer ≥ 0" },
    lesson: { courseId: "integer", slug: "string (unique within the course)", title: "{ar,en}", youtubeVideoId: "YouTube video ID only (e.g. \"dQw4w9WgXcQ\") or null", status: "draft|published|archived", sortOrder: "integer ≥ 0" },
    blocks: {
      note: `A lesson has at most ${MAX_LESSON_BLOCKS} blocks. With replace_lesson_blocks the array order is the display order. With add_block/update_block, sortOrder must be unique within the lesson.`,
      types: {
        "rich-text": { data: { ar: "Markdown", en: "Markdown" } },
        callout: { data: { ar: "plain text", en: "plain text", tone: calloutTones.join("|") } },
        code: { data: { language: "optional: python|py|javascript|js|typescript|ts|json|html|css|bash|sh", code: "string (shown LTR)" } },
        image: { data: { src: "/api/assets/<id> for an uploaded image (with assetId) or an https URL", assetId: "optional integer from upload_asset (kind image); src must then equal its url", alt: "optional {ar,en} — required in practice for meaningful images", caption: "optional {ar,en}" } },
        file: { data: { assetId: "integer from upload_asset (non-image kind)", title: "{ar,en}", description: "optional {ar,en}" } },
        interactive: {
          data: { component: registeredInteractiveComponentIds.join("|"), props: "optional object" },
          components: Object.fromEntries(registeredInteractiveComponentIds.map((id) => [id, interactiveComponentDetails[id].description.en])),
          props: { "python-playground": { starterCode: "optional string", expectedOutput: "optional string; when set, the student's printed output is checked against it" }, "binary-converter": {} },
        },
      },
      example: [
        { type: "rich-text", data: { ar: "## الأهداف\n- تعريف النظام الثنائي", en: "## Objectives\n- Define the binary system" } },
        { type: "callout", data: { tone: "key-concept", ar: "كل خانة ثنائية تساوي 0 أو 1.", en: "Each binary digit is 0 or 1." } },
        { type: "code", data: { language: "python", code: "print(bin(10))" } },
        { type: "interactive", data: { component: "binary-converter" } },
      ],
    },
    questions: {
      note: `create_questions_bulk accepts 1–${MAX_BULK_QUESTIONS} questions and is all-or-nothing.`,
      common: { courseId: "integer", prompt: "{ar,en}", explanation: "{ar,en} — say why the answer is right and, if useful, why a likely alternative is wrong", difficulty: "easy|medium|hard", status: "draft|published|archived", lessonIds: "integer[] (may be empty)" },
      difficulty: { easy: "direct recall or a single step", medium: "apply one concept or trace a short sequence", hard: "combine concepts, diagnose a result, or a non-trivial step" },
      types: {
        mcq: { answer: { choices: { ar: ["…"], en: ["…"] }, correctIndex: "0-based; both choice lists must have the same length and order" } },
        true_false: { answer: { correct: "boolean" } },
        short_answer: { answer: { acceptedAnswers: ["accepted answers; matching ignores case and leading/trailing spaces"] } },
      },
      example: { courseId: 1, type: "mcq", prompt: { ar: "ما القيمة الثنائية للعدد 5؟", en: "What is 5 in binary?" }, answer: { choices: { ar: ["101", "110", "111"], en: ["101", "110", "111"] }, correctIndex: 0 }, explanation: { ar: "5 = 4 + 1، أي 101.", en: "5 = 4 + 1, so 101." }, difficulty: "easy", status: "draft", lessonIds: [] },
    },
    assets: Object.fromEntries(Object.entries(assetRules).map(([kind, rule]) => [kind, { mimeTypes: [...rule.mimeTypes], maxBytes: rule.maxBytes }])),
  };
}
