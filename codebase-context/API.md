# API Documentation

This document catalogs all API endpoints in the Post Panel application.

## API Conventions

### Base URL
- Development: `http://localhost:7180`
- Production: Configured via `BACKEND_URL` environment variable

### Authentication
- JWT tokens in HTTP-only cookies (`session`, `refresh_token`)
- Bearer token in `Authorization` header (alternative)
- Tokens returned in URL query parameters for OAuth flow

### Request Format
- Content-Type: `application/json` for POST/PUT requests
- Query parameters for GET requests
- Path parameters for resource identification

### Response Format
- Success: JSON object with data
- Error: JSON object with `error` field
- Status codes: 200 (success), 400 (bad request), 401 (unauthorized), 403 (forbidden), 404 (not found), 409 (conflict), 500 (server error)

### Pagination
- `offset`: Starting position (default: 0)
- `limit`: Number of items (default: 12, max: 50)

## Authentication Endpoints

### POST /api/auth/login
**Purpose:** Admin/user login with credentials
**Authentication:** None
**Authorization:** None
**Request:**
```json
{
  "userid": "string",
  "password": "string"
}
```
**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "avatar_url": "...",
    "github_id": 12345678,
    "email": "...",
    "bio": "...",
    "created_at": "..."
  }
}
```
**Cookies:** Sets `session` and `refresh_token`
**Errors:** 401 (invalid credentials)

### GET /api/auth/me
**Purpose:** Get current authenticated user
**Authentication:** Optional (validates if token present)
**Authorization:** None
**Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "user",
    "name": "User Name",
    "avatar_url": "...",
    "github_id": 12345678,
    "email": "...",
    "bio": "...",
    "created_at": "..."
  }
}
```
**Response (200, unauthenticated):**
```json
{
  "user": null
}
```

### POST /api/auth/logout
**Purpose:** Clear session cookies
**Authentication:** None
**Authorization:** None
**Response (200):**
```json
{
  "message": "Logged out"
}
```
**Side effects:** Deletes `session` and `refresh_token` cookies

### POST /api/auth/refresh
**Purpose:** Refresh access token using refresh token
**Authentication:** Refresh token in cookie
**Authorization:** None
**Response (200):**
```json
{
  "success": true
}
```
**Cookies:** Updates `session` cookie with new access token
**Errors:** 401 (no/invalid refresh token)

### GET /api/auth/github
**Purpose:** Initiate GitHub OAuth flow
**Authentication:** None
**Authorization:** None
**Response:** Redirect to GitHub OAuth authorization URL
**Errors:** 500 (GitHub OAuth not configured)

### GET /api/auth/github/callback
**Purpose:** Handle GitHub OAuth callback
**Authentication:** GitHub OAuth code
**Authorization:** None
**Query Parameters:**
- `code`: GitHub OAuth authorization code
**Response:** Redirect to frontend with tokens in URL
**URL Parameters:**
- `token`: Access token
- `refresh`: Refresh token
- `user`: URL-encoded JSON user data
**Side effects:** Creates or updates user in database
**Errors:** Redirects with error on failure

## Admin Endpoints

### GET /api/admin/check
**Purpose:** Check if current user is admin
**Authentication:** Required
**Authorization:** Admin (GitHub ID in ADMIN_GITHUB_IDS)
**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "avatar_url": "...",
    "github_id": 12345678
  }
}
```
**Errors:** 401 (not authenticated), 403 (not admin)

### POST /api/admin/login
**Purpose:** Admin login with GitHub ID and password
**Authentication:** None
**Authorization:** Admin (GitHub ID + password)
**Request:**
```json
{
  "github_id": 12345678,
  "password": "admin_password"
}
```
**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "name": "Administrator",
    "avatar_url": "...",
    "github_id": 12345678,
    "email": "...",
    "bio": "...",
    "is_admin": true
  },
  "token": "jwt_access_token"
}
```
**Cookies:** Sets `session` and `refresh_token`
**Errors:** 401 (wrong password), 403 (not admin), 404 (user not found)

### GET /api/admin/dashboard
**Purpose:** Get admin dashboard statistics
**Authentication:** Required
**Authorization:** Admin
**Response (200):**
```json
{
  "stats": {
    "totalPosts": 100,
    "totalUsers": 50,
    "totalStars": 1000,
    "totalForks": 200,
    "languages": {
      "JavaScript": 30,
      "Python": 20,
      "TypeScript": 15
    }
  },
  "posts": [...],
  "users": [...]
}
```
**Errors:** 403 (not admin)

