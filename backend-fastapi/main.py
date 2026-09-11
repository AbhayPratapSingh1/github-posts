import os
import time
import re
import json
import markdown as md
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, quote

import httpx
from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from all_posts import posts
from handler.postHandler import Post_handler
from database import get_db
from app.models import User, Post, Comment, Like
from auth import (
    create_access_token,
    create_refresh_token,
    verify_credentials,
    get_user_from_request,
    refresh_access_token,
    require_user,
)
from config import APP_ENV, PORT, BACKEND_URL, FRONTEND_URL, CORS_ORIGINS, GEMINI_API_KEY, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ADMIN_GITHUB_IDS, ADMIN_PASSWORD

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_db():
    """Add missing columns on startup."""
    from database import dbEngine
    from sqlalchemy import text
    with dbEngine.connect() as conn:
        try:
            conn.execute(text("ALTER TABLE \"user\" ADD COLUMN IF NOT EXISTS github_token VARCHAR"))
            conn.commit()
        except Exception:
            pass
        try:
            conn.execute(text("ALTER TABLE comment ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT FALSE"))
            conn.commit()
        except Exception:
            pass
        try:
            pk = "SERIAL PRIMARY KEY" if dbEngine.dialect.name == "postgresql" else "INTEGER PRIMARY KEY AUTOINCREMENT"
            conn.execute(text(f"""
                CREATE TABLE IF NOT EXISTS post_like (
                    id {pk} NOT NULL,
                    post_id VARCHAR NOT NULL,
                    user_id INTEGER NOT NULL,
                    created_at VARCHAR,
                    UNIQUE (post_id, user_id)
                )
            """))
            conn.commit()
        except Exception:
            pass


postHandler = Post_handler()

class CreatePostRequest(BaseModel):
    title: str
    type: str
    shortDescription: str
    description: str
    hosted: Optional[dict] = None
    availableAt: Optional[list] = None
    github: Optional[str] = None
    language: Optional[str] = None
    lastPushAt: Optional[str] = None
    defaultBranch: Optional[str] = "main"

def slugify(text: str) -> str:
    text = text.lower().strip()
    text = re.sub(r"[^\w\s-]", "", text)
    text = re.sub(r"[\s_]+", "-", text)
    text = re.sub(r"-+", "-", text)
    return text.strip("-")

def parse_github_url(url: str):
    parsed = urlparse(url)
    parts = parsed.path.strip("/").split("/")
    if len(parts) >= 2:
        return parts[0], parts[1]
    return None, None

_github_cache: dict[str, tuple[float, dict]] = {}
GITHUB_CACHE_TTL = 3600  # 1 hour

async def fetch_github_repo(owner: str, repo: str, user_token: str = None):
    cache_key = f"{owner}/{repo}"
    now = time.time()
    if cache_key in _github_cache:
        cached_at, cached_data = _github_cache[cache_key]
        if now - cached_at < GITHUB_CACHE_TTL:
            return cached_data

    headers = {"Accept": "application/vnd.github.v3+json"}
    token = user_token or os.getenv("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"token {token}"
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers=headers,
            timeout=10.0,
        )
        if resp.status_code == 200:
            data = resp.json()
            _github_cache[cache_key] = (now, data)
            return data
    return None

def set_session_cookie(response, token: str):
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=APP_ENV == "prod",
        samesite="none" if APP_ENV == "prod" else "lax",
        max_age=JWT_ACCESS_EXPIRY_MINUTES * 60,
        path="/",
    )

def set_refresh_cookie(response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=APP_ENV == "prod",
        samesite="none" if APP_ENV == "prod" else "lax",
        max_age=JWT_REFRESH_EXPIRY_DAYS * 24 * 60 * 60,
        path="/",
    )

@app.get("/")
def testing():
    return {"data":"End point is working fine"}

# ── Auth routes ──────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    userid: str
    password: str

@app.post("/api/auth/login")
def login(body: LoginRequest, db: Session = Depends(get_db)):
    user = verify_credentials(body.userid, body.password)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Invalid credentials"})
    access = create_access_token(user.id, user.username)
    refresh = create_refresh_token(user.id, user.username)
    user_data = {"id": user.id, "username": user.username or f"user_{user.id}", "name": getattr(user, "name", "") or "", "avatar_url": user.avatar_url}
    if hasattr(user, "github_id"):
        user_data["github_id"] = user.github_id
    if hasattr(user, "email"):
        user_data["email"] = user.email
    if hasattr(user, "bio"):
        user_data["bio"] = user.bio
    if hasattr(user, "created_at"):
        user_data["created_at"] = user.created_at
    response = JSONResponse({"success": True, "user": user_data})
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh)
    return response

