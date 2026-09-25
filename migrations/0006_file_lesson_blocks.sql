-- SQLite cannot extend an existing CHECK constraint, so recreate the table
-- while preserving every existing block and its asset-link relationship.
PRAGMA foreign_keys = OFF;

CREATE TABLE lesson_blocks_next (
  id INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rich-text', 'image', 'file', 'code', 'callout', 'interactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE (lesson_id, sort_order)
);

INSERT INTO lesson_blocks_next (id, lesson_id, type, sort_order, data_json, created_at, updated_at)
SELECT id, lesson_id, type, sort_order, data_json, created_at, updated_at
FROM lesson_blocks;

DROP TABLE lesson_blocks;
ALTER TABLE lesson_blocks_next RENAME TO lesson_blocks;

CREATE INDEX idx_lesson_blocks_lesson_id ON lesson_blocks(lesson_id);
CREATE INDEX idx_lesson_blocks_lesson_sort_order ON lesson_blocks(lesson_id, sort_order);

PRAGMA foreign_keys = ON;
