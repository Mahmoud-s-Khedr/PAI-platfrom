# Architecture

```text
Browser
  ↓
React SPA (Vite)
  ↓ same-origin /api/*
Hono Cloudflare Worker
  ↓ DB binding             ↓ ASSET_BUCKET binding
Cloudflare D1              Private Cloudflare R2
```

The official `@cloudflare/vite-plugin` runs the Worker in `workerd` during `npm run dev`; it is not a Node-only API replacement. `wrangler.jsonc` routes `/api/*` to the Worker first and uses SPA fallback for browser routes such as `/courses/first-secondary`.

The UI is a deliberately small student-facing SPA:

- `/` loads published courses from the API.
- `/courses/:courseSlug` loads a course and ordered published lessons.
- `/courses/:courseSlug/lessons/:lessonSlug` loads the generic lesson/block renderer and lesson-scoped questions.

`src/lib/types.ts` is shared by browser and Worker mapping code. D1 JSON columns are parsed at the Worker boundary. A lesson is one bilingual entity: localized fields contain both Arabic and English; the browser language preference switches presentation and sets `dir="rtl"` for Arabic.

## Content safety

The Phase 1 rich-text block stores a localized `{ "ar", "en" }` safe Markdown string and renders CommonMark with GFM tables. Supported authoring features are headings, paragraphs, emphasis, ordered/unordered/task lists, links, inline code, fenced code, and tables. Fenced code and dedicated code blocks share syntax highlighting for Python, JavaScript, TypeScript, JSON, HTML, CSS, and Bash; unrecognized languages render as escaped plain text.

Rich text is still untrusted D1 content. The renderer skips raw HTML, does not use an HTML parser or `dangerouslySetInnerHTML`, suppresses Markdown images, and only makes relative same-site, `http:`, `https:`, and `mailto:` URLs clickable. External HTTP(S) links open with `rel="noopener noreferrer"`. Images remain the dedicated image-block feature, and interactive block names are resolved only through a hardcoded frontend registry. D1 never supplies JavaScript for execution; unknown block/component types show a contained notice rather than breaking the lesson page.

## Student state

Language, completed lesson IDs, last-opened lesson, question-attempt/outcome counts, and a bounded list of recent mistakes are local-only. `src/storage/student-state.ts` is the small boundary around localStorage, so a later IndexedDB implementation need not affect pages or question rendering. No accounts or server-side progress exist in this phase.

Public navigation search is served by `GET /api/search?q=…`, backed directly by
D1 rather than a separate search service. It is bounded, filters strictly to
published courses/lessons/questions, and returns question prompts without
answers. The Worker also generates `/robots.txt` and `/sitemap.xml` from
published routes; those two paths run before static SPA assets.

## Managed lesson assets

R2 holds uploaded image and downloadable-file binaries; D1 holds generated keys
and validated metadata. The bucket has no public domain. `GET /api/assets/:id`
serves an asset only when it is linked from a published lesson in a published
course; authenticated administrators may preview draft or orphaned assets.
Files are never stored in D1.

## Source PDFs

`subjects-content/` is intentionally outside both `src/` and `public/`, and is never imported by Vite or Worker code. It remains internal authoring material and is not included in the frontend build.
