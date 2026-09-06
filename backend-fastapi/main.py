import os
import time
import re
import json
import markdown as md
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
    create_access_token,
    create_refresh_token,
    verify_credentials,
    get_user_from_request,
    refresh_access_token,
    require_user,
)
from config import PORT, FRONTEND_URL, CORS_ORIGINS, GEMINI_API_KEY, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET

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

def set_session_cookie(response, token: str):
    response.set_cookie(
        key="session",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=JWT_ACCESS_EXPIRY_MINUTES * 60,
        path="/",
    )

def set_refresh_cookie(response, token: str):
    response.set_cookie(
        key="refresh_token",
        value=token,
        httponly=True,
        secure=False,
        samesite="lax",
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
    response = JSONResponse({"success": True, "user": {"id": user.id, "username": user.username, "avatar_url": user.avatar_url}})
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
def github_login():
    if not GITHUB_CLIENT_ID:
        return JSONResponse(status_code=500, content={"error": "GitHub OAuth not configured"})
    redirect_uri = f"{FRONTEND_URL}/api/auth/github/callback"
    github_url = (
        f"https://github.com/login/oauth/authorize"
        f"?client_id={GITHUB_CLIENT_ID}"
        f"&redirect_uri={redirect_uri}"
        f"&scope=user:email"
    )
    return RedirectResponse(url=github_url)

@app.get("/api/auth/github/callback")
async def github_callback(code: str = Query(...), db: Session = Depends(get_db)):
    if not code:
        return RedirectResponse(url=f"{FRONTEND_URL}/login?error=no_code")

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
    avatar_url = gh_user.get("avatar_url")

    if db is not None:
        user = db.query(User).filter(User.github_id == github_id).first()
        if not user:
            user = User(
                github_id=github_id,
                username=username,
                avatar_url=avatar_url,
            )
            db.add(user)
            db.commit()
            db.refresh(user)
    else:
        from auth import _SimpleUser
        user = _SimpleUser(id=github_id, username=username, avatar_url=avatar_url)

    access = create_access_token(user.id, user.username)
    refresh_token = create_refresh_token(user.id, user.username)
    response = RedirectResponse(url=f"{FRONTEND_URL}")
    set_session_cookie(response, access)
    set_refresh_cookie(response, refresh_token)
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

async def fetch_readme(owner: str, repo: str) -> str:
    """Fetch the README content from a GitHub repo."""
    for ext in ("md", "MD", "markdown", "txt"):
        url = f"https://raw.githubusercontent.com/{owner}/{repo}/HEAD/README.{ext}"
        async with httpx.AsyncClient() as client:
            resp = await client.get(url, timeout=10.0)
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
async def generatePostContent(url: str = Query(..., description="GitHub repo URL")):
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

    repo_data = await fetch_github_repo(owner, repo)
    if not repo_data:
        return JSONResponse(
            status_code=404,
            content={"error": "Repository not found"}
        )

    repo_data["name"] = repo
    readme = await fetch_readme(owner, repo)
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

@app.put('/api/posts/{id}')
async def updatePost(id, body: CreatePostRequest, request: Request, db: Session = Depends(get_db)):
    require_user(request, db)

    data = body.model_dump(exclude_unset=True)

    if body.github:
        owner, repo = parse_github_url(body.github)
        if owner and repo:
            gh = await fetch_github_repo(owner, repo)
            if gh:
                data["language"] = data.get("language") or gh.get("language")
                data["defaultBranch"] = gh.get("defaultBranch", data.get("defaultBranch"))
                data["lastPushAt"] = gh.get("pushedAt", data.get("lastPushAt"))
                data["githubOwner"] = gh.get("githubOwner")
                data["stats"] = gh.get("stats")

    updated = postHandler.update_post(id, db, data)
    if not updated:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    return updated

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=PORT, reload=True)