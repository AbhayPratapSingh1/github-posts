# Glossary

This document explains domain-specific terminology used in the Post Panel application.

## Core Concepts

### Post

A project showcase entry created by a user. Represents something the user built (a game, tool, or app) that they want to display to others.

**Attributes:**
- Title (slugified into a unique ID)
- Type (playable, hosted, none)
- Short description (card display)
- Full description (Markdown or HTML)
- GitHub repository link (optional)
- Language, stats, timestamps

### Type (Post Type)

Categorizes how a post can be experienced:
- **playable:** Can be played/used directly in the browser
- **hosted:** Hosted online at a URL
- **none:** Neither playable nor hosted

Defined in `client/src/config/posts.js` (`POST_TYPE`).

### Feed

The paginated list of posts displayed on the Home page. Supports infinite scroll via IntersectionObserver and uses `offset`/`limit` pagination.

### Author

The user who created a post. Resolved either by `user_id` (primary) or by matching `username == githubOwner` (fallback). Displayed as `authorName`/`authorUsername` in API responses.

### Short Description

A brief one-line summary of the post, used in card layouts. Max ~100 characters.

### Description

The full post content. Can be:
- Markdown (rendered via react-markdown)
- HTML (rendered via `dangerouslySetInnerHTML`, detected by presence of `<` character)

## Authentication

### GitHub OAuth

The primary authentication method. Users sign in with their GitHub account via OAuth 2.0.

### Session Token (Access Token)

Short-lived JWT (15 min default) that authenticates API requests. Stored in:
- `session` HTTP-only cookie (backend)
- `session_token` localStorage (frontend)

### Refresh Token

Long-lived JWT (30 days default) used to obtain new access tokens. Stored in:
- `refresh_token` HTTP-only cookie (backend)
- `refresh_token` localStorage (frontend)

### Admin Token

Alterative token for admin access, returned by `/api/admin/login`. Stored in `admin_token` localStorage.

### ADMIN_GITHUB_IDS

Comma-separated list of GitHub user IDs allowed to access admin features. Currently hardcoded as an environment variable.

## GitHub Terms

### GitHub Owner

The GitHub username of the repository owner. Stored as `githubOwner` in the Post model.

### GitHub Stats

Repository statistics fetched from GitHub API:
- **stars:** Number of stars
- **forks:** Number of forks
- **watchers:** Number of watchers
- **openIssues:** Number of open issues

### Repo Ownership

The verification that a post creator actually owns the GitHub repository they're linking to. Checked by comparing GitHub API `owner.id` with the user's `github_id`.

### Parse GitHub URL

The process of extracting `owner` and `repo` from a GitHub URL (e.g., `https://github.com/owner/repo` → `owner`, `repo`).

## AI Features

### AI Generation

Auto-creating post content (title, description, type, availableAt) from a GitHub repository's metadata and README using Google Gemini 2.5 Flash.

### README

The repository's README file, fetched to provide context for AI generation (limit 4000 chars).

### generateContent

The Google Gemini API operation used for AI content generation.

## Admin

### Admin Dashboard

Admin-only view showing aggregate statistics (total posts, users, stars, forks, languages) and providing post/user management.

### Admin Verify

The check that a user's GitHub ID is in `ADMIN_GITHUB_IDS` before allowing admin operations.

### Bulk Operations

Admin endpoints that delete all posts or all users at once.

## Deployment

### Render

Cloud platform hosting the FastAPI backend and managed PostgreSQL database.

### Vercel

Cloud platform hosting the React frontend as static files.

### Render Blueprint

Deployment configuration file (`render.yaml`) that defines the Render service and database.

### Railway (Alternative)

Alternative deployment platform with its own config (`railway.json`).

### Procfile

Heroku-style deployment configuration.

## Frontend

### ProtectedRoute

React component that gates routes requiring authentication. Redirects to `/login` if no valid token exists.

### Infinite Scroll

Automatic pagination triggered by scrolling to the bottom of the post list. Implemented with `IntersectionObserver`.

### Toast

Temporary notification messages displayed in the top-right corner. Managed by `ToastContext`.

### Lightbox

Full-screen image viewer used in post pages. Supports keyboard navigation (arrows, ESC) and image counter.

### Quill Editor

Rich text editor (via `react-quill-new`) used for editing post descriptions.

### Prose

Tailwind CSS typography class (`@tailwindcss/typography`) for styling rendered markdown/HTML content.

## Database

### JSON Columns

Flexible columns in the database storing structured data:
- `hosted`: Hosting details
- `availableAt`: Platform availability
- `stats`: Repository statistics

### Slug

URL-friendly version of the post title, used as the post ID (e.g., "My Cool Project" → "my-cool-project").

### Seed Data

Demo data created by the seed script (`scripts/seed.py`): 3 users, 52 posts, 5 comments.

### Fallback Data

Static post data in `all_posts.py` used when the database connection fails.

## Testing

### Fixture

Setup code in tests that provides reusable data (users, posts, auth headers) for test cases.

### Test Factory

Function that creates test entities (e.g., `create_test_user()`, `create_test_post()`).

## Legacy

### Legacy Backend

The retired Node.js/Hono backend in `backend/` directory. Kept for reference, not used by the running application.

### Legacy Port

Port 3000 (old backend) vs. port 7180 (current FastAPI backend). The Bruno test environment still points to the legacy port — needs updating.

## Configuration

### APP_ENV

Environment variable selecting which `.env` file to load. Controls cookie security settings (`secure`/`samesite`).

### CORS_ORIGINS

Comma-separated list of allowed browser origins for cross-origin requests.

### VITE_BACKEND_URL

Frontend environment variable specifying the backend API URL. If unset, the frontend proxies `/api` to localhost:7180 in development.