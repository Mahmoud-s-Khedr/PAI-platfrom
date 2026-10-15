# Content quality standards

Version 2.0 — 2026-10-16

This standard applies to every authored lesson, whether the teacher writes it
in the CMS or an AI agent writes it through MCP. It governs original teaching
material; it does not authorize importing, quoting, serving, or extracting the
internal textbook PDFs. It is guidance for the single content owner, not a
gate: the platform does not record evidence or block publishing.

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

Choose a consistent Arabic term,
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
why a likely alternative does not. Aim for at least one mapped published
question per lesson and a mix of `easy`, `medium`, and `hard` coverage.

## Diagrams, images, video, and interactives

Use only original diagrams/images or assets with documented permission. Provide
concise Arabic and English alt text for meaningful images; never use a textbook
scan or a page-derived illustration. Test visual order, labels, contrast, and
RTL placement.

The CMS stores a YouTube ID, not a video file. Before publishing, verify that a
real, public lesson video resolves and that its title and presentation support
both language experiences.

An interactive is justified only when it materially helps students practise or
observe something that static explanation cannot. Use only components
registered in `src/interactives/registry.tsx`.

An interactive must be keyboard reachable, describe its controls and outcome,
avoid unsafe code execution, and work in Arabic RTL and English LTR.

## Checking and corrections

Before publishing, preview the lesson as a student (the CMS lesson editor links
to a draft preview) in Arabic RTL and English LTR, and answer every mapped
question once. Agent-written content gets the same check.

To correct published material, edit it in place or return it to draft first if
the change is large. Never use a correction as a route to reproduce a source
text. Every agent write is recorded in the audit log, and admin writes are
recorded there too.
