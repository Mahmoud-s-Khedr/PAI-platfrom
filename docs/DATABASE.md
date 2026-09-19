# Database

All Phase 1 schema lives in `migrations/0001_initial_schema.sql`. Timestamps are UTC-compatible SQLite `CURRENT_TIMESTAMP` text values. Foreign keys are enabled in the migration and every relation has a foreign-key constraint.

| Table | Purpose | Important constraints / relationships |
| --- | --- | --- |
| `courses` | Bilingual course metadata | Unique `slug`; status is `draft`, `published`, or `archived`; ordered by `sort_order`. |
| `lessons` | Bilingual course lessons | `course_id → courses.id`; unique `(course_id, slug)`; nullable `youtube_video_id` stores only the YouTube ID. |
| `lesson_blocks` | Ordered generic lesson content | `lesson_id → lessons.id`; constrained initial block types; one `data_json` payload instead of per-block tables. |
| `questions` | Generic question-bank records | `course_id → courses.id`; constrained initial types; JSON prompt, answer, and explanation. |
| `question_lessons` | Optional question-to-lesson scoping | Composite PK `(question_id, lesson_id)` and cascading foreign keys. |
| `assets` | Future R2 object metadata | Unique object `key`, MIME type, and JSON metadata. It does not hold a file or a redundant URL. |

Indexes cover course/lesson ordering, lesson-block ordering, course question status, and both directions of question-to-lesson lookup.

## Question scope semantics

`questions.course_id` always establishes the owning course.

`question_lessons` is an optional many-to-many lesson scope:

- A mapping makes a question eligible for a lesson query.
- A question with multiple mappings is returned only once when querying multiple lessons; the API uses `DISTINCT`.
- **Zero mappings means course-wide.** Such a question is returned by `GET /api/questions?course=<course-slug>` but is not injected into individual lesson queries. This keeps lesson practice focused while allowing a future course practice surface to include all course questions.
