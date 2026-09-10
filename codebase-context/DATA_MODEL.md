# Data Model

This document reverse-engineers the application's data model from the actual implementation.

## Overview

Post Panel uses PostgreSQL as its primary database with SQLAlchemy ORM for data access. The data model consists of three main entities: User, Post, and Comment.

## Models

### User

**Purpose:** Represents a user account, primarily authenticated via GitHub OAuth.

**Table:** `user`

**Fields:**
- `id` (Integer, PK, autoincrement) - Internal user ID
- `github_id` (Integer, unique, not null) - GitHub user ID
- `username` (String, not null) - GitHub username
- `name` (String, nullable) - Display name
- `email` (String, nullable) - Email address
- `avatar_url` (String, nullable) - Profile picture URL
- `bio` (String, nullable) - User biography
- `created_at` (String, nullable) - Account creation timestamp
- `github_token` (String, nullable) - GitHub access token for API calls

**Relationships:**
- One-to-many with Post (via user_id)
- One-to-many with Comment (via user_id)

**Created by:** GitHub OAuth callback (`github_callback()` in `main.py`)
**Updated by:** GitHub OAuth callback on subsequent logins
**Deleted by:** Admin only (`admin_delete_all_users()`)

**Important invariants:**
- `github_id` must be unique
- `username` is required
- `github_token` is stored for GitHub API rate limit avoidance

**Used by:** Authentication, Post ownership, Comment authorship

### Post

**Purpose:** Represents a project showcase post created by a user.

**Table:** `post`

**Fields:**
- `id` (String, PK) - Slugified title (e.g., "my-cool-project")
- `user_id` (Integer, nullable) - Owner's user ID
- `title` (String) - Post title
- `type` (String) - Post type (playable/hosted/none)
- `shortDescription` (String) - Brief description for cards
- `hosted` (JSON, nullable) - Hosting information
- `availableAt` (JSON, nullable) - Availability platforms
- `description` (String) - Full post description (Markdown/HTML)
- `github` (String, nullable) - GitHub repository URL
- `dateOfCreation` (Integer, nullable) - Project creation timestamp
- `language` (String, nullable) - Primary programming language
- `lastPushAt` (String, nullable) - Last GitHub push timestamp
- `defaultBranch` (String, nullable) - Default git branch
- `stats` (JSON, nullable) - Repository statistics (stars, forks, etc.)
- `githubOwner` (String, nullable) - GitHub repository owner
- `created_at` (String, nullable) - Post creation timestamp
- `updated_at` (String, nullable) - Last update timestamp

**Relationships:**
- Many-to-one with User (via user_id)
- One-to-many with Comment (via post_id)

**Created by:** Authenticated users (`createPost()` in `main.py`)
**Updated by:** Post owner or Admin (`updatePost()`, `admin_update_post()`)
**Deleted by:** Post owner or Admin (`deletePost()`, `admin_delete_post()`)

**Important invariants:**
- `id` is generated from title via `slugify()`
- `user_id` is set to creator's ID
- `githubOwner` is populated from GitHub API if github URL provided
- `stats` contains stars, forks, watchers, openIssues
- Ownership is verified via `post.user_id == user.id`

**Used by:** Post listing, Post detail, Admin dashboard

### Comment

**Purpose:** Represents a user comment on a post.

**Table:** `comment`

**Fields:**
- `id` (Integer, PK, autoincrement) - Comment ID
- `post_id` (String, not null) - Post ID being commented on
- `user_id` (Integer, not null) - Comment author's user ID
- `content` (String, not null) - Comment text
- `created_at` (String, nullable) - Comment creation timestamp
- `updated_at` (String, nullable) - Last update timestamp

**Relationships:**
- Many-to-one with Post (via post_id)
- Many-to-one with User (via user_id)

**Created by:** Authenticated users (`create_comment()` in `main.py`)
**Updated by:** Not implemented (no edit endpoint)
**Deleted by:** Not implemented (no delete endpoint)

**Important invariants:**
- `content` cannot be empty
- `post_id` references an existing post (not enforced by FK)
- `user_id` is set to commenter's ID

**Used by:** Post detail view, Comment display

## Relationships Diagram

```
User
├── id (PK)
├── github_id (unique)
├── username
├── name
├── email
├── avatar_url
├── bio
├── created_at
└── github_token

Post
├── id (PK, slug)
├── user_id (FK → User.id)
├── title
├── type
├── shortDescription
├── hosted (JSON)
├── availableAt (JSON)
├── description
├── github
├── dateOfCreation
├── language
├── lastPushAt
├── defaultBranch
├── stats (JSON)
├── githubOwner
├── created_at
└── updated_at

Comment
├── id (PK)
├── post_id (FK → Post.id)
├── user_id (FK → User.id)
├── content
├── created_at
└── updated_at
```

