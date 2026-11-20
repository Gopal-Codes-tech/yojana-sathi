"""YojanaSaathi API (FastAPI). Run:  uvicorn app.main:app --reload"""
from __future__ import annotations

import re
from contextlib import asynccontextmanager
from datetime import date
from pathlib import Path
from typing import Literal, Optional

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.responses import FileResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, ConfigDict, Field

from . import db, engine, services
from .states import STATES, STATE_NAMES

@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.ensure_ready()  # create tables + load data/*.json (idempotent)
    yield


app = FastAPI(title="YojanaSaathi", version="1.0", lifespan=lifespan)
STATIC = Path(__file__).resolve().parent.parent / "static"
STATUSES = ["interested", "documents_ready", "applied", "approved", "rejected"]


def get_conn():
    with db.session() as conn:
        yield conn


class Profile(BaseModel):
    """Answers are used for this request only and never written to the database."""
    model_config = ConfigDict(extra="ignore")
    age: Optional[int] = Field(None, ge=0, le=120)
    gender: Optional[Literal["female", "male", "other"]] = None
    state: Optional[str] = None
    income: Optional[int] = Field(None, ge=0, le=100_000_000)
    occupation: Optional[Literal["farmer", "labourer", "student", "self_employed", "street_vendor",
                                 "salaried", "homemaker", "retired", "unemployed"]] = None
    category: Optional[Literal["general", "obc", "sc", "st"]] = None
    owns_land: Optional[bool] = None
    pregnant: Optional[bool] = None
    girl_child: Optional[bool] = None
    no_pucca_house: Optional[bool] = None
    no_lpg: Optional[bool] = None
    has_bank_account: Optional[bool] = None


class MatchRequest(BaseModel):
    profile: Profile
    district: str = ""


class ExplainRequest(BaseModel):
    slug: str
    lang: Literal["en", "hi"] = "hi"


class SummaryRequest(BaseModel):
    slug: str
    profile: Profile
    name: str = Field("", max_length=80)
    district: str = Field("", max_length=80)
    lang: Literal["en", "hi"] = "hi"


