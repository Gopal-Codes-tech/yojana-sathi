"""HTTP-level tests. Needs: pip install -r requirements-dev.txt"""
import os, tempfile, unittest

os.environ["YS_DB_PATH"] = os.path.join(tempfile.mkdtemp(), "api.db")
try:
    from fastapi.testclient import TestClient
    from app.main import app
except ImportError:  # fastapi/httpx not installed
    TestClient = None


@unittest.skipIf(TestClient is None, "fastapi/httpx not installed")
class TestApi(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.cm = TestClient(app); cls.c = cls.cm.__enter__()   # runs lifespan (creates + seeds DB)

    @classmethod
    def tearDownClass(cls):
        cls.cm.__exit__(None, None, None)

    def test_health_and_meta(self):
        self.assertEqual(self.c.get("/api/health").json()["schemes"], 15)
        self.assertGreaterEqual(len(self.c.get("/api/meta").json()["states"]), 36)

    def test_match_farmer(self):
        r = self.c.post("/api/match", json={"profile": {"age": 40, "gender": "male", "state": "Bihar", "income": 90000,
                                                         "occupation": "farmer", "owns_land": True}}).json()
        slugs = {m["slug"]: m["status"] for m in r["matches"]}
        self.assertEqual(slugs["pm-kisan"], "eligible")
        self.assertTrue(r["csc_url"].startswith("https://www.google.com/maps/search/"))

    def test_bad_state_rejected(self):
        self.assertEqual(self.c.post("/api/match", json={"profile": {"state": "Atlantis"}}).status_code, 422)

    def test_tracker_roundtrip(self):
        tok = "a" * 24
        row = self.c.post("/api/tracker", json={"token": tok, "slug": "pm-kisan", "reminder_date": "2026-12-15"}).json()
        self.assertEqual(self.c.get(f"/api/tracker?token={tok}").json()[0]["id"], row["id"])
        self.assertEqual(self.c.patch(f"/api/tracker/{row['id']}", json={"token": tok, "status": "applied"}).json()["status"], "applied")
        self.assertIn("BEGIN:VCALENDAR", self.c.get(f"/api/tracker/{row['id']}/ics?token={tok}").text)
        self.assertEqual(self.c.get(f"/api/tracker?token={'b' * 24}").json(), [])   # other token sees nothing
        self.assertEqual(self.c.delete(f"/api/tracker/{row['id']}?token={tok}").status_code, 204)

    def test_summary_and_explain(self):
        p = {"age": 40, "state": "Bihar", "income": 90000, "occupation": "farmer", "owns_land": True}
        self.assertIn("PM-KISAN", self.c.post("/api/summary", json={"slug": "pm-kisan", "profile": p, "lang": "en"}).json()["text"])
        self.assertEqual(self.c.post("/api/explain", json={"slug": "pm-kisan", "lang": "hi"}).json()["source"], "curated")

    def test_frontend_served(self):
        self.assertIn("YojanaSaathi", self.c.get("/").text)


if __name__ == "__main__":
    unittest.main()
