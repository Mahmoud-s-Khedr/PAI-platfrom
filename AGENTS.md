# PAI Education Platform — Agent Guide

## Project purpose

This is the Phase 1 foundation for an Egyptian secondary-school Programming & Artificial Intelligence learning platform. It is a small student-facing application, not a content-import pipeline.

- `subjects-content/` contains internal PDF reference material only. Do not import, serve, parse, bundle, extract, or seed textbook content from it.
- Existing database seed content is explicitly development/demo material. Keep that distinction clear in code and documentation.
- The app supports Arabic and English. Arabic must remain right-to-left.

## Architecture

```text
React SPA (src/) → same-origin /api/* → Hono Worker (worker/) → Cloudflare D1 + private R2
```

- The UI uses React, TypeScript, Vite, React Router, Tailwind CSS, and locally owned shadcn/ui components in `src/components/ui`; prefer those components over new custom primitives.
- The Worker runs through `@cloudflare/vite-plugin` in local `workerd`, not a Node API mock.
- `src/lib/types.ts` defines the API/domain shapes shared by browser and Worker mapping code.
- `src/storage/student-state.ts` is the only browser-storage boundary. Student state is local only; there are no accounts or server-side progress records in this phase.
- The public API is read-only. Preserve the JSON error shape: `{ error: { code, message } }`.
- `/api/*` must continue to route to the Worker; client application routes use SPA fallback. Preserve `assets.run_worker_first: ["/api/*"]` and `assets.not_found_handling: "single-page-application"` unless routing requirements explicitly change.
- When changing `wrangler.jsonc`, Vite/Cloudflare configuration, or asset routing, verify both an API request and direct navigation to a client-side route.
- Do not casually remove or alter these API and SPA routing settings.

## Source layout

| Path | Responsibility |
| --- | --- |
| `src/app/` | App entry, routing, layout, language provider |
| `src/pages/` | Home, course, and lesson screens |
| `src/lesson-blocks/` | Safe rendering for database-backed lesson blocks |
| `src/interactives/` | Hardcoded interactive-component registry |
| `src/question-engine/` | Question UI and grading logic |
| `src/lib/` | Shared types, API client, utilities |
| `src/storage/` | Local student-state abstraction |
| `worker/routes/` | HTTP endpoints and input validation |
| `worker/db/` | D1 queries and database-to-domain mapping |
| `migrations/` | Immutable, ordered D1 schema migrations |
| `scripts/seed.sql` | Idempotent demo data only |
| `tests/` | Focused Vitest unit tests |

## Development workflow

Use npm; `package-lock.json` is committed.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

Routine checks after a code change:

```bash
npm test
npm run typecheck
npm run build
```

- Run `npm run cf-types` when changing `wrangler.jsonc` bindings, and keep generated Worker types synchronized with that configuration. `npx wrangler types --check` (already included in `npm run typecheck`) can verify they are not stale without rewriting them.
- `.wrangler/state/` contains ephemeral local binding state, including D1; it is safe to delete only when intentionally resetting the local Cloudflare environment. Never confuse it with production data, and never use `--remote` for ordinary development.
- Keep `.wrangler/` covered by `.gitignore`; local state must never be committed.
- Remote migrations and deployment are deliberate operations. Follow `docs/PRODUCTION_DEPLOYMENT.md`; do not deploy or seed remote D1 unless explicitly asked.

## Implementation conventions

- Keep UI copy bilingual. Use `useLanguage()` and localized `{ ar, en }` data instead of hardcoding an English-only student-facing string.
- Preserve `document.documentElement.lang` and `dir` behavior in `src/app/language.tsx`; use RTL-aware Tailwind utilities where directional styling is needed.
- Favor concise, contextual UI. Do not add decorative badges, duplicate labels, or development-status copy unless it communicates an actionable state.
- Keep accessibility intact: inputs need associated labels or an `aria-label`; icon-only controls need accessible names; meaningful images need localized alt text.
- Keep page components focused on orchestration. Put reusable content rendering in `lesson-blocks/`, interactions in `interactives/`, and grading rules in `question-engine/`.
- TypeScript types do not validate JSON at runtime. Validate request inputs in Worker routes and parse and validate D1 JSON at the database-to-domain mapping boundary.
- Treat `data_json`, `prompt_json`, `answer_json`, `explanation_json`, `metadata_json`, and similar stored JSON as untrusted. Handle invalid stored JSON in a controlled way before exposing typed domain/API objects.
- Avoid scattered unchecked `JSON.parse(...) as SomeType` casts; centralize mapping and validation where practical.
- `rich-text` blocks are localized safe Markdown. Keep raw HTML as text; never inject unsafe D1 HTML or execute D1 JavaScript. Markdown images remain disabled in favor of validated image blocks.
- New interactive types must be explicitly registered in `src/interactives/registry.tsx`. Unknown lesson block or interactive types should remain contained with a user-visible notice.
- Existing admin authentication and private-R2 asset delivery are explicitly in scope. Do not add student accounts, server-side student progress, public R2 buckets, or a content-ingestion flow without an explicit scope change.

## Data and API changes

- Add new migrations as the next numbered file in `migrations/`; never rewrite a migration that could already have been applied remotely.
- Update `src/lib/types.ts`, Worker query/mapping code, API client code, and tests together when changing a response shape.
- Maintain published-content filtering and ordered course/lesson results.
- Questions must use exactly one scope (`lesson`, `lessons`, or `course`). `lesson=<id>` returns published questions mapped to that lesson.
- `lessons=<id>,<id>,...` returns the union mapped to any selected lesson, with each question once.
- `course=<slug>` returns every published question owned by that course, including mapped and course-wide questions.
- A question with no `question_lessons` rows is course-wide: it appears in course queries, not lesson queries. See `docs/DATABASE.md`.

## Before handing off

- Run the focused test suite for the affected behavior, then `npm run typecheck` and `npm run build` for implementation changes.
- Confirm the English and Arabic UI still render correctly when changing student-facing screens.
- Mention any skipped verification and why.
- Keep unrelated user changes intact; do not reset or overwrite a dirty worktree.
