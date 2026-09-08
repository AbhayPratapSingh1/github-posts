from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Post(Base):
    __tablename__ = 'post'

    id = Column(String, primary_key=True)
    user_id = Column(Integer, nullable=True)
    title = Column(String)
    type = Column(String)
    shortDescription = Column(String)
    hosted = Column(JSON)
    availableAt = Column(JSON)
    description = Column(String)
    github = Column(String)
    dateOfCreation = Column(Integer)
    language = Column(String)
    lastPushAt = Column(String)
    defaultBranch = Column(String)
    stats = Column(JSON)
    githubOwner = Column(String)


class User(Base):
    __tablename__ = 'user'

    id = Column(Integer, primary_key=True, autoincrement=True)
    github_id = Column(Integer, unique=True, nullable=False)
    username = Column(String, nullable=False)
    email = Column(String)
    avatar_url = Column(String)
    bio = Column(String)
    created_at = Column(String)
    github_token = Column(String)