@app.get("/api/auth/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    try:
        user = get_user_from_request(request, db)
    except Exception:
        user = get_user_from_request(request, None)
    if not user:
        return {"user": None}
    user_data = {
        "id": user.id,
        "username": user.username or f"user_{user.id}",
        "name": getattr(user, "name", "") or "",
        "avatar_url": user.avatar_url,
        "github_id": user.github_id if hasattr(user, "github_id") else None,
    }
    if hasattr(user, "email"):
        user_data["email"] = user.email
    if hasattr(user, "bio"):
        user_data["bio"] = user.bio
    if hasattr(user, "created_at"):
        user_data["created_at"] = user.created_at
    user_data["is_admin"] = (
        user.github_id in ADMIN_GITHUB_IDS if hasattr(user, "github_id") else False
    )
    return {"user": user_data}

@app.post("/api/auth/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie(key="session", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return response

@app.post("/api/auth/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refresh_token")
    if not token:
        return JSONResponse(status_code=401, content={"error": "No refresh token"})
    try:
        new_access = refresh_access_token(token, db)
    except Exception:
        new_access = None
    if not new_access:
        return JSONResponse(status_code=401, content={"error": "Invalid refresh token"})
    response = JSONResponse({"success": True})
    set_session_cookie(response, new_access)
    return response

@app.get("/api/auth/github")
def github_login(returnTo: str = "/"):
    if not GITHUB_CLIENT_ID:
        return JSONResponse(status_code=500, content={"error": "GitHub OAuth not configured"})
    redirect_uri = f"{BACKEND_URL}/api/auth/github/callback"
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
        f"&state={returnTo}"
    )
    return RedirectResponse(url=github_url)

@app.get("/api/auth/github/callback")
async def github_callback(code: str = Query(...), state: str = Query("/"), db: Session = Depends(get_db)):
    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_code")
    
    return_to = state if state.startswith("/") else "/"

    async with httpx.AsyncClient() as client:
        token_res = await client.post(
            "https://github.com/login/oauth/access_token",
            json={
                "client_id": GITHUB_CLIENT_ID,
                "client_secret": GITHUB_CLIENT_SECRET,
                "code": code,
            },
            headers={"Accept": "application/json"},
        )
        if token_res.status_code != 200:
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=token_exchange_failed")
        token_data = token_res.json()
        access_token = token_data.get("access_token")
        if not access_token:
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_access_token")

    async with httpx.AsyncClient() as client:
        user_res = await client.get(
            "https://api.github.com/user",
            headers={
                "Authorization": f"Bearer {access_token}",
                "Accept": "application/json",
            },
        )
        if user_res.status_code != 200:
            return RedirectResponse(url=f"{FRONTEND_URL}/login?error=fetch_user_failed")
        gh_user = user_res.json()

    github_id = gh_user.get("id")
    username = gh_user.get("login")
    name = gh_user.get("name", "")
    avatar_url = gh_user.get("avatar_url")
    bio = gh_user.get("bio", "")
    created_at = gh_user.get("created_at", "")
    email = gh_user.get("email", "")

    if db is not None:
        user = db.query(User).filter(User.github_id == github_id).first()
        if not user:
            user = User(
                github_id=github_id,
                username=username,
                name=name,
                email=email,
                avatar_url=avatar_url,
                bio=bio,
                created_at=created_at,
                github_token=access_token,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            user.username = username
            user.name = name or user.name
            user.email = user.email or email
            user.avatar_url = avatar_url
            user.github_token = access_token
            if bio:
                user.bio = user.bio or bio
            db.commit()
            db.refresh(user)
    else:
        from auth import _SimpleUser
        user = _SimpleUser(id=github_id, username=username, email=email, avatar_url=avatar_url, bio=bio, created_at=created_at, name=name)

    access = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)

    user_data = {"id": user.id, "username": user.username or f"user_{user.id}", "avatar_url": getattr(user, "avatar_url", "")}
    if hasattr(user, "name"):
        user_data["name"] = getattr(user, "name", "") or ""
    if hasattr(user, "github_id"):
        user_data["github_id"] = user.github_id
    if hasattr(user, "email"):
        user_data["email"] = user.email
    if hasattr(user, "bio"):
        user_data["bio"] = user.bio
    if hasattr(user, "created_at"):
        user_data["created_at"] = user.created_at

    # Pass tokens via URL too: cross-site cookies are unreliable when frontend/backend are on different domains (e.g. Vercel/Render)
    user_json = quote(json.dumps(user_data))
    sep = "&" if "?" in return_to else "?"
    redirect_url = f"{FRONTEND_URL}{return_to}{sep}token={access}&refresh={refresh_token}&user={user_json}"
    response = RedirectResponse(url=redirect_url)
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh_token)
    return response

