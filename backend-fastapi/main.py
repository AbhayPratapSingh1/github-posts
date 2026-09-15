import os
import time
import re
import json
import logging
import bleach
import markdown as md
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse, urlencode

import httpx
from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from handler.postHandler import Post_handler
from database import get_db
from app.models import User, Post, Comment, Like, PostMedia, CommentLike, Feedback
from auth import (
    create_access_token,
    create_refresh_token,
    generate_csrf_token,
    get_user_from_request,
    refresh_access_token,
    require_user,
)
from config import APP_ENV, PORT, BACKEND_URL, FRONTEND_URL, CORS_ORIGINS, GEMINI_API_KEY, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, ADMIN_GITHUB_IDS, ADMIN_PASSWORD, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, MAX_IMAGE_SIZE_MB, MAX_VIDEO_SIZE_MB, ALLOWED_IMAGE_TYPES, ALLOWED_VIDEO_TYPES

logger = logging.getLogger("post_panel")

app = FastAPI()

if APP_ENV == "prod":
    if os.getenv("JWT_SECRET", "dev-secret-change-me") == "dev-secret-change-me":
        logger.warning("JWT_SECRET is using its insecure default value in a prod environment")
    if os.getenv("ADMIN_PASSWORD", "admin123") == "admin123":
        logger.warning("ADMIN_PASSWORD is using its insecure default value in a prod environment")


@app.on_event("startup")
def log_cloudinary_config():
    print(f"[Cloudinary] CLOUD_NAME: {CLOUDINARY_CLOUD_NAME or 'NOT SET'}")
    print(f"[Cloudinary] API_KEY: {CLOUDINARY_API_KEY or 'NOT SET'}")
    print(f"[Cloudinary] API_SECRET: {'SET' if CLOUDINARY_API_SECRET else 'NOT SET'}")
    print(f"[Cloudinary] MAX_IMAGE_SIZE_MB: {MAX_IMAGE_SIZE_MB}")
    print(f"[Cloudinary] MAX_VIDEO_SIZE_MB: {MAX_VIDEO_SIZE_MB}")
    print(f"[Cloudinary] ALLOWED_IMAGE_TYPES: {ALLOWED_IMAGE_TYPES}")
    print(f"[Cloudinary] ALLOWED_VIDEO_TYPES: {ALLOWED_VIDEO_TYPES}")


app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CSRF_SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


@app.middleware("http")
async def csrf_protect(request: Request, call_next):
    """Require a matching double-submit CSRF token for cookie-authenticated,
    state-changing requests. Bearer-token (non-cookie) requests are unaffected
    since a cross-site attacker can't set a custom Authorization header."""
    if request.method not in CSRF_SAFE_METHODS and request.cookies.get("session"):
        csrf_cookie = request.cookies.get("csrf_token")
        csrf_header = request.headers.get("x-csrf-token")
        if not csrf_cookie or not csrf_header or csrf_cookie != csrf_header:
            return JSONResponse(status_code=403, content={"error": "Missing or invalid CSRF token"})
    return await call_next(request)


_rate_limit_buckets: dict[str, list] = defaultdict(list)


def check_rate_limit(key: str, max_requests: int, window_seconds: int) -> bool:
    """Simple in-memory fixed-window limiter. Per-process only; fine for a
    single backend instance, not a substitute for a shared limiter behind a
    load balancer."""
    now = time.time()
    bucket = _rate_limit_buckets[key]
    while bucket and now - bucket[0] > window_seconds:
        bucket.pop(0)
    if len(bucket) >= max_requests:
        return False
    bucket.append(now)
    return True


def client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def is_admin_user(user) -> bool:
    return bool(user) and getattr(user, "github_id", None) in ADMIN_GITHUB_IDS


def require_admin(request: Request, db: Session) -> Optional[User]:
    """Returns the authenticated user if they're an admin, else None."""
    user = get_user_from_request(request, db)
    return user if is_admin_user(user) else None


