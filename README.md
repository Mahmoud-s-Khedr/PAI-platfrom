# PAI Education Platform — Phase 1

The Phase 1 foundation for an Egyptian secondary-school Programming & Artificial Intelligence platform. It proves a small end-to-end path: React browser UI → `/api/*` → Hono Worker → Cloudflare D1 → browser.

The `subjects-content/` PDFs are internal authoring/reference material only. This application does not read, process, import, or bundle them. The seeded course, lesson, blocks, and questions are explicitly development/demo data, not textbook content.

## Stack

- React, TypeScript, Vite, React Router
- Cloudflare Vite plugin and Workers runtime (also used in local development)
- Hono API and Cloudflare D1
- localStorage behind a small student-state storage abstraction
- Vitest focused unit tests

## Install and run locally

This repository uses npm and includes `package-lock.json`.

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
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

`npm run db:migrate:local` is safe to re-run. The idempotent development seed is `npm run db:seed:local`.

## Read API

- `GET /api/health`
- `GET /api/courses`
- `GET /api/courses/:slug`
- `GET /api/courses/:slug/lessons`
- `GET /api/lessons/:id`
- `GET /api/questions?lesson=<id>`
- `GET /api/questions?lessons=<id>,<id>`
- `GET /api/questions?course=<course-slug>`

All routes are read-only. Bad input and missing resources use a JSON error object with `error.code` and `error.message`. See [database documentation](docs/DATABASE.md) for course-wide question semantics.

## Cloudflare D1 setup and deployment

`wrangler.jsonc` currently contains a deliberately local placeholder D1 UUID. Before a remote deployment:

1. Log in with `npx wrangler login`.
2. Create a database with `npm run db:create`.
3. Copy the returned `database_id` into `wrangler.jsonc` (keep the `DB` binding and `pai-platform` name).
4. Run `npm run db:migrate:remote`.
5. Optionally load the clearly marked demo data with `npm run db:seed:remote`.
6. Run `npm run deploy`.

No R2 bucket is required in Phase 1. The `assets` D1 table stores only a future R2 object key and metadata; adding an R2 binding and upload flow is deferred.

See [architecture](docs/ARCHITECTURE.md) and [database documentation](docs/DATABASE.md).

For step-by-step operations, use the [local development guide](docs/LOCAL_DEVELOPMENT.md) or [production deployment guide](docs/PRODUCTION_DEPLOYMENT.md).
