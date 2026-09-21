# PAI Education Platform — Master Project Checklist

> **Project:** Programming & Artificial Intelligence learning platform for Egyptian secondary-school students  
> **Initial courses:** First Secondary and Second Secondary  
> **Core model:** Course → Lessons → Content / Interactives / YouTube, plus a curriculum-scoped Question Bank  
> **Architecture:** React + TypeScript + Vite → same-origin `/api/*` → Hono on Cloudflare Workers → D1, with R2 for uploaded assets  
> **Last reviewed:** 2026-09-22
>
> **Review basis:** Checked items are implemented in the Phase 1 repository or
> were verified locally in this review. Unchecked items remain future work,
> require a production verification, or need a dedicated test.

## Single-admin workflow

The admin application has one content owner. Draft, published, and archived
statuses are the only publishing workflow controls. Content-quality guidance is
still useful, but the app must not require a reviewer checklist, an approval
decision, a self-attestation, or a second-person sign-off before publishing.

### Retired completed work — cleanup reference

The following completed multi-person editorial features have been removed from
the active UI and protected API. They are listed here so their remaining
historical database and documentation references are easy to find.

| Retired feature | Removed active code | Historical reference to remove later |
| --- | --- | --- |
| Source-evidence record, terminology/coverage notes, and correction log | `src/pages/admin-lesson-page.tsx`, `src/lib/types.ts`, `worker/routes/admin.ts`, `worker/db/admin.ts` | `migrations/0005_lesson_production_metadata.sql` → `lesson_production_metadata` table and its rows |
| Original-work attestation, review checklist, interactive decision, and self-certification | Same files as above | The corresponding columns in `lesson_production_metadata` from migration `0005` |
| Publication-readiness gate based on that metadata, video, and mapped questions | `worker/routes/admin.ts`, `worker/db/admin.ts`, `tests/admin-api.test.ts` | `docs/ADMIN_API.md`, `docs/DATABASE.md`, and `docs/CONTENT_QUALITY_STANDARDS.md` still describe the retired process and should be revised or deleted with the legacy table |

Do not rewrite migration `0005`, because it may already be applied. If the
legacy table is to be physically removed, add a new migration after backing up
any data that needs to be retained.

---

## 1. Project Foundation

- [x] Finalize repository structure.
- [x] Keep `subjects-content/` as internal source/reference material only.
- [x] Ensure `subjects-content/` is excluded from the production frontend bundle.
- [x] Set up React + TypeScript.
- [x] Set up Vite.
- [x] Configure `@cloudflare/vite-plugin`.
- [x] Set up Cloudflare Worker entry point.
- [x] Set up Hono API.
- [x] Configure Wrangler.
- [x] Configure TypeScript.
- [x] Set up Tailwind CSS and shared UI primitives.
- [x] Set up React Router.
- [x] Create shared frontend/backend domain types.
- [x] Generate and maintain Cloudflare binding types.
- [x] Ensure `.wrangler/state/` is ignored by Git.
- [x] Add development script.
- [x] Add build script.
- [x] Add preview script.
- [x] Add deployment script.
- [x] Add typecheck script.
- [x] Add test script.
- [x] Add basic project documentation.

### Target architecture

```text
React SPA
   │
   ├── static student/admin UI
   │
   └── /api/*
          ↓
      Hono Worker
          ↓
          D1
          ↓
          R2
```

---

## 2. Database

### Courses

- [x] Create `courses` table.
- [x] Add course `id`.
- [x] Add unique `slug`.
- [x] Add `title_ar`.
- [x] Add `title_en`.
- [x] Add `description_ar`.
- [x] Add `description_en`.
- [x] Add `status`.
- [x] Support `draft`.
- [x] Support `published`.
- [x] Support `archived`.
- [x] Add `sort_order`.
- [x] Add `created_at`.
- [x] Add `updated_at`.
- [x] Seed First Secondary course.
- [x] Seed Second Secondary course.

### Lessons

- [x] Create `lessons` table.
- [x] Add foreign key to `courses`.
- [x] Add lesson `slug`.
- [x] Make lesson slug unique within a course.
- [x] Add `title_ar`.
- [x] Add `title_en`.
- [x] Add nullable `youtube_video_id`.
- [x] Add `sort_order`.
- [x] Add `status`.
- [x] Add `created_at`.
- [x] Add `updated_at`.