# ── Admin routes ─────────────────────────────────────────────────────

@app.get("/api/admin/check")
def admin_check(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    print(f"[DEBUG /admin/check] user={getattr(user, 'username', None)}, github_id={getattr(user, 'github_id', None)}")

    if not user:
        print(f"[DEBUG /admin/check] No user found in token")
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    github_id = getattr(user, "github_id", None)
    if github_id not in ADMIN_GITHUB_IDS:
        print(f"[DEBUG /admin/check] github_id={github_id} NOT in admin list {ADMIN_GITHUB_IDS}")
        return JSONResponse(status_code=403, content={"error": "Not an admin account"})

    print(f"[DEBUG /admin/check] Admin verified: {user.username} (github_id={github_id})")
    return JSONResponse(content={
        "success": True,
        "user": {
            "id": user.id,
            "username": user.username,
            "name": getattr(user, "name", "") or "",
            "avatar_url": user.avatar_url,
            "github_id": user.github_id,
        },
    })

class AdminLoginRequest(BaseModel):
    github_id: int
    password: str

@app.post("/api/admin/login")
def admin_login(body: AdminLoginRequest, db: Session = Depends(get_db)):
    print(f"[DEBUG /admin/login] Login attempt for github_id={body.github_id}")

    if body.password != ADMIN_PASSWORD:
        print(f"[DEBUG /admin/login] Wrong password for github_id={body.github_id}")
        return JSONResponse(status_code=401, content={"error": "Invalid password"})

    if body.github_id not in ADMIN_GITHUB_IDS:
        print(f"[DEBUG /admin/login] github_id={body.github_id} NOT in admin list")
        return JSONResponse(status_code=403, content={"error": "Not an admin account"})

    user = db.query(User).filter(User.github_id == body.github_id).first()
    if not user:
        print(f"[DEBUG /admin/login] No DB user for github_id={body.github_id}")
        return JSONResponse(status_code=404, content={"error": "Admin user not found"})

    access = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)
    user_data = {
        "id": user.id,
        "username": user.username,
        "name": getattr(user, "name", "") or "",
        "avatar_url": user.avatar_url,
        "github_id": user.github_id,
        "email": getattr(user, "email", ""),
        "bio": getattr(user, "bio", ""),
        "is_admin": True,
    }
    print(f"[DEBUG /admin/login] Success: {user.username} (github_id={user.github_id})")
    response = JSONResponse({"success": True, "user": user_data, "token": access})
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh_token)
    return response

@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    all_posts = db.query(Post).order_by(Post.created_at.desc().nullslast()).all()
    all_users = db.query(User).all()

    post_list = []
    for p in all_posts:
        author = db.query(User).filter(User.id == p.user_id).first() if p.user_id else None
        if not author and p.githubOwner:
            author = db.query(User).filter(User.username == p.githubOwner).first()
        post_list.append({
            "id": p.id,
            "title": p.title,
            "type": p.type,
            "shortDescription": p.shortDescription,
            "github": p.github,
            "language": p.language,
            "stats": p.stats,
            "githubOwner": p.githubOwner,
            "dateOfCreation": p.dateOfCreation,
            "user_id": p.user_id,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "authorName": author.name if author else None,
            "authorUsername": author.username if author else None,
        })

    user_list = []
    for u in all_users:
        user_list.append({
            "id": u.id,
            "github_id": u.github_id,
            "username": u.username,
            "name": getattr(u, "name", "") or "",
            "email": u.email,
            "avatar_url": u.avatar_url,
            "bio": u.bio,
            "created_at": u.created_at,
        })

    total_stars = sum((p.stats or {}).get("stars", 0) for p in all_posts)
    total_forks = sum((p.stats or {}).get("forks", 0) for p in all_posts)
    languages = {}
    for p in all_posts:
        lang = p.language or "Unknown"
        languages[lang] = languages.get(lang, 0) + 1

    return {
        "stats": {
            "totalPosts": len(all_posts),
            "totalUsers": len(all_users),
            "totalStars": total_stars,
            "totalForks": total_forks,
            "languages": languages,
        },
        "posts": post_list,
        "users": user_list,
    }

