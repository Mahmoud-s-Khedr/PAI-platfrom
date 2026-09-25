# Operations runbook

This runbook covers the deployed Worker, its production D1 database, and the private R2 asset bucket. It deliberately does not use the development/demo seed in production.

## Environment boundary

Local development uses `npm run dev` with local `workerd`, local D1 state in `.wrangler/state/`, and optional secrets in the ignored `.dev.vars` file. It must never use `--remote` for routine work.

Production operations use the Cloudflare account, Worker secrets, the production D1 binding, and the private `ASSET_BUCKET`. Keep production credentials in Cloudflare secrets or the CI secret store; never copy them into `.dev.vars`, `wrangler.jsonc`, SQL, or an export committed to Git. Before using a non-production deployment environment, define a separate Wrangler environment with separate bindings and regenerate Worker types.

## Logs and deployment visibility

`wrangler.jsonc` already enables Workers Observability and structured API request logging. Logs include method, path without a query string, response status, and duration; do not add cookies, authorization headers, student answers, or other personal data to them.

During an incident, tail only the needed traffic:

```bash
npx wrangler tail pai-platform --status error --format pretty
```

In the Cloudflare dashboard, open **Workers & Pages → pai-platform → Observability** to inspect persisted invocation, custom, and exception logs. Review the live deployment and its version before and after every release:

```bash
npx wrangler deployments list --name pai-platform
npx wrangler versions list --name pai-platform
```

Record the deployed version ID, commit SHA, migration numbers, operator, and the result of the smoke checks in the release record.

## Release and smoke checks

1. Run `npm test`, `npm run typecheck`, and `npm run build` locally.
2. Review pending migrations and make a D1 export before a migration or large content change.
3. Run `npx wrangler deploy --dry-run`, then deploy through the approved release process.
4. Check `/api/health`, `/api/courses`, a course page, and a lesson page by direct navigation. Check both Arabic RTL and English.
5. Watch error logs and the uptime monitor through the initial traffic period.

## Backups and exports

Before a production migration, bulk content edit, or correction, export D1 to a protected, access-controlled location outside the repository:

```bash
npx wrangler d1 export pai-platform --remote --output=./pai-platform-before-change.sql
```

The export contains content and account metadata, so encrypt it at rest, restrict access, set a retention period, and never commit it. D1 data alone is not a complete asset backup: record the associated R2 object keys and maintain a separately access-controlled R2 replication/export through the bucket’s S3-compatible API. Periodically restore an export into an isolated test database and verify an authored course, lesson, and linked asset; an untested backup is not a recovery plan.

## Rollback and content correction

For a code-only incident, first confirm the current and prior version, then use the Cloudflare dashboard deployment rollback or:

```bash
npx wrangler rollback --name pai-platform --message "Rollback: <incident reference>"
```

Worker rollback does **not** undo D1 or R2 changes. Do not attempt to rewrite or delete an applied migration. Instead, make a new corrective migration or restore only the reviewed data from the protected export in a maintenance window. Re-run the smoke checks immediately after either action.

For a content error, prefer the protected admin workflow: set unsafe content to draft/archive, correct and preview it, then publish. For a bulk correction, take an export first, have a second reviewer validate affected course/lesson/question IDs, execute the smallest reversible change, and document the before/after IDs and operator.

## Monitoring and privacy

Configure an external uptime monitor to make a GET request to `/api/health` at least every five minutes and alert the on-call owner after consecutive failures. Alert on Worker exceptions and a sustained rise in 5xx responses; inspect the deployment version and recent migrations first.

Later analytics must be opt-in where required, aggregate-only, and avoid names, email addresses, IP addresses, full URLs, free-text answers, or stable cross-site identifiers. Measure learning outcomes only after documenting purpose, retention, access, and student privacy protections.
