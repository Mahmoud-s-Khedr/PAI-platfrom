PRAGMA foreign_keys = ON;

CREATE TABLE courses (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  description_ar TEXT NOT NULL DEFAULT '',
  description_en TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE lessons (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL,
  slug TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT NOT NULL,
  youtube_video_id TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  UNIQUE (course_id, slug)
);

CREATE INDEX idx_lessons_course_id ON lessons(course_id);
CREATE INDEX idx_lessons_course_sort_order ON lessons(course_id, sort_order);

CREATE TABLE lesson_blocks (
  id INTEGER PRIMARY KEY,
  lesson_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('rich-text', 'image', 'code', 'callout', 'interactive')),
  sort_order INTEGER NOT NULL DEFAULT 0,
  data_json TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE,
  UNIQUE (lesson_id, sort_order)
);

CREATE INDEX idx_lesson_blocks_lesson_id ON lesson_blocks(lesson_id);
CREATE INDEX idx_lesson_blocks_lesson_sort_order ON lesson_blocks(lesson_id, sort_order);

CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  course_id INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('mcq', 'true_false', 'short_answer')),
  prompt_json TEXT NOT NULL,
  answer_json TEXT NOT NULL,
  explanation_json TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'beginner',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
);

CREATE INDEX idx_questions_course_id ON questions(course_id);
CREATE INDEX idx_questions_course_status ON questions(course_id, status);

CREATE TABLE question_lessons (
  question_id INTEGER NOT NULL,
  lesson_id INTEGER NOT NULL,
  PRIMARY KEY (question_id, lesson_id),
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
);

CREATE INDEX idx_question_lessons_question_id ON question_lessons(question_id);
CREATE INDEX idx_question_lessons_lesson_id ON question_lessons(lesson_id);

CREATE TABLE assets (
  id INTEGER PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