@app.delete("/api/admin/posts/{id}")
def admin_delete_post(id: str, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})
    postHandler.delete_post(id, db)
    return {"message": "Post deleted successfully"}

@app.delete("/api/admin/posts")
def admin_delete_all_posts(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    count = db.query(Post).count()
    db.query(Post).delete()
    db.commit()
    return {"message": f"Deleted {count} posts"}

@app.delete("/api/admin/users")
def admin_delete_all_users(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    count = db.query(User).count()
    db.query(User).delete()
    db.commit()
    return {"message": f"Deleted {count} users"}
@app.post("/api/posts/{post_id}/comments")
async def create_comment(
    post_id: str,
    request: Request,
    db: Session = Depends(get_db)
):
    user = require_user(request, db)

    if not user:
        return JSONResponse(
            status_code=401,
            content={"error": "Unauthorized"}
        )

    body = await request.json()
    content = body.get("content", "").strip()

    if not content:
        return JSONResponse(
            status_code=400,
            content={"error": "Content required"}
        )

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    comment = Comment(
        post_id=post_id,
        user_id=user.id,
        content=content,
        created_at=now,
        updated_at=now,
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "github_id": user.github_id,
        "username": user.username,
        "name": getattr(user, "name", "") or "",
        "avatar_url": user.avatar_url,
        "content": comment.content,
        "is_deleted": bool(comment.is_deleted),
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


@app.get("/api/posts/{post_id}/comments")
def get_comments(post_id: str, db: Session = Depends(get_db)):
    comments = (
        db.query(
            Comment,
            User.id,
            User.github_id,
            User.username,
            User.name,
            User.avatar_url,
        )
        .join(User, Comment.user_id == User.id)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.desc())
        .limit(6)
        .all()
    )

    return [
        {
            "id": c.id,
            "user_id": user_id,
            "github_id": github_id,
            "username": username,
            "name": name or "",
            "avatar_url": avatar_url,
            "content": "" if c.is_deleted else c.content,
            "is_deleted": bool(c.is_deleted),
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }
        for c, user_id, github_id, username, name, avatar_url in comments
    ]


def _comment_to_dict(comment: Comment, db: Session) -> dict:
    author = db.query(User).filter(User.id == comment.user_id).first()
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user_id": comment.user_id,
        "github_id": author.github_id if author else None,
        "username": author.username if author else None,
        "name": (author.name if author else "") or "",
        "avatar_url": author.avatar_url if author else None,
        "content": "" if comment.is_deleted else comment.content,
        "is_deleted": bool(comment.is_deleted),
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


@app.put("/api/posts/{post_id}/comments/{comment_id}")
async def update_comment(
    post_id: str,
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    body = await request.json()
    content = body.get("content", "").strip()

    if not content:
        return JSONResponse(status_code=400, content={"error": "Content required"})

    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.post_id == post_id)
        .first()
    )
    if not comment:
        return JSONResponse(status_code=404, content={"error": "Comment not found"})
    if comment.is_deleted:
        return JSONResponse(status_code=400, content={"error": "Comment was deleted"})
    if comment.user_id != user.id:
        return JSONResponse(
            status_code=403,
            content={"error": "You can only edit your own comments"},
        )

    comment.content = content
    comment.updated_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(comment)

    return _comment_to_dict(comment, db)


@app.delete("/api/posts/{post_id}/comments/{comment_id}")
def delete_comment(
    post_id: str,
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    comment = (
        db.query(Comment)
        .filter(Comment.id == comment_id, Comment.post_id == post_id)
        .first()
    )
    if not comment:
        return JSONResponse(status_code=404, content={"error": "Comment not found"})

    is_admin = (
        user.github_id in ADMIN_GITHUB_IDS if hasattr(user, "github_id") else False
    )

    if is_admin:
        comment.is_deleted = True
        comment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(comment)
        return {
            "message": "Comment deleted",
            "comment": _comment_to_dict(comment, db),
        }

    if comment.user_id != user.id:
        return JSONResponse(
            status_code=403,
            content={"error": "You can only delete your own comments"},
        )

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}

class LikeRequest(BaseModel):
    liked: bool

@app.post("/api/posts/{post_id}/like")
def like_post(
    post_id: str,
    body: LikeRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    if db is None:
        return JSONResponse(status_code=503, content={"error": "Service unavailable"})

    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    post = postHandler.get_post_raw(post_id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})

    existing = (
        db.query(Like)
        .filter(Like.post_id == post_id, Like.user_id == user.id)
        .first()
    )

    if body.liked and not existing:
        db.add(
            Like(
                post_id=post_id,
                user_id=user.id,
                created_at=datetime.now(timezone.utc),
            )
        )
        db.commit()
    elif not body.liked and existing:
        db.delete(existing)
        db.commit()

    like_count = db.query(Like).filter(Like.post_id == post_id).count()
    return {"liked": body.liked, "like_count": like_count}

@app.put("/api/admin/posts/{id}")
async def admin_update_post(id: str, body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    print(f"[DEBUG /admin/posts PUT] user={getattr(user, 'username', None)}, post_id={id}")
    if not user or not hasattr(user, "github_id") or user.github_id not in ADMIN_GITHUB_IDS:
        print(f"[DEBUG /admin/posts PUT] Not admin")
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})

    data = body.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    # Never allow admin to change ownership fields
    data.pop("user_id", None)
    data.pop("githubOwner", None)

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            if gh:
                data["language"] = data.get("language") or gh.get("language")
                data["defaultBranch"] = gh.get("default_branch", data.get("defaultBranch"))
                data["lastPushAt"] = gh.get("pushed_at", data.get("lastPushAt"))
                data["stats"] = {
                    "stars": gh.get("stargazers_count", 0),
                    "forks": gh.get("forks_count", 0),
                    "watchers": gh.get("watchers_count", 0),
                    "openIssues": gh.get("open_issues_count", 0),
                }

    print(f"[DEBUG /admin/posts PUT] Updating post {id} (owner preserved)")
    updated = postHandler.update_post(id, db, data)
    return updated

