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

`GET /api/admin/questions` accepts optional `search`, `courseId`, `lessonId`,
`type`, `difficulty`, and `status` filters. Search matches the bilingual prompt.
A question's `lessonIds` may be empty for a
course-wide question; non-empty mappings must all belong to its selected
course. Deleting a lesson or question is deliberately an archive operation.
Removing a lesson block is a real deletion because blocks have no archive
state.

Course, lesson, and question mutations use bilingual `{ "ar", "en" }` text.
Lesson-block and question payloads are checked against the supported types
before being serialized to D1. The APIs do not upload or serve files; R2 asset
management remains a separately scoped milestone.

Lesson blocks must have a unique `sortOrder` within their lesson. A conflicting
create or update returns `409 BLOCK_SORT_ORDER_CONFLICT`; use the reorder
endpoint for a complete ordering. A lesson with mapped questions cannot move to
another course until those question mappings are removed, which returns `409
LESSON_COURSE_CHANGE_REQUIRES_QUESTION_REASSIGNMENT`. D1 also enforces that a
mapped question and lesson belong to the same course.
