import os
from pathlib import Path

APP_ENV = os.getenv("APP_ENV", "local")

_env_file = Path(__file__).parent / f".env.{APP_ENV}"
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

PORT = int(os.getenv("PORT", "7180"))
BACKEND_URL = os.getenv("BACKEND_URL", "http://localhost:7180")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5180")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", FRONTEND_URL).split(",")]

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5434/post_panel")

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_ACCESS_EXPIRY_MINUTES = int(os.getenv("JWT_ACCESS_EXPIRY_MINUTES", "15"))
JWT_REFRESH_EXPIRY_DAYS = int(os.getenv("JWT_REFRESH_EXPIRY_DAYS", "30"))

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY_POST_PANEL", "")

GITHUB_CLIENT_ID = os.getenv("GITHUB_CLIENT_ID_POST_PANEL", "")
GITHUB_CLIENT_SECRET = os.getenv("GITHUB_CLIENT_SECRET_POST_PANEL", "")
