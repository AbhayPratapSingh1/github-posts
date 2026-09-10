"""Tests for GET /api/users: public listing of platform users."""

from tests.conftest import create_test_user, create_test_post


class TestGetUsers:
    def test_returns_all_users_with_post_counts(self, client, db):
        u1 = create_test_user(db, github_id=12345, username="alice")
        u2 = create_test_user(db, github_id=99999, username="bob")
        create_test_post(db, user_id=u1.id, title="Alice Post")

        resp = client.get("/api/users")
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 2

        by_name = {u["username"]: u for u in data["users"]}
        assert by_name["alice"]["postCount"] == 1
        assert by_name["bob"]["postCount"] == 0
        assert by_name["alice"]["name"] == "Test User"
        assert by_name["alice"]["avatar_url"] == "https://example.com/avatar.png"

    def test_excludes_sensitive_fields(self, client, db):
        create_test_user(db)
        resp = client.get("/api/users")
        user = resp.json()["users"][0]
        assert "github_token" not in user
        assert "email" not in user

    def test_public_and_ordering_newest_first(self, client, db):
        create_test_user(db, github_id=12345, username="alice")
        create_test_user(db, github_id=99999, username="bob")
        resp = client.get("/api/users")
        users = resp.json()["users"]
        assert users[0]["username"] == "bob"
        assert users[1]["username"] == "alice"