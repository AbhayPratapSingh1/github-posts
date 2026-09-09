"""Load tests for Post Panel API using Locust.

Run:
  locust -f backend-fastapi/loadtests/locustfile.py --host=http://127.0.0.1:7180

Open http://localhost:8089 to configure and start the test.
"""

import json
from urllib.parse import quote
from locust import HttpUser, task, between, events


# ── Seed data ──────────────────────────────────────────────────────────

SEED_POSTS = [
    f"load-test-post-{i}" for i in range(20)
]


# ── User behaviour ─────────────────────────────────────────────────────

class AnonymousUser(HttpUser):
    """Unauthenticated visitor — reads posts, views single post."""
    weight = 3
    wait_time = between(1, 3)

    @task(10)
    def list_posts(self):
        """GET /api/posts — the most common endpoint."""
        offset = self.environment.parsed_options.get("offset", 0) if hasattr(self.environment.parsed_options, "get") else 0
        self.client.get("/api/posts?offset=0&limit=12", name="/api/posts [page]")

    @task(5)
    def list_posts_page2(self):
        self.client.get("/api/posts?offset=12&limit=12", name="/api/posts [page2]")

    @task(8)
    def get_post(self):
        """GET /api/posts/{id} — random post."""
        post_id = SEED_POSTS[self.random.randint(0, len(SEED_POSTS) - 1)]
        with self.client.get(f"/api/posts/{post_id}", name="/api/posts/[id]", catch_response=True) as resp:
            if resp.status_code == 404:
                resp.success()  # 404 is expected for seed IDs that don't exist

    @task(3)
    def github_info(self):
        """GET /api/github/info — public repo lookup."""
        self.client.get(
            "/api/github/info?url=https://github.com/microsoft/typescript",
            name="/api/github/info",
        )

    @task(1)
    def health_check(self):
        self.client.get("/", name="/ [health]")


class AuthenticatedUser(HttpUser):
    """Logged-in user — creates, updates, deletes posts."""
    weight = 1
    wait_time = between(2, 5)

    def on_start(self):
        """Login and store token."""
        resp = self.client.post(
            "/api/auth/login",
            json={"userid": "admin", "password": "12345"},
            name="/api/auth/login",
        )
        if resp.status_code == 200:
            data = resp.json()
            self.user_data = data.get("user", {})
            # Token is set as cookie by the server
            self.is_logged_in = True
        else:
            self.is_logged_in = False
            self.user_data = {}

    @task(8)
    def list_posts(self):
        self.client.get("/api/posts?offset=0&limit=12", name="/api/posts [auth]")

    @task(3)
    def create_post(self):
        """POST /api/posts — creates a unique post."""
        if not self.is_logged_in:
            return
        idx = self.random.randint(0, 999999)
        self.client.post(
            "/api/posts",
            json={
                "title": f"Load Test Post {idx}",
                "type": "playable",
                "shortDescription": f"Auto-generated post {idx}",
                "description": f"<p>Full description for load test post {idx}</p>",
                "github": None,
            },
            name="/api/posts [create]",
        )

    @task(2)
    def get_post_by_id(self):
        """GET /api/posts/{id} — view own post."""
        post_id = SEED_POSTS[self.random.randint(0, min(4, len(SEED_POSTS) - 1))]
        with self.client.get(f"/api/posts/{post_id}", name="/api/posts/[id] [auth]", catch_response=True) as resp:
            if resp.status_code in (200, 404):
                resp.success()

    @task(1)
    def get_me(self):
        """GET /api/auth/me — check auth status."""
        self.client.get("/api/auth/me", name="/api/auth/me")

    @task(1)
    def github_info(self):
        self.client.get(
            "/api/github/info?url=httpsgithub.com/facebook/react",
            name="/api/github/info [auth]",
        )


class BurstUser(HttpUser):
    """Simulates burst traffic — rapid requests in quick succession."""
    weight = 1
    wait_time = between(0.1, 0.5)

    @task(5)
    def rapid_list_posts(self):
        self.client.get("/api/posts?offset=0&limit=12", name="/api/posts [burst]")

    @task(2)
    def rapid_get_post(self):
        post_id = SEED_POSTS[self.random.randint(0, len(SEED_POSTS) - 1)]
        with self.client.get(f"/api/posts/{post_id}", name="/api/posts/[id] [burst]", catch_response=True) as resp:
            if resp.status_code in (200, 404):
                resp.success()

    @task(1)
    def rapid_health(self):
        self.client.get("/", name="/ [burst]")
