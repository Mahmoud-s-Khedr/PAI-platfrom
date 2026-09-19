# Architecture

```text
Browser
  ↓
React SPA (Vite)
  ↓ same-origin /api/*
Hono Cloudflare Worker
  ↓ DB binding
Cloudflare D1
```

The official `@cloudflare/vite-plugin` runs the Worker in `workerd` during `npm run dev`; it is not a Node-only API replacement. `wrangler.jsonc` routes `/api/*` to the Worker first and uses SPA fallback for browser routes such as `/courses/first-secondary`.

The UI is a deliberately small student-facing SPA:

- `/` loads published courses from the API.
- `/courses/:courseSlug` loads a course and ordered published lessons.
- `/courses/:courseSlug/lessons/:lessonSlug` loads the generic lesson/block renderer and lesson-scoped questions.

`src/lib/types.ts` is shared by browser and Worker mapping code. D1 JSON columns are parsed at the Worker boundary. A lesson is one bilingual entity: localized fields contain both Arabic and English; the browser language preference switches presentation and sets `dir="rtl"` for Arabic.

## Content safety

The Phase 1 rich-text block renders database text as text paragraphs. It does **not** inject database HTML or parse raw HTML, avoiding arbitrary HTML execution. Interactive block names are resolved only through a hardcoded frontend registry. D1 never supplies JavaScript for execution; unknown block/component types show a contained notice rather than breaking the lesson page.

## Student state

Language, completed lesson IDs, and question-attempt counts are local-only. `src/storage/student-state.ts` is the small boundary around localStorage, so a later IndexedDB implementation need not affect pages or question rendering. No accounts or server-side progress exist in this phase.

## Future R2

R2 is the intended location for binary lesson assets. D1's `assets.key` will identify an R2 object, and public/delivery URLs can be derived by the future asset-serving layer. Files are not stored in D1 and no R2 bucket is provisioned or used yet.

## Source PDFs

`subjects-content/` is intentionally outside both `src/` and `public/`, and is never imported by Vite or Worker code. It remains internal authoring material and is not included in the frontend build.
