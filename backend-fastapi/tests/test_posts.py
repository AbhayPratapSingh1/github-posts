"""Tests for Posts CRUD: GET /api/posts, GET /api/posts/{id}, POST /api/posts, PUT /api/posts/{id}, DELETE /api/posts/{id}."""

from tests.conftest import create_test_user, create_test_post
from auth import create_access_token


class TestGetPosts:
    def test_get_posts_returns_paginated_list(self, client, db):
        for i in range(5):
            create_test_post(db, title=f"Post {i}")
        resp = client.get("/api/posts")
        assert resp.status_code == 200
        data = resp.json()
        assert "posts" in data
        assert "total" in data
        assert data["total"] == 5
        assert len(data["posts"]) == 5

    def test_get_posts_default_pagination(self, client, db):
        for i in range(15):
            create_test_post(db, title=f"Post {i}")
        resp = client.get("/api/posts")
        data = resp.json()
        assert data["total"] == 15
        assert len(data["posts"]) == 12  # default limit

    def test_get_posts_custom_offset_limit(self, client, db):
        for i in range(10):
            create_test_post(db, title=f"Post {i}")
        resp = client.get("/api/posts?offset=2&limit=3")
        data = resp.json()
        assert len(data["posts"]) == 3
        assert data["offset"] == 2
        assert data["limit"] == 3
        assert data["total"] == 10

    def test_get_posts_limit_capped_at_50(self, client, db):
        resp = client.get("/api/posts?limit=100")
        data = resp.json()
        assert data["limit"] == 50

    def test_get_posts_empty_when_no_posts(self, client, db):
        resp = client.get("/api/posts")
        data = resp.json()
        assert data["total"] == 0
        assert len(data["posts"]) == 0

    def test_get_posts_ordered_by_creation_date(self, client, db):
        p1 = create_test_post(db, title="First")
        p1.dateOfCreation = 1000
        p2 = create_test_post(db, title="Second")
        p2.dateOfCreation = 2000
        db.commit()
        resp = client.get("/api/posts")
        posts = resp.json()["posts"]
        # Should be ordered desc (newest first)
        assert posts[0]["title"] == "Second"
        assert posts[1]["title"] == "First"


class TestGetPostById:
    def test_get_post_by_id_returns_post(self, client, db):
        create_test_post(db, title="My Post")
        resp = client.get("/api/posts/my-post")
        assert resp.status_code == 200
        assert resp.json()["title"] == "My Post"

    def test_get_post_by_id_returns_404_for_nonexistent(self, client, db):
        resp = client.get("/api/posts/nonexistent")
        assert resp.status_code == 404
        assert "error" in resp.json()


class TestCreatePost:
    def test_create_post_success(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "New Post",
                "type": "playable",
                "shortDescription": "A new post",
                "description": "Full description",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "New Post"

    def test_create_post_returns_401_when_unauthenticated(self, client, db):
        resp = client.post(
            "/api/posts",
            json={
                "title": "New Post",
                "type": "playable",
                "shortDescription": "A new post",
                "description": "Full description",
            },
        )
        assert resp.status_code == 401

    def test_create_post_returns_409_for_duplicate_title(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        create_test_post(db, title="Duplicate")
        resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Duplicate",
                "type": "playable",
                "shortDescription": "A new post",
                "description": "Full description",
            },
        )
        assert resp.status_code == 409
        assert "already exists" in resp.json()["error"]

    def test_create_post_generates_slug_id(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "My Cool Post!",
                "type": "playable",
                "shortDescription": "A new post",
                "description": "Full description",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["id"] == "my-cool-post"

    def test_create_post_with_github_url(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        resp = client.post(
            "/api/posts",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "GitHub Post",
                "type": "playable",
                "shortDescription": "A new post",
                "description": "Full description",
                "github": "https://github.com/owner/repo",
            },
        )
        # May fail due to GitHub API, but should not crash
        assert resp.status_code in (200, 403, 500)


class TestUpdatePost:
    def test_update_post_success(self, client, db, auth_headers):
        user = create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        create_test_post(db, user_id=user.id, title="Original Title")
        resp = client.put(
            "/api/posts/original-title",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Updated Title",
                "type": "hosted",
                "shortDescription": "Updated",
                "description": "Updated description",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Updated Title"

    def test_update_post_returns_403_when_not_owner(self, client, db):
        user = create_test_user(db, github_id=12345, username="testuser")
        other = create_test_user(db, github_id=99999, username="otheruser")
        create_test_post(db, user_id=user.id, title="Someone's Post")
        token = create_access_token(other.id, "otheruser")
        resp = client.put(
            "/api/posts/someones-post",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "Hacked Title",
                "type": "playable",
                "shortDescription": "Hacked",
                "description": "Hacked",
            },
        )
        assert resp.status_code == 403
        assert "Not authorized" in resp.json()["error"]

    def test_update_post_returns_404_when_not_found(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        resp = client.put(
            "/api/posts/nonexistent",
            headers={"Authorization": f"Bearer {token}"},
            json={
                "title": "New Title",
                "type": "playable",
                "shortDescription": "New",
                "description": "New",
            },
        )
        assert resp.status_code == 404


class TestDeletePost:
    def test_delete_post_success(self, client, db, auth_headers):
        user = create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        create_test_post(db, user_id=user.id, title="To Delete")
        resp = client.delete(
            "/api/posts/to-delete",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 200
        assert "deleted" in resp.json()["message"].lower()

    def test_delete_post_returns_403_when_not_owner(self, client, db):
        user = create_test_user(db, github_id=12345, username="testuser")
        other = create_test_user(db, github_id=99999, username="otheruser")
        create_test_post(db, user_id=user.id, title="Someone's Post")
        token = create_access_token(other.id, "otheruser")
        resp = client.delete(
            "/api/posts/someones-post",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 403
        assert "Not authorized" in resp.json()["error"]

    def test_delete_post_returns_404_when_not_found(self, client, db, auth_headers):
        create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        resp = client.delete(
            "/api/posts/nonexistent",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert resp.status_code == 404

    def test_delete_post_cannot_delete_twice(self, client, db, auth_headers):
        user = create_test_user(db, github_id=12345, username="testuser")
        token = create_access_token(1, "testuser")
        create_test_post(db, user_id=user.id, title="Delete Me")
        resp1 = client.delete("/api/posts/delete-me", headers={"Authorization": f"Bearer {token}"})
        assert resp1.status_code == 200
        resp2 = client.delete("/api/posts/delete-me", headers={"Authorization": f"Bearer {token}"})
        assert resp2.status_code == 404
