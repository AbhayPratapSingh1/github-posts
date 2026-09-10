---
name: codebase-context
description: Use when asked to explain, plan, debug, or modify ANY part of the post-panel codebase. Reads the generated codebase-context docs to locate the specific source files for the requested feature, then opens exactly those files instead of exploring the repo broadly. Triggers on keywords like "how does", "where is", "find", "fix", "explain", "add feature", "this code", "the codebase".
---

# Codebase Context Lookup

Post Panel keeps a generated, source-verified snapshot of the repository in `codebase-context/` at the repo root. Before answering or writing code, use it to jump directly to the specific files involved — do not do open-ended repo-wide greps first.

## Rule: Seek the named file before broad exploration

1. If you do not already know which files are involved, read the relevant doc below (entry point: `codebase-context/README.md`), then **open the exact source files** listed in the table.
2. Read files with `Limit`/`Offset` targeted at the referenced sections (many files contain exact line ranges from the docs).
3. `codebase-context/` is a **snapshot** — the source code is authoritative. If docs and source disagree, trust the source and note the staleness.

## Topic → Doc → Source File Map

| Topic | Context doc (read first) | Source files to open |
|-------|--------------------------|----------------------|
| Any domain overview | `codebase-context/AI_CONTEXT.md` | — |
| Architecture / request lifecycle | `codebase-context/ARCHITECTURE.md` | `backend-fastapi/main.py`, `client/src/main.jsx`, `client/src/App.jsx` |
| Directory structure | `codebase-context/DIRECTORY_MAP.md` | — |
| Functions inventory + call graph | `codebase-context/FUNCTIONS.md` | files referenced there |
| Database schema | `codebase-context/DATA_MODEL.md` | `backend-fastapi/app/models.py`, `backend-fastapi/alembic/versions/` |
| All API endpoints | `codebase-context/API.md` | `backend-fastapi/main.py` (routes), `client/src/api/posts.js` |
| Auth / OAuth / JWT / sessions | `codebase-context/AUTH.md` | `backend-fastapi/auth.py`, `main.py` auth routes, `client/src/context/AuthContext.jsx`, `client/src/api/client.js`, `client/src/components/ProtectedRoute.jsx` |
| End-to-end flows | `codebase-context/FLOWS.md` | files referenced per flow |
| Env vars / config | `codebase-context/ENVIRONMENT.md`, `codebase-context/CONFIGURATION.md` | `backend-fastapi/config.py`, `client/src/config/env.js` |
| Integrations (GitHub/Gemini/DB) | `codebase-context/INTEGRATIONS.md` | `backend-fastapi/main.py` (fetch_github_repo, fetch_readme, generate_with_gemini) |
| Frontend state | `codebase-context/STATE_MANAGEMENT.md` | `client/src/context/AuthContext.jsx`, `client/src/context/ToastContext.jsx` |
| Error handling | `codebase-context/ERROR_HANDLING.md` | `client/src/api/client.js`, route error branches in `main.py` |
| Tests | `codebase-context/TESTING.md` | `backend-fastapi/tests/`, `client/src/tests/` |
| Deployment / CI | `codebase-context/DEPLOYMENT.md` | `.github/workflows/ci-cd.yml`, `backend-fastapi/render.yaml`, `railway.json`, `Procfile` |
| Security | `codebase-context/SECURITY.md` | files referenced there |
| Conventions | `codebase-context/CONVENTIONS.md` | — |
| Terminology | `codebase-context/GLOSSARY.md` | — |
| Feature → file map / change impact | `codebase-context/FEATURE_MAP.md` | files referenced there |
| Business rules / invariants | `codebase-context/BUSINESS_RULES.md` | `backend-fastapi/main.py`, `handler/postHandler.py` |
| Entry points / routes | `codebase-context/ENTRY_POINTS.md` | `client/src/App.jsx` |
| Observability | `codebase-context/OBSERVABILITY.md` | — |

## Quick Start

- Ask "how does X work?" → read the matching doc, then open the named files.
- Ask "where is X implemented?" → read `codebase-context/FEATURE_MAP.md`, then open the listed files.
- Ask "add/change X" → read `codebase-context/FEATURE_MAP.md` (change-impact map) + the domain docs, then open the affected files.

## Shared Domain Skills

For a given area, the matching specialized skill carries the exact file list and reading order:

- `posts-context` — posts, feed, comments, create/edit
- `auth-context` — login, OAuth, JWT, sessions, tokens
- `admin-context` — admin dashboard, moderation, admin-only endpoints
- `ai-github-context` — GitHub repo enrichment, Gemini AI generation

Load the matching skill when the question falls in one of those areas, then open exactly the files it names.