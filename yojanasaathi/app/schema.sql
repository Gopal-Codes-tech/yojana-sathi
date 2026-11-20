PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS documents (
  key      TEXT PRIMARY KEY,
  name_en  TEXT NOT NULL,
  name_hi  TEXT NOT NULL,
  how_en   TEXT,
  how_hi   TEXT
);

CREATE TABLE IF NOT EXISTS schemes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  slug             TEXT NOT NULL UNIQUE,
  level            TEXT NOT NULL CHECK (level IN ('central','state')),
  state            TEXT,
  category         TEXT,
  priority         INTEGER NOT NULL DEFAULT 50,
  confidence       TEXT NOT NULL DEFAULT 'sure' CHECK (confidence IN ('sure','likely')),
  name_en          TEXT NOT NULL,
  name_hi          TEXT NOT NULL,
  benefit_en       TEXT,
  benefit_hi       TEXT,
  simple_en        TEXT,
  simple_hi        TEXT,
  how_en           TEXT,
  how_hi           TEXT,
  portal_url       TEXT,
  source_url       TEXT,
  data_as_of       TEXT,
  deadline_note_en TEXT,
  deadline_note_hi TEXT
);

-- One row per condition. Rows with the same grp are OR-ed; different grps are AND-ed.
CREATE TABLE IF NOT EXISTS eligibility_rules (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  grp       INTEGER NOT NULL,
  field     TEXT NOT NULL,
  op        TEXT NOT NULL CHECK (op IN ('eq','ne','in','not_in','gte','lte','between','is_true','is_false')),
  value_json TEXT,
  soft      INTEGER NOT NULL DEFAULT 0,
  label_en  TEXT,
  label_hi  TEXT
);
CREATE INDEX IF NOT EXISTS idx_rules_scheme ON eligibility_rules(scheme_id);

CREATE TABLE IF NOT EXISTS scheme_documents (
  scheme_id INTEGER NOT NULL REFERENCES schemes(id) ON DELETE CASCADE,
  doc_key   TEXT NOT NULL REFERENCES documents(key),
  required  INTEGER NOT NULL DEFAULT 1,
  position  INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (scheme_id, doc_key)
);

-- Apply & track. Holds NO personal profile data: only an anonymous browser token.
CREATE TABLE IF NOT EXISTS tracker (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  token         TEXT NOT NULL,
  scheme_slug   TEXT NOT NULL REFERENCES schemes(slug) ON DELETE CASCADE,
  status        TEXT NOT NULL DEFAULT 'interested'
                CHECK (status IN ('interested','documents_ready','applied','approved','rejected')),
  reminder_date TEXT,
  note          TEXT NOT NULL DEFAULT '',
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (token, scheme_slug, note)
);
CREATE INDEX IF NOT EXISTS idx_tracker_token ON tracker(token);
