-- Asset binaries remain in R2. This table records the only first-class
-- relationship an uploaded asset currently has: an image block that uses it.
-- It makes orphan detection and safe deletion deterministic without parsing
-- arbitrary JSON stored in lesson_blocks.
CREATE TABLE asset_links (
  asset_id INTEGER NOT NULL,
  lesson_block_id INTEGER NOT NULL UNIQUE,
  PRIMARY KEY (asset_id, lesson_block_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE RESTRICT,
  FOREIGN KEY (lesson_block_id) REFERENCES lesson_blocks(id) ON DELETE CASCADE
);

CREATE INDEX idx_asset_links_asset_id ON asset_links(asset_id);
