import os
import time
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import httpx
from fastapi import Depends, FastAPI, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, RedirectResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session
from all_posts import posts
from handler.postHandler import Post_handler
from database import get_db
from app.models import User
from auth import (
    create_token,
    verify_credentials,
    get_user_from_request,
    require_user,
)
from config import PORT, FRONTEND_URL, CORS_ORIGINS

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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

async def fetch_github_repo(owner: str, repo: str):
    async with httpx.AsyncClient() as client:
        resp = await client.get(
            f"https://api.github.com/repos/{owner}/{repo}",
            headers={"Accept": "application/vnd.github.v3+json"},
            timeout=10.0,
        )
        if resp.status_code == 200:
            return resp.json()
    return None

def set_session_cookie(response: RedirectResponse, token: str):
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=30 * 24 * 60 * 60,
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
    token = create_token(user.id, user.username)
    response = JSONResponse({"success": True, "user": {"id": user.id, "username": user.username, "avatar_url": user.avatar_url}})
    set_session_cookie(response, token)
    return response

@app.get("/api/auth/me")
def get_me(request: Request, db: Session = Depends(get_db)):
    try:
        user = get_user_from_request(request, db)
    except Exception:
        user = get_user_from_request(request, None)
    if not user:
        return {"user": None}
    return {
        "user": {
            "id": user.id,
            "username": user.username,
            "avatar_url": user.avatar_url,
        }
    }

@app.post("/api/auth/logout")
def logout():
    response = JSONResponse({"message": "Logged out"})
    response.delete_cookie(key="session", path="/")
    return response

# ── Post routes ──────────────────────────────────────────────────────

@app.get('/api/posts')
def getPosts(db: Session = Depends(get_db)):
    try:
        return postHandler.get_all_posts(db)
    except Exception:
        return posts

@app.get('/api/posts/{id}')
def getPostById(id, db: Session = Depends(get_db)):
    try:
        post = postHandler.get_post_by_id(id, db)
    except Exception:
        post = next((x for x in posts if x["id"] == id), None)
    if post is None:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    return post

@app.get('/api/github/info')
async def getGithubInfo(url: str = Query(..., description="GitHub repo URL")):
    owner, repo = parse_github_url(url)
    if not owner or not repo:
        return JSONResponse(
            status_code=400,
            content={"error": "Invalid GitHub URL. Expected format: https://github.com/owner/repo"}
        )
    data = await fetch_github_repo(owner, repo)
    if not data:
        return JSONResponse(
            status_code=404,
            content={"error": "Repository not found or rate-limited"}
        )
    return {
        "language": data.get("language"),
        "defaultBranch": data.get("default_branch"),
        "createdAt": data.get("created_at"),
        "pushedAt": data.get("pushed_at"),
        "githubOwner": data.get("owner", {}).get("login"),
        "description": data.get("description"),
        "stats": {
            "stars": data.get("stargazers_count", 0),
            "forks": data.get("forks_count", 0),
            "watchers": data.get("watchers_count", 0),
            "openIssues": data.get("open_issues_count", 0),
        },
    }

@app.post('/api/posts')
async def createPost(body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    require_user(request, db)

    post_id = slugify(body.title)
    existing = postHandler.get_post_by_id(post_id, db)
    if existing:
        return JSONResponse(
            status_code=409,
            content={"error": "A post with this title already exists"}
        )
    data = body.model_dump()
    data["id"] = post_id
    data["dateOfCreation"] = int(time.time())

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            gh = await fetch_github_repo(owner, repo)
            if gh:
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
    require_user(request, db)

    deleted = postHandler.delete_post(id, db)
    if not deleted:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    return {"message": "Post deleted successfully"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)