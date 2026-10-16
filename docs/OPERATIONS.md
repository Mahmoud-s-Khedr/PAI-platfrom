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
npm run db:backup -- --remote /protected/pai-backups
```

The export contains content and account metadata, so encrypt it at rest, restrict access, set a retention period, and never commit it. D1 data alone is not a complete asset backup: record the associated R2 object keys and maintain a separately access-controlled R2 replication/export through the bucket’s S3-compatible API. Periodically restore an export into an isolated test database and verify an authored course, lesson, and linked asset; an untested backup is not a recovery plan.

The backup command requires an explicit `--local` or `--remote`, refuses repository destinations (including symlinks), and creates a unique private directory with restrictive file permissions. It never overwrites a previous backup. Use an encrypted backup volume; filesystem permissions alone do not provide encryption. A failed export can leave partial output and must not be treated as a usable backup.

At launch, the operator should schedule a daily D1 export and daily private-R2 copy using an external scheduler with restricted credentials. Retain 30 daily copies and 12 monthly copies in a separate access-controlled location. Record the Worker version, latest migration, export timestamp, and R2 inventory with each backup. No production schedule or resources are created by this repository change.

Once a month, restore a matched D1/R2 backup into an isolated environment. Compare course, lesson, block, question, mapping, and asset counts; load a lesson and download an asset as a student, verify draft filtering, and verify admin access. Record the outcome and time taken. Rotate/revoke restored sessions and agent tokens before making a restored environment reachable.

For a **local-only D1 restore drill**, first export the local database, then import it into a new temporary persistence directory; leave the normal `.wrangler/state/` untouched:

```bash
npm run db:backup -- --local /protected/pai-backups
# Replace <backup> with the unique directory printed by the command.
restore_dir=$(mktemp -d)
npx wrangler d1 execute pai-platform --local --persist-to="$restore_dir" --file=/protected/pai-backups/<backup>/database.sql
npx wrangler d1 execute pai-platform --local --persist-to="$restore_dir" --command="PRAGMA foreign_key_check; SELECT COUNT(*) AS lessons FROM lessons; SELECT COUNT(*) AS assets FROM assets;"
```

Keep the protected source export until the drill is recorded. This drill validates D1 export/import only; R2 recovery and production scheduling still require operator verification during deployment.

## Response security and abuse limits

`public/_headers` protects static pages; Worker middleware applies the same baseline to APIs and protected admin responses. Headers disable MIME sniffing, framing, camera/microphone/geolocation, object embeds, cross-origin form submissions, and foreign base URLs. HTTPS responses also enable HSTS. This baseline CSP does not restrict script sources; safe Markdown rendering and upload MIME restrictions remain necessary. The referrer policy preserves the origin information required by YouTube playback. Uploaded files keep their stricter `sandbox` CSP. Auth, admin, and MCP responses use `Cache-Control: no-store`.

Cloudflare rate-limit bindings allow 10 sign-in requests per minute (password and Google OAuth combined) and 120 authoring requests per minute (admin writes and MCP combined), per edge address and Cloudflare location. Exceeding a limit returns HTTP 429 with the standard JSON error and `Retry-After: 60`. Limiter failure prevents sensitive requests from proceeding. The edge-provided address is hashed with a daily prefix and used only for transient abuse counters; the app does not log the address or key or store either in D1/R2. Shared networks can share a limit; tune these settings after observing real admin usage. Public student reads and session checks do not consume these limits.

Namespace IDs `1001` and `1002` in `wrangler.jsonc` must be unique to this application's production rate limits within the Cloudflare account; use different IDs for any staging deployment. These limits are approximate and location-specific, not a global quota. Review the [Cloudflare rate-limit binding documentation](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) when changing them. Static and Worker headers need separate configuration as described in [Cloudflare's headers documentation](https://developers.cloudflare.com/workers/static-assets/headers/).

Run `npm audit` before releases. The Phase 3 dependency update uses compatible lockfile upgrades, without forced major upgrades or overrides.

## Rollback and content correction

For a code-only incident, first confirm the current and prior version, then use the Cloudflare dashboard deployment rollback or:

```bash
npx wrangler rollback --name pai-platform --message "Rollback: <incident reference>"
```

Worker rollback does **not** undo D1 or R2 changes. Do not attempt to rewrite or delete an applied migration. Instead, make a new corrective migration or restore only the reviewed data from the protected export in a maintenance window. Re-run the smoke checks immediately after either action.

For a content error, prefer the protected admin workflow: set unsafe content to draft/archive, correct and preview it, then publish. For a bulk correction, take an export first, validate affected course/lesson/question IDs, execute the smallest reversible change, and document the before/after IDs and operator.

## Monitoring and privacy

Configure an external uptime monitor to make a GET request to `/api/health` at least every five minutes and alert the on-call owner after consecutive failures. Alert on Worker exceptions and a sustained rise in 5xx responses; inspect the deployment version and recent migrations first.

Later analytics must be opt-in where required, aggregate-only, and avoid names, email addresses, IP addresses, full URLs, free-text answers, or stable cross-site identifiers. Measure learning outcomes only after documenting purpose, retention, access, and student privacy protections.
