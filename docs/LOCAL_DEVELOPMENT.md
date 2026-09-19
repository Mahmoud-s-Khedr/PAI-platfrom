# Local development deployment

This guide runs the complete Phase 1 app locally: the React SPA, Hono Worker, and a persistent local D1 database. It does not require a Cloudflare account or use a remote database.

## Prerequisites

- Node.js 22 or later
- npm (this repository commits `package-lock.json`)

## First run

From the repository root:

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run db:bootstrap-admin:local
npm run dev
```

Open the URL printed by Vite, usually `http://localhost:5173`.

`npm run dev` uses the Cloudflare Vite plugin, which executes the Worker in local `workerd`. The application is therefore exercised through the real same-origin API path:

```text
Browser → /api/* → local Hono Worker → local D1
```

The local D1 state persists under `.wrangler/state/`, which is deliberately ignored by Git. The `database_id` placeholder in `wrangler.jsonc` is sufficient for this local-only workflow.

## Verify the local application

In a second terminal:

```bash
curl http://localhost:5173/api/health
curl http://localhost:5173/api/courses
curl http://localhost:5173/api/courses/first-secondary/lessons
curl http://localhost:5173/api/lessons/1
```

Expected health response:

```json
{"ok":true}
```

In the browser, confirm the two course cards appear, open the First Secondary development lesson, and switch between Arabic and English. The Arabic page should use RTL layout.

## Everyday workflow

Use these commands after pulling changes:

```bash
npm install
npm run db:migrate:local
npm run db:seed:local
npm run db:bootstrap-admin:local
npm test
npm run typecheck
npm run dev
```

The seed script is idempotent and contains development/demo material only. Do not add textbook extracts to it. The separate admin bootstrap command reads `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the ignored `.dev.vars`, stores only a password hash in local D1, and may be rerun to rotate that local credential.

To preview a production build locally:

```bash
npm run preview
```

## Adding a schema migration

1. Add a numbered SQL file to `migrations/`, for example `0002_add_example.sql`.
2. Apply it locally: `npm run db:migrate:local`.
3. Update generated Cloudflare binding types if `wrangler.jsonc` changed: `npm run cf-types`.
4. Run `npm test`, `npm run typecheck`, and `npm run build`.

Only after local verification should that migration be applied to remote D1 as described in [Production deployment](PRODUCTION_DEPLOYMENT.md).

## Troubleshooting

- **`no such table`**: Run `npm run db:migrate:local`, then `npm run db:seed:local`.
- **No demo records**: Run `npm run db:seed:local` again.
- **Unexpected local state**: Local D1 data is intentionally persistent. Stop the dev server and remove only the project’s `.wrangler/state/` directory if you explicitly want to discard all local database state; then rerun migration and seed commands.
- **Binding type error**: Run `npm run cf-types`, then `npm run typecheck`.

Never use `--remote` for routine local development commands.
