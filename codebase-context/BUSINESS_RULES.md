# Business Rules & Invariants

This document catalogs business rules and invariants that are enforced in the Post Panel implementation.

> Rules documented here are verified from the code. No rules are invented.

## Post Rules

### Rule: Only post owners can edit/delete posts

**Rule:** Editing and deleting requires `post.user_id == user.id`.

**Where enforced:**
- Backend: `main.py:897` (delete), `main.py:916` (update)
- Frontend: Edit/Delete buttons shown only for post owner (`pages/Post.jsx`)

**Relevant files:**
- `backend-fastapi/main.py:887-948`

**Consequences if changed:** Any authenticated user could modify/remove others' content.

---

### Rule: Only post owners can create posts for their own GitHub repos

**Rule:** When creating a post with a GitHub URL, the GitHub repo owner's ID must match the user's `github_id`.

**Where enforced:**
- Backend: `main.py:866-871` (create), `main.py:930-935` (update)
- Frontend: No frontend enforcement (server-side only)

**Relevant files:**
- `backend-fastapi/main.py:861-882, 925-945`

**Consequences if changed:** Users could claim credit for repos they don't own.

---

### Rule: Post titles must be unique

**Rule:** Post IDs are slugified from titles and must not collide with existing posts.

**Where enforced:**
- Backend: `main.py:846-852` (returns 409 on duplicate)

**Relevant files:**
- `backend-fastapi/main.py:842-852`

**Consequences if changed:** Two posts could share the same ID, breaking lookups.

---

### Rule: Post dateOfCreation defaults to now

**Rule:** When not enriched from GitHub, `dateOfCreation` is set to `int(time.time())`.

**Where enforced:**
- Backend: `main.py:856`

**Relevant files:**
- `backend-fastapi/main.py:842-859`

---

## User Rules

### Rule: Users are identified by unique GitHub IDs

**Rule:** `github_id` must be unique in the User table.

**Where enforced:**
- Backend: DB unique constraint (`app/models.py:33`)
- Backend: Upsert logic in `github_callback()` (`main.py:261-286`)

**Consequences if changed:** Duplicate accounts for the same GitHub identity.

---

### Rule: Admin access is restricted to an allowlist

**Rule:** Only users whose `github_id` is in `ADMIN_GITHUB_IDS` get admin access.

**Where enforced:**
- Backend: All `/api/admin/*` routes check `user.github_id not in ADMIN_GITHUB_IDS`
- Frontend: Admin login requires GitHub ID + password

**Relevant files:**
- `backend-fastapi/main.py:317-601`
- `client/src/pages/AdminLogin.jsx`

**Consequences if changed:** Unauthorized users could moderate content.

---

### Rule: Admin login requires both password and admin GitHub ID

**Rule:** `/api/admin/login` requires the password to equal `ADMIN_PASSWORD` AND the GitHub ID to be in `ADMIN_GITHUB_IDS`.

**Where enforced:**
- Backend: `main.py:353-359`

**Relevant files:**
- `backend-fastapi/main.py:349-382`

**Consequences if changed:** Weakened admin security.

---

## Comment Rules

### Rule: Only authenticated users can comment

**Rule:** `POST /api/posts/{id}/comments` requires authentication via `require_user()`.

**Where enforced:**
- Backend: `main.py:486`

**Relevant files:**
- `backend-fastapi/main.py:480-529`

**Consequences if changed:** Spam/unauthorized comments.

---

### Rule: Comments cannot be empty

**Rule:** Comment content must be non-empty after stripping whitespace.

**Where enforced:**
- Backend: `main.py:497-501` (returns 400 on empty)

**Relevant files:**
- `backend-fastapi/main.py:494-501`

**Consequences if changed:** Empty/meaningless comments.

---

### Rule: Comments are limited to 6 in API responses

**Rule:** Comment queries use `.limit(6)` and single post responses include first 5 with `has_more_comments` flag.

**Where enforced:**
- Backend: `main.py:546` (comments endpoint), `main.py:637` (post detail)

**Relevant files:**
- `backend-fastapi/main.py:532-562, 614-658`

**Consequences if changed:** Performance impact on large posts.

---

## GitHub Enrichment Rules

### Rule: GitHub data enriches but does not override user input

**Rule:** During post creation, user-provided `language`, `defaultBranch`, etc. take precedence; GitHub data only fills missing values.

**Where enforced:**
- Backend: `main.py:872-874` (`data.get("language") or gh.get("language")`)

**Relevant files:**
- `backend-fastapi/main.py:872-882`

---

### Rule: GitHub API responses are cached for 1 hour

**Rule:** `_github_cache` stores repo data with `GITHUB_CACHE_TTL = 3600` seconds.

**Where enforced:**
- Backend: `main.py:81-106`

**Relevant files:**
- `backend-fastapi/main.py:81-106`

**Consequences if changed:** Rate limiting or stale data.

---

## Admin Rules

### Rule: Admin bulk operations delete everything

**Rule:** `DELETE /api/admin/posts` and `DELETE /api/admin/users` delete ALL records (no confirmation parameter enforced server-side; frontend uses type-to-confirm).

**Where enforced:**
- Backend: `main.py:459-479`
- Frontend: Type-to-confirm in `AdminDashboard.jsx`

**Consequences if changed:** Data loss (irreversible).

---

### Rule: Admin updates cannot change ownership

**Rule:** `admin_update_post()` strips `user_id` and `githubOwner` from update data.

**Where enforced:**
- Backend: `main.py:580-581`

**Relevant files:**
- `backend-fastapi/main.py:564-600`

**Consequences if changed:** Admins could transfer/forge ownership.

---

## Database Invariants

### Rule: No DB-level foreign keys

**Observed:** `Comment.post_id` and `Comment.user_id` / `Post.user_id` are NOT database foreign keys. Joins and integrity are handled in application code.

**Impact:** Orphaned comments possible if posts deleted without cleaning comments.

---

### Rule: Timestamps stored as ISO 8601 strings

**Observed:** `created_at`/`updated_at` are String columns containing ISO 8601. `dateOfCreation` is an Integer (Unix timestamp).

**Impact:** Mixing formats requires careful conversion.

---

### Rule: Graceful degradation on DB failure

**Observed:** When the database connection fails (`get_db()` yields None or query raises), routes fall back to static `all_posts.py` data.

**Relevant files:**
- `backend-fastapi/database.py`
- `backend-fastapi/main.py:604-624`

---

## Frontend Rules (UI Enforcement)

### Rule: Unauthenticated users cannot access create/edit pages

**Where enforced:** `ProtectedRoute.jsx` gates `/create` and `/post/:id/edit`.

---

### Rule: Edit/Delete actions only shown to post owners

**Where enforced:** `pages/Post.jsx` checks `user.id === post.user_id`.

---

### Rule: Admin dashboard requires an admin_token

**Where enforced:** `AdminDashboard.jsx` checks localStorage `admin_token`.

**Note:** This is a UI check only; actual security is server-side.

---

## Consequences Summary Matrix

| Rule | If Violated | Files to Check |
|------|-------------|----------------|
| Post ownership | Anyone can edit/delete | `main.py:887-948` |
| Repo ownership | Content theft | `main.py:861-882, 925-945` |
| Unique post ID | Broken posts | `main.py:846-852` |
| Admin allowlist | Unauthorized admin | `main.py:317-601` |
| Comment auth | Spam | `main.py:486` |
| Non-empty comment | Low-quality comments | `main.py:494-501` |
| Admin no ownership change | Ownership forgery | `main.py:580-581` |
| Bulk delete | Data loss | `main.py:459-479` |