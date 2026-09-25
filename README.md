# PAI Education Platform — Phase 1

The Phase 1 foundation for an Egyptian secondary-school Programming & Artificial Intelligence platform. It proves a small end-to-end path: React browser UI → `/api/*` → Hono Worker → Cloudflare D1 → browser.

The `subjects-content/` PDFs are internal authoring/reference material only. This application does not read, process, import, or bundle them. The seeded course, lesson, blocks, and questions are explicitly development/demo data, not textbook content.

## Stack

- React, TypeScript, Vite, React Router
- Cloudflare Vite plugin and Workers runtime (also used in local development)
- Hono API, Cloudflare D1, and a private R2 bucket for managed lesson assets
- localStorage behind a small student-state storage abstraction
- Vitest focused unit tests

## Install and run locally

This repository uses npm and includes `package-lock.json`.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run db:bootstrap-admin:local
npm run dev
```

Open the URL Vite reports (normally `http://localhost:5173`). The Worker runs in Cloudflare's local `workerd` runtime, so the frontend calls the same-origin `/api/*` API and local D1 binding rather than a Node mock.

Useful commands:

```bash
npm test
npm run typecheck
npm run build
npm run preview
npm run cf-types
```

`npm run db:migrate:local` is safe to re-run. The idempotent development seed is `npm run db:seed:local`. Configure the ignored `.dev.vars` first, then use `npm run db:bootstrap-admin:local` to seed the initial admin's password hash; see [authentication setup](docs/AUTHENTICATION.md).

## Public read API

- `GET /api/health`
- `GET /api/courses`
- `GET /api/courses/:slug`
- `GET /api/courses/:slug/lessons`
- `GET /api/lessons/:id`
- `GET /api/questions?lesson=<id>`
- `GET /api/questions?lessons=<id>,<id>`
- `GET /api/questions?course=<course-slug>`
- `GET /api/assets/:id` for assets linked from published lessons (administrators can also preview draft assets)

These public routes are read-only and expose published content only. Bad input and missing resources use a JSON error object with `error.code` and `error.message`. See [database documentation](docs/DATABASE.md) for course-wide question semantics.

## Admin API

Protected authoring endpoints live under `/api/admin/*`; they cover course,
lesson, lesson-block, and question-bank management. They require a Google or
email/password session for a locally assigned `admin` user; browser bearer tokens and
Cloudflare Access identities are not accepted. See the [authentication setup
guide](docs/AUTHENTICATION.md) and [admin API guide](docs/ADMIN_API.md).

## Cloudflare D1 setup and deployment

`wrangler.jsonc` currently contains a deliberately local placeholder D1 UUID. Before a remote deployment:

1. Log in with `npx wrangler login`.
2. Create a database with `npm run db:create`.
3. Copy the returned `database_id` into `wrangler.jsonc` (keep the `DB` binding and `pai-platform` name).
4. Create the private asset bucket: `npx wrangler r2 bucket create pai-platform-assets --location=enam`.
5. Run `npm run db:migrate:remote`.
6. Optionally load the clearly marked demo data with `npm run db:seed:remote`.
7. Run `npm run deploy`.

Keep the R2 bucket private. The Worker validates all uploads and only exposes an
asset publicly when it is linked from a published lesson in a published course.

See [architecture](docs/ARCHITECTURE.md) and [database documentation](docs/DATABASE.md).

For step-by-step operations, use the [local development guide](docs/LOCAL_DEVELOPMENT.md) or [production deployment guide](docs/PRODUCTION_DEPLOYMENT.md).
