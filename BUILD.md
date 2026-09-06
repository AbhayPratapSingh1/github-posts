# Post Panel — Build Log

A chronological log of how this project is being built. Each entry describes the why and the what of a build step.

---

## 1. Setup repository
- `git init`, README with a one-line project description.
- `.gitignore` for Node (`node_modules/`, `dist/`), Python, `.DS_Store`, logs, and env files (`.env*`, keeping only `.env.example`).
- Monorepo layout: `client/` (React frontend), `backend-fastapi/` (Python API), `backend/` (earlier Node API), `bruno/` (API tests), `dev.sh` (dev environment launcher).

## 2. Scaffold the client
- `client/` bootstrapped with **Vite + React**, styled with **Tailwind CSS v4** (`@tailwindcss/vite`).
- Routing with `react-router-dom` (`App.jsx`: `/` → Home, `/post/:id` → Post).
- Design tokens in `src/index.css` (light/dark theme, `bg-*`/`fg-*`/`primary-*` palette).

## 3. Create the Home page (project showcase)
- `src/pages/Home.jsx`: header + list of project cards (title, short description, type badge: `playable`/`hosted`, hosted platform, GitHub icon).
- Data initially came from a static seed config (`src/config/posts.js` + `findPostById` helper) so the UI could be built before any backend existed.

## 4. Create the single post page
- `src/pages/Post.jsx` at route `/post/:id`:
  - Hero section with title, short description, **read time** (computed from `READ_WORD_PER_MINUTE` in `src/config/text.js`), hosted platform, "Live" indicator.
  - Primary CTA by type: "Play Now" / "Visit Site" / GitHub "View Source".
  - Full description rendered as Markdown via `react-markdown` + `remark-gfm` with `@tailwindcss/typography` prose styling.
  - CTA footer + "Back to top" footer.
- Falls back to the local config seed when the API is unreachable.

## 5. Add the API layer
- `src/api/client.js`: tiny `fetch` wrapper hitting `/api` (proxied to the backend by Vite), throws on non-OK responses.
- `src/api/posts.js`: `getPosts()` / `getPostById(id)`.
- Unit tests with Node's built-in test runner (`node --test`): `client.test.js`, `posts.test.js`.
- Linting with `oxlint` (`npm run lint`).

## 6. Build the first (Node) backend
- `backend/`: **Hono** server exposing `GET /api/posts` and `GET /api/posts/:id` (404 for missing IDs).
- Seed data in `src/posts.js`; `scripts/generate-posts.js` syncs GitHub repos into `posts/post.json` (`npm run sync`).
- Runs on port `3000` (`node --watch src/index.js`).

## 7. Test the API with Bruno
- `bruno/post-panel-api/` collection: "Get All Posts", "Get Post by ID", "Get Missing Post", plus `environments/` for base URL switching — used to validate endpoints without a browser.

## 8. Rewrite the backend in FastAPI
- `backend-fastapi/`: **FastAPI + uvicorn** on port `8000` — `main.py` serves the same `/api/posts` and `/api/posts/{id}` endpoints.
- Post data lives in `all_posts.py` (id, title, type, shortDescription, hosted, availableAt, markdown description, github, stats).
- Replaces the Node backend as the primary API; the client talks to it through the Vite `/api` proxy.

## 9. Add a Postgres database (Docker)
- `docker-compose.yml`: `postgres:16` container (`post-panel-db`) on host port `5434`, named volume `pgdata`.
- Root env files feed the DB: `.env.local` (dev creds) and `.env.prod` (placeholder creds).

## 10. Introduce SQLAlchemy + Alembic migrations
- `backend-fastapi/app/models.py`: declarative `Base` + `Post` model mirroring the post shape (`title`, `type`, `shortDescription`, `hosted`, `availableAt`, `description`, `github`, `dateOfCreation`, `language`, `lastPushAt`, `defaultBranch`).
- `alembic/` set up; `alembic.ini` holds the `sqlalchemy.url`; `alembic/env.py` now loads the env file and feeds `Base.metadata` to autogenerate.
- Fixes along the way:
  - env vars were never loaded in `alembic/env.py` / `models.py` → added `load_dotenv(f".env.{APP_ENV}")` and env-override for `sqlalchemy.url`.
  - `target_metadata = None` (boilerplate) was overwriting `Base.metadata` → autogenerate now works.
