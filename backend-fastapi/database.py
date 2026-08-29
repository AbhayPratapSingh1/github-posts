
import os

from dotenv import load_dotenv
from sqlalchemy.orm import  sessionmaker
from sqlalchemy import create_engine

load_dotenv(f".env.{os.getenv('APP_ENV', 'local')}")

dbEngine = create_engine(os.environ["DATABASE_URL"])

SessionLocal = sessionmaker(bind=dbEngine, autocommit=False, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()