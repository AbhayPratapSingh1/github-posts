# Load Tests

## Quick Start

### 1. Quick CLI test (no UI)

```bash
cd backend-fastapi
python3 loadtests/quick_load.py --host http://127.0.0.1:7180 --users 10 --duration 30
```

Options:
- `--host` — Backend URL (default: http://127.0.0.1:7180)
- `--users` — Concurrent virtual users (default: 10)
- `--duration` — Test duration in seconds (default: 30)

### 2. Locust (web UI)

```bash
cd backend-fastapi
locust -f loadtests/locustfile.py --host http://127.0.0.1:7180
```

Open http://localhost:8089 in your browser to configure:
- Number of users
- Spawn rate
- Host URL

## User Types

| Type | Weight | Description |
|------|--------|-------------|
| AnonymousUser | 3 | Read-only visitor: lists posts, views posts, checks GitHub info |
| AuthenticatedUser | 1 | Logged-in user: creates/reads posts, checks profile |
| BurstUser | 1 | Rapid-fire requests with short wait times |

## Endpoints Tested

- `GET /api/posts` — List posts (pagination)
- `GET /api/posts/{id}` — View single post
- `POST /api/posts` — Create post (auth only)
- `GET /api/auth/me` — Check auth status
- `GET /api/github/info` — GitHub repo lookup
- `GET /` — Health check

## What to Look For

- **Requests/sec** — throughput under load
- **Latency p50/p95/p99** — response time distribution
- **Error rate** — should be <1% for healthy server
- **Status codes** — mostly 200s, some 404s expected
