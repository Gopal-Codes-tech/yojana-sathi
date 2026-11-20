"""Pure helpers: pre-filled application summary, .ics reminder, optional LLM explanation."""
from __future__ import annotations

import json
import os
import urllib.request
from datetime import date, datetime, timezone
from urllib.parse import quote_plus

LABELS = {
    "occupation": {
        "farmer": ("Farmer", "किसान"), "labourer": ("Daily-wage / labourer", "दिहाड़ी मज़दूर"),
        "student": ("Student", "विद्यार्थी"), "self_employed": ("Small business / self-employed", "छोटा व्यवसाय / स्वरोज़गार"),
        "street_vendor": ("Street vendor", "रेहड़ी-पटरी विक्रेता"), "salaried": ("Salaried job", "नौकरीपेशा"),
        "homemaker": ("Homemaker", "गृहिणी"), "retired": ("Retired / senior citizen", "सेवानिवृत्त / वरिष्ठ नागरिक"),
        "unemployed": ("Looking for work", "रोज़गार की तलाश"),
    },
    "gender": {"female": ("Female", "महिला"), "male": ("Male", "पुरुष"), "other": ("Other", "अन्य")},
    "category": {"general": ("General", "सामान्य"), "obc": ("OBC", "ओबीसी"), "sc": ("SC", "अनुसूचित जाति"), "st": ("ST", "अनुसूचित जनजाति")},
}


def _lab(field: str, value, lang: str) -> str:
    pair = LABELS.get(field, {}).get(value)
    return pair[1 if lang == "hi" else 0] if pair else str(value)


def csc_search_url(state: str | None, district: str | None) -> str:
    place = " ".join(p for p in (district, state) if p) or "me"
    return "https://www.google.com/maps/search/" + quote_plus(f"Common Service Centre CSC near {place}")


def build_summary(scheme: dict, profile: dict, name: str, district: str, lang: str) -> str:
    """Text the person (or a CSC operator) can copy/print. Never contains ID numbers."""
    hi = lang == "hi"
    t = (lambda en, h: h if hi else en)
    nm = scheme["name_hi"] if hi else scheme["name_en"]
    lines = [t("APPLICATION SUMMARY (pre-filled, for reference)", "आवेदन सारांश (पहले से भरा, संदर्भ के लिए)"),
             f"{t('Scheme', 'योजना')}: {nm}", ""]
    if name:
        lines.append(f"{t('Name', 'नाम')}: {name}")
    for key, en, h in [("age", "Age", "आयु"), ("gender", "Gender", "लिंग"), ("state", "State", "राज्य"),
                       ("income", "Annual family income (approx.)", "परिवार की वार्षिक आय (लगभग)"),
                       ("occupation", "Occupation", "व्यवसाय"), ("category", "Category", "वर्ग")]:
        v = profile.get(key)
        if v in (None, ""):
            continue
        if key == "income":
            v = f"₹{int(v):,}"
        elif key in LABELS:
            v = _lab(key, v, lang)
        lines.append(f"{t(en, h)}: {v}")
    if district:
        lines.append(f"{t('District / city', 'ज़िला / शहर')}: {district}")
    lines += ["", t("Why you appear eligible:", "आप पात्र क्यों दिखते हैं:")]
    lines += [f"  - {r}" for r in scheme.get("reasons", [])] or ["  -"]
    lines += ["", t("Documents to carry:", "साथ ले जाने वाले दस्तावेज़:")]
    for i, d in enumerate(scheme["documents"], 1):
        lines.append(f"  {i}. [ ] {d['name_hi'] if hi else d['name_en']}")
    lines += ["", f"{t('Official portal', 'आधिकारिक पोर्टल')}: {scheme['portal_url']}",
              t("Aadhaar / ID numbers are NOT stored by YojanaSaathi - write them on the official form only.",
                "आधार / पहचान संख्या YojanaSaathi में सुरक्षित नहीं की जाती - इन्हें सिर्फ़ आधिकारिक फ़ॉर्म पर लिखें।"),
              t("Please verify eligibility on the official portal before applying.",
                "आवेदन से पहले आधिकारिक पोर्टल पर पात्रता ज़रूर जाँच लें।")]
    return "\n".join(lines)


def build_ics(summary: str, when: str, uid: str) -> str:
    d = datetime.strptime(when, "%Y-%m-%d").date()
    end = date.fromordinal(d.toordinal() + 1)
    esc = lambda s: s.replace("\\", "\\\\").replace(",", "\\,").replace(";", "\\;").replace("\n", "\\n")
    return "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//YojanaSaathi//EN", "BEGIN:VEVENT",
        f"UID:{uid}@yojanasaathi", f"DTSTAMP:{datetime.now(timezone.utc):%Y%m%dT%H%M%SZ}",
        f"DTSTART;VALUE=DATE:{d:%Y%m%d}", f"DTEND;VALUE=DATE:{end:%Y%m%d}",
        f"SUMMARY:{esc(summary)}", "BEGIN:VALARM", "TRIGGER:-P1D", "ACTION:DISPLAY",
        f"DESCRIPTION:{esc(summary)}", "END:VALARM", "END:VEVENT", "END:VCALENDAR", ""])


def explain(scheme: dict, lang: str) -> dict:
    """Plain-language explanation. Uses an LLM only to *rephrase the curated text*
    (never to decide eligibility). Falls back to the curated text if no key / any error."""
    curated = scheme["simple_hi"] if lang == "hi" else scheme["simple_en"]
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        return {"text": curated, "source": "curated"}
    language = "simple Hindi (Devanagari)" if lang == "hi" else "very simple English"
    prompt = (
        f"Rewrite the following government scheme details in {language} for a person with low literacy. "
        "Use at most 4 short sentences. Do NOT add any fact, amount or condition that is not in the text. "
        "Do NOT say whether the person is eligible.\n\n"
        f"Scheme: {scheme['name_en']}\nBenefit: {scheme['benefit_en']}\nSummary: {scheme['simple_en']}\n"
        f"How to apply: {scheme['how_en']}")
    body = json.dumps({"model": os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-5-5"), "max_tokens": 400,
                       "messages": [{"role": "user", "content": prompt}]}).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=body, method="POST",
        headers={"content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01"})
    try:
        with urllib.request.urlopen(req, timeout=12) as r:
            data = json.load(r)
        text = "".join(b.get("text", "") for b in data.get("content", []) if b.get("type") == "text").strip()
        if text:
            return {"text": text, "source": "ai"}
    except Exception:
        pass
    return {"text": curated, "source": "curated"}
