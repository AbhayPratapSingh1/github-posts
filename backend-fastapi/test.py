import os

from dotenv import load_dotenv
from sqlalchemy import create_engine

load_dotenv(f".env.{os.getenv('APP_ENV', 'local')}")

engine = create_engine(os.environ["DATABASE_URL"])

with engine.connect() as conn:
    print("✅ Connected successfully!")