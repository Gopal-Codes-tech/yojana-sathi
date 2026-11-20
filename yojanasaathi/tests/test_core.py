import os, tempfile, unittest

os.environ["YS_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "test.db")
from app import db, engine, services  # noqa: E402


class Base(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.ensure_ready()
        with db.session() as c:
            cls.schemes = db.load_schemes(c)

    def slugs(self, profile, statuses=None):
        ms = engine.match_schemes(self.schemes, profile)
        return {m["slug"]: m for m in ms if not statuses or m["status"] in statuses}


class TestSeed(Base):
    def test_fifteen_schemes(self):
        self.assertEqual(len(self.schemes), 15)
        self.assertEqual(sum(s["level"] == "state" for s in self.schemes), 3)

    def test_seed_is_idempotent(self):
        with db.session() as c:
            db.seed(c)
            self.assertEqual(c.execute("SELECT COUNT(*) FROM schemes").fetchone()[0], 15)

    def test_every_scheme_has_rules_docs_and_portal(self):
        for s in self.schemes:
            self.assertTrue(s["rules"] and s["documents"] and s["portal_url"].startswith("https://"), s["slug"])


class TestEngine(Base):
    def test_farmer_up(self):
        p = dict(age=45, gender="male", state="Uttar Pradesh", income=150000, occupation="farmer", owns_land=True)
        r = self.slugs(p)
        self.assertEqual(r["pm-kisan"]["status"], "eligible")
        self.assertIn("e-shram", r)
        self.assertNotIn("mh-ladki-bahin", r)       # wrong state / gender
        self.assertNotIn("pm-svanidhi", r)          # not a vendor

    def test_missing_answer_gives_possible_not_hidden(self):
        p = dict(age=45, gender="male", state="Bihar", income=100000, occupation="farmer")
        m = self.slugs(p)["pm-kisan"]
        self.assertEqual(m["status"], "possible")
        self.assertEqual(m["missing"], ["owns_land"])

    def test_or_group_age_70_ignores_income(self):
        p = dict(age=72, gender="male", state="Kerala", income=2000000, occupation="retired")
        self.assertIn("ayushman-bharat-pmjay", self.slugs(p))
        p["age"] = 50
        self.assertNotIn("ayushman-bharat-pmjay", self.slugs(p))

    def test_proxy_rules_are_labelled_likely(self):
        p = dict(age=65, gender="female", state="Bihar", income=80000, occupation="retired")
        self.assertEqual(self.slugs(p)["nsap-old-age-pension"]["status"], "likely")

    def test_student_sc(self):
        p = dict(age=19, gender="female", state="Rajasthan", income=200000, occupation="student", category="sc")
        self.assertEqual(self.slugs(p)["nsp-post-matric-sc"]["status"], "eligible")
        p["category"] = "general"
        self.assertNotIn("nsp-post-matric-sc", self.slugs(p))

    def test_income_just_over_limit_excluded(self):
        p = dict(age=19, gender="female", state="Rajasthan", income=250001, occupation="student", category="sc")
        self.assertNotIn("nsp-post-matric-sc", self.slugs(p))

    def test_state_schemes_only_in_own_state(self):
        base = dict(age=30, gender="female", income=100000, occupation="homemaker")
        self.assertIn("mh-ladki-bahin", self.slugs({**base, "state": "Maharashtra"}))
        self.assertIn("mp-ladli-behna", self.slugs({**base, "state": "Madhya Pradesh"}))
        self.assertNotIn("mh-ladki-bahin", self.slugs({**base, "state": "Madhya Pradesh"}))

    def test_pmmvy_needs_pregnancy(self):
        p = dict(age=25, gender="female", state="Bihar", income=100000, occupation="homemaker", pregnant=True)
        self.assertEqual(self.slugs(p)["pm-matru-vandana"]["status"], "eligible")
        p["pregnant"] = False
        self.assertNotIn("pm-matru-vandana", self.slugs(p))

    def test_ranking_eligible_before_likely_before_possible(self):
        p = dict(age=30, gender="female", state="Uttar Pradesh", income=100000, occupation="self_employed")
        order = [m["status"] for m in engine.match_schemes(self.schemes, p)]
        self.assertEqual(order, sorted(order, key=engine.STATUS_ORDER.get))

    def test_empty_profile_never_crashes(self):
        self.assertIsInstance(engine.match_schemes(self.schemes, {}), list)

    def test_garbage_values_are_unknown_not_errors(self):
        self.assertEqual(engine.eval_condition({"field": "age", "op": "gte", "value": 18}, {"age": "abc"}), "unknown")


class TestTracker(Base):
    TOKEN = "t" * 20

    def test_crud_and_isolation(self):
        with db.session() as c:
            row = db.tracker_add(c, self.TOKEN, "pm-kisan", reminder_date="2026-12-01")
            self.assertEqual(row["status"], "interested")
            row = db.tracker_update(c, self.TOKEN, row["id"], {"status": "applied"})
            self.assertEqual(row["status"], "applied")
            self.assertEqual(len(db.tracker_list(c, self.TOKEN)), 1)
            self.assertEqual(db.tracker_list(c, "x" * 20), [])
            self.assertIsNone(db.tracker_get(c, "x" * 20, row["id"]))
            self.assertTrue(db.tracker_delete(c, self.TOKEN, row["id"]))

    def test_no_profile_columns_in_tracker(self):
        with db.session() as c:
            cols = {r[1] for r in c.execute("PRAGMA table_info(tracker)")}
        self.assertFalse(cols & {"age", "income", "aadhaar", "name", "gender"})


class TestServices(Base):
    def test_summary_has_docs_and_no_ids(self):
        s = next(x for x in self.schemes if x["slug"] == "pm-kisan")
        s["reasons"] = ["You are a farmer"]
        txt = services.build_summary(s, dict(age=40, state="Bihar", income=120000, occupation="farmer"), "Ram", "Patna", "en")
        self.assertIn("PM-KISAN", txt)
        self.assertIn("₹120,000", txt)
        self.assertIn("Land records", txt)
        self.assertIn("NOT stored", txt)

    def test_summary_hindi(self):
        s = next(x for x in self.schemes if x["slug"] == "pm-kisan")
        s["reasons"] = []
        self.assertIn("किसान", services.build_summary(s, dict(occupation="farmer"), "", "", "hi"))

    def test_ics(self):
        ics = services.build_ics("Hello, world", "2026-12-31", "7")
        self.assertIn("DTSTART;VALUE=DATE:20261231", ics)
        self.assertIn("DTEND;VALUE=DATE:20270101", ics)

    def test_explain_falls_back_to_curated_without_key(self):
        os.environ.pop("ANTHROPIC_API_KEY", None)
        out = services.explain(self.schemes[0], "hi")
        self.assertEqual(out["source"], "curated")

    def test_csc_url(self):
        self.assertIn("Varanasi", services.csc_search_url("Uttar Pradesh", "Varanasi"))


if __name__ == "__main__":
    unittest.main()
