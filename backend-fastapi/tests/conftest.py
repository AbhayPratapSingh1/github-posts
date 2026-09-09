import os
os.environ["APP_ENV"] = "test"
os.environ["DATABASE_URL"] = "sqlite:///./test.db"
os.environ["JWT_SECRET"] = "test-secret-key-for-testing-only"
os.environ["GEMINI_API_KEY"] = ""
os.environ["GITHUB_CLIENT_ID"] = ""
os.environ["GITHUB_CLIENT_SECRET"] = ""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import get_db
from app.models import Base
from main import app
from auth import create_access_token, create_refresh_token

engine = create_engine(
    "sqlite:///./test.db",
    connect_args={"check_same_thread": False},
)

TestSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

# Drop and recreate all tables to ensure schema is up to date
Base.metadata.drop_all(bind=engine)
Base.metadata.create_all(bind=engine)


def override_get_db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db


@pytest.fixture(autouse=True)
def cleanup_db():
    yield
    db = TestSessionLocal()
    for table in reversed(Base.metadata.sorted_tables):
        db.execute(table.delete())
    db.commit()
    db.close()


@pytest.fixture
def client():
    return TestClient(app, raise_server_exceptions=False)


@pytest.fixture
def db():
    db = TestSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture
def auth_headers():
    token = create_access_token(1, "testuser")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_auth_headers():
    token = create_access_token(999, "otheruser")
    return {"Authorization": f"Bearer {token}"}


def create_test_user(db, github_id=12345, username="testuser"):
    from app.models import User
    user = User(
        github_id=github_id,
        username=username,
        name="Test User",
        email="test@example.com",
        avatar_url="https://example.com/avatar.png",
        bio="Test bio",
        created_at="2026-01-01T00:00:00Z",
        github_token="ghp_test_token",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_test_post(db, user_id=1, title="Test Post", github=None):
    from app.models import Post
    from main import slugify
    post = Post(
        id=slugify(title),
        title=title,
        type="playable",
        shortDescription="A test post",
        description="Full description here",
        github=github,
        user_id=user_id,
        dateOfCreation=1000000,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return post
