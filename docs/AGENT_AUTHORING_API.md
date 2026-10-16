# Agent authoring (remote MCP)

The teacher writes content with local AI agents (Claude Code, Codex,
Antigravity). They connect to a remote MCP server on the existing Worker and
can create, edit, and publish courses, lessons, blocks, questions, and assets.
No AI model runs inside the platform.

```text
Local agent ──MCP over HTTPS──▶ /api/mcp (Worker) ──▶ worker/services/authoring.ts ──▶ D1 + private R2
Browser CMS ──/api/admin/*────▶ worker/routes/admin.ts ─┘
```

Both write paths call the same authoring service, so agents get exactly the
same validation and invariants as the browser CMS, and every write lands in
`audit_log`.

## Boundaries

- Agents **never** receive Cloudflare API tokens, Wrangler credentials, or
  direct D1/R2 access. `/api/mcp` is the only agent write path.
- `/api/mcp` accepts only `Authorization: Bearer pai_agent_…`. Browser session
  cookies are ignored there, and admin routes do not accept agent tokens.
- Errors keep the platform shape `{ "error": { "code", "message" } }`. MCP tool
  errors return that JSON with `isError: true`, plus an `issues` list of
  `path: message` strings for validation failures.
- Student-facing text is bilingual `{ "ar": "…", "en": "…" }`; Arabic renders RTL.
- Rich text is safe Markdown: raw HTML stays text and Markdown images are not
  rendered (use image blocks). Agents must write original material and never
  copy textbook content.
- Agents cannot hard-delete courses, lessons, or questions; they archive with
  `set_status`. Only a single lesson block can be deleted (`delete_block`), and
  `replace_lesson_blocks` replaces a lesson's whole block list.

## Tokens and audit

- The admin creates one token per agent at **`/admin/agents`** (for example
  `claude-code`, `codex`, `antigravity`). The plaintext token is shown once;
  D1 keeps only its SHA-256 hash (`agent_tokens.token_hash`). The tokens are 32
  random bytes, so a slow hash adds nothing.
- Revoking takes effect on the next request (`401 AGENT_AUTH_REQUIRED`).
  `last_used_at` is updated on every authenticated request.
- `audit_log` records the actor (admin or agent, with its name), action,
  entity, and a short summary for every write. The latest entries are shown on
  `/admin/agents`.

Admin API (browser session only):

| Purpose | Endpoint |
| --- | --- |
| List tokens | `GET /api/admin/agent-tokens` |
| Create a token (returns `{ token, agent }` once) | `POST /api/admin/agent-tokens` `{ "name" }` |
| Revoke | `POST /api/admin/agent-tokens/:id/revoke` |
| Recent audit entries | `GET /api/admin/audit?limit=1..500` |
| Student-view data for any lesson status | `GET /api/admin/lessons/:id/preview` |

## MCP endpoint

`POST /api/mcp`: stateless Streamable HTTP with JSON responses, one server
per request and no session or Durable Object. It is implemented with
`@modelcontextprotocol/sdk`'s `McpServer` and
`WebStandardStreamableHTTPServerTransport` in `worker/mcp/server.ts`.

| Category | Tools |
| --- | --- |
| Read | `get_content_guide`, `list_courses`, `get_course`, `list_lessons`, `get_lesson`, `search_questions`, `get_question`, `list_assets` |
| Courses and lessons | `create_course`, `update_course`, `create_lesson`, `update_lesson` |
| Blocks | `replace_lesson_blocks` (main bulk tool, one D1 batch), `add_block`, `update_block`, `delete_block`, `reorder_blocks` |
| Questions | `create_question`, `create_questions_bulk` (1–50, all-or-nothing), `update_question` |
| Publishing | `set_status` for a course, lesson, or question: `draft`, `published`, or `archived` |
| Assets | `upload_asset` (base64; same MIME and size rules as the CMS upload) |

`get_content_guide` returns the exact block and question JSON shapes, the
registered interactive components and their props, the asset limits, and the
authoring rules. Agents should call it first.

After an agent writes a draft, open **View as student** in the CMS lesson
editor (`/admin/lessons/:id/preview`) to check it in Arabic and English before
publishing.

## Connecting agents

Use your deployed origin, or `http://localhost:5173` while running `npm run dev`.
Keep each token in that agent's secret or environment storage, never in a repository.

### Claude Code

```bash
claude mcp add --transport http pai https://<host>/api/mcp \
  --header "Authorization: Bearer pai_agent_…"
```

### Codex (`~/.codex/config.toml`)

```toml
[mcp_servers.pai]
url = "https://<host>/api/mcp"
bearer_token_env_var = "PAI_AGENT_TOKEN"
```

Then `export PAI_AGENT_TOKEN=pai_agent_…` in the shell that runs Codex.

### Antigravity (MCP servers → raw config, `mcp_config.json`)

```json
{
  "mcpServers": {
    "pai": {
      "serverUrl": "https://<host>/api/mcp",
      "headers": { "Authorization": "Bearer pai_agent_…" }
    }
  }
}
```

Client configuration formats change between releases. If a field name above is
rejected, check that client's current MCP documentation for a remote "streamable
HTTP" server with a custom header.

## Recommended authoring prompt

> You are authoring for the PAI Education platform through the `pai` MCP server.
> First call `get_content_guide` and follow it exactly. Then call `list_courses`
> and `list_lessons` to see what exists.
>
> Write **original** bilingual content (Egyptian-school Arabic and clear
> English) for the lesson "<topic>" in course <courseId>, for <grade> students.
> Create the lesson as **draft**. Write its blocks in one `replace_lesson_blocks`
> call: objectives, then one idea at a time with worked examples, code blocks
> where relevant, one or two callouts, a registered interactive only if it
> really helps, and a recap. Then add 6–10 questions with
> `create_questions_bulk`, mapped to this lesson, with a mix of easy, medium,
> and hard difficulties and an explanation for each.
>
> Do not publish. Report the lesson id and a short summary so I can check it
> with "View as student".

Ask the agent to publish with `set_status` only after the check.
