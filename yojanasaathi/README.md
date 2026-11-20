# YojanaSaathi · योजना साथी

A voice-enabled Hindi + English assistant that asks 5 simple questions (gender, age, state, income, occupation) and shows **only the government welfare schemes you are eligible for** — with a document checklist, nearest CSC link, official portal, a pre-filled application summary and deadline reminders.

Built for **YCCE HackKumbh** (problem statement: *Help finding & applying for govt. welfare schemes*).

## Run it

```bash
python -m venv .venv
.venv\Scripts\activate          # Windows   (Linux/macOS: source .venv/bin/activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://127.0.0.1:8000 — the database file is created and seeded automatically on first start.

Docker: `docker build -t yojanasaathi . && docker run -p 8000:8000 yojanasaathi`

Tests: `python -m unittest discover -s tests -v` (add `pip install -r requirements-dev.txt` to also run the HTTP tests).

## How it maps to the PPT

| PPT promise | Where in the code |
|---|---|
| Voice-first Hindi/English, Web Speech API | `static/app.js` (speech recognition + read-aloud, Hindi/Roman-Hindi/English answer parsing) |
| Rule-based eligibility, no AI guesswork | `app/engine.py` + `eligibility_rules` table; unit-tested |
| Schemes DB, extend by data not code | `data/schemes.json` → `schemes`, `eligibility_rules`, `documents`, `scheme_documents` tables (`app/schema.sql`) |
| AI only simplifies text | `POST /api/explain` — LLM rewrites curated text; falls back to curated text with no API key |
| Document checklist, CSC link, portal, pre-filled summary | scheme cards, `POST /api/summary` |
| Deadline & status reminders | `tracker` table, `/api/tracker*`, `.ics` calendar download, 🔔 badge for due items |
| Assisted mode for CSC / Anganwadi workers | “Assisted mode” toggle: beneficiary name, “Next person” reset, printable summary |
| Privacy: no Aadhaar, session-only answers | Profile lives in `sessionStorage` and is never written to the DB; tracker stores only an anonymous random token |
| Installable, low-bandwidth PWA | `manifest.webmanifest`, `sw.js`, no frontend build step |
| 15 central + state schemes | 12 central + 3 state (UP, Maharashtra, MP) |

### Differences from the slide wording (edit the PPT or be ready to explain)
* Frontend is **vanilla JS PWA**, not React (no build step, lighter on weak phones).
* The prototype DB is **SQLite**. The schema is plain SQL and ports to PostgreSQL; say “SQLite for the prototype, PostgreSQL for production”.

## Results: three statuses
* **Eligible** – every rule passed.
* **Likely** – rules pass but they are a proxy (e.g. “BPL household” approximated by an income limit). Confirm on the portal.
* **Confirm** – one fact is missing (e.g. “do you own land?”). The app asks only that question.

## Add a scheme (no code change)
Append an object to `data/schemes.json` (copy an existing one) and restart. Rule ops: `eq, ne, in, not_in, gte, lte, between, is_true, is_false`; wrap conditions in `{"any":[...]}` for OR; `"soft": true` means “don’t block if unanswered”. Fields: `age, gender, state, income, occupation, category, owns_land, pregnant, girl_child, no_pucca_house, no_lpg, has_bank_account`.

## API
`GET /api/meta` · `GET /api/schemes[/{slug}]` · `POST /api/match` · `POST /api/explain` · `POST /api/summary` · `GET|POST /api/tracker` · `PATCH|DELETE /api/tracker/{id}` · `GET /api/tracker/{id}/ics`. Interactive docs at `/docs`.

## ⚠️ Before you demo or submit
1. **Re-verify scheme data against the official portals.** The 15 entries (amounts, age/income limits, portal URLs, whether a state scheme is still open — especially Ladki Bahin and Ladli Behna) were compiled from general knowledge, not live-checked. Update `data_as_of` in `schemes.json` after you check. Income limits for PM-JAY, PMAY, Ujjwala and NSAP are *proxies* for SECC/BPL status, which is why they show “Likely”.
2. Voice input needs Chrome/Edge (Web Speech API) and an internet connection; other browsers fall back to tap/type.
3. “Nearest CSC” opens a Google Maps search for your state/district — there is no official CSC dataset bundled.

## 2–3 minute demo video script
1. **0:00** Problem: crores of eligible people never claim schemes (awareness, confusing rules, middlemen).
2. **0:20** Turn on *Voice guide*, say answers in Hindi: “महिला” → “32” → “उत्तर प्रदेश” → “दो लाख” → “गृहिणी”.
3. **1:00** Results: eligible vs likely vs “confirm”; answer the pregnancy / LPG question and watch the list update.
4. **1:25** Open one scheme: *Explain simply*, document checklist, portal, CSC link, **Application summary** → print.
5. **1:55** *Track & remind me* → set a date → 🔔 badge, download the calendar reminder.
6. **2:15** *Assisted mode* for a CSC operator: beneficiary name → “Next person”.
7. **2:35** Show `data/schemes.json`: adding a scheme is just data. Close with privacy (no Aadhaar stored).
