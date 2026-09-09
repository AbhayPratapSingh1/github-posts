"""Tests for GitHub integration: /api/github/info and /api/github/generate."""

import os
from unittest.mock import patch, AsyncMock
from tests.conftest import create_test_user
from auth import create_access_token

# Ensure GEMINI_API_KEY is set so the endpoint doesn't early-return 500
os.environ["GEMINI_API_KEY"] = "test-key"

MOCK_GITHUB_REPO = {
    "language": "Python",
    "default_branch": "main",
    "created_at": "2026-01-01T00:00:00Z",
    "pushed_at": "2026-09-01T00:00:00Z",
    "description": "A test repository",
    "stargazers_count": 100,
    "forks_count": 25,
    "watchers_count": 10,
    "open_issues_count": 5,
    "owner": {
        "login": "testuser",
        "id": 12345,
    },
}


class TestGithubInfo:
    @patch("main.fetch_github_repo", new_callable=AsyncMock, return_value=MOCK_GITHUB_REPO)
    def test_github_info_returns_repo_data(self, mock_fetch, client, db):
        resp = client.get("/api/github/info?url=https://github.com/testuser/repo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["language"] == "Python"
        assert data["githubOwner"] == "testuser"
        assert data["ownerId"] == 12345
        assert data["stats"]["stars"] == 100

    def test_github_info_returns_400_for_invalid_url(self, client, db):
        resp = client.get("/api/github/info?url=not-a-url")
        assert resp.status_code == 400
        assert "Invalid GitHub URL" in resp.json()["error"]

    def test_github_info_returns_400_for_incomplete_url(self, client, db):
        resp = client.get("/api/github/info?url=https://github.com/only-owner")
        assert resp.status_code == 400

    @patch("main.fetch_github_repo", new_callable=AsyncMock, return_value=None)
    def test_github_info_returns_404_for_nonexistent_repo(self, mock_fetch, client, db):
        resp = client.get("/api/github/info?url=https://github.com/user/nonexistent-repo-xyz")
        assert resp.status_code == 404

    def test_github_info_requires_url_param(self, client, db):
        resp = client.get("/api/github/info")
        assert resp.status_code == 422  # validation error


class TestGithubGenerate:
    @patch("main.GEMINI_API_KEY", "test-key")
    @patch("main.generate_with_gemini", new_callable=AsyncMock)
    @patch("main.fetch_readme", new_callable=AsyncMock, return_value="# Test README")
    @patch("main.fetch_github_repo", new_callable=AsyncMock, return_value=MOCK_GITHUB_REPO)
    def test_generate_returns_content(self, mock_fetch, mock_readme, mock_gemini, client, db):
        mock_gemini.return_value = {
            "title": "Generated Title",
            "shortDescription": "A short desc",
            "description": "<p>Full description</p>",
            "type": "playable",
            "availableAt": ["web"],
        }
        resp = client.post("/api/github/generate?url=https://github.com/testuser/repo")
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Generated Title"

    def test_generate_returns_400_for_invalid_url(self, client, db):
        resp = client.post("/api/github/generate?url=invalid")
        assert resp.status_code == 400

    @patch("main.GEMINI_API_KEY", "test-key")
    @patch("main.fetch_github_repo", new_callable=AsyncMock, return_value=None)
    def test_generate_returns_404_for_nonexistent_repo(self, mock_fetch, client, db):
        resp = client.post("/api/github/generate?url=https://github.com/user/nope")
        assert resp.status_code == 404

    @patch("main.GEMINI_API_KEY", "test-key")
    @patch("main.fetch_github_repo", new_callable=AsyncMock)
    def test_generate_returns_500_when_gemini_not_configured(self, mock_fetch, client, db):
        mock_fetch.return_value = MOCK_GITHUB_REPO
        # Override GEMINI_API_KEY back to empty
        with patch("main.GEMINI_API_KEY", ""):
            resp = client.post("/api/github/generate?url=https://github.com/testuser/repo")
            assert resp.status_code == 500
            assert "GEMINI_API_KEY" in resp.json()["error"]
