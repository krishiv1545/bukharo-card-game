from django.test import TestCase


class AuthApiTests(TestCase):
    def test_signup_login_logout(self):
        self.assertIsNone(self.client.get("/api/auth/me/").json()["username"])
        bad = self.client.post("/api/auth/signup/", {"username": "a b", "password": "secret1"}, content_type="application/json")
        self.assertEqual(bad.status_code, 400)
        ok = self.client.post("/api/auth/signup/", {"username": "alice", "password": "secret1"}, content_type="application/json")
        self.assertEqual(ok.status_code, 201)
        self.assertEqual(self.client.get("/api/auth/me/").json()["username"], "alice")
        self.client.post("/api/auth/logout/")
        self.assertIsNone(self.client.get("/api/auth/me/").json()["username"])
        wrong = self.client.post("/api/auth/login/", {"username": "alice", "password": "nope"}, content_type="application/json")
        self.assertEqual(wrong.status_code, 400)
        good = self.client.post("/api/auth/login/", {"username": "alice", "password": "secret1"}, content_type="application/json")
        self.assertEqual(good.status_code, 200)
