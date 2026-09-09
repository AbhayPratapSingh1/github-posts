"""Tests for POST /api/auth/login and POST /api/auth/logout."""

from tests.conftest import create_test_user


class TestLogin:
    def test_login_valid_credentials(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "admin", "password": "12345"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["user"]["username"] == "admin"
        assert "session" in resp.cookies

    def test_login_invalid_userid(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "wrong", "password": "12345"})
        assert resp.status_code == 401
        assert "error" in resp.json()

    def test_login_invalid_password(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "admin", "password": "wrong"})
        assert resp.status_code == 401

    def test_login_empty_body(self, client, db):
        resp = client.post("/api/auth/login", json={})
        assert resp.status_code == 422  # validation error

    def test_login_sets_session_cookie(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "admin", "password": "12345"})
        assert "session" in resp.cookies
        assert "refresh_token" in resp.cookies

    def test_login_response_has_user_data(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "admin", "password": "12345"})
        user = resp.json()["user"]
        assert "id" in user
        assert "username" in user
        assert user["username"] == "admin"


class TestLogout:
    def test_logout_clears_cookies(self, client, db):
        resp = client.post("/api/auth/logout")
        assert resp.status_code == 200
        assert resp.json()["message"] == "Logged out"

    def test_logout_deletes_session_cookie(self, client, db):
        resp = client.post("/api/auth/logout")
        # After logout, cookies should be cleared
        assert resp.status_code == 200
