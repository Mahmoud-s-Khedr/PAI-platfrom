-- Editorial governance is kept separate from student-facing lesson content.
-- Values are validated at the Worker mapping boundary before admin use.
CREATE TABLE lesson_production_metadata (
  lesson_id INTEGER PRIMARY KEY,
  source_references_json TEXT NOT NULL DEFAULT '{}',
  terminology_notes_json TEXT NOT NULL DEFAULT '{}',
  lesson_structure_json TEXT NOT NULL DEFAULT '{}',
  coverage_comparison_notes_json TEXT NOT NULL DEFAULT '{}',
  checklist_json TEXT NOT NULL DEFAULT '{}',
  interactive_decision_json TEXT NOT NULL DEFAULT '{}',
  original_work_attested INTEGER NOT NULL DEFAULT 0 CHECK (original_work_attested IN (0, 1)),
  correction_reason_json TEXT NOT NULL DEFAULT '{}',
  self_certified_by_user_id INTEGER,
  self_certified_by_display_name TEXT,
  self_certified_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  FOREIGN KEY (self_certified_by_user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Existing records are development/demo material. They intentionally start with
-- empty evidence and cannot satisfy the protected publication readiness check.
INSERT INTO lesson_production_metadata (lesson_id)
SELECT id FROM lessons;

-- Phase 1 uses a fixed editorial difficulty vocabulary. This is a data
-- migration; request validation prevents non-standard values going forward.
UPDATE questions SET difficulty = 'easy' WHERE difficulty = 'beginner';

-- The original table predates the controlled vocabulary. Keep direct D1
-- writers from bypassing the API validator with an arbitrary difficulty.
CREATE TRIGGER questions_require_standard_difficulty_on_insert
BEFORE INSERT ON questions
FOR EACH ROW WHEN NEW.difficulty NOT IN ('easy', 'medium', 'hard')
BEGIN
  SELECT RAISE(ABORT, 'Question difficulty must be easy, medium, or hard');
END;

CREATE TRIGGER questions_require_standard_difficulty_on_update
BEFORE UPDATE OF difficulty ON questions
FOR EACH ROW WHEN NEW.difficulty NOT IN ('easy', 'medium', 'hard')
BEGIN
  SELECT RAISE(ABORT, 'Question difficulty must be easy, medium, or hard');
END;