# ── Post routes ──────────────────────────────────────────────────────

@app.get('/api/users')
def getUsers(request: Request, db: Session = Depends(get_db)):
    if db is None:
        return JSONResponse(status_code=503, content={"error": "Service unavailable"})
    try:
        return postHandler.get_all_users(db)
    except Exception:
        return {"users": [], "total": 0}

@app.get('/api/posts')
def getPosts(request: Request, db: Session = Depends(get_db)):
    try:
        offset = int(request.query_params.get("offset", 0))
        limit = int(request.query_params.get("limit", 12))
        limit = min(limit, 50)
        current_user = get_user_from_request(request, db)
        return postHandler.get_all_posts(db, offset=offset, limit=limit, user=current_user)
    except Exception:
        return posts

@app.get('/api/posts/search')
def searchPosts(request: Request, q: str = "", db: Session = Depends(get_db)):
    try:
        if not q or not q.strip():
            return {"posts": [], "total": 0, "offset": 0, "limit": 12}
        query = q.strip()
        offset = int(request.query_params.get("offset", 0))
        limit = int(request.query_params.get("limit", 12))
        limit = min(limit, 50)
        current_user = get_user_from_request(request, db)
        return postHandler.search_posts(db, query, user=current_user, offset=offset, limit=limit)
    except Exception:
        return {"posts": [], "total": 0, "offset": 0, "limit": 12}

@app.get('/api/posts/liked')
def getLikedPosts(request: Request, db: Session = Depends(get_db)):
    if db is None:
        return JSONResponse(status_code=503, content={"error": "Service unavailable"})
    user = get_user_from_request(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})
    try:
        return postHandler.get_liked_posts(db, user)
    except Exception:
        return {"posts": [], "total": 0}