ALLOWED_HTML_TAGS = [
    "p", "br", "div", "span", "strong", "b", "em", "i", "u", "s",
    "h1", "h2", "h3", "h4", "ul", "ol", "li", "a", "img",
    "blockquote", "code", "pre", "video", "source", "figure", "figcaption",
]
ALLOWED_HTML_ATTRS = {
    "a": ["href", "title", "target", "rel"],
    "img": ["src", "alt", "title", "width", "height"],
    "video": ["src", "controls", "width", "height", "poster"],
    "source": ["src", "type"],
}
ALLOWED_HTML_PROTOCOLS = ["http", "https", "mailto"]


def sanitize_html(html: str) -> str:
    if not html:
        return html
    return bleach.clean(
        html,
        tags=ALLOWED_HTML_TAGS,
        attributes=ALLOWED_HTML_ATTRS,
        protocols=ALLOWED_HTML_PROTOCOLS,
        strip=True,
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

class GithubRateLimitedError(Exception):
    """Raised when the GitHub API itself rate-limits our request."""
    pass

class GithubApiError(Exception):
    """Raised for unexpected non-200/404 responses from the GitHub API."""
    def __init__(self, status_code: int):
        self.status_code = status_code
        super().__init__(f"GitHub API returned {status_code}")

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
        if resp.status_code == 404:
            return None
        if resp.status_code in (403, 429) or resp.headers.get("X-RateLimit-Remaining") == "0":
            raise GithubRateLimitedError()
        raise GithubApiError(resp.status_code)

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
    # Double-submit CSRF token: readable by frontend JS (same-origin only),
    # echoed back as a header on state-changing requests.
    response.set_cookie(
        key="csrf_token",
        value=generate_csrf_token(),
        httponly=False,
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
    user_data["is_admin"] = is_admin_user(user)
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
    response = JSONResponse({"success": True, "access_token": new_access})
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

    user_data = {
        "id": user.id,
        "username": user.username or f"user_{user.id}",
        "name": getattr(user, "name", "") or "",
        "avatar_url": user.avatar_url,
        "github_id": user.github_id if hasattr(user, "github_id") else None,
        "email": getattr(user, "email", ""),
        "bio": getattr(user, "bio", ""),
        "is_admin": is_admin_user(user),
    }

    # Cross-site cookies (Render backend / Vercel frontend, different
    # registrable domains) are unreliable across browsers, so the token is
    # also passed via the redirect URL for the frontend to store and send as
    # an Authorization header. Cookies are still set as a secondary path.
    params = urlencode({
        "token": access,
        "refresh": refresh_token,
        "user": json.dumps(user_data),
    })
    response = RedirectResponse(url=f"{FRONTEND_URL}{return_to}?{params}")
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh_token)
    return response

# ── Admin routes ─────────────────────────────────────────────────────

@app.get("/api/admin/check")
def admin_check(request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Not authenticated"})

    if not is_admin_user(user):
        return JSONResponse(status_code=403, content={"error": "Not an admin account"})

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
    password: str

@app.post("/api/admin/login")
def admin_login(body: AdminLoginRequest, request: Request, db: Session = Depends(get_db)):
    if not check_rate_limit(f"admin_login:{client_ip(request)}", max_requests=5, window_seconds=300):
        return JSONResponse(status_code=429, content={"error": "Too many attempts. Try again later."})

    # The password step is a second factor on top of an *already-authenticated*
    # GitHub session — the target account is derived from that session, never
    # from client-supplied input, so this can't be used to log in as an
    # arbitrary admin github_id.
    user = get_user_from_request(request, db)
    if not is_admin_user(user):
        return JSONResponse(status_code=403, content={"error": "Not an admin account"})

    if body.password != ADMIN_PASSWORD:
        return JSONResponse(status_code=401, content={"error": "Invalid password"})

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
    response = JSONResponse({"success": True, "user": user_data, "token": access})
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh_token)
    return response

@app.get("/api/admin/dashboard")
def admin_dashboard(request: Request, db: Session = Depends(get_db)):
    if not require_admin(request, db):
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
    if not require_admin(request, db):
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})
    postHandler.delete_post(id, db)
    return {"message": "Post deleted successfully"}

