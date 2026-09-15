"""Regression tests for the security fixes: hardcoded backdoor removal,
identity-bound admin login, CSRF protection, and stored-XSS sanitization."""

from auth import create_access_token
from tests.conftest import create_test_user, create_test_post


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


class TestBackdoorRemoved:
    def test_password_login_endpoint_gone(self, client, db):
        resp = client.post("/api/auth/login", json={"userid": "admin", "password": "12345"})
        assert resp.status_code == 404


class TestAdminLoginIdentityBound:
    def test_requires_authenticated_admin_session(self, client, db):
        # No session at all -> can't reach the password check.
        resp = client.post("/api/admin/login", json={"password": "admin123"})
        assert resp.status_code == 403

    def test_non_admin_session_rejected_regardless_of_password(self, client, db, monkeypatch):
        import config
        monkeypatch.setattr(config, "ADMIN_PASSWORD", "correct-horse")
        import main
        monkeypatch.setattr(main, "ADMIN_PASSWORD", "correct-horse")
        user = create_test_user(db, github_id=999999, username="notadmin")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/admin/login",
            json={"password": "correct-horse"},
            headers=_auth(token),
        )
        assert resp.status_code == 403

    def test_admin_session_wrong_password_rejected(self, client, db, monkeypatch):
        import main
        monkeypatch.setattr(main, "ADMIN_GITHUB_IDS", [42])
        user = create_test_user(db, github_id=42, username="realadmin")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/admin/login",
            json={"password": "wrong"},
            headers=_auth(token),
        )
        assert resp.status_code == 401

    def test_admin_session_correct_password_succeeds(self, client, db, monkeypatch):
        import main
        monkeypatch.setattr(main, "ADMIN_GITHUB_IDS", [42])
        monkeypatch.setattr(main, "ADMIN_PASSWORD", "correct-horse")
        user = create_test_user(db, github_id=42, username="realadmin")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/admin/login",
            json={"password": "correct-horse"},
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert resp.json()["user"]["is_admin"] is True
        # Bearer token is echoed back in the body for cross-origin clients
        # (Vercel frontend / Render backend), which can't rely on cookies
        # alone; the frontend stores it and sends it as an Authorization header.
        assert resp.json()["token"]


class TestCSRFProtection:
    def test_cookie_authenticated_post_without_csrf_header_rejected(self, client, db):
        user = create_test_user(db, github_id=111, username="cookieuser")
        post = create_test_post(db, user_id=user.id, title="CSRF Target")
        token = create_access_token(user.id, user.username)
        client.cookies.set("session", token)
        client.cookies.set("csrf_token", "some-csrf-value")
        resp = client.post(f"/api/posts/{post.id}/like", json={"liked": True})
        assert resp.status_code == 403
        assert "CSRF" in resp.json()["error"]

    def test_cookie_authenticated_post_with_matching_csrf_header_allowed(self, client, db):
        user = create_test_user(db, github_id=112, username="cookieuser2")
        post = create_test_post(db, user_id=user.id, title="CSRF Target 2")
        token = create_access_token(user.id, user.username)
        client.cookies.set("session", token)
        client.cookies.set("csrf_token", "matching-value")
        resp = client.post(
            f"/api/posts/{post.id}/like",
            json={"liked": True},
            headers={"X-CSRF-Token": "matching-value"},
        )
        assert resp.status_code == 200

    def test_bearer_only_requests_unaffected_by_csrf_check(self, client, db):
        user = create_test_user(db, github_id=113, username="beareruser")
        post = create_test_post(db, user_id=user.id, title="Bearer Target")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            f"/api/posts/{post.id}/like",
            json={"liked": True},
            headers=_auth(token),
        )
        assert resp.status_code == 200

    def test_bearer_request_unaffected_even_when_session_cookie_also_present(self, client, db):
        # Real browser requests always carry the httponly session cookie set at
        # login (auto-attached) alongside the Authorization header the frontend
        # explicitly sends. The CSRF check must key off how the request was
        # actually authenticated, not merely whether a session cookie exists.
        user = create_test_user(db, github_id=114, username="bothauthuser")
        post = create_test_post(db, user_id=user.id, title="Both Auth Target")
        token = create_access_token(user.id, user.username)
        client.cookies.set("session", token)
        client.cookies.set("csrf_token", "some-csrf-value")
        resp = client.post(
            f"/api/posts/{post.id}/like",
            json={"liked": True},
            headers=_auth(token),
        )
        assert resp.status_code == 200


class TestStoredXSSSanitization:
    def test_script_tag_stripped_from_post_description(self, client, db):
        user = create_test_user(db, github_id=200, username="author")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/posts",
            json={
                "title": "XSS Test Post",
                "type": "none",
                "shortDescription": "short",
                "description": "<p>hi</p><script>alert(1)</script><img src=x onerror=alert(2)>",
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        description = resp.json()["description"]
        assert "<script" not in description
        assert "onerror" not in description
        assert "<p>hi</p>" in description
