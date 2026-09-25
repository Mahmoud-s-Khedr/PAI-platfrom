# Database

The Phase 1 content schema lives in `migrations/0001_initial_schema.sql`; authentication is added by the immutable `migrations/0002_auth.sql`. Timestamps are UTC-compatible SQLite `CURRENT_TIMESTAMP` text values. Foreign keys are enabled in the migrations and every relation has a foreign-key constraint.

| Table | Purpose | Important constraints / relationships |
| --- | --- | --- |
| `courses` | Bilingual course metadata | Unique `slug`; status is `draft`, `published`, or `archived`; ordered by `sort_order`. |
| `lessons` | Bilingual course lessons | `course_id → courses.id`; unique `(course_id, slug)`; nullable `youtube_video_id` stores only the YouTube ID. |
| `lesson_production_metadata` | Protected editorial evidence | One row per lesson: source identifiers and author-written notes, review checklist, interactive decision, original-work attestation, correction reason, and self-certification identity/timestamp. It is never returned by public APIs. |
| `lesson_blocks` | Ordered generic lesson content | `lesson_id → lessons.id`; constrained block types including `file`; one `data_json` payload instead of per-block tables. |
| `questions` | Generic question-bank records | `course_id → courses.id`; constrained initial types; JSON prompt, answer, and explanation. |
| `question_lessons` | Optional question-to-lesson scoping | Composite PK `(question_id, lesson_id)`, cascading foreign keys, and a trigger requiring the question and lesson to have the same course. |
| `assets` | Private R2 object metadata | Unique object `key`, MIME type, and JSON metadata. It does not hold binary content or a redundant URL. |
| `asset_links` | Asset-to-block relationship | An asset can be linked to a single image or file block; links prevent deletion while in use and gate public delivery to published lessons. |
| `role_grants` | Deployment-time authorization grants | Normalized email to `admin` or `student`; it is the runtime source of truth and is not demo course content. |
| `users` | Local authenticated identities | Optional immutable Google subject, unique email, display name, optional salted password hash, and a cached role. |
| `sessions` | Opaque browser sessions | SHA-256 token hash, user relation, expiry, and supporting lookup indexes; plaintext session tokens never enter D1. |

Indexes cover course/lesson ordering, lesson-block ordering, course question status, and both directions of question-to-lesson lookup.

## JSON validation at the mapping boundary

Database JSON is treated as untrusted. Before it is returned through the public API, the Worker parses and validates every `lesson_blocks.data_json` payload against its block type and every question `prompt_json`, `answer_json`, and `explanation_json` payload against its question type. A malformed block is retained with `data: null` so the client can display its existing safe fallback; a malformed question is omitted from the public result. No stored JSON is executed or rendered as HTML.

The block set includes a `file` download block. Its payload stores an `assetId`
and bilingual display text; the binary remains in private R2 and is served only
through the Worker after a published-content check.

## Production readiness

`0005_lesson_production_metadata.sql` migrates legacy demo question difficulty
`beginner` to `easy` and adds the per-lesson editorial record. The protected
lesson update route requires complete Arabic and English source references and
author notes, original-work attestation, all checklist entries, a documented
interactive decision, a real YouTube ID, signed-in-admin self-certification,
and at least one mapped published question before it accepts `published`.
Existing demo content receives empty evidence and remains distinguishable from
reviewed authored material.

## Local verification

On 2026-09-19, the migration was applied to an empty isolated local D1 persistence directory, then `scripts/seed.sql` ran successfully. The resulting database contained 2 courses, 1 lesson, 5 lesson blocks, 4 questions, and 3 question-to-lesson mappings. `EXPLAIN QUERY PLAN` confirmed the representative public course, lesson-block, course-question, and lesson-question queries use the course/order, block/order, and course/status indexes (with primary-key lookups for the relationship joins).

## Question scope semantics

`questions.course_id` always establishes the owning course.

`question_lessons` is an optional many-to-many lesson scope:

- A mapping makes a question eligible for a lesson query.
- A question with multiple mappings is returned only once when querying multiple lessons; the API uses `DISTINCT`.
- **Zero mappings means course-wide.** Such a question is returned by `GET /api/questions?course=<course-slug>` but is not injected into individual lesson queries. This keeps lesson practice focused while allowing a future course practice surface to include all course questions.