### DELETE /api/admin/posts/{id}
**Purpose:** Delete a post (admin only)
**Authentication:** Required
**Authorization:** Admin
**Path Parameters:**
- `id`: Post ID to delete
**Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```
**Errors:** 403 (not admin), 404 (post not found)

### DELETE /api/admin/posts
**Purpose:** Delete all posts (admin only)
**Authentication:** Required
**Authorization:** Admin
**Response (200):**
```json
{
  "message": "Deleted 50 posts"
}
```
**Errors:** 403 (not admin)

### PUT /api/admin/posts/{id}
**Purpose:** Update a post (admin only)
**Authentication:** Required
**Authorization:** Admin
**Path Parameters:**
- `id`: Post ID to update
**Request:** Same as POST /api/posts
**Response (200):** Updated post object
**Errors:** 403 (not admin), 404 (post not found)

### DELETE /api/admin/users
**Purpose:** Delete all users (admin only)
**Authentication:** Required
**Authorization:** Admin
**Response (200):**
```json
{
  "message": "Deleted 30 users"
}
```
**Errors:** 403 (not admin)

## Post Endpoints

### GET /api/posts
**Purpose:** Get paginated list of posts
**Authentication:** None
**Authorization:** None
**Query Parameters:**
- `offset` (default: 0): Starting position
- `limit` (default: 12, max: 50): Number of posts
**Response (200):**
```json
{
  "posts": [
    {
      "id": "my-cool-project",
      "user_id": 1,
      "title": "My Cool Project",
      "type": "playable",
      "shortDescription": "A cool project",
      "hosted": null,
      "availableAt": ["web"],
      "description": "...",
      "github": "https://github.com/user/repo",
      "dateOfCreation": 1234567890,
      "language": "JavaScript",
      "lastPushAt": "2024-01-01T00:00:00Z",
      "defaultBranch": "main",
      "stats": {
        "stars": 100,
        "forks": 20,
        "watchers": 10,
        "openIssues": 5
      },
      "githubOwner": "user",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "authorName": "User Name",
      "authorUsername": "user"
    }
  ],
  "total": 100,
  "offset": 0,
  "limit": 12
}
```
**Fallback:** Returns static posts from `all_posts.py` on database error

### GET /api/posts/{id}
**Purpose:** Get single post with comments
**Authentication:** None
**Authorization:** None
**Path Parameters:**
- `id`: Post ID
**Response (200):**
```json
{
  "id": "my-cool-project",
  "user_id": 1,
  "title": "My Cool Project",
  "...": "...",
  "comments": [
    {
      "id": 1,
      "user_id": 2,
      "github_id": 87654321,
      "username": "commenter",
      "name": "Commenter Name",
      "avatar_url": "...",
      "content": "Great project!",
      "created_at": "2024-01-02T00:00:00Z"
    }
  ],
  "has_more_comments": true
}
```
**Notes:** Returns up to 5 comments, `has_more_comments` indicates if more exist
**Errors:** 404 (post not found)
**Fallback:** Returns static post from `all_posts.py` on database error

### POST /api/posts
**Purpose:** Create a new post
**Authentication:** Required
**Authorization:** Ownership (set to authenticated user)
**Request:**
```json
{
  "title": "My Cool Project",
  "type": "playable",
  "shortDescription": "A cool project",
  "description": "Full description in Markdown",
  "hosted": null,
  "availableAt": ["web"],
  "github": "https://github.com/user/repo",
  "language": "JavaScript",
  "lastPushAt": "2024-01-01T00:00:00Z",
  "defaultBranch": "main"
}
```
**Response (200):** Created post object
**Side effects:**
- Generates slugified ID from title
- Fetches GitHub data if URL provided
- Verifies repo ownership via GitHub API
**Errors:** 409 (duplicate title), 403 (repo not owned by user)

### PUT /api/posts/{id}
**Purpose:** Update an existing post
**Authentication:** Required
**Authorization:** Ownership (post.user_id == user.id)
**Path Parameters:**
- `id`: Post ID to update
**Request:** Same as POST /api/posts (partial updates allowed)
**Response (200):** Updated post object
**Side effects:** Re-fetches GitHub data if URL provided
**Errors:** 404 (post not found), 403 (not owner)

### DELETE /api/posts/{id}
**Purpose:** Delete a post
**Authentication:** Required
**Authorization:** Ownership (post.user_id == user.id)
**Path Parameters:**
- `id`: Post ID to delete
**Response (200):**
```json
{
  "message": "Post deleted successfully"
}
```
**Errors:** 404 (post not found), 403 (not owner)

## Comment Endpoints

### GET /api/posts/{post_id}/comments
**Purpose:** Get comments for a post
**Authentication:** None
**Authorization:** None
**Path Parameters:**
- `post_id`: Post ID
**Response (200):**
```json
[
  {
    "id": 1,
    "user_id": 2,
    "github_id": 87654321,
    "username": "commenter",
    "name": "Commenter Name",
    "avatar_url": "...",
    "content": "Great project!",
    "created_at": "2024-01-02T00:00:00Z"
  }
]
```
**Notes:** Returns latest 6 comments

### POST /api/posts/{post_id}/comments
**Purpose:** Create a comment on a post
**Authentication:** Required
**Authorization:** Any authenticated user
**Path Parameters:**
- `post_id`: Post ID to comment on
**Request:**
```json
{
  "content": "Great project!"
}
```
**Response (200):**
```json
{
  "id": 1,
  "post_id": "my-cool-project",
  "user_id": 2,
  "github_id": 87654321,
  "username": "commenter",
  "name": "Commenter Name",
  "avatar_url": "...",
  "content": "Great project!",
  "created_at": "2024-01-02T00:00:00Z"
}
```
**Errors:** 401 (not authenticated), 400 (empty content)

## GitHub Integration Endpoints

### GET /api/github/info
**Purpose:** Fetch GitHub repository information
**Authentication:** None (but uses token if available)
**Authorization:** None
**Query Parameters:**
- `url`: GitHub repository URL
**Response (200):**
```json
{
  "language": "JavaScript",
  "defaultBranch": "main",
  "createdAt": "2024-01-01T00:00:00Z",
  "pushedAt": "2024-01-02T00:00:00Z",
  "githubOwner": "user",
  "ownerId": 12345678,
  "description": "Repository description",
  "stats": {
    "stars": 100,
    "forks": 20,
    "watchers": 10,
    "openIssues": 5
  }
}
```
**Notes:** Results cached in memory for 1 hour
**Errors:** 400 (invalid URL), 404 (repository not found)

### POST /api/github/generate
**Purpose:** Generate post content using AI
**Authentication:** None (but uses token if available)
**Authorization:** None
**Query Parameters:**
- `url`: GitHub repository URL
**Response (200):**
```json
{
  "title": "Generated Project Title",
  "shortDescription": "One-line summary",
  "description": "<p>HTML description</p>",
  "type": "playable",
  "availableAt": ["web"]
}
```
**Side effects:**
- Fetches repository data from GitHub
- Fetches README content
- Calls Google Gemini API
**Notes:** Converts markdown to HTML for Quill editor
**Errors:** 400 (invalid URL), 404 (repository not found), 500 (generation failed)

## Health Check

### GET /
**Purpose:** Health check endpoint
**Authentication:** None
**Authorization:** None
**Response (200):**
```json
{
  "data": "End point is working fine"
}
```

## Error Response Format

All error responses follow this format:
```json
{
  "error": "Error message describing what went wrong"
}
```

## Rate Limiting

- No explicit rate limiting implemented
- GitHub API calls have 10-second timeout
- Gemini API calls have 30-second timeout
- In-memory GitHub API cache (1 hour TTL) reduces external calls

## CORS Configuration

- **Allowed origins:** Configured via `CORS_ORIGINS` environment variable
- **Credentials:** Allowed
- **Methods:** All
- **Headers:** All

## Request Validation

### Pydantic Models
- `CreatePostRequest`: Validates post creation/update
- `LoginRequest`: Validates login credentials
- `AdminLoginRequest`: Validates admin login

### Manual Validation
- GitHub URL format validation
- Comment content non-empty validation
- Ownership verification in routes

## Response Serialization

### Post Serialization
- Uses `Post_handler._post_to_dict()` for consistent format
- Includes author information (name, username)
- Handles null values gracefully

### User Serialization
- Consistent user object format across endpoints
- Excludes sensitive fields (github_token)
- Includes computed fields (is_admin)

## API Testing

### Bruno Collection
- **Location:** `bruno/post-panel-api/`
- **Environment:** Points to legacy port 3000 (needs update)
- **Tests:** Basic CRUD operations

### Pytest Tests
- **Location:** `backend-fastapi/tests/`
- **Coverage:** Posts, Auth, GitHub integration, Utilities
- **Fixtures:** SQLite test database, auth headers