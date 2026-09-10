---
name: ai-github-context
description: Use when the user asks about the GitHub integration (repo info fetch, OAuth, repo ownership checks) or the AI generation feature (Gemini) in the post-panel codebase. Triggers on "GitHub", "repo", "repository", "README", "Gemini", "AI generate", "generate post", "github info", "stars". Open exactly the named files below instead of exploring the repo broadly.
---

# GitHub + AI Context — Specific Files

Read the source files in the order shown. `codebase-context/INTEGRATIONS.md` and matching FLOWS sections are verified snapshots; the source is authoritative.

## Backend (all logic is in inline functions in `backend-fastapi/main.py`)

| What | Line range (approx) | Notes |
|------|---------------------|-------|
| URL parser | `main.py` ~74 (`parse_github_url`) | extracts owner/repo |
| Repo fetch + cache | `main.py` ~84 (`fetch_github_repo`) | `_github_cache` TTL 3600s; token = user `github_token` else `GITHUB_TOKEN` env |
| Repo info endpoint | `main.py` ~660 (`getGithubInfo`) | GET `/api/github/info?url=` |
| README fetch | `main.py` ~692 (`fetch_readme`) | truncated to 4000 chars for AI |
| Gemini call | `main.py` ~706 (`generate_with_gemini`) | gemini-2.5-flash; builds title/description/type/availableAt |
| Generate endpoint | `main.py` ~804 (`generatePostContent`) | POST `/api/github/generate?url=` |
| OAuth callback | `main.py` ~219 (`github_callback`) | upserts User, stores `github_token` |
| Ownership check | `main.py` `createPost` ~843 / `updatePost` ~907 | GitHub owner.id must equal user.github_id |
| Config | `backend-fastapi/config.py` | `GEMINI_API_KEY_POST_PANEL`, `GITHUB_CLIENT_ID_POST_PANEL`, `GITHUB_CLIENT_SECRET_POST_PANEL` (loaded via `.env.{APP_ENV}` + process env) |

## Frontend

| What | File | Notes |
|------|------|-------|
| GitHub info call | `client/src/api/posts.js` (`getGithubInfo` ~60) | fetch with `Authorization` header |
| AI generation call | `client/src/api/posts.js` (`generatePostContent` ~71) | same header pattern |
| CreatePost form | `client/src/pages/CreatePost.jsx` | repo URL input, "fetch info", "generate with AI", auto-fill |
| Auth for calls | `client/src/api/client.js` | token from `getToken()` |

## Key gotchas

1. **`getGithubInfo`/`generatePostContent` bypass the shared `request()` client** — they call `fetch` directly and attach the token manually, so they do NOT get the 401-refresh behavior. Keep that pattern in mind when editing them.
2. **Rate limits / cache:** repo metadata cached 1 hour in-process (per worker). No cache eviction beyond TTL.
3. **Token precedence:** user's `github_token` (from OAuth) is used first; falls back to `GITHUB_TOKEN` env var (line ~93, ~694).
4. **Ownership enforcement** is server-side on create/update — the AI/info endpoints do not require login.
5. **Missing tests:** no backend or frontend tests cover Gemini generation; `test_github.py` mocks the GitHub API.
6. **AI key required** only for the generate feature; local dev can run without it (empty default).