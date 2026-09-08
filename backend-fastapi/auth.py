from typing import Optional
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Request, HTTPException
from sqlalchemy.orm import Session

from app.models import User
from config import JWT_SECRET, JWT_ALGORITHM, JWT_ACCESS_EXPIRY_MINUTES, JWT_REFRESH_EXPIRY_DAYS


def create_access_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(minutes=JWT_ACCESS_EXPIRY_MINUTES),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: int, username: str) -> str:
    payload = {
        "sub": str(user_id),
        "username": username,
        "type": "refresh",
        "exp": datetime.now(timezone.utc) + timedelta(days=JWT_REFRESH_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        print(f"[DEBUG decode_token] Token (first 50): {token[:50]}...")
        decoded = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        print(f"[DEBUG decode_token] Decoded OK: sub={decoded.get('sub')}, type={decoded.get('type')}, username={decoded.get('username')}")
        return decoded
    except jwt.PyJWTError as e:
        print(f"[DEBUG decode_token] FAILED: {e}")
        return None


class _SimpleUser:
    def __init__(self, id: int, username: str, email: str = "", avatar_url: str = "", bio: str = "", created_at: str = ""):
        self.id = id
        self.username = username
        self.email = email
        self.avatar_url = avatar_url
        self.bio = bio
        self.created_at = created_at

# Hardcoded admin — used when DB has no matching row
ADMIN_USER = _SimpleUser(
    id=1,
    username="admin",
    email="admin@postpanel.local",
    bio="Administrator of Post Panel",
    created_at="2026-01-01T00:00:00Z",
)


def verify_credentials(userid: str, password: str) -> Optional[_SimpleUser]:
    if userid == "admin" and password == "12345":
        return ADMIN_USER
    return None


def get_user_from_request(request: Request, db: Optional[Session]) -> Optional[User]:
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    print(f"[DEBUG get_user_from_request] Cookie token: {'yes' if request.cookies.get('session') else 'no'}")
    print(f"[DEBUG get_user_from_request] Bearer token: {'yes' if token and not request.cookies.get('session') else 'no'}")
    if not token:
        print(f"[DEBUG get_user_from_request] No token found, returning None")
        return None
    payload = decode_token(token)
    if not payload:
        print(f"[DEBUG get_user_from_request] Invalid token, returning None")
        return None
    if payload.get("type") != "access":
        print(f"[DEBUG get_user_from_request] Wrong token type: {payload.get('type')}, returning None")
        return None
    user_id = int(payload.get("sub", 0))
    print(f"[DEBUG get_user_from_request] Looking up user_id={user_id}")
    if db is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            print(f"[DEBUG get_user_from_request] Found DB user: {user.username}")
            return user
        print(f"[DEBUG get_user_from_request] No DB user for id={user_id}")
    # Fallback: hardcoded admin not in DB
    if payload.get("username") == "admin":
        print(f"[DEBUG get_user_from_request] Using hardcoded ADMIN_USER")
        return ADMIN_USER
    # Fallback: return _SimpleUser for any GitHub user
    print(f"[DEBUG get_user_from_request] Creating _SimpleUser fallback for {payload.get('username')}")
    return _SimpleUser(
        id=user_id,
        username=payload.get("username", ""),
    )


def refresh_access_token(refresh_token: str, db: Optional[Session]) -> Optional[str]:
    """Validate refresh token and return a new access token string."""
    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        return None
    user_id = int(payload.get("sub", 0))
    username = payload.get("username", "")
    if db is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return create_access_token(user.id, user.username)
    if username == "admin":
        return create_access_token(ADMIN_USER.id, ADMIN_USER.username)
    return None


def require_user(request: Request, db: Optional[Session]) -> User:
    user = get_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