@app.delete("/api/admin/posts")
def admin_delete_all_posts(request: Request, db: Session = Depends(get_db)):
    if not require_admin(request, db):
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    count = db.query(Post).count()
    db.query(Post).delete()
    db.commit()
    return {"message": f"Deleted {count} posts"}

@app.delete("/api/admin/users")
def admin_delete_all_users(request: Request, db: Session = Depends(get_db)):
    if not require_admin(request, db):
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
    parent_id = body.get("parent_id")

    if not content:
        return JSONResponse(
            status_code=400,
            content={"error": "Content required"}
        )

    if parent_id:
        parent_comment = db.query(Comment).filter(Comment.id == parent_id, Comment.post_id == post_id).first()
        if not parent_comment:
            return JSONResponse(status_code=404, content={"error": "Parent comment not found"})
        if parent_comment.parent_id is not None:
            return JSONResponse(status_code=400, content={"error": "Cannot nest replies more than one level"})

    from datetime import datetime, timezone

    now = datetime.now(timezone.utc)

    comment = Comment(
        post_id=post_id,
        user_id=user.id,
        content=content,
        parent_id=parent_id,
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
        "parent_id": comment.parent_id,
        "like_count": 0,
        "liked_by_me": False,
        "created_at": comment.created_at,
        "updated_at": comment.updated_at,
    }


@app.get("/api/posts/{post_id}/comments")
def get_comments(post_id: str, request: Request, db: Session = Depends(get_db)):
    user = get_user_from_request(request, db)
    current_user_id = user.id if user else None

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
        .order_by(Comment.created_at.asc())
        .all()
    )

    comment_map = {}
    for c, user_id, github_id, username, name, avatar_url in comments:
        like_count = db.query(CommentLike).filter(CommentLike.comment_id == c.id).count()
        liked_by_me = False
        if current_user_id:
            liked_by_me = db.query(CommentLike).filter(
                CommentLike.comment_id == c.id,
                CommentLike.user_id == current_user_id,
            ).first() is not None
        comment_map[c.id] = {
            "id": c.id,
            "user_id": user_id,
            "github_id": github_id,
            "username": username,
            "name": name or "",
            "avatar_url": avatar_url,
            "content": "" if c.is_deleted else c.content,
            "is_deleted": bool(c.is_deleted),
            "parent_id": c.parent_id,
            "like_count": like_count,
            "liked_by_me": liked_by_me,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
            "replies": [],
        }

    top_level = []
    for cid, comment in comment_map.items():
        pid = comment["parent_id"]
        if pid and pid in comment_map:
            comment_map[pid]["replies"].append(comment)
        else:
            top_level.append(comment)

    top_level.reverse()

    return top_level


def _comment_to_dict(comment: Comment, db: Session, user_id: int = None) -> dict:
    author = db.query(User).filter(User.id == comment.user_id).first()
    like_count = db.query(CommentLike).filter(CommentLike.comment_id == comment.id).count()
    liked_by_me = False
    if user_id:
        liked_by_me = db.query(CommentLike).filter(
            CommentLike.comment_id == comment.id,
            CommentLike.user_id == user_id,
        ).first() is not None
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
        "parent_id": comment.parent_id,
        "like_count": like_count,
        "liked_by_me": liked_by_me,
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

    return _comment_to_dict(comment, db, user.id)


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

    if is_admin_user(user):
        comment.is_deleted = True
        comment.updated_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(comment)
        return {
            "message": "Comment deleted",
            "comment": _comment_to_dict(comment, db, user.id),
        }

    if comment.user_id != user.id:
        return JSONResponse(
            status_code=403,
            content={"error": "You can only delete your own comments"},
        )

    db.delete(comment)
    db.commit()
    return {"message": "Comment deleted"}


