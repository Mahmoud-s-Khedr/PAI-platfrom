PRAGMA foreign_keys = OFF;

-- Google sign-in originally required a Google subject. Password-only administrators
-- need the same user record before they have linked a Google account.
CREATE TABLE users_next (
  id INTEGER PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'student')) DEFAULT 'student',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO users_next (id, google_sub, email, display_name, role, created_at, updated_at)
SELECT id, google_sub, email, display_name, role, created_at, updated_at
FROM users;

CREATE TABLE sessions_next (
  id INTEGER PRIMARY KEY,
  token_hash TEXT NOT NULL UNIQUE,
  user_id INTEGER NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users_next(id) ON DELETE CASCADE
);

INSERT INTO sessions_next (id, token_hash, user_id, expires_at, created_at, updated_at)
SELECT id, token_hash, user_id, expires_at, created_at, updated_at
FROM sessions;

DROP TABLE sessions;
DROP TABLE users;
ALTER TABLE users_next RENAME TO users;
ALTER TABLE sessions_next RENAME TO sessions;

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

PRAGMA foreign_keys = ON;

-- Keep the cross-table question/lesson course invariant at the D1 boundary,
-- including future non-HTTP writers.
CREATE TRIGGER question_lessons_require_matching_course
BEFORE INSERT ON question_lessons
FOR EACH ROW
WHEN (SELECT course_id FROM questions WHERE id = NEW.question_id) !=
     (SELECT course_id FROM lessons WHERE id = NEW.lesson_id)
BEGIN
  SELECT RAISE(ABORT, 'Question and lesson must belong to the same course');
END;

CREATE TRIGGER lessons_cannot_change_course_with_mapped_questions
BEFORE UPDATE OF course_id ON lessons
FOR EACH ROW
WHEN NEW.course_id != OLD.course_id
 AND EXISTS (
   SELECT 1
   FROM question_lessons ql
   JOIN questions q ON q.id = ql.question_id
   WHERE ql.lesson_id = OLD.id AND q.course_id != NEW.course_id
 )
BEGIN
  SELECT RAISE(ABORT, 'Unmap questions before moving a lesson to another course');
END;

CREATE TRIGGER questions_cannot_change_course_with_mapped_lessons
BEFORE UPDATE OF course_id ON questions
FOR EACH ROW
WHEN NEW.course_id != OLD.course_id
 AND EXISTS (
   SELECT 1
   FROM question_lessons ql
   JOIN lessons l ON l.id = ql.lesson_id
   WHERE ql.question_id = OLD.id AND l.course_id != NEW.course_id
 )
BEGIN
  SELECT RAISE(ABORT, 'Unmap lessons before moving a question to another course');
END;