### Lesson Blocks

- [x] Create `lesson_blocks` table.
- [x] Add foreign key to `lessons`.
- [x] Add `type`.
- [x] Add `sort_order`.
- [x] Add `data_json`.
- [x] Add `created_at`.
- [x] Add `updated_at`.
- [x] Add runtime validation for parsed block JSON.

Initial block types:

- [x] `rich-text`
- [x] `image`
- [x] `code`
- [x] `callout`
- [x] `interactive`
- [x] Defer `download` until an explicitly scoped asset-delivery flow is needed.

### Questions

- [x] Create `questions` table.
- [x] Add foreign key to `courses`.
- [x] Add `type`.
- [x] Add `prompt_json`.
- [x] Add `answer_json`.
- [x] Add `explanation_json`.
- [x] Add `difficulty`.
- [x] Migrate legacy `beginner` values to `easy`.
- [x] Restrict question difficulty to `easy`, `medium`, or `hard` in the CMS and D1.
- [x] Add `status`.
- [x] Add `created_at`.
- [x] Add `updated_at`.
- [x] Add runtime validation for all parsed question JSON.

Initial question types:

- [x] `mcq`
- [x] `true_false`
- [x] `short_answer`

### Question ↔ Lesson Relationships

- [x] Create `question_lessons` table.
- [x] Add `question_id`.
- [x] Add `lesson_id`.
- [x] Use composite primary key `(question_id, lesson_id)`.
- [x] Support question linked to one lesson.
- [x] Support question linked to multiple lessons.
- [x] Support course-wide question with zero lesson mappings.
- [x] Deduplicate questions returned for multi-lesson queries.

### Assets

- [x] Create `assets` table.
- [x] Add `id`.
- [x] Add R2 object `key`.
- [x] Add `mime_type`.
- [x] Add `metadata_json`.
- [x] Add `created_at`.
- [x] Do not store binary files in D1.

### Database Engineering

- [x] Enable/use foreign keys.
- [x] Add appropriate unique constraints.
- [x] Create immutable numbered migrations.
- [x] Create reproducible development seed data.
- [x] Index `lessons.course_id`.
- [x] Index `(lessons.course_id, lessons.sort_order)`.
- [x] Index `lesson_blocks.lesson_id`.
- [x] Index `(lesson_blocks.lesson_id, lesson_blocks.sort_order)`.
- [x] Index `questions.course_id`.
- [x] Index `(questions.course_id, questions.status)`.
- [x] Index `question_lessons.question_id`.
- [x] Index `question_lessons.lesson_id`.
- [x] Verify migration from an empty local D1 database.
- [x] Verify seed script is safe to rerun or clearly document reset procedure.
- [x] Verify representative public-query plans use the intended indexes.

---

## 3. Public API

### Basic API Infrastructure

- [x] Implement `GET /api/health`.
- [x] Define consistent JSON response conventions.
- [x] Preserve error format:

```json
{
  "error": {
    "code": "LESSON_NOT_FOUND",
    "message": "Lesson not found"
  }
}
```

- [x] Validate route parameters.
- [x] Validate query parameters.
- [x] Validate parsed JSON loaded from D1.
- [x] Return proper `400` errors.
- [x] Return proper `404` errors.
- [x] Return proper `500` errors without exposing SQL/internal details.
- [x] Ensure public API is read-only during the initial phase.

### Courses API

- [x] Implement `GET /api/courses`.
- [x] Implement `GET /api/courses/:slug`.
- [x] Return published content only.
- [x] Order courses by `sort_order`.

### Lessons API

- [x] Implement `GET /api/courses/:slug/lessons`.
- [x] Implement lesson detail route.
- [x] Decide whether public lesson detail uses ID, slug, or both.
- [x] Return lesson title.
- [x] Return YouTube video ID.
- [x] Return ordered lesson blocks.
- [x] Filter out unpublished lessons.
- [x] Handle lesson-not-found cleanly.

### Questions API

- [x] Implement questions for one lesson.
- [x] Implement questions for multiple lessons.
- [x] Implement questions for an entire course.
- [x] Return published questions only.
- [x] Deduplicate multi-lesson results.
- [x] Document course-wide question semantics.
- [ ] Add optional difficulty filtering when useful.
- [ ] Add optional question-count limit when useful.
- [ ] Design a scalable random-selection strategy.
- [ ] Avoid large-table `ORDER BY RANDOM()` as the long-term strategy.

