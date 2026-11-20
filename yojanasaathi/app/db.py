"""SQLite data layer (standard library only).

The schema in schema.sql is plain SQL and ports to PostgreSQL with small
changes (AUTOINCREMENT -> SERIAL, datetime('now') -> now()).
"""
from __future__ import annotations

import json
import os
import sqlite3
from contextlib import contextmanager
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent
DB_PATH = os.environ.get("YS_DB_PATH", str(BASE / "data" / "yojanasaathi.db"))

SCHEME_COLS = [
    "slug", "level", "state", "category", "priority", "confidence",
    "name_en", "name_hi", "benefit_en", "benefit_hi", "simple_en", "simple_hi",
    "how_en", "how_hi", "portal_url", "source_url", "data_as_of",
    "deadline_note_en", "deadline_note_hi",
]


def connect(path: str | None = None) -> sqlite3.Connection:
    conn = sqlite3.connect(path or DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


@contextmanager
def session(path: str | None = None):
    conn = connect(path)
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db(conn: sqlite3.Connection) -> None:
    conn.executescript((BASE / "app" / "schema.sql").read_text(encoding="utf-8"))


def seed(conn: sqlite3.Connection) -> int:
    """Idempotent: (re)loads data/*.json. Returns number of schemes loaded.

    Adding a scheme = adding an entry to data/schemes.json. No code changes.
    """
    docs = json.loads((BASE / "data" / "documents.json").read_text(encoding="utf-8"))
    schemes = json.loads((BASE / "data" / "schemes.json").read_text(encoding="utf-8"))

    for d in docs:
        conn.execute(
            """INSERT INTO documents(key,name_en,name_hi,how_en,how_hi) VALUES(?,?,?,?,?)
               ON CONFLICT(key) DO UPDATE SET name_en=excluded.name_en, name_hi=excluded.name_hi,
               how_en=excluded.how_en, how_hi=excluded.how_hi""",
            (d["key"], d["name_en"], d["name_hi"], d.get("how_en"), d.get("how_hi")),
        )

    seen = []
    for s in schemes:
        seen.append(s["slug"])
        vals = [s.get(c) for c in SCHEME_COLS]
        updates = ",".join(f"{c}=excluded.{c}" for c in SCHEME_COLS if c != "slug")
        conn.execute(
            f"INSERT INTO schemes({','.join(SCHEME_COLS)}) VALUES({','.join('?' * len(SCHEME_COLS))}) "
            f"ON CONFLICT(slug) DO UPDATE SET {updates}",
            vals,
        )
        sid = conn.execute("SELECT id FROM schemes WHERE slug=?", (s["slug"],)).fetchone()["id"]
        conn.execute("DELETE FROM eligibility_rules WHERE scheme_id=?", (sid,))
        conn.execute("DELETE FROM scheme_documents WHERE scheme_id=?", (sid,))
        for grp, item in enumerate(s["rules"]):
            for cond in item["any"] if "any" in item else [item]:
                conn.execute(
                    """INSERT INTO eligibility_rules(scheme_id,grp,field,op,value_json,soft,label_en,label_hi)
                       VALUES(?,?,?,?,?,?,?,?)""",
                    (sid, grp, cond["field"], cond["op"], json.dumps(cond.get("value")),
                     1 if cond.get("soft") else 0, cond.get("label_en"), cond.get("label_hi")),
                )
        for pos, key in enumerate(s["documents"]):
            conn.execute(
                "INSERT INTO scheme_documents(scheme_id,doc_key,position) VALUES(?,?,?)",
                (sid, key, pos),
            )

    # remove schemes deleted from the JSON (keeps tracker rows via FK cascade)
    if seen:
        marks = ",".join("?" * len(seen))
        conn.execute(f"DELETE FROM schemes WHERE slug NOT IN ({marks})", seen)
    return len(schemes)


def load_schemes(conn: sqlite3.Connection, slug: str | None = None) -> list[dict]:
    """Load schemes with rules and documents attached."""
    q = "SELECT * FROM schemes" + (" WHERE slug=?" if slug else "") + " ORDER BY priority DESC, name_en"
    rows = [dict(r) for r in conn.execute(q, (slug,) if slug else ())]
    for s in rows:
        s["rules"] = [
            {**dict(r), "value": json.loads(r["value_json"]) if r["value_json"] else None,
             "soft": bool(r["soft"])}
            for r in conn.execute(
                "SELECT * FROM eligibility_rules WHERE scheme_id=? ORDER BY id", (s["id"],))
        ]
        s["documents"] = [
            dict(r) for r in conn.execute(
                """SELECT d.key,d.name_en,d.name_hi,d.how_en,d.how_hi,sd.required
                   FROM scheme_documents sd JOIN documents d ON d.key=sd.doc_key
                   WHERE sd.scheme_id=? ORDER BY sd.position""", (s["id"],))
        ]
    return rows


# ---------- tracker (anonymous, no profile data) ----------

def tracker_list(conn, token: str) -> list[dict]:
    return [dict(r) for r in conn.execute(
        """SELECT t.*, s.name_en, s.name_hi, s.portal_url FROM tracker t
           JOIN schemes s ON s.slug=t.scheme_slug WHERE t.token=?
           ORDER BY (t.reminder_date IS NULL), t.reminder_date, t.id""", (token,))]


def tracker_get(conn, token: str, tid: int) -> dict | None:
    r = conn.execute(
        """SELECT t.*, s.name_en, s.name_hi FROM tracker t
           JOIN schemes s ON s.slug=t.scheme_slug WHERE t.token=? AND t.id=?""", (token, tid)).fetchone()
    return dict(r) if r else None


def tracker_add(conn, token, slug, status="interested", reminder_date=None, note="") -> dict:
    conn.execute(
        """INSERT INTO tracker(token,scheme_slug,status,reminder_date,note) VALUES(?,?,?,?,?)
           ON CONFLICT(token,scheme_slug,note) DO UPDATE SET status=excluded.status,
           reminder_date=excluded.reminder_date, updated_at=datetime('now')""",
        (token, slug, status, reminder_date, note or ""),
    )
    tid = conn.execute(
        "SELECT id FROM tracker WHERE token=? AND scheme_slug=? AND note=?",
        (token, slug, note or "")).fetchone()["id"]
    return tracker_get(conn, token, tid)


def tracker_update(conn, token, tid, fields: dict) -> dict | None:
    allowed = {k: v for k, v in fields.items() if k in ("status", "reminder_date", "note")}
    if allowed:
        sets = ",".join(f"{k}=?" for k in allowed)
        conn.execute(
            f"UPDATE tracker SET {sets}, updated_at=datetime('now') WHERE token=? AND id=?",
            (*allowed.values(), token, tid))
    return tracker_get(conn, token, tid)


def tracker_delete(conn, token, tid) -> bool:
    return conn.execute("DELETE FROM tracker WHERE token=? AND id=?", (token, tid)).rowcount > 0


def ensure_ready(path: str | None = None) -> None:
    Path(path or DB_PATH).parent.mkdir(parents=True, exist_ok=True)
    with session(path) as conn:
        init_db(conn)
        seed(conn)
