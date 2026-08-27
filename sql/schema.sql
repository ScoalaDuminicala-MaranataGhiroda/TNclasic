-- ============================================================================
-- Schema Turso pentru "Talantul în Negoț" — Școala Duminicală Maranata Ghiroda
-- Rulează cu: turso db shell <numele-bazei> < sql/schema.sql
-- ============================================================================

PRAGMA foreign_keys = ON;

-- Concurenți -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS competitors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  first_name TEXT NOT NULL,
  last_name  TEXT NOT NULL,
  category   TEXT NOT NULL CHECK (category IN ('P-1','2-3','4-5','6-7','8-9','10-11','18-45','45+')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Prezență ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS attendance_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_date TEXT NOT NULL UNIQUE -- format YYYY-MM-DD
);

CREATE TABLE IF NOT EXISTS attendance_records (
  session_id     INTEGER NOT NULL REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  competitor_id  INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  present        INTEGER NOT NULL DEFAULT 1 CHECK (present IN (0,1)),
  PRIMARY KEY (session_id, competitor_id)
);

CREATE INDEX IF NOT EXISTS idx_attendance_competitor ON attendance_records(competitor_id);

-- Note ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS grades (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  grade_date    TEXT NOT NULL,      -- YYYY-MM-DD ; pot exista mai multe note pe aceeași dată
  score         INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_grades_competitor ON grades(competitor_id, grade_date);

-- Progres capitole (global, pentru toți concurenții) ------------------------
-- book: '1SAM' (1 Samuel, 31 capitole) sau '2SAM' (2 Samuel, 24 capitole)
CREATE TABLE IF NOT EXISTS chapters_progress (
  book      TEXT NOT NULL CHECK (book IN ('1SAM','2SAM')),
  chapter   INTEGER NOT NULL,
  completed INTEGER NOT NULL DEFAULT 0 CHECK (completed IN (0,1)),
  PRIMARY KEY (book, chapter)
);

-- Pool comun de întrebări deja "consumate" (quiz + indisciplină) -------------
-- question_id se referă la id-ul întrebării din fișierele JSON statice
-- (ex: "1SAM-3-012"), NU e un FK către o tabelă de întrebări (întrebările
-- nu sunt stocate în Turso, ca să nu consumăm din limita de citiri).
CREATE TABLE IF NOT EXISTS used_questions (
  question_id TEXT PRIMARY KEY,
  used_at     TEXT NOT NULL DEFAULT (datetime('now')),
  context     TEXT -- 'quiz' sau 'indisciplina', doar informativ
);

-- Indisciplină -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS discipline_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  competitor_id  INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  event_date     TEXT NOT NULL,       -- YYYY-MM-DD ; pot fi mai multe pe aceeași dată
  correct_count  INTEGER,             -- completat după ce răspunde la cele 3 întrebări
  card           TEXT CHECK (card IN ('rosu','galben')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS discipline_questions (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  discipline_event_id  INTEGER NOT NULL REFERENCES discipline_events(id) ON DELETE CASCADE,
  question_id          TEXT NOT NULL,
  is_correct           INTEGER NOT NULL CHECK (is_correct IN (0,1))
);

CREATE INDEX IF NOT EXISTS idx_discipline_competitor ON discipline_events(competitor_id);
CREATE INDEX IF NOT EXISTS idx_discipline_questions_event ON discipline_questions(discipline_event_id);