---

## 4. Student Application

### Home Page

- [x] Build platform landing page.
- [x] Display First Secondary course.
- [x] Display Second Secondary course.
- [x] Load course data from API.
- [x] Add Arabic/English switcher.
- [x] Make layout mobile responsive.

### Course Page

- [x] Display course title.
- [x] Display course description.
- [x] Display ordered lesson list.
- [x] Display lesson completion indicators.
- [x] Add Continue Learning action.
- [x] Add course-level practice action.
- [x] Handle empty course state.
- [x] Handle API failure state.

### Lesson Page

- [x] Display lesson title.
- [ ] Add previous lesson navigation.
- [ ] Add next lesson navigation.
- [x] Render YouTube player when video exists.
- [x] Render lesson blocks.
- [x] Render interactive material.
- [x] Add lesson practice section.
- [x] Add Mark Completed behavior.
- [x] Persist lesson progress.
- [ ] Handle missing/unavailable video.
- [x] Handle invalid content block gracefully.

### Core Student Journey

```text
Choose course
    ↓
Choose lesson
    ↓
Watch video
    ↓
Study content
    ↓
Use interactive material when useful
    ↓
Practice questions
    ↓
Review mistakes/explanations
    ↓
Continue to next lesson
```

---

## 5. Arabic + English

- [x] Create global language state.
- [x] Persist selected language locally.
- [x] Render Arabic lesson content.
- [x] Render English lesson content.
- [x] Set `dir="rtl"` for Arabic.
- [x] Set `dir="ltr"` for English.
- [x] Set document `lang` correctly.
- [x] Use RTL-aware navigation.
- [x] Use RTL-aware icons where direction matters.
- [x] Use RTL-aware spacing/layout utilities.
- [x] Support Arabic question UI.
- [x] Keep code samples LTR even inside Arabic pages.
- [x] Add localized image alt text.
- [ ] Test all important screens in Arabic.
- [ ] Test all important screens in English.

---

## 6. Lesson Block System

### Generic Renderer

- [x] Create reusable `<LessonBlock />`.
- [x] Dispatch blocks by `type`.
- [x] Preserve block ordering.
- [x] Validate block data at runtime.
- [x] Gracefully render unsupported block types.

### Rich Text

- [x] Decide and document the rich-text format.
- [x] Prefer safe Markdown or safe plain text.
- [x] Support headings.
- [x] Support paragraphs.
- [x] Support lists.
- [x] Support links.
- [x] Support inline code.
- [x] Support code blocks.
- [x] Support GFM tables.
- [x] Do not blindly inject database HTML.
- [x] Do not execute JavaScript from stored content.

### Images

- [x] Render responsive images.
- [x] Support Arabic caption.
- [x] Support English caption.
- [x] Support Arabic alt text.
- [x] Support English alt text.
- [ ] Integrate with R2 later.

### Code Blocks

- [x] Add syntax highlighting.
- [x] Show language.
- [x] Add copy button.
- [x] Preserve LTR code direction.
- [x] Ensure code works properly inside RTL lesson layout.

### Callouts

- [ ] Support key concept.
- [ ] Support note.
- [ ] Support tip.
- [ ] Support warning.
- [ ] Support example.

---

## 7. Interactive Learning System

### Interactive Architecture

- [x] Create hardcoded interactive registry.
- [x] Store interactive component name in lesson block data.
- [x] Store component configuration/props in lesson content.
- [x] Only allow explicitly registered interactive components.
- [x] Fail safely for unknown interactive names.
- [ ] Lazy-load heavy interactives where appropriate.

### Potential First-Grade Interactives

Build only when a real lesson needs them.

- [x] Decimal ↔ binary converter.
- [ ] Binary exercises.
- [ ] Hexadecimal converter.
- [ ] Bit/byte calculator.
- [ ] Character encoding visualizer.
- [ ] Image resolution/data-size visualizer.
- [ ] Audio sampling visualizer.
- [ ] Compression demonstration.
- [ ] Logic-gate simulator.
- [ ] Network/request visualizer.
- [ ] IP/domain/DNS visualizer.
- [ ] Database/table playground.
- [ ] Quartile/box-plot visualizer.
- [ ] Regression visualizer.
- [ ] Probability/simulation exercises.
- [ ] More options are here [INTERACTIVE_LESSON_RECOMMENDATIONS](./INTERACTIVE_LESSON_RECOMMENDATIONS.md)

