---
name: admin-context
description: Use when the user asks about admin features, moderation, the admin dashboard, admin login, admin-only endpoints, or bulk delete in the post-panel codebase. Triggers on "admin", "dashboard", "moderate", "delete all", "admin login", "admin token", "statistics", "AdminDashboard". Open exactly the named files below instead of exploring the repo broadly.
---

# Admin Context — Specific Files

Read the source files in the order shown. `codebase-context/AUTH.md`, `codebase-context/FEATURE_MAP.md`, and `codebase-context/API.md` are verified snapshots; the source is authoritative.

## Backend

| What | File | Notes |
|------|------|-------|
| Admin gate + routes | `backend-fastapi/main.py` | `admin_check` (~319), `admin_login` (~349), `admin_dashboard` (~384), `admin_delete_post` (~447), `admin_delete_all_posts` (~459), `admin_delete_all_users` (~470), `admin_update_post` (~564) |
| Admin auth helpers | `backend-fastapi/auth.py` | `require_user` (~109), admin fallback user via `verify_credentials` (~59) |
| Allowlist | `backend-fastapi/config.py` | `ADMIN_GITHUB_IDS` (env, default is a real GitHub ID), `ADMIN_PASSWORD` (default `admin123`) |
| Data for stats | `backend-fastapi/app/models.py` | Post/User/Comment models used by dashboard aggregations |

## Frontend

| What | File | Notes |
|------|------|-------|
| Admin login | `client/src/pages/AdminLogin.jsx` | GitHub ID + password → `admin_token` |
| Dashboard | `client/src/pages/AdminDashboard.jsx` | stats cards, post/user management, type-to-confirm deletes |
| API wrappers | `client/src/api/posts.js` | `adminUpdatePost` (~35), `deleteAllPosts` (~48), `deleteAllUsers` (~54) |
| Admin edit route | `client/src/App.jsx` | `/admin` → AdminLogin, `/admin/dashboard` → AdminDashboard, `/admin/post/:id/edit` → CreatePost (ProtectedRoute) |
| Token storage | `client/src/api/client.js` | `admin_token` in localStorage used by dashboard (UI-only guard) |

## Key gotchas

1. **Admin = GitHub ID allowlist + password.** Both checks must pass for `admin_login`. True authorization is server-side; the frontend `admin_token` check is cosmetic.
2. **Bulk deletes are irreversible.** `DELETE /api/admin/posts` and `/api/admin/users` remove every row with no server-side confirmation.
3. **`admin_update_post` strips `user_id`/`githubOwner`** — ownership cannot be forged via admin update (`main.py` ~580).
4. **Dashboard stats** (`main.py` ~384-445): total posts/users, star/fork sums, language breakdown, recent posts. DB-failure fallback returns static data.
5. **Untested:** there are currently no backend tests for admin endpoints.

## Security notes

- `ADMIN_PASSWORD` default `admin123` and default `ADMIN_GITHUB_IDS` must be changed in production.
- Admin bulk deletes have no `?confirm` param — the type-to-confirm dialog is frontend-only.