## Entity Relationship Diagram

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│    User     │       │    Post     │       │   Comment   │
├─────────────┤       ├─────────────┤       ├─────────────┤
│ id (PK)     │◄──┐   │ id (PK)     │◄──┐   │ id (PK)     │
│ github_id   │   │   │ user_id (FK)│───┘   │ post_id (FK)│───┐
│ username    │   └───│ githubOwner │       │ user_id (FK)│───┘
│ name        │       │ title       │       │ content     │
│ email       │       │ type        │       │ created_at  │
│ avatar_url  │       │ description │       │ updated_at  │
│ bio         │       │ github      │       └─────────────┘
│ created_at  │       │ stats (JSON)│
│ github_token│       │ created_at  │
└─────────────┘       │ updated_at  │
                      └─────────────┘
```

## Database Schema Notes

### Missing Foreign Keys
**Observed:** The database schema does not define foreign key constraints at the database level. Relationships are enforced manually in application code.

**Impact:**
- No referential integrity at database level
- Manual joins required in queries
- Potential for orphaned records if application logic has bugs

### JSON Columns
- `Post.hosted` - Flexible hosting information
- `Post.availableAt` - Platform availability list
- `Post.stats` - Repository statistics (stars, forks, watchers, openIssues)

### Timestamp Storage
- All timestamps stored as ISO 8601 strings
- No timezone information stored (implicitly UTC)
- `dateOfCreation` stored as Unix timestamp (Integer)

### Soft Deletion
- No soft deletion implemented
- Records are permanently deleted

## Data Invariants

### User Invariants
1. `github_id` must be unique across all users
2. `username` cannot be null
3. `github_token` is updated on each login (not unique)

### Post Invariants
1. `id` is generated from title via `slugify()`
2. `id` must be unique (enforced by application code)
3. `user_id` is set to creator's ID
4. `githubOwner` is populated from GitHub API when available
5. `stats` contains numeric values for stars, forks, watchers, openIssues
6. Ownership verified via `post.user_id == user.id` in routes

### Comment Invariants
1. `content` cannot be empty or whitespace-only
2. `post_id` references an existing post (application-level check)
3. `user_id` is set to commenter's ID

## Data Access Patterns

### Read Patterns
1. **Post listing:** `Post` ordered by `dateOfCreation DESC NULLS LAST` with offset/limit
2. **Post detail:** Single `Post` by ID with latest 6 `Comment` records
3. **User lookup:** `User` by `github_id` or `id`
4. **Admin dashboard:** All `Post` and `User` records with aggregation

### Write Patterns
1. **Post creation:** Insert `Post` with slugified ID
2. **Post update:** Update `Post` fields (excluding ownership)
3. **Post delete:** Delete `Post` by ID
4. **Comment creation:** Insert `Comment` with timestamps
5. **User upsert:** Create or update `User` on GitHub OAuth

### Query Patterns
1. **Manual joins:** Comment → User joins done in application code
2. **Fallback queries:** Database failures fall back to static data
3. **Aggregation:** Admin dashboard calculates totals in application code

## Migration History

### Alembic Migrations
1. Initial `post` table creation
2. `user` table creation
3. Add `stats` and `githubOwner` to `post`
4. Add `user_id` to `post`
5. Add `bio`, `email`, `name` to `user`
6. Add timestamps to `user`
7. Add `github_token` to `user`
8. `comment` table creation
9. Various schema refinements

### Startup Migration
- `main.py:40` - Adds `github_token` column to `user` table if missing
- **Note:** This is a stopgap; proper migrations should handle this

## Data Seeding

### Seed Script
- **File:** `backend-fastapi/scripts/seed.py`
- **Purpose:** Creates demo data for development
- **Creates:**
  - 3 demo users (alice, bob, charlie)
  - 52 numbered demo posts (seed-1 to seed-52)
  - 5 sample comments

### Fallback Data
- **File:** `backend-fastapi/all_posts.py`
- **Purpose:** Static fallback when database unavailable
- **Contains:** 16 hardcoded post objects

## Performance Considerations

### Indexing
- Primary keys are indexed (automatic)
- `github_id` on `User` is unique (indexed)
- No other indexes visible in schema

### Query Optimization
- `get_all_posts()` uses offset/limit pagination
- Comments limited to 6 per API response
- No query optimization or caching beyond GitHub API

### Storage
- JSON columns used for flexible data (hosted, availableAt, stats)
- Large text fields for descriptions (no length limit)
- GitHub tokens stored in plain text (security concern)

## Data Quality Issues

### Potential Issues
1. **Orphaned comments:** No FK constraints means comments can exist for deleted posts
2. **Inconsistent timestamps:** Mix of ISO strings and Unix timestamps
3. **No soft deletion:** Deleted data is permanently lost
4. **Plain text tokens:** GitHub tokens stored without encryption

### Recommendations
1. Add database-level foreign key constraints
2. Standardize timestamp format
3. Implement soft deletion for audit trail
4. Encrypt sensitive tokens