### Programming Interactives

- [ ] Python playground.
- [ ] Python coding exercises.
- [ ] HTML/CSS playground.
- [ ] HTML/JavaScript playground.
- [ ] Sandboxed web preview.
- [ ] Coding challenge support.

### AI Interactives

- [ ] Classification demonstration.
- [ ] Machine-learning concept visualization.
- [ ] Neural-network visualization.
- [ ] Token-prediction/LLM demonstration.
- [ ] Generative-AI exercises.

---

## 8. YouTube Lesson Integration

For every authored lesson:

- [x] Store only YouTube video ID in lesson data.
- [x] Render responsive player.
- [x] Use privacy-enhanced embedding where appropriate.
- [x] Allow lessons to exist before the video is ready.
- [ ] Gracefully handle unavailable/removed videos.
- [ ] Review YouTube audience/child-directed requirements before public launch.
- [ ] Add captions/subtitles where practical.

---

## 9. Question Engine

### Core Question Types

- [x] MCQ.
- [x] True/false.
- [x] Short answer.

Possible later types:

- [ ] Multiple select.
- [ ] Fill in the blank.
- [ ] Matching.
- [ ] Ordering.
- [ ] Coding question.

### Practice Behavior

- [x] Render question.
- [x] Accept answer.
- [x] Submit/check answer.
- [x] Show correct/incorrect result.
- [x] Show explanation.
- [x] Move to next question.
- [ ] Support previous question if appropriate.
- [ ] Calculate session score.
- [ ] Retry incorrect questions.
- [ ] Randomize question order.
- [ ] Randomize MCQ choices safely.
- [ ] Practice fixed number of questions.
- [ ] Practice all matching questions.

### Scope Selection

- [x] Practice one lesson.
- [ ] Practice multiple lessons.
- [ ] Practice entire course.
- [ ] Filter by difficulty.
- [x] Show available question count.

Example UX:

```text
Practice

Lessons
☑ Algorithms
☑ Python Basics 1
☑ Python Basics 2
☐ Data Structures

Questions
○ 10
● 20
○ 50
○ All

Difficulty
☑ Easy
☑ Medium
☐ Hard

[ Start ]
```

---

## 10. Student Local Progress

No account is required initially.

- [x] Create one browser-storage abstraction.
- [x] Store language preference.
- [x] Store completed lessons.
- [ ] Store last opened lesson.
- [x] Store question attempts.
- [ ] Store correct/incorrect counts.
- [ ] Store recent mistakes if useful.
- [ ] Calculate course completion percentage.
- [ ] Add Clear/Reset Progress action.
- [x] Handle malformed/corrupted local state safely.

Later:

- [ ] Add optional cloud sync only if student accounts are introduced.

---

## 11. Admin Application

This is a major product milestone because it allows normal content changes without rebuilding/redeploying the app.

> The protected `/admin` browser application supports core course, lesson,
> block, and question-bank authoring. Asset uploads and student-facing preview
> remain separately scoped work.

### Admin Home

- [x] Protect `/admin`.
- [x] Display course list.
- [x] Display lesson list.
- [x] Show draft/published status.
- [x] Show question counts.
- [x] Show last update time where useful.

### Course Editor

- [x] Create courses from the browser CMS.
- [x] Edit bilingual titles and descriptions.
- [x] Edit slug, display order, and draft/published/archived status.
- [x] Open and create a course's lessons.

### Lesson Editor

- [x] Create lesson via protected admin API and browser CMS.
- [x] Edit lesson via protected admin API and browser CMS.
- [x] Archive/delete lesson safely via protected admin API and browser CMS.
- [x] Edit Arabic title via protected admin API and browser CMS.
- [x] Edit English title via protected admin API and browser CMS.
- [x] Edit YouTube video ID via protected admin API and browser CMS.
- [x] Change lesson order via protected admin API and browser CMS.
- [x] Change draft/published/archived status via protected admin API and browser CMS.

### Block Editor