@app.post("/api/posts/{post_id}/comments/{comment_id}/like")
def like_comment(
    post_id: str,
    comment_id: int,
    request: Request,
    db: Session = Depends(get_db),
):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    comment = db.query(Comment).filter(Comment.id == comment_id, Comment.post_id == post_id).first()
    if not comment:
        return JSONResponse(status_code=404, content={"error": "Comment not found"})

    existing = db.query(CommentLike).filter(
        CommentLike.comment_id == comment_id,
        CommentLike.user_id == user.id,
    ).first()

    if existing:
        db.delete(existing)
        db.commit()
        liked = False
    else:
        like = CommentLike(
            comment_id=comment_id,
            user_id=user.id,
            created_at=datetime.now(timezone.utc),
        )
        db.add(like)
        db.commit()
        liked = True

    like_count = db.query(CommentLike).filter(CommentLike.comment_id == comment_id).count()
    return {"liked": liked, "like_count": like_count}


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
    user = require_admin(request, db)
    if not user:
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})

    data = body.model_dump(exclude_unset=True)
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if data.get("description"):
        data["description"] = sanitize_html(data["description"])

    # Never allow admin to change ownership fields
    data.pop("user_id", None)
    data.pop("githubOwner", None)

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            try:
                gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            except (GithubRateLimitedError, GithubApiError) as e:
                logger.warning("GitHub lookup failed during admin post update (%s): %s", owner + "/" + repo, e)
                gh = None
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
                data["githubSynced"] = True

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
        return {"posts": [], "total": 0, "offset": offset, "limit": limit}

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

