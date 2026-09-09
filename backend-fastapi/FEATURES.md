# Backend Features

## 1. Auth
- POST /api/auth/login (valid + invalid credentials)
- POST /api/auth/logout (clears cookies)
- GET /api/auth/me (authenticated + unauthenticated)
- POST /api/auth/refresh (valid + invalid refresh token)
- GET /api/auth/github (redirects to GitHub OAuth)

## 2. Posts CRUD
- GET /api/posts (pagination: offset, limit, total)
- GET /api/posts/{id} (found + not found)
- POST /api/posts (create + duplicate title 409 + unauthenticated 401)
- PUT /api/posts/{id} (update + not owner 403 + not found 404)
- DELETE /api/posts/{id} (delete + not owner 403 + not found 404)

## 3. GitHub Integration
- GET /api/github/info (valid URL + invalid URL + repo not found)
- GET /api/github/generate (valid + invalid URL + no API key)

## 4. Repo Ownership Validation
- POST /api/posts blocks if repo owner != user
- PUT /api/posts/{id} blocks if repo owner != user

## 5. Pagination
- Default offset=0, limit=12
- Custom offset/limit
- Limit capped at 50

## 6. Utilities
- slugify() converts title to slug
- parse_github_url() extracts owner/repo
- fetch_github_repo() caches for 1 hour
