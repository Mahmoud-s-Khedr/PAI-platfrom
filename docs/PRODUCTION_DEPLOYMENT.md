# Production deployment

This guide deploys the React SPA and Hono Worker together to Cloudflare Workers and attaches the production D1 database. It requires a Cloudflare account with Workers and D1 access.

## Before you start

Verify the implementation before touching remote resources:

```bash
npm install
npm test
npm run typecheck
npm run build
```

Do not seed production with the demo SQL unless a temporary demonstration site is intentional. The seed contains clearly marked development content, not authored curriculum content.

## One-time Cloudflare setup

1. Authenticate Wrangler:

   ```bash
   npx wrangler login
   npx wrangler whoami
   ```

2. Create the production D1 database:

   ```bash
   npm run db:create
   ```

3. Wrangler prints a `database_id`. Replace only the placeholder value in `wrangler.jsonc` with that UUID. Keep these values unchanged unless deliberately renaming the resource:

   ```jsonc
   "binding": "DB",
   "database_name": "pai-platform"
   ```

4. Regenerate and verify binding types after the config change:

   ```bash
   npm run cf-types
   npm run typecheck
   ```

Commit the non-secret D1 UUID in `wrangler.jsonc` with the configuration change. Do not put passwords, API tokens, or other secrets in this file.

## Migrate production D1

Review pending remote migrations first:

```bash
npx wrangler d1 migrations list pai-platform --remote
```

Apply them:

```bash
npm run db:migrate:remote
```

Wrangler confirms the planned migration and captures a backup before applying it. If it fails, investigate the reported SQL issue and retry only after correcting the migration.

For an intentionally temporary demo database only, load the demo records:

```bash
npm run db:seed:remote
```

## Deploy

Perform a Cloudflare deployment dry run first:

```bash
npm run build
npx wrangler deploy --dry-run
```

Then deploy the Worker and static SPA assets together:

```bash
npm run deploy
```

Wrangler prints the deployed `workers.dev` URL. Cloudflare routes `/api/*` to the Worker first and falls back to the SPA shell for browser routes.

## Post-deploy verification

Replace `<worker-url>` with the URL Wrangler returns:

```bash
curl https://<worker-url>/api/health
curl https://<worker-url>/api/courses
curl https://<worker-url>/api/courses/first-secondary/lessons
```

Also open these browser routes directly to confirm SPA fallback works:

```text
https://<worker-url>/
https://<worker-url>/courses/first-secondary
https://<worker-url>/courses/first-secondary/lessons/programming-basics-1-python
```

Check that Arabic switches the document to RTL and that no browser network request fails. For operational debugging, use:

```bash
npx wrangler tail pai-platform
```

## Updating an existing deployment

For every release:

1. Add migration files without rewriting migrations already applied remotely.
2. Run local migration, tests, typecheck, and build.
3. Review and apply the remote migrations.
4. Deploy.
5. Verify `/api/health` and critical student routes.

This project currently has no production secrets or R2 binding. When either is added, configure secrets with `wrangler secret put` and add R2 bindings to `wrangler.jsonc`; do not store credentials in the repository.