@app.get('/api/users/{username}/posts')
def getUserPosts(username: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        return JSONResponse(status_code=404, content={"error": "User not found"})
    try:
        return postHandler.get_user_posts(db, user.id)
    except Exception:
        return {"posts": [], "total": 0, "user": None}

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
    if not check_rate_limit(f"github_info:{client_ip(request)}", max_requests=20, window_seconds=3600):
        return JSONResponse(status_code=429, content={"error": "Too many requests. Please try again later."})

    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"}
        )
    user = get_user_from_request(request, db)
    user_token = getattr(user, "github_token", None) if user else None
    try:
        data = await fetch_github_repo(owner, repo, user_token)
    except GithubRateLimitedError:
        return JSONResponse(
            status_code=429,
            content={"error": "GitHub API rate limit exceeded. Try again later, or log in to increase your rate limit."}
        )
    except GithubApiError as e:
        logger.warning("GitHub API error %s for %s/%s", e.status_code, owner, repo)
        return JSONResponse(
            status_code=502,
            content={"error": "GitHub API error. Please try again later."}
        )
    if not data:
        return JSONResponse(
            status_code=404,
            content={"error": "Repository not found"}
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
        result["description"] = sanitize_html(md.markdown(result["description"]))

    return result

@app.post('/api/github/generate')
async def generatePostContent(request: Request, url: str = Query(..., description="GitHub repo URL"), db: Session = Depends(get_db)):
    if not check_rate_limit(f"github_generate:{client_ip(request)}", max_requests=10, window_seconds=3600):
        return JSONResponse(status_code=429, content={"error": "Too many requests. Please try again later."})

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
    try:
        repo_data = await fetch_github_repo(owner, repo, user_token)
    except GithubRateLimitedError:
        return JSONResponse(
            status_code=429,
            content={"error": "GitHub API rate limit exceeded. Try again later, or log in to increase your rate limit."}
        )
    except GithubApiError as e:
        logger.warning("GitHub API error %s for %s/%s", e.status_code, owner, repo)
        return JSONResponse(
            status_code=502,
            content={"error": "GitHub API error. Please try again later."}
        )
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
        logger.warning("generate_with_gemini failed: %s", e)
        return JSONResponse(
            status_code=500,
            content={"error": "Failed to generate content. Please try again."}
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
    data["githubSynced"] = False
    if data.get("description"):
        data["description"] = sanitize_html(data["description"])

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            try:
                gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            except (GithubRateLimitedError, GithubApiError) as e:
                # GitHub is unreachable/rate-limited right now: create the post as an
                # unsynced pre-post rather than blocking the user. They can retry via
                # POST /api/posts/{id}/sync-github once GitHub is available again.
                logger.warning("GitHub lookup failed during post creation (%s): %s", owner + "/" + repo, e)
                gh = None
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
                data["githubSynced"] = True

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
    if data.get("description"):
        data["description"] = sanitize_html(data["description"])

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            try:
                gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
            except (GithubRateLimitedError, GithubApiError) as e:
                # GitHub is unreachable/rate-limited: save the rest of the edit as-is
                # and leave the existing repo data/sync status untouched. The user can
                # retry via POST /api/posts/{id}/sync-github later.
                logger.warning("GitHub lookup failed during post update (%s): %s", owner + "/" + repo, e)
                gh = None
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
                data["githubOwner"] = gh.get("owner", {}).get("login")
                data["stats"] = {
                    "stars": gh.get("stargazers_count", 0),
                    "forks": gh.get("forks_count", 0),
                    "watchers": gh.get("watchers_count", 0),
                    "openIssues": gh.get("open_issues_count", 0),
                }
                data["githubSynced"] = True

    updated = postHandler.update_post(id, db, data)
    return updated

@app.post('/api/posts/{id}/sync-github')
async def syncPostGithub(id: str, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)

    if not check_rate_limit(f"github_sync:{client_ip(request)}", max_requests=20, window_seconds=3600):
        return JSONResponse(status_code=429, content={"error": "Too many requests. Please try again later."})

    post = postHandler.get_post_raw(id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post ID doesn't exist"})
    if post.user_id != user.id:
        return JSONResponse(status_code=403, content={"error": "Not authorized to sync this post"})
    if not post.github:
        return JSONResponse(status_code=400, content={"error": "This post has no GitHub repository linked"})

    owner, repo = parse_github_url(post.github)
    if not owner or not repo:
        return JSONResponse(status_code=400, content={"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"})

    try:
        gh = await fetch_github_repo(owner, repo, getattr(user, "github_token", None))
    except GithubRateLimitedError:
        return JSONResponse(
            status_code=429,
            content={"error": "GitHub API rate limit exceeded. Try again later, or log in to increase your rate limit."}
        )
    except GithubApiError as e:
        logger.warning("GitHub API error %s while syncing post %s", e.status_code, id)
        return JSONResponse(status_code=502, content={"error": "GitHub API error. Please try again later."})

    if not gh:
        return JSONResponse(status_code=404, content={"error": "Repository not found on GitHub"})

    gh_owner_id = gh.get("owner", {}).get("id")
    if gh_owner_id and user.github_id and gh_owner_id != user.github_id:
        return JSONResponse(status_code=403, content={"error": "You are not the owner of this repository"})

    data = {
        "language": gh.get("language"),
        "defaultBranch": gh.get("default_branch"),
        "lastPushAt": gh.get("pushed_at"),
        "githubOwner": gh.get("owner", {}).get("login"),
        "stats": {
            "stars": gh.get("stargazers_count", 0),
            "forks": gh.get("forks_count", 0),
            "watchers": gh.get("watchers_count", 0),
            "openIssues": gh.get("open_issues_count", 0),
        },
        "githubSynced": True,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    updated = postHandler.update_post(id, db, data)
    return updated


# ── Media Upload Endpoints ─────────────────────────────────────────────────────

import hashlib
import time as time_module

class MediaSignRequest(BaseModel):
    clientMediaId: str
    type: str  # 'image' or 'video'
    mimeType: str
    fileSize: int
    originalFilename: str

class MediaConfirmRequest(BaseModel):
    clientMediaId: str
    cloudinaryPublicId: str
    resourceType: str
    secureUrl: str

def _generate_cloudinary_signature(params: dict, timestamp: int) -> str:
    """Generate Cloudinary upload signature."""
    if not CLOUDINARY_API_SECRET:
        return ""
    sorted_params = "&".join(f"{k}={v}" for k, v in sorted(params.items()) if v)
    sign_string = f"{sorted_params}&timestamp={timestamp}"
    return hashlib.sha1((sign_string + CLOUDINARY_API_SECRET).encode()).hexdigest()


@app.post('/api/posts/{post_id}/media/sign')
def sign_media_upload(post_id: str, body: MediaSignRequest, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    post = postHandler.get_post_raw(post_id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})
    if post.user_id != user.id:
        return JSONResponse(status_code=403, content={"error": "Not authorized"})

    # Validate media type
    if body.type not in ["image", "video"]:
        return JSONResponse(status_code=400, content={"error": "Invalid media type"})

    # Validate MIME type
    allowed = ALLOWED_IMAGE_TYPES if body.type == "image" else ALLOWED_VIDEO_TYPES
    if body.mimeType not in allowed:
        return JSONResponse(status_code=400, content={"error": f"Invalid MIME type '{body.mimeType}'. Allowed: {allowed}"})

    # Validate file size
    max_size = MAX_IMAGE_SIZE_MB if body.type == "image" else MAX_VIDEO_SIZE_MB
    if body.fileSize > max_size * 1024 * 1024:
        return JSONResponse(status_code=400, content={"error": f"File too large. Max: {max_size}MB"})

    # Create or get media record
    media = db.query(PostMedia).filter(
        PostMedia.post_id == post_id,
        PostMedia.client_media_id == body.clientMediaId
    ).first()

    if not media:
        media = PostMedia(
            post_id=post_id,
            client_media_id=body.clientMediaId,
            type=body.type,
            status="pending",
            mime_type=body.mimeType,
            file_size=body.fileSize,
            original_filename=body.originalFilename,
            created_at=datetime.now(timezone.utc).isoformat(),
            updated_at=datetime.now(timezone.utc).isoformat(),
        )
        db.add(media)
        db.commit()
        db.refresh(media)

    # Generate signature
    timestamp = int(time_module.time())
    folder = f"posts/{post_id}"
    resource_type = "image" if body.type == "image" else "video"

    params = {
        "folder": folder,
    }
    signature = _generate_cloudinary_signature(params, timestamp)

    return {
        "mediaId": media.id,
        "cloudName": CLOUDINARY_CLOUD_NAME,
        "apiKey": CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resourceType": resource_type,
    }


@app.post('/api/posts/{post_id}/media/confirm')
def confirm_media_upload(post_id: str, body: MediaConfirmRequest, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    post = postHandler.get_post_raw(post_id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})
    if post.user_id != user.id:
        return JSONResponse(status_code=403, content={"error": "Not authorized"})

    media = db.query(PostMedia).filter(
        PostMedia.post_id == post_id,
        PostMedia.client_media_id == body.clientMediaId
    ).first()

    if not media:
        return JSONResponse(status_code=404, content={"error": "Media record not found"})

    expected_prefix = f"https://res.cloudinary.com/{CLOUDINARY_CLOUD_NAME}/"
    if not body.secureUrl.startswith(expected_prefix):
        return JSONResponse(status_code=400, content={"error": "Invalid media URL"})
    if body.resourceType not in ("image", "video"):
        return JSONResponse(status_code=400, content={"error": "Invalid resource type"})
    if not body.cloudinaryPublicId.startswith(f"posts/{post_id}/") and not body.cloudinaryPublicId.startswith(f"posts/{post_id}"):
        return JSONResponse(status_code=400, content={"error": "Invalid media public ID"})

    media.status = "uploaded"
    media.cloudinary_public_id = body.cloudinaryPublicId
    media.cloudinary_resource_type = body.resourceType
    media.cloudinary_secure_url = body.secureUrl
    media.cloudinary_url = body.secureUrl
    media.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    return {"success": True, "mediaId": media.id}


@app.post('/api/posts/{post_id}/finalize')
def finalize_post_media(post_id: str, request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    post = postHandler.get_post_raw(post_id, db)
    if not post:
        return JSONResponse(status_code=404, content={"error": "Post not found"})
    if post.user_id != user.id:
        return JSONResponse(status_code=403, content={"error": "Not authorized"})

    # Get all media for this post
    media_list = db.query(PostMedia).filter(PostMedia.post_id == post_id).all()

    # Resolve placeholders in description
    description = post.description or ""
    for media in media_list:
        placeholder = f"{{{{media:{media.client_media_id}}}}}"
        if placeholder in description:
            if media.status == "uploaded" and media.cloudinary_secure_url:
                description = description.replace(placeholder, media.cloudinary_secure_url)
            else:
                # Remove unresolved placeholder
                description = description.replace(placeholder, "")

    post.description = description
    post.updated_at = datetime.now(timezone.utc).isoformat()
    db.commit()

    return {
        "success": True,
        "postId": post_id,
        "uploadedMedia": len([m for m in media_list if m.status == "uploaded"]),
        "pendingMedia": len([m for m in media_list if m.status != "uploaded"]),
    }


@app.get('/api/posts/{post_id}/media')
def get_post_media(post_id: str, db: Session = Depends(get_db)):
    media_list = db.query(PostMedia).filter(PostMedia.post_id == post_id).all()
    return {
        "media": [
            {
                "id": m.id,
                "clientMediaId": m.client_media_id,
                "type": m.type,
                "status": m.status,
                "cloudinaryUrl": m.cloudinary_secure_url,
            }
            for m in media_list
        ]
    }


@app.post("/api/feedback")
async def submit_feedback(request: Request, db: Session = Depends(get_db)):
    body = await request.json()
    content = body.get("content", "").strip()
    category = body.get("category", "general").strip()
    is_anonymous = body.get("is_anonymous", False)

    if not content:
        return JSONResponse(status_code=400, content={"error": "Content required"})

    user = get_user_from_request(request, db)

    feedback = Feedback(
        user_id=user.id if user and not is_anonymous else None,
        content=content,
        category=category,
        is_anonymous=is_anonymous,
        created_at=datetime.now(timezone.utc),
    )
    db.add(feedback)
    db.commit()
    db.refresh(feedback)

    return {
        "id": feedback.id,
        "content": feedback.content,
        "category": feedback.category,
        "is_anonymous": feedback.is_anonymous,
        "created_at": feedback.created_at,
    }


@app.get("/api/feedback/mine")
def get_my_feedback(request: Request, db: Session = Depends(get_db)):
    user = require_user(request, db)
    if not user:
        return JSONResponse(status_code=401, content={"error": "Unauthorized"})

    feedbacks = (
        db.query(Feedback)
        .filter(Feedback.user_id == user.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "content": f.content,
            "category": f.category,
            "is_anonymous": f.is_anonymous,
            "created_at": f.created_at,
        }
        for f in feedbacks
    ]


@app.get("/api/admin/feedback")
def admin_get_all_feedback(request: Request, db: Session = Depends(get_db)):
    if not require_admin(request, db):
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    feedbacks = (
        db.query(Feedback, User.username, User.name, User.avatar_url)
        .outerjoin(User, Feedback.user_id == User.id)
        .order_by(Feedback.created_at.desc())
        .all()
    )

    return [
        {
            "id": f.id,
            "content": f.content,
            "category": f.category,
            "is_anonymous": f.is_anonymous,
            "username": None if f.is_anonymous else username,
            "name": None if f.is_anonymous else (name or ""),
            "avatar_url": None if f.is_anonymous else avatar_url,
            "created_at": f.created_at,
        }
        for f, username, name, avatar_url in feedbacks
    ]


@app.delete("/api/admin/feedback/{feedback_id}")
def admin_delete_feedback(feedback_id: int, request: Request, db: Session = Depends(get_db)):
    if not require_admin(request, db):
        return JSONResponse(status_code=403, content={"error": "Admin access required"})

    feedback = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not feedback:
        return JSONResponse(status_code=404, content={"error": "Feedback not found"})

    db.delete(feedback)
    db.commit()
    return {"message": "Feedback deleted"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)