@app.get('/api/posts/{id}')
def getPostById(id, request: Request, db: Session = Depends(get_db)):
    current_user = get_user_from_request(request, db)

    post = postHandler.get_post_by_id(
        id,
        db,
        user=current_user,
    )

    if post is None:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"},
        )

    return post

@app.get('/api/github/info')
async def getGithubInfo(request: Request, url: str = Query(..., description="GitHub repo URL"), db: Session = Depends(get_db)):
    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"}
        )
    user = get_user_from_request(request, db)
    user_token = getattr(user, "github_token", None) if user else None
    data = await fetch_github_repo(owner, repo, user_token)
    if not data:
        return JSONResponse(
            status_code=404,
            content={"error": "Repository not found or rate-limited. If rate-limited, try logging out and back in to refresh your GitHub token."}
        )
    return {
        "language": data.get("language"),
        "defaultBranch": data.get("default_branch"),
        "createdAt": data.get("created_at"),
        "pushedAt": data.get("pushed_at"),
        "githubOwner": data.get("owner", {}).get("login"),
        "ownerId": data.get("owner", {}).get("id"),
        "description": data.get("description"),
        "stats": {
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "watchers": data.get("watchers_count", 0),
            "openIssues": data.get("open_issues_count", 0),
        },
    }

async def fetch_readme(owner: str, repo: str, user_token: str = None) -> str:
    """Fetch the README content from a GitHub repo."""
    gh_token = user_token or os.getenv("GITHUB_TOKEN")
    headers = {}
    if gh_token:
        headers["Authorization"] = f"token {gh_token}"
    for ext in ("md", "MD", "markdown", "txt"):
        url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.{ext}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, headers=headers, timeout=10.0)
            if resp.status_code == 200:
                return resp.text[:4000]
    return ""

async def generate_with_gemini(repo_data: dict, readme: str) -> dict:
    """Call Gemini API to generate post content from repo data."""
    prompt = f"""You are a technical blog writer for a project showcase site. Given a GitHub repository, generate a post.

Repository: {repo_data.get('githubOwner')}/{repo_data.get('name', '')}
Language: {repo_data.get('language', 'N/A')}
Description: {repo_data.get('description', 'N/A')}
Stars: {repo_data.get('stats', {}).get('stars', 0)}
Forks: {repo_data.get('stats', {}).get('forks', 0)}

README:
{readme[:3000]}

Generate a JSON object with these fields:
- "title": Short catchy project name (max 50 chars)
- "shortDescription": One-line summary for a card (max 100 chars). Must be a single sentence.
- "description": Must be plain Markdown (NOT HTML). Follow this exact structure:
  First line: A brief intro paragraph (2-3 sentences) describing what the project is.
  Then a blank line, then sections in this order:

## Gameplay
- Bullet point explaining how to play or use it
- 3-5 bullet points

## Features
- Bullet point for each key feature
- 3-5 bullet points

## Tech Stack
- **LibraryName** - what it does
- List the main technologies used

Keep each bullet point short (one sentence). Do not use HTML tags. Do not use code blocks for the description itself.

- "type": One of "playable", "hosted", or "none"
- "availableAt": Array like ["web"] or ["web", "mobile"]

Return ONLY valid JSON, no markdown fences. The description field must be plain markdown with no HTML tags."""

    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 4096,
        },
    }

    async with httpx.AsyncClient() as client:
        resp = await client.post(api_url, json=payload, timeout=30.0)
        if resp.status_code != 200:
            raise Exception(f"Gemini API error: {resp.status_code}")
        data = resp.json()

    text = data["candidates"][0]["content"]["parts"][0]["text"]
    text = text.strip()
    if text.startswith("```"):
        text = text.split("\n", 1)[1].rsplit("```", 1)[0].strip()

    # Extract JSON object from the response
    start = text.find("{")
    end = text.rfind("}")
    if start == -1 or end == -1:
        raise Exception("No JSON object found in response")
    json_str = text[start:end + 1]

    # Fix common JSON issues from LLM output:
    # 1. Unescaped newlines inside string values
    # 2. Control characters
    def fix_json_strings(s):
        result = []
        in_string = False
        i = 0
        while i < len(s):
            c = s[i]
            if c == '"' and (i == 0 or s[i - 1] != '\\'):
                in_string = not in_string
                result.append(c)
            elif in_string and c == '\n':
                result.append('\\n')
            elif in_string and c == '\r':
                pass  # skip \r
            elif in_string and c == '\t':
                result.append('\\t')
            else:
                result.append(c)
            i += 1
        return ''.join(result)

    json_str = fix_json_strings(json_str)
    result = json.loads(json_str)

    # Convert markdown description to HTML for Quill.js
    if "description" in result and result["description"]:
        result["description"] = md.markdown(result["description"])

    return result

