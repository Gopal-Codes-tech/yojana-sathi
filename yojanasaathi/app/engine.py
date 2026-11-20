"""Rule-based eligibility engine. No AI involved: pure, testable logic.

A scheme has a list of rule rows. Rows sharing a ``grp`` are OR-ed, different
groups are AND-ed. Every condition evaluates to pass / fail / unknown.

* any group fails            -> scheme is excluded
* no fail but some unknown   -> "possible" (we list which fields are missing)
* everything passes          -> "eligible" (or "likely" if the scheme's rules
                                 are only a proxy, e.g. BPL status)
"""
from __future__ import annotations

from typing import Any

PASS, FAIL, UNKNOWN = "pass", "fail", "unknown"
STATUS_ORDER = {"eligible": 0, "likely": 1, "possible": 2}

# Fields the engine understands. The UI asks for the first five.
CORE_FIELDS = ["age", "gender", "state", "income", "occupation"]
EXTRA_FIELDS = [
    "category", "owns_land", "pregnant", "girl_child",
    "no_pucca_house", "no_lpg", "has_bank_account",
]


def _is_missing(v: Any) -> bool:
    return v is None or v == ""


def _norm(v: Any) -> Any:
    return v.strip().lower() if isinstance(v, str) else v


def eval_condition(rule: dict, profile: dict) -> str:
    """Evaluate a single rule row against a profile dict."""
    value = profile.get(rule["field"])
    if _is_missing(value):
        return PASS if rule.get("soft") else UNKNOWN

    op, target = rule["op"], rule.get("value")
    try:
        if op == "eq":
            ok = _norm(value) == _norm(target)
        elif op == "ne":
            ok = _norm(value) != _norm(target)
        elif op == "in":
            ok = _norm(value) in [_norm(t) for t in target]
        elif op == "not_in":
            ok = _norm(value) not in [_norm(t) for t in target]
        elif op == "gte":
            ok = float(value) >= float(target)
        elif op == "lte":
            ok = float(value) <= float(target)
        elif op == "between":
            ok = float(target[0]) <= float(value) <= float(target[1])
        elif op == "is_true":
            ok = value is True
        elif op == "is_false":
            ok = value is False
        else:
            raise ValueError(f"unknown op {op!r}")
    except (TypeError, ValueError):
        return UNKNOWN
    return PASS if ok else FAIL


def evaluate_scheme(scheme: dict, profile: dict) -> dict | None:
    """Return a match dict, or None if the person is not eligible."""
    groups: dict[int, list[dict]] = {}
    for r in scheme["rules"]:
        groups.setdefault(r["grp"], []).append(r)

    reasons: list[dict] = []
    missing: list[str] = []
    for conds in groups.values():
        results = [(c, eval_condition(c, profile)) for c in conds]
        passed = [c for c, res in results if res == PASS]
        if passed:
            # soft conditions that passed only because the answer is missing
            # are not worth showing as a reason
            real = [c for c in passed if not _is_missing(profile.get(c["field"]))]
            if real:
                c = real[0]
                reasons.append({"en": c["label_en"], "hi": c["label_hi"]})
            continue
        unknown = [c for c, res in results if res == UNKNOWN]
        if unknown:
            for c in unknown:
                if c["field"] not in missing:
                    missing.append(c["field"])
            continue
        return None  # every condition in this group failed

    if missing:
        status = "possible"
    elif scheme.get("confidence") == "likely":
        status = "likely"
    else:
        status = "eligible"
    return {"slug": scheme["slug"], "status": status, "reasons": reasons, "missing": missing}


def match_schemes(schemes: list[dict], profile: dict) -> list[dict]:
    """Evaluate all schemes and return ranked matches (best first)."""
    out = []
    for s in schemes:
        m = evaluate_scheme(s, profile)
        if m:
            m["_priority"] = s.get("priority", 50)
            m["_name"] = s["name_en"]
            out.append(m)
    out.sort(key=lambda m: (STATUS_ORDER[m["status"]], -m["_priority"], m["_name"]))
    for m in out:
        m.pop("_priority"), m.pop("_name")
    return out