class TrackerCreate(BaseModel):
    token: str = Field(min_length=16, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    slug: str
    status: Literal["interested", "documents_ready", "applied", "approved", "rejected"] = "interested"
    reminder_date: Optional[str] = None
    note: str = Field("", max_length=80)


class TrackerPatch(BaseModel):
    token: str = Field(min_length=16, max_length=64, pattern=r"^[A-Za-z0-9_-]+$")
    status: Optional[Literal["interested", "documents_ready", "applied", "approved", "rejected"]] = None
    reminder_date: Optional[str] = None
    note: Optional[str] = Field(None, max_length=80)


def _check_date(v: Optional[str]) -> Optional[str]:
    if v in (None, ""):
        return None
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", v):
        raise HTTPException(422, "reminder_date must be YYYY-MM-DD")
    try:
        date.fromisoformat(v)
    except ValueError:
        raise HTTPException(422, "invalid date")
    return v


def _public(s: dict) -> dict:
    return {k: v for k, v in s.items() if k not in ("id", "rules")}


@app.get("/api/health")
def health(conn=Depends(get_conn)):
    n = conn.execute("SELECT COUNT(*) c FROM schemes").fetchone()["c"]
    return {"ok": True, "schemes": n}


@app.get("/api/meta")
def meta(conn=Depends(get_conn)):
    return {"states": [{"en": en, "hi": hi} for en, hi in STATES], "statuses": STATUSES,
            "core_fields": engine.CORE_FIELDS, "extra_fields": engine.EXTRA_FIELDS,
            "scheme_count": conn.execute("SELECT COUNT(*) c FROM schemes").fetchone()["c"]}


@app.get("/api/schemes")
def schemes(conn=Depends(get_conn)):
    return [_public(s) for s in db.load_schemes(conn)]


@app.get("/api/schemes/{slug}")
def scheme(slug: str, conn=Depends(get_conn)):
    rows = db.load_schemes(conn, slug)
    if not rows:
        raise HTTPException(404, "scheme not found")
    return _public(rows[0])


@app.post("/api/match")
def match(req: MatchRequest, conn=Depends(get_conn)):
    profile = req.profile.model_dump()
    if profile["state"] and profile["state"] not in STATE_NAMES:
        raise HTTPException(422, "unknown state")
    all_schemes = db.load_schemes(conn)
    by_slug = {s["slug"]: s for s in all_schemes}
    results = []
    for m in engine.match_schemes(all_schemes, profile):
        s = _public(by_slug[m["slug"]])
        results.append({**s, "status": m["status"], "reasons": m["reasons"], "missing": m["missing"]})
    return {
        "matches": results,
        "total_schemes": len(all_schemes),
        "csc_url": services.csc_search_url(profile["state"], req.district),
        "disclaimer": "Indicative result. Always verify on the official portal.",
    }


@app.post("/api/explain")
def explain(req: ExplainRequest, conn=Depends(get_conn)):
    rows = db.load_schemes(conn, req.slug)
    if not rows:
        raise HTTPException(404, "scheme not found")
    return services.explain(rows[0], req.lang)


@app.post("/api/summary")
def summary(req: SummaryRequest, conn=Depends(get_conn)):
    rows = db.load_schemes(conn, req.slug)
    if not rows:
        raise HTTPException(404, "scheme not found")
    s = rows[0]
    profile = req.profile.model_dump()
    m = engine.evaluate_scheme(s, profile)
    s["reasons"] = [r["hi" if req.lang == "hi" else "en"] for r in (m["reasons"] if m else [])]
    return {"text": services.build_summary(s, profile, req.name.strip(), req.district.strip(), req.lang)}


@app.get("/api/tracker")
def tracker_list(token: str = Query(min_length=16, max_length=64), conn=Depends(get_conn)):
    return db.tracker_list(conn, token)


@app.post("/api/tracker", status_code=201)
def tracker_add(req: TrackerCreate, conn=Depends(get_conn)):
    if not db.load_schemes(conn, req.slug):
        raise HTTPException(404, "scheme not found")
    row = db.tracker_add(conn, req.token, req.slug, req.status, _check_date(req.reminder_date), req.note.strip())
    conn.commit()
    return row


@app.patch("/api/tracker/{tid}")
def tracker_patch(tid: int, req: TrackerPatch, conn=Depends(get_conn)):
    fields = req.model_dump(exclude={"token"}, exclude_unset=True)
    fields = {k: v for k, v in fields.items() if v is not None or k == "reminder_date"}
    if "reminder_date" in fields:
        fields["reminder_date"] = _check_date(fields["reminder_date"])
    row = db.tracker_update(conn, req.token, tid, fields)
    conn.commit()
    if not row:
        raise HTTPException(404, "not found")
    return row


@app.delete("/api/tracker/{tid}", status_code=204)
def tracker_delete(tid: int, token: str = Query(min_length=16, max_length=64), conn=Depends(get_conn)):
    ok = db.tracker_delete(conn, token, tid)
    conn.commit()
    if not ok:
        raise HTTPException(404, "not found")


@app.get("/api/tracker/{tid}/ics")
def tracker_ics(tid: int, token: str = Query(min_length=16, max_length=64), conn=Depends(get_conn)):
    row = db.tracker_get(conn, token, tid)
    if not row or not row["reminder_date"]:
        raise HTTPException(404, "no reminder set")
    text = services.build_ics(f"YojanaSaathi: {row['name_en']} ({row['status']})", row["reminder_date"], str(tid))
    return PlainTextResponse(text, media_type="text/calendar",
                             headers={"Content-Disposition": f'attachment; filename="reminder-{tid}.ics"'})


@app.get("/")
def index():
    return FileResponse(STATIC / "index.html")


app.mount("/", StaticFiles(directory=STATIC), name="static")