- [x] Add block via protected admin API and browser CMS.
- [x] Edit block via protected admin API and browser CMS.
- [x] Remove block via protected admin API and browser CMS.
- [x] Reorder blocks via protected admin API and browser CMS.
- [x] Rich-text block authoring via protected admin API and browser CMS.
- [x] Image selector/uploader.
- [x] Code block authoring via protected admin API and browser CMS.
- [x] Callout block authoring via protected admin API and browser CMS.
- [x] Interactive type selection via protected admin API and browser CMS.
- [x] Interactive configuration authoring via protected admin API and browser CMS.
- [x] Lesson preview.

### Publishing

- [x] Save draft via admin API.
- [x] Retrieve draft content for API-based preview.
- [x] Publish via admin API.
- [x] Unpublish via admin API.
- [x] Archive via admin API.
- [x] Ensure public API never exposes drafts.
- [x] Track update timestamps.
- [ ] Consider content revision history later.

---

## 12. Question-Bank Admin

### Question Management

- [x] Display question list.
- [x] Search questions via protected admin API and browser CMS.
- [x] Filter by course via protected admin API and browser CMS.
- [x] Filter by lesson via protected admin API and browser CMS.
- [x] Filter by type via protected admin API and browser CMS.
- [x] Filter by difficulty via protected admin API and browser CMS.
- [x] Filter by publication status via protected admin API and browser CMS.

### Question Editor

- [x] Create MCQ via protected admin API and browser CMS.
- [x] Create true/false via protected admin API and browser CMS.
- [x] Create short-answer question via protected admin API and browser CMS.
- [x] Edit Arabic prompt via protected admin API and browser CMS.
- [x] Edit English prompt via protected admin API and browser CMS.
- [x] Edit answer via protected admin API and browser CMS.
- [x] Edit Arabic explanation via protected admin API and browser CMS.
- [x] Edit English explanation via protected admin API and browser CMS.
- [x] Set difficulty via protected admin API and browser CMS.
- [x] Limit selectable difficulty to `easy`, `medium`, and `hard`.
- [x] Assign one lesson via protected admin API and browser CMS.
- [x] Assign multiple lessons via protected admin API and browser CMS.
- [x] Make question course-wide via protected admin API and browser CMS.
- [x] Preview question.
- [x] Publish/unpublish via protected admin API and browser CMS.
- [x] Duplicate question via protected admin API and browser CMS.
- [x] Archive/delete safely via protected admin API and browser CMS.

---

## 13. Admin Security

Initial approach:

- [x] Protect admin application.
- [x] Protect all write APIs.
- [x] Ensure public users cannot modify D1.
- [x] Validate every write operation.
- [ ] Add upload restrictions.
- [ ] Review CSRF needs if cookie/session auth is added.
- [ ] Add rate limiting to sensitive endpoints if useful.
- [ ] Consider Cloudflare Access for initial admin protection.

Later, if multiple staff/admin users exist:

- [ ] Application-level admin authentication.
- [ ] Roles and permissions.
- [ ] Audit log.
- [ ] Record who created/updated/published content.

---

## 14. R2 / Asset Management

- [ ] Create R2 bucket.
- [x] Configure Worker R2 binding.
- [x] Upload images.
- [x] Upload worksheets.
- [x] Upload datasets.
- [x] Upload downloadable lesson resources.
- [x] Store asset metadata in D1.
- [x] Serve assets safely.
- [x] Validate MIME types.
- [x] Add file-size limits.
- [x] Generate safe object keys.
- [x] Prevent dangerous file execution.
- [x] Handle asset deletion.
- [x] Find/remove orphaned assets.
- [ ] Add multipart upload only if large files eventually require it.

YouTube should continue handling lesson videos unless there is a reason to change that.

---

## 15. Content-Production Workflow

For every lesson:

- [ ] Open Arabic official lesson.
- [ ] Open English official lesson.
- [ ] Identify required concepts.
- [ ] Identify terminology.
- [ ] Identify important examples.
- [ ] Identify expected skills.
- [ ] Decide lesson structure.
- [ ] Write original Arabic explanation.
- [ ] Write/adapt English version if the product requires it.
- [ ] Create diagrams/images.
- [ ] Add code samples.
- [ ] Decide whether an interactive genuinely improves the lesson.
- [ ] Build/configure interactive if needed.
- [ ] Create question bank.
- [ ] Create answer explanations.
- [ ] Record YouTube lesson.
- [ ] Add YouTube video ID.
- [ ] Preview lesson.
- [ ] Compare coverage against official source material.
- [ ] Test Arabic rendering.
- [ ] Test English rendering.
- [ ] Publish.
- [ ] Move to the next lesson.

