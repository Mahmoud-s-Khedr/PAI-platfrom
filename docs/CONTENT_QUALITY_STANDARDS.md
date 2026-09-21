# Content quality standards

Version 1.0 — 2026-09-21

This standard applies to every authored lesson. It governs original teaching
material; it does not authorize importing, quoting, serving, or extracting the
internal textbook PDFs. Authors may record only an official source identifier,
edition/reference label, and their own high-level coverage notes in the CMS.

## Lesson template

Every bilingual lesson should contain, in an order appropriate for the topic:

1. Learning objectives and prerequisite knowledge.
2. A concept sequence that introduces one idea at a time.
3. Original worked examples and an original Arabic and English explanation.
4. Readable, runnable code where code is part of the objective.
5. A recap and independent practice.

Use short, localized plain-text lesson blocks. Do not store or inject HTML,
textbook excerpts, scans, PDF URLs, or executable JavaScript. Code remains in
dedicated code blocks. The Arabic experience must be reviewed in RTL and the
English experience in LTR.

## Terminology

Record terminology notes in both languages. Choose a consistent Arabic term,
its English equivalent, and any useful paired form on first use. Do not switch
between Arabic translations without explaining a necessary distinction. Keep
code identifiers and language keywords in their original form and explain them
in the surrounding localized text rather than translating code.

## Questions and explanations

Questions and explanations are bilingual, original, and mapped to the lesson
they assess. Use only these difficulty values:

- `easy`: direct recall or a single observed step.
- `medium`: apply one concept or trace a short sequence.
- `hard`: combine concepts, diagnose a result, or complete a non-trivial step.

An explanation should state why the correct answer works and, when helpful,
why a likely alternative does not. A published lesson needs at least one mapped
published question; a useful pilot includes `easy`, `medium`, and `hard`
coverage.

## Diagrams, images, video, and interactives

Use only original diagrams/images or assets with documented permission. Provide
concise Arabic and English alt text for meaningful images; never use a textbook
scan or a page-derived illustration. Test visual order, labels, contrast, and
RTL placement.

The CMS stores a YouTube ID, not a video file. Before publishing, verify that a
real, public lesson video resolves and that its title and presentation support
both language experiences.

An interactive is justified only when it materially helps students practise or
observe something that static explanation cannot. Record either:

- `implemented`, with the exact component registered in `src/interactives/registry.tsx`; or
- `not needed`, with a bilingual rationale.

An interactive must be keyboard reachable, describe its controls and outcome,
avoid unsafe code execution, and work in Arabic RTL and English LTR.

## Review, certification, and corrections

The protected lesson editor records the author’s self-certification against the
currently signed-in admin and the Worker timestamp. It is accountability
evidence, not independent approval. Publishing is blocked until both source
references, author notes, original-work attestation, every checklist item, an
interactive decision, a YouTube ID, self-certification, and a mapped published
question are present.

To correct a draft or published lesson: return it to draft if needed, document
the correction reason, make the correction, rerun all relevant review checks,
self-certify again, and then republish. Never silently replace published
material or use a correction as a route to reproduce a source text.