@app.post('/api/github/generate')
async def generatePostContent(request: Request, url: str = Query(..., description="GitHub repo URL"), db: Session = Depends(get_db)):
    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid GitHub URL"}
        )

    if not GEMINI_API_KEY:
        return JSONResponse(
            status_code=500,
            content={"error": "GEMINI_API_KEY not configured on the server"}
        )

    user = get_user_from_request(request, db)
    user_token = getattr(user, "github_token", None) if user else None
    repo_data = await fetch_github_repo(owner, repo, user_token)
    if not repo_data:
        return JSONResponse(
            status_code=404,
            content={"error": "Repository not found"}
        )

    repo_data["name"] = repo
    readme = await fetch_readme(owner, repo, user_token)
    if not readme:
        readme = repo_data.get("description") or "No README available for this repository."

    try:
        generated = await generate_with_gemini(repo_data, readme)
        return generated
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": f"Failed to generate content: {str(e)}"}
        )

@app.post('/api/posts')
async def createPost(body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)

    post_id = slugify(body.title)
    existing = postHandler.get_post_by_id(post_id, db)
    if existing:
        return JSONResponse(
            status_code=409,
            content={"error": "A post with this title already exists"}
        )
    data = body.model_dump()
    data["id"] = post_id
    data["user_id"] = user.id
    data["dateOfCreation"] = int(time.time())
    now = datetime.now(timezone.utc).isoformat()
    data["created_at"] = now
    data["updated_at"] = now

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            if gh:
                gh_owner_id = gh.get("owner", {}).get("id")
                if gh_owner_id and user.github_id and gh_owner_id != user.github_id:
                    return JSONResponse(
                        status_code=403,
                        content={"error": "You are not the owner of this repository"}
                    )
                data["language"] = data.get("language") or gh.get("language")
                data["defaultBranch"] = gh.get("default_branch", data.get("defaultBranch"))
                data["lastPushAt"] = gh.get("pushed_at", data.get("lastPushAt"))
                data["dateOfCreation"] = int(datetime.fromisoformat(gh["created_at"].replace("Z", "+00:00")).timestamp()) if gh.get("created_at") else data["dateOfCreation"]
                data["githubOwner"] = gh.get("owner", {}).get("login")
                data["stats"] = {
                    "stars": gh.get("stargazers_count", 0),
                    "forks": gh.get("forks_count", 0),
                    "watchers": gh.get("watchers_count", 0),
                    "openIssues": gh.get("open_issues_count", 0),
                }

    post = postHandler.create_post(db, data)
    return post

@app.delete('/api/posts/{id}')
def deletePost(id, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    if post.user_id != user.id:
        return JSONResponse(
            status_code=403,
            content={"error": "Not authorized to delete this post"}
        )

    postHandler.delete_post(id, db)
    return {"message": "Post deleted successfully"}

@app.put('/api/posts/{id}')
async def updatePost(id, body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    if post.user_id != user.id:
        return JSONResponse(
            status_code=403,
            content={"error": "Not authorized to update this post"}
        )

    data = body.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            if gh:
                gh_owner_id = gh.get("owner", {}).get("id")
                if gh_owner_id and user.github_id and gh_owner_id != user.github_id:
                    return JSONResponse(
                        status_code=403,
                        content={"error": "You are not the owner of this repository"}
                    )
                data["language"] = data.get("language") or gh.get("language")
                data["defaultBranch"] = gh.get("defaultBranch", data.get("defaultBranch"))
                data["lastPushAt"] = gh.get("lastPushAt", data.get("lastPushAt"))
                data["githubOwner"] = gh.get("owner", {}).get("login")
                data["stats"] = {
                    "stars": gh.get("stargazers_count", 0),
                    "forks": gh.get("forks_count", 0),
                    "watchers": gh.get("watchers_count", 0),
                    "openIssues": gh.get("open_issues_count", 0),
                }

    updated = postHandler.update_post(id, db, data)
    return updated

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)