### Production Loop

```text
Official lesson sources
        ↓
Author our lesson
        ↓
Create video
        ↓
Add useful interactive
        ↓
Create questions
        ↓
Review
        ↓
Publish
        ↓
Next lesson
```

---

## 16. Content Quality System

- [x] Define lesson-writing template.
- [x] Define Arabic terminology rules.
- [x] Define English terminology rules.
- [x] Define bilingual terminology consistency rules.
- [x] Define question-writing guidelines.
- [x] Define difficulty levels.
- [x] Define answer-explanation standards.
- [x] Define image/diagram style.
- [x] Define video format/style.
- [x] Define interactive-design rules.
- [x] Create correction workflow for content mistakes.
- [x] Review licensing/reuse rules for Ministry textbook material.
- [x] Prefer original explanations, diagrams, activities, and questions unless reproduction rights are clear.

---

## 17. Search and Navigation

MVP:

- [x] Course navigation.
- [x] Lesson navigation.
- [ ] Previous lesson.
- [ ] Next lesson.
- [ ] Continue where I left off.

Later:

- [ ] Search lessons.
- [ ] Search concepts.
- [ ] Search question bank.
- [ ] Filter lessons.
- [ ] Keyboard navigation.

Do not add a separate search service until the data size/requirements justify it.

---

## 18. PWA / Offline Support

Not required for the first internal release, but valuable later.

- [ ] Web app manifest.
- [ ] Installable PWA.
- [ ] Service worker.
- [ ] Cache application shell.
- [ ] Cache selected lessons.
- [ ] Offline indicator.
- [ ] Download lesson/course for offline study.
- [ ] Safely update cached content.
- [ ] Avoid stale-content confusion.
- [ ] Test offline behavior on mobile.

---

## 19. Accessibility

- [ ] Keyboard navigation.
- [x] Semantic headings.
- [x] Associated form labels.
- [x] Accessible names for icon-only buttons.
- [x] Localized image alt text.
- [ ] Adequate color contrast.
- [ ] Visible focus states.
- [x] Screen-reader-friendly question feedback.
- [x] Do not rely on color alone for correct/incorrect.
- [ ] Appropriate touch target sizes.
- [ ] Captions/subtitles for videos where practical.
- [ ] Test RTL accessibility.

---

## 20. Mobile / Responsive UX

- [x] Phone layout.
- [x] Tablet layout.
- [x] Desktop layout.
- [x] Responsive video player.
- [x] Responsive code editor.
- [ ] Responsive tables.
- [ ] RTL mobile testing.
- [x] Question UI suitable for small screens.
- [ ] Avoid unnecessarily large downloads.
- [ ] Test on slow connections.
- [ ] Test touch interactions for interactives.

---

## 21. Security

- [x] Keep secrets out of frontend code.
- [x] Access D1 only through Worker backend.
- [ ] Restrict R2 write access to trusted backend/admin paths.
- [x] Validate API inputs.
- [x] Validate JSON loaded from D1.
- [x] Never execute arbitrary JavaScript from lesson content.
- [x] Never blindly render unsafe database HTML.
- [ ] Restrict upload MIME types.
- [ ] Restrict upload sizes.
- [ ] Add appropriate security headers.
- [x] Protect admin routes.
- [x] Protect write endpoints.
- [ ] Review dependencies for vulnerabilities.
- [ ] Create backup/export plan for authored content.

---

## 22. Testing

### Unit Tests

- [x] MCQ grading.
- [x] True/false grading.
- [x] Short-answer grading.
- [ ] Lesson block validation.
- [ ] Interactive registry.
- [ ] Localization helpers.
- [ ] Local progress/storage functions.

### Database / API Tests

- [ ] Course ordering.
- [x] Lesson ordering.
- [ ] Published-content filtering.
- [ ] One-lesson question scope.
- [ ] Multi-lesson question scope.
- [x] Multi-lesson deduplication.
- [x] Course-wide questions.
- [x] Standardized question-difficulty validation.
- [ ] Invalid IDs/slugs.
- [ ] Invalid query parameters.
- [ ] Invalid stored JSON handling.

