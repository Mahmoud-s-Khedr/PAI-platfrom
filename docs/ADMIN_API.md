# Admin API

`/api/admin/*` is the write-capable content-management API. It is separate from
the student-facing public API: public endpoints continue to expose only
published content and contain no write methods.

## Protection

Every admin endpoint uses the Google or email/password local session described
in [Authentication](AUTHENTICATION.md). No bearer token or Cloudflare Access
identity is accepted. A request without a valid session receives
`401 ADMIN_AUTH_REQUIRED`; a signed-in student receives
`403 ADMIN_ACCESS_DENIED`. The current role is read from `users` for every
request, so changes to a user's role take effect without waiting for a session
to expire.

## Endpoints

All request JSON is validated. Error responses use the established format
`{ "error": { "code", "message" } }`.

| Purpose | Endpoint |
| --- | --- |
| Dashboard summary | `GET /api/admin/dashboard` |
| List/create courses | `GET`, `POST /api/admin/courses` |
| Read/update a course | `GET`, `PATCH /api/admin/courses/:id` |
| List a course's lessons | `GET /api/admin/courses/:id/lessons` |
| Read/create lessons | `GET /api/admin/lessons/:id`, `POST /api/admin/lessons` |
| Update/archive lesson | `PATCH`, `DELETE /api/admin/lessons/:id` |
| Add/reorder lesson blocks | `POST /api/admin/lessons/:lessonId/blocks`, `PUT /api/admin/lessons/:lessonId/blocks/order` |
| Update/remove a block | `PATCH`, `DELETE /api/admin/blocks/:id` |
| Search/create questions | `GET`, `POST /api/admin/questions` |
| Read/update/archive question | `GET`, `PATCH`, `DELETE /api/admin/questions/:id` |
| Create a draft copy | `POST /api/admin/questions/:id/duplicate` |
| List/upload managed assets | `GET`, `POST /api/admin/assets` |
| Delete an unused asset | `DELETE /api/admin/assets/:id` |

`GET /api/admin/questions` accepts optional `search`, `courseId`, `lessonId`,
`type`, `difficulty`, and `status` filters. Search matches the bilingual prompt.
A question's `lessonIds` may be empty for a
course-wide question; non-empty mappings must all belong to its selected
course. Deleting a lesson or question is deliberately an archive operation.
Removing a lesson block is a real deletion because blocks have no archive
state.

Course, lesson, and question mutations use bilingual `{ "ar", "en" }` text.
Lesson-block and question payloads are checked against the supported types
before being serialized to D1.

Questions use only `easy`, `medium`, or `hard` difficulty. Lesson responses
from `GET /api/admin/lessons/:id` additionally include protected `production`
metadata and `publishingReadiness`. Production metadata holds source
identifiers/edition labels and author-written high-level notes, never textbook
text or PDFs. Its `selfCertificationConfirmed` request flag is only an
affirmative action: the Worker records the signed-in admin identity and its own
timestamp, and never accepts either from the browser.

Changing a lesson to `published` returns
`400 LESSON_NOT_READY_FOR_PUBLICATION` unless the full bilingual source and
coverage evidence, terminology/structure/comparison notes, original-work
attestation, checklist, interactive decision, YouTube ID, certification, and a
mapped published question are present. The response’s `publishingReadiness`
field gives the CMS a non-sensitive list of incomplete requirements.

Asset uploads use `multipart/form-data` with `kind` and `file` fields. Images
allow JPEG, PNG, WebP, and GIF up to 8 MiB; worksheets, datasets, and resources
allow only their applicable PDF/text/CSV/JSON formats up to 20 MiB. SVG, HTML,
scripts, and executable formats are rejected. The Worker generates all object
keys and serves assets via `GET /api/assets/:id`; non-image files are always
attachment-only. An image block can reference its managed `assetId`, allowing
the API to reject deletion of in-use assets and identify zero-use orphans.

Lesson blocks must have a unique `sortOrder` within their lesson. A conflicting
create or update returns `409 BLOCK_SORT_ORDER_CONFLICT`; use the reorder
endpoint for a complete ordering. A lesson with mapped questions cannot move to
another course until those question mappings are removed, which returns `409
LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT`. D1 also enforces that a
mapped question and lesson belong to the same course.

## Browser CMS

The protected browser application exposes the completed authoring workflows at
these routes:

| Route | Available workflow |
| --- | --- |
| `/admin` | Course dashboard, course creation, lesson summaries, status/counts, and last-update times. |
| `/admin/courses/:id` | Course metadata/status editing and lesson creation/navigation. |
| `/admin/lessons/:id` | Lesson metadata/status editing, archive, and authoring/reordering/removal of supported blocks. |
| `/admin/questions` | Question search/filtering, create/edit, lesson mappings, publication status, duplication, and archive. |

The block editor supports rich text, URL-backed images, code, callouts, and
registered interactive components. Rich-text values are localized safe Markdown
strings (`{ "ar", "en" }`), not HTML. The editor includes syntax help and an
optional preview for the active application language; its textarea remains the
source of truth. It supports headings, paragraphs, emphasis, ordered/unordered/task
lists, links, inline/fenced code, and GFM tables. Raw HTML and Markdown images
are not rendered. Only relative same-site, `http:`, `https:`, and `mailto:`
links are clickable; external HTTP(S) links open safely in a new tab.

The CMS includes an Asset screen for uploading and removing unused files. The
image block editor can select an existing image or upload one in place; an
external image URL remains available for intentionally remote images. Lesson
preview renders the saved draft in the student-facing block renderer. The
question editor has a student-style question preview that does not save an
attempt or change student progress.
