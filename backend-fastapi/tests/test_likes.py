"""Tests for post likes: POST /api/posts/{id}/like, and like fields on GET /api/posts & GET /api/posts/{id}.

Rules:
- An authenticated user can like/unlike a post (idempotent via explicit liked flag).
- Likes are per-user: liking again is a no-op, unliking removes the like.
"""

from tests.conftest import create_test_user, create_test_post
from auth import create_access_token

POST_ID = "test-post"


def _auth(token):
    return {"Authorization": f"Bearer {token}"}


def _create_user_and_token(db, github_id=12345, username="testuser"):
    user = create_test_user(db, github_id=github_id, username=username)
    token = create_access_token(user.id, username)
    return user, token


class TestLikePost:
    def test_like_post(self, client, db):
        create_test_post(db, title="Test Post")
        _, token = _create_user_and_token(db)
        resp = client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": True},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["liked"] is True
        assert data["like_count"] == 1

    def test_like_is_idempotent(self, client, db):
        create_test_post(db, title="Test Post")
        _, token = _create_user_and_token(db)
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": True},
        )
        resp = client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": True},
        )
        assert resp.status_code == 200
        assert resp.json()["like_count"] == 1

    def test_unlike_post(self, client, db):
        create_test_post(db, title="Test Post")
        _, token = _create_user_and_token(db)
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": True},
        )
        resp = client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": False},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["liked"] is False
        assert data["like_count"] == 0

    def test_unlike_when_not_liked_is_noop(self, client, db):
        create_test_post(db, title="Test Post")
        _, token = _create_user_and_token(db)
        resp = client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": False},
        )
        assert resp.status_code == 200
        assert resp.json()["liked"] is False
        assert resp.json()["like_count"] == 0

    def test_multiple_users_count_separately(self, client, db):
        create_test_post(db, title="Test Post")
        _, token_a = _create_user_and_token(db, username="userA")
        _, token_b = _create_user_and_token(db, github_id=99999, username="userB")
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token_a),
            json={"liked": True},
        )
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token_b),
            json={"liked": True},
        )
        data = client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token_a),
            json={"liked": True},
        ).json()
        assert data["like_count"] == 2

    def test_like_requires_auth(self, client, db):
        create_test_post(db, title="Test Post")
        resp = client.post(
            f"/api/posts/{POST_ID}/like",
            json={"liked": True},
        )
        assert resp.status_code == 401

    def test_like_nonexistent_post_404(self, client, db):
        _, token = _create_user_and_token(db)
        resp = client.post(
            "/api/posts/nonexistent/like",
            headers=_auth(token),
            json={"liked": True},
        )
        assert resp.status_code == 404


class TestLikeFields:
    def test_get_post_includes_like_count_and_liked(self, client, db):
        create_test_post(db, title="Test Post")
        user, token = _create_user_and_token(db)
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(token),
            json={"liked": True},
        )

        resp = client.get(
            f"/api/posts/{POST_ID}",
            headers=_auth(token),
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["likeCount"] == 1
        assert data["liked"] is True

        resp_anon = client.get(f"/api/posts/{POST_ID}")
        assert resp_anon.json()["likeCount"] == 1
        assert resp_anon.json()["liked"] is False

    def test_get_posts_includes_like_count_and_liked(self, client, db):
        create_test_post(db, title="Test Post")
        other = create_test_user(db, github_id=99999, username="otheruser")
        other_token = create_access_token(other.id, "otheruser")
        _create_user_and_token(db)
        client.post(
            f"/api/posts/{POST_ID}/like",
            headers=_auth(other_token),
            json={"liked": True},
        )

        resp = client.get("/api/posts")
        posts = resp.json()["posts"]
        assert len(posts) == 1
        assert posts[0]["likeCount"] == 1
        assert posts[0]["liked"] is False


class TestLikedPosts:
    def test_returns_liked_posts_most_recent_first(self, client, db):
        create_test_post(db, title="First Post")
        create_test_post(db, title="Second Post")
        create_test_post(db, title="Unliked Post")
        user, token = _create_user_and_token(db)
        other, other_token = _create_user_and_token(db, github_id=99999, username="otheruser")

        client.post(
            "/api/posts/first-post/like",
            headers=_auth(token),
            json={"liked": True},
        )
        client.post(
            "/api/posts/second-post/like",
            headers=_auth(token),
            json={"liked": True},
        )
        client.post(
            "/api/posts/first-post/like",
            headers=_auth(other_token),
            json={"liked": True},
        )

        resp = client.get("/api/posts/liked", headers=_auth(token))
        assert resp.status_code == 200
        posts = resp.json()["posts"]
        assert [p["id"] for p in posts] == ["second-post", "first-post"]
        assert posts[0]["liked"] is True
        assert posts[0]["likeCount"] == 1
        assert posts[1]["likeCount"] == 2

    def test_liked_posts_requires_auth(self, client, db):
        resp = client.get("/api/posts/liked")
        assert resp.status_code == 401

    def test_liked_posts_empty_for_user_without_likes(self, client, db):
        create_test_post(db, title="First Post")
        _, token = _create_user_and_token(db)
        resp = client.get("/api/posts/liked", headers=_auth(token))
        assert resp.status_code == 200
        assert resp.json() == {"posts": [], "total": 0}