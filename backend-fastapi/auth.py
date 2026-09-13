import secrets
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
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None


class _SimpleUser:
    def __init__(self, id: int, username: str, email: str = "", avatar_url: str = "", bio: str = "", created_at: str = "", name: str = ""):
        self.id = id
        self.username = username
        self.name = name
        self.email = email
        self.avatar_url = avatar_url
        self.bio = bio
        self.created_at = created_at


def generate_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def get_user_from_request(request: Request, db: Optional[Session]) -> Optional[User]:
    token = request.cookies.get("session")
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != "access":
        return None
    user_id = int(payload.get("sub", 0))
    if db is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return user
    # Fallback: return _SimpleUser for any GitHub user
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
    if db is not None:
        user = db.query(User).filter(User.id == user_id).first()
        if user:
            return create_access_token(user.id, user.username)
    return None


def require_user(request: Request, db: Optional[Session]) -> User:
    user = get_user_from_request(request, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return user
