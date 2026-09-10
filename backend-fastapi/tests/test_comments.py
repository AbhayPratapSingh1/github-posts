"""Tests for comment CRUD: POST, GET, PUT (edit), DELETE.

Rules:
- Any authenticated user can create a comment.
- A user can edit/delete only their own comment.
- An admin can delete any comment (soft delete -> shown as deleted by admin).
"""

from tests.conftest import create_test_user, create_test_post
from auth import create_access_token
from config import ADMIN_GITHUB_IDS

POST_ID = "test-post"


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user_and_token(db, github_id=12345, username="testuser"):
    user = create_test_user(db, github_id=github_id, username=username)
    token = create_access_token(user.id, username)
    return user, token


class TestCreateComment:
    def test_create_comment_success(self, client, db):
        user, token = _create_user_and_token(db)
        resp = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Great post!"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Great post!"
        assert data["is_deleted"] is False
        assert data["user_id"] == user.id
        assert data["username"] == "testuser"

    def test_create_comment_requires_auth(self, client, db):
        resp = client.post(
            f"/api/posts/{POST_ID}/comments",
            json={"content": "Hi"},
        )
        assert resp.status_code == 401

    def test_create_comment_requires_content(self, client, db):
        _, token = _create_user_and_token(db)
        resp = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "   "},
        )
        assert resp.status_code == 400


class TestGetComments:
    def test_get_comments_lists_comments(self, client, db):
        create_test_post(db, title="Test Post")
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "First"},
        )
        assert created.status_code == 200
        resp = client.get(f"/api/posts/{POST_ID}/comments")
        assert resp.status_code == 200
        assert len(resp.json()) == 1
        assert resp.json()[0]["content"] == "First"


class TestUpdateComment:
    def test_edit_own_comment_success(self, client, db):
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Original"},
        ).json()
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(token),
            json={"content": "Edited"},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["content"] == "Edited"
        assert data["is_deleted"] is False

    def test_edit_requires_content(self, client, db):
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Original"},
        ).json()
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(token),
            json={"content": ""},
        )
        assert resp.status_code == 400

    def test_edit_other_users_comment_forbidden(self, client, db):
        _, owner_token = _create_user_and_token(db, username="owner")
        _, other_token = _create_user_and_token(db, github_id=99999, username="otheruser")
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(owner_token),
            json={"content": "Original"},
        ).json()
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(other_token),
            json={"content": "Hacked"},
        )
        assert resp.status_code == 403

    def test_edit_nonexistent_comment_404(self, client, db):
        _, token = _create_user_and_token(db)
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/9999",
            headers=_auth(token),
            json={"content": "Nope"},
        )
        assert resp.status_code == 404

    def test_edit_requires_auth(self, client, db):
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Original"},
        ).json()
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            json={"content": "Anonymous"},
        )
        assert resp.status_code == 401


class TestDeleteComment:
    def test_delete_own_comment_removes_it(self, client, db):
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Bye"},
        ).json()
        resp = client.delete(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(token),
        )
        assert resp.status_code == 200
        remaining = client.get(f"/api/posts/{POST_ID}/comments").json()
        assert remaining == []

    def test_delete_other_users_comment_forbidden(self, client, db):
        _, owner_token = _create_user_and_token(db, username="owner")
        _, other_token = _create_user_and_token(db, github_id=99999, username="otheruser")
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(owner_token),
            json={"content": "Mine"},
        ).json()
        resp = client.delete(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(other_token),
        )
        assert resp.status_code == 403

    def test_delete_nonexistent_comment_404(self, client, db):
        _, token = _create_user_and_token(db)
        resp = client.delete(
            f"/api/posts/{POST_ID}/comments/9999",
            headers=_auth(token),
        )
        assert resp.status_code == 404

    def test_delete_requires_auth(self, client, db):
        _, token = _create_user_and_token(db)
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(token),
            json={"content": "Keep"},
        ).json()
        resp = client.delete(f"/api/posts/{POST_ID}/comments/{created['id']}")
        assert resp.status_code == 401

    def test_admin_delete_marks_comment_deleted(self, client, db):
        admin = create_test_user(
            db, github_id=ADMIN_GITHUB_IDS[0], username="admin"
        )
        admin_token = create_access_token(admin.id, admin.username)
        _, owner_token = _create_user_and_token(db, username="owner")
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(owner_token),
            json={"content": "Remove me"},
        ).json()

        resp = client.delete(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(admin_token),
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["comment"]["is_deleted"] is True
        assert body["comment"]["content"] == ""

        comments = client.get(f"/api/posts/{POST_ID}/comments").json()
        assert len(comments) == 1
        assert comments[0]["is_deleted"] is True
        assert comments[0]["content"] == ""

    def test_admin_can_edit_only_own_comments(self, client, db):
        admin = create_test_user(
            db, github_id=ADMIN_GITHUB_IDS[0], username="admin"
        )
        admin_token = create_access_token(admin.id, admin.username)
        _, owner_token = _create_user_and_token(db, username="owner")
        created = client.post(
            f"/api/posts/{POST_ID}/comments",
            headers=_auth(owner_token),
            json={"content": "Not mine"},
        ).json()
        resp = client.put(
            f"/api/posts/{POST_ID}/comments/{created['id']}",
            headers=_auth(admin_token),
            json={"content": "Edited by admin"},
        )
        assert resp.status_code == 403