### UI Tests

- [ ] English layout.
- [ ] Arabic RTL layout.
- [ ] Home page.
- [ ] Course page.
- [ ] Lesson page.
- [ ] Question session.
- [ ] Mobile viewport.
- [ ] Unknown lesson block.
- [ ] Unknown interactive.
- [ ] Missing YouTube video.
- [ ] Network/API error state.

Later:

- [ ] End-to-end browser tests for critical journeys.

---

## 23. Performance

- [ ] Keep initial JS bundle reasonable.
- [ ] Lazy-load heavy interactives.
- [ ] Lazy-load code editors.
- [ ] Lazy-load Pyodide if introduced.
- [ ] Resize/compress lesson images.
- [ ] Cache static assets appropriately.
- [x] Avoid loading every course question when unnecessary.
- [ ] Monitor D1 rows read/write.
- [ ] Measure slow D1 queries.
- [ ] Add indexes based on real query patterns.
- [ ] Test on slower mobile devices/connections.
- [ ] Avoid `ORDER BY RANDOM()` for large question-bank sampling.

---

## 24. Error Handling

- [ ] Course-not-found page.
- [ ] Lesson-not-found page.
- [x] API failure state.
- [ ] Offline/network failure state.
- [x] Missing image state.
- [ ] Missing video state.
- [x] Invalid lesson block state.
- [ ] Invalid question state.
- [x] Failed interactive state.
- [ ] Retry actions where appropriate.
- [ ] Keep errors understandable in Arabic and English.

---

## 25. Observability and Operations

Start simple:

- [ ] Worker request/error logs.
- [ ] Deployment visibility.
- [x] Database migration procedure.
- [ ] Database export/backup procedure.
- [ ] Rollback procedure.
- [ ] Content correction procedure.
- [ ] Basic uptime/error monitoring.
- [ ] Separate development and production configuration.

Later:

- [ ] Privacy-respecting product analytics.
- [ ] Lesson completion metrics.
- [ ] Question difficulty/success metrics.
- [ ] Frontend error monitoring.
- [ ] API performance monitoring.

---

## 26. Production Deployment

- [ ] Create/configure Cloudflare project.
- [ ] Create production D1 database.
- [ ] Configure production D1 binding.
- [ ] Apply production migrations.
- [ ] Seed real course records.
- [ ] Create R2 bucket.
- [ ] Configure R2 binding.
- [ ] Configure custom domain.
- [ ] Verify `/api/*` routes to Worker.
- [ ] Verify SPA fallback for client-side routes.
- [ ] Configure admin protection.
- [x] Build production bundle.
- [x] Verify `subjects-content/` is not in the production output.
- [ ] Smoke-test production API.
- [ ] Smoke-test student UI.
- [ ] Test Arabic.
- [ ] Test English.
- [ ] Test mobile.
- [ ] Test admin.
- [ ] Test draft vs published behavior.
- [ ] Document deployment process.
- [ ] Document migration process.
- [ ] Document rollback process.

---

## 27. Public-Site Essentials

Before public launch:

- [ ] Final platform name.
- [ ] Logo.
- [ ] Favicon.
- [ ] App icons.
- [ ] About page.
- [ ] Contact method.
- [ ] Privacy policy.
- [ ] Terms/usage rules where appropriate.
- [ ] Copyright/content notice.
- [ ] Page metadata.
- [ ] Open Graph metadata.
- [ ] Sitemap if public indexing is desired.
- [ ] Robots configuration.
- [ ] Custom 404 page.

---

## 28. Deliberately Out of Scope for the Initial Product

Do **not** make these prerequisites for launch:

- [ ] Student accounts.
- [ ] Google login.
- [ ] Cloud progress synchronization.
- [ ] Teacher accounts.
- [ ] Parent accounts.
- [ ] AI tutor.
- [ ] RAG over textbooks.
- [ ] AI grading.
- [ ] Personalized recommendations.
- [ ] Adaptive learning.
- [ ] Gamification.
- [ ] Leaderboards.
- [ ] Certificates.
- [ ] Payments/subscriptions.
- [ ] Native mobile applications.
- [ ] Discussion/comments.
- [ ] Live classes.
- [ ] Complex analytics.
- [ ] Microservices.
- [ ] Vector database.

