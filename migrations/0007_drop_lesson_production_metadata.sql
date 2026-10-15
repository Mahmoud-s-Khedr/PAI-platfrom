-- The multi-person editorial review process (source evidence, checklist,
-- attestation, self-certification) was retired in favour of the single-admin
-- draft/published/archived workflow. Migration 0005 is left untouched because
-- it may already have been applied; this migration removes its table.
--
-- Before applying remotely to a database that has real rows, back them up:
--   npx wrangler d1 export pai-platform --remote --table=lesson_production_metadata --output=backups/lesson_production_metadata.sql
-- The difficulty triggers created by 0005 are still in use and are kept.
DROP TABLE IF EXISTS lesson_production_metadata;