- Migration workflow: `alembic revision --autogenerate -m "<message>"` then `alembic upgrade head` (run from `backend-fastapi/`).
- `requirements.txt` added: `fastapi`, `uvicorn`, `sqlalchemy`, `alembic`, `python-dotenv`, `psycopg2-binary`.

## 11. Split env files per service
- Backend: `backend-fastapi/.env.local` / `.env.prod` — `APP_ENV` + `DATABASE_URL`.
- Frontend: `client/.env.local` / `.env.prod` — `VITE_BACKEND_URL`; `vite.config.js` reads it via `loadEnv` for the `/api` proxy target (falls back to `http://127.0.0.1:7180`).
- Root `.env.local` / `.env.prod` remain for docker-compose.

## 12. One-command dev environment
- `dev.sh` (iTerm AppleScript): opens a 2×2 pane grid — FastAPI server (`uvicorn --reload`), client dev server (`npm run dev`), client folder, backend folder — plus a tab for opencode (no model specified, uses whatever default is configured) and a tab running `docker-compose up -d` + `code .`.

## 13. Connect the API to Postgres (engine, sessions, seeding)
- `database.py`: loads env per `APP_ENV` (`load_dotenv(f".env.{APP_ENV}")`), creates the engine from `DATABASE_URL`, defines the `SessionLocal` factory and a `get_db()` FastAPI dependency (yields a session, closes it in `finally`).
- `main.py` wired to the DB: routes use `Depends(get_db)` and delegate to `Post_handler`; `postHandler.py` queries the `Post` model (`get_all_posts`, `get_post_by_id`).
- **SQLAlchemy 2.0 gotcha:** `sessionmaker` lives in `sqlalchemy.orm` — `from sqlalchemy import sessionmaker` raises `ImportError` on 2.x (the ORM namespace was removed from the top-level package).
- **Migrate-then-seed:** `alembic upgrade head` must run before seeding — the seed's existence-check query fails with `relation "post" does not exist` otherwise.
- `scripts/seed.py`: idempotent seeder (checks `id` before inserting) that loads `all_posts.py` into the `post` table — verified 16 rows.
- DB verified live: `post` table + `alembic_version` exist, 16 posts, JSON columns (`hosted`, `availableAt`) round-trip correctly.

## 14. Harden the API (fallback + 404) and end-to-end check
- Missing post IDs now return a real `JSONResponse(status_code=404, {"error": "Post ID doesn't exist"})` again (was a 200 + error dict during the rewrite).
- DB-down fallback: routes catch DB errors and serve `all_posts.py`; removed the eager `dbEngine.connect()` test from `database.py` so the app starts even when Postgres is down (verified with an unreachable `DATABASE_URL` — still 200, 16 posts from fallback, 404s intact).
- `app/models.py`: `declarative_base` now imported from `sqlalchemy.orm` (kills the 2.0 deprecation warning).
- Verified end-to-end: browser → Vite `/api` proxy → FastAPI (8000) → Postgres (5434). Note: the client auto-increments its port when 5173–5175 are busy (this machine was serving other projects) — the client ended up on **http://localhost:5176**.

---

## Current stack

| Layer       | Tech                                              |
|-------------|---------------------------------------------------|
| Frontend    | React 19, Vite 8, Tailwind CSS v4, react-markdown |
| Backend     | FastAPI, uvicorn                                  |
| DB          | PostgreSQL 16 (Docker), SQLAlchemy, Alembic       |
| API testing | Bruno collection (`bruno/post-panel-api/`)        |
| Tooling     | oxlint, node --test, dev.sh                       |

## Common commands

```bash
# DB
docker-compose up -d

# Backend (from backend-fastapi/)
pip install -r requirements.txt
python3 -m uvicorn main:app --reload

# Migration (from backend-fastapi/)
alembic revision --autogenerate -m "message"
alembic upgrade head

# Seed the DB (from backend-fastapi/)
python3 scripts/seed.py

# Client (from client/)
npm run dev
npm run lint
npm test
```
