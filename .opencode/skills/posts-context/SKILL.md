---
name: posts-context
description: Use when the user asks about posts, the post feed, infinite scroll, creating/editing/deleting posts, commenting, or post rendering in the post-panel codebase. Triggers on "post", "feed", "infinite scroll", "create post", "edit post", "delete post", "comments", "post detail", "Home page", "Post page". Open exactly the named files below instead of exploring the repo broadly.
---

# Posts Context — Specific Files

Read the source files below in the order shown. Consult `codebase-context/DATA_MODEL.md`, `codebase-context/API.md`, and `codebase-context/FLOWS.md` for snapshots, then verify against source (source is authoritative).

## Backend

| What | File | Notes |
|------|------|-------|
| Post model | `backend-fastapi/app/models.py` (class `Post`, ~line 7) | JSON columns: hosted, availableAt, stats |
| Post business logic | `backend-fastapi/handler/postHandler.py` | `Post_handler._post_to_dict`, CRUD, author resolution |
| All post routes | `backend-fastapi/main.py` | `getPosts` (~605), `getPostById` (~615), `createPost` (~843), `deletePost` (~888), `updatePost` (~907) |
| Comment routes | `backend-fastapi/main.py` | `create_comment` (~480), `get_comments` (~532) |
| Comment model | `backend-fastapi/app/models.py` (class `Comment`, ~line 43) | |
| DB session | `backend-fastapi/database.py` | `get_db()` may return None — routes fall back to static data |

## Frontend

| What | File | Notes |
|------|------|-------|
| API wrappers | `client/src/api/posts.js` | getPosts, getPostById, createPost, updatePost, deletePost, getPostCommentById |
| HTTP client | `client/src/api/client.js` | token attach, 401 refresh/retry |
| Home feed | `client/src/pages/Home.jsx` | infinite scroll via IntersectionObserver |
| Post detail | `client/src/pages/Post.jsx` | comments, edit/delete owner checks. **Catch-block bug ~line 42** references undefined `data`. |
| Create/edit form | `client/src/pages/CreatePost.jsx` | edit mode via `useParams().id` |
| Comments UI | `client/src/components/Comments.jsx` | comment add/list |
| Post types/config | `client/src/config/posts.js` | POST_TYPE enum, fallback seed data |
| Routes | `client/src/App.jsx` | `/`, `/post/:id`, `/create`, `/post/:id/edit` |

## Tests

- `backend-fastapi/tests/test_posts.py`
- `backend-fastapi/tests/conftest.py` (`create_test_user`, `create_test_post` fixtures)
- `client/src/tests/api/posts.test.js`

## Key Zontacts (things that break silently)

1. **Duplicate slug/title:** `createPost` returns 409 on existing ID (`main.py` ~846).
2. **Ownership:** update/delete require `post.user_id == user.id` — verified in `main.py` routes, not the handler.
3. **No DB foreign keys:** comment joins are manual; deleting a post does not cascade-delete comments.
4. **Author resolution:** `_resolve_user` uses `user_id` then falls back to matching `username == githubOwner`.
5. **DB down:** routes yield static data from `backend-fastapi/all_posts.py` without signaling an error.