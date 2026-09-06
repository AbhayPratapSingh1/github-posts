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
    def __init__(self, id: int, username: str, avatar_url: str = ""):
        self.id = id
        self.username = username
        self.avatar_url = avatar_url

# Hardcoded admin — used when DB has no matching row
ADMIN_USER = _SimpleUser(id=1, username="admin")


def verify_credentials(userid: str, password: str) -> Optional[_SimpleUser]:
    if userid == "admin" and password == "12345":
        return ADMIN_USER
    return None


def get_user_from_request(request: Request, db: Optional[Session]) -> Optional[User]:
    token = request.cookies.get("session")
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    if payload.get("type") != "access":
        return None
    if db is not None:
        user = db.query(User).filter(User.id == int(payload.get("sub", 0))).first()
        if user:
            return user
    # Fallback: hardcoded admin not in DB
    if payload.get("username") == "admin":
        return ADMIN_USER
    return None


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
