"""Regression tests for the security fixes: hardcoded backdoor removal,
identity-bound admin login, CSRF protection, and stored-XSS sanitization."""

from unittest.mock import patch, AsyncMock
from starlette.requests import Request
from auth import create_access_token
from tests.conftest import create_test_user, create_test_post
from main import client_ip


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

    def test_gallery_block_markup_survives_sanitization(self, client, db):
        # The BlockEditor gallery block serializes to a div carrying class/
        # data-mode/data-images/style attributes that bleach doesn't know
        # about by default; without an explicit allowlist for them, saving a
        # post silently strips the gallery's layout and re-editability.
        user = create_test_user(db, github_id=201, username="galleryauthor")
        token = create_access_token(user.id, user.username)
        description = (
            '<div class="gallery-grid" data-mode="grid" data-images="[]" '
            'style="grid-template-columns:repeat(3,1fr);">'
            '<img src="https://example.com/a.jpg" alt="">'
            '<div class="gallery-more">'
            '<img src="https://example.com/b.jpg" alt="" style="filter:brightness(.6);" />'
            '<span>+2</span></div></div>'
        )
        resp = client.post(
            "/api/posts",
            json={
                "title": "Gallery Test Post",
                "type": "none",
                "shortDescription": "short",
                "description": description,
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        saved = resp.json()["description"]
        assert 'class="gallery-grid"' in saved
        assert 'data-mode="grid"' in saved
        assert "data-images=" in saved
        assert "grid-template-columns:repeat(3,1fr)" in saved
        assert 'class="gallery-more"' in saved
        assert "filter:brightness(.6)" in saved

    def test_hr_divider_block_survives_sanitization(self, client, db):
        user = create_test_user(db, github_id=203, username="divideruser")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/posts",
            json={
                "title": "Divider Test Post",
                "type": "none",
                "shortDescription": "short",
                "description": "<p>a</p><hr /><p>b</p>",
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        assert "<hr" in resp.json()["description"]

    def test_gallery_div_rejects_malicious_style_and_class(self, client, db):
        user = create_test_user(db, github_id=202, username="galleryattacker")
        token = create_access_token(user.id, user.username)
        resp = client.post(
            "/api/posts",
            json={
                "title": "Gallery Attack Post",
                "type": "none",
                "shortDescription": "short",
                "description": (
                    '<div class="not-a-gallery-class" onclick="alert(1)" '
                    'style="background:url(javascript:alert(1))">x</div>'
                ),
            },
            headers=_auth(token),
        )
        assert resp.status_code == 200
        saved = resp.json()["description"]
        assert "onclick" not in saved
        assert "javascript:" not in saved
        assert "not-a-gallery-class" not in saved


def _make_request(headers=None, client_host="10.0.0.5"):
    scope = {
        "type": "http",
        "headers": [(k.lower().encode(), v.encode()) for k, v in (headers or {}).items()],
        "client": (client_host, 12345),
    }
    return Request(scope)


class TestClientIpBehindProxy:
    # On Render (and most PaaS), request.client.host is the reverse proxy's
    # own address — identical for every visitor — so every per-IP rate limit
    # collapsed into one shared, app-wide bucket. Once enough requests came
    # in from *anyone*, everyone started getting 429s until the window
    # rolled over, even someone who'd made a single request hours earlier.
    def test_prefers_x_forwarded_for_over_socket_peer(self):
        req = _make_request({"x-forwarded-for": "203.0.113.7, 10.0.0.1"})
        assert client_ip(req) == "203.0.113.7"

    def test_falls_back_to_x_real_ip(self):
        req = _make_request({"x-real-ip": "203.0.113.9"})
        assert client_ip(req) == "203.0.113.9"

    def test_falls_back_to_socket_peer_without_proxy_headers(self):
        req = _make_request({}, client_host="10.0.0.5")
        assert client_ip(req) == "10.0.0.5"

    @patch("main.fetch_github_repo", new_callable=AsyncMock, return_value=None)
    def test_different_forwarded_for_values_get_independent_rate_limit_buckets(self, mock_fetch, client, db):
        user = create_test_user(db, github_id=300, username="ratelimituser")
        token = create_access_token(user.id, user.username)
        post = create_test_post(db, user_id=user.id, title="Rate Limit Target", github="https://github.com/x/y")

        # Exhaust the sync-github rate limit (20/hour) as one "client".
        for _ in range(20):
            client.post(
                f"/api/posts/{post.id}/sync-github",
                headers={"Authorization": f"Bearer {token}", "X-Forwarded-For": "203.0.113.1"},
            )
        blocked = client.post(
            f"/api/posts/{post.id}/sync-github",
            headers={"Authorization": f"Bearer {token}", "X-Forwarded-For": "203.0.113.1"},
        )
        assert blocked.status_code == 429

        # A different client (different X-Forwarded-For) must not be affected.
        other = client.post(
            f"/api/posts/{post.id}/sync-github",
            headers={"Authorization": f"Bearer {token}", "X-Forwarded-For": "203.0.113.2"},
        )
        assert other.status_code != 429
