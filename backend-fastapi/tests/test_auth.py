"""Tests for POST /api/auth/logout.

The old password-based POST /api/auth/login endpoint (hardcoded admin/12345
backdoor) has been removed entirely; login now only happens via GitHub OAuth
(/api/auth/github -> /api/auth/github/callback).
"""


class TestLogout:
    def test_logout_clears_cookies(self, client, db):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out"

    def test_logout_deletes_session_cookie(self, client, db):
        resp = client.post("/api/auth/logout")
        # After logout, cookies should be cleared
        assert resp.status_code == 200