---

# Recommended Build Milestones

## Milestone 1 — Foundation

- [x] React/Vite application works locally.
- [x] Cloudflare Worker + Hono works locally.
- [x] D1 is configured.
- [x] Database migrations work.
- [x] Courses work.
- [x] Lessons work.
- [x] Lesson blocks work.
- [x] Basic read API works.
- [x] Development seed data works.
- [x] Build, typecheck, and tests pass.

**Goal:** Prove `React → Hono → D1 → React`.

---

## Milestone 2 — Student MVP

- [x] Home/course navigation.
- [x] Bilingual UI.
- [x] Arabic RTL.
- [x] Generic lesson renderer.
- [x] YouTube player.
- [x] Basic question engine.
- [ ] One/multi/course question scopes.
- [x] Local progress.
- [x] Mobile baseline.

**Goal:** A student can open a course, learn a lesson, practice, and continue.

---

## Milestone 3 — One Excellent Real Lesson

- [ ] Pick one real curriculum lesson.
- [ ] Author original lesson content.
- [ ] Add real video or video placeholder.
- [ ] Add question bank.
- [ ] Add one useful interactive.
- [ ] Review against Arabic and English source material.
- [ ] Test on desktop/mobile.
- [ ] Test Arabic/English.
- [ ] Publish internally.

**Goal:** Prove the actual learning experience, not just the software architecture.

---

## Milestone 4 — Admin CMS

- [x] Protect admin.
- [x] Course management API.
- [x] Lesson management API.
- [x] Block authoring API.
- [x] Question-bank authoring API.
- [ ] R2 image/file uploads.
- [ ] Draft/preview/publish workflow.
- [x] Public API remains published-content-only.

**Goal:** Normal content changes no longer require a code deployment.

---

## Milestone 5 — Content Production

- [x] Establish authoring standards.
- [ ] Work lesson-by-lesson through First Secondary.
- [ ] Work lesson-by-lesson through Second Secondary.
- [ ] Record corresponding videos.
- [ ] Build reusable interactives only when lessons require them.
- [ ] Grow question bank continuously.
- [ ] Review/correct published content continuously.

**Goal:** Turn the platform foundation into a complete curriculum product.

---

## Milestone 6 — Launch Quality

- [ ] Mobile polish.
- [ ] Accessibility.
- [ ] Security review.
- [ ] Performance review.
- [ ] Production deployment.
- [ ] Admin security.
- [ ] Error monitoring.
- [ ] Backup/restore process.
- [ ] Legal/content-rights review.
- [ ] Public-site essentials.
- [ ] PWA/offline support if it materially improves launch value.

**Goal:** Make the product reliable enough for real students.

---

# Definition of the First Useful Release

The first useful release does **not** require every item above.

A reasonable first release is ready when:

- [x] Both course containers exist.
- [ ] The platform runs reliably in production.
- [ ] Arabic and English work correctly.
- [ ] Lessons can be authored and published without rebuilding the application.
- [x] Lesson pages support video, static material, and optional interactives.
- [ ] Students can practice lesson/multi-lesson/course question banks.
- [x] Student progress survives refreshes locally.
- [x] Admin writes are protected.
- [ ] At least a useful initial set of real lessons has been published.
- [ ] Mobile experience is usable.
- [ ] Critical errors/security issues have been addressed.

Everything else can grow after students start using the platform.

---

## Technical Reference Notes

The current Cloudflare Workers Vite integration supports React/Vite SPAs with an integrated Worker API, local Workers-runtime development, bindings, static assets, and unified deployment. D1 indexes should be added around real, frequently filtered or joined columns rather than indiscriminately; use actual query patterns and `EXPLAIN QUERY PLAN` when tuning.

Useful official references:

- Cloudflare Workers Vite plugin: https://developers.cloudflare.com/workers/vite-plugin/
- React + Vite on Workers: https://developers.cloudflare.com/workers/framework-guides/web-apps/react/
- Workers Static Assets: https://developers.cloudflare.com/workers/static-assets/
- Cloudflare D1 best practices: https://developers.cloudflare.com/d1/best-practices/
- D1 indexes: https://developers.cloudflare.com/d1/best-practices/use-indexes/
