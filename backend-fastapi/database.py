
import logging
from sqlalchemy.orm import sessionmaker
from sqlalchemy import create_engine
from sqlalchemy.exc import OperationalError

from config import DATABASE_URL

log = logging.getLogger(__name__)

dbEngine = create_engine(DATABASE_URL, pool_pre_ping=True)

SessionLocal = sessionmaker(bind=dbEngine, autocommit=False, autoflush=False)

def get_db():
    db = SessionLocal()
    try:
        yield db
    except OperationalError:
        log.warning("Database unavailable")
        yield None
    finally:
        try:
            db.close()
        except Exception:
            pass