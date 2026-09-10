from sqlalchemy import Column, Integer, String, JSON, Boolean, UniqueConstraint
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
    created_at = Column(String)
    updated_at = Column(String)


class User(Base):
    __tablename__ = 'user'

    id = Column(Integer, primary_key=True, autoincrement=True)
    github_id = Column(Integer, unique=True, nullable=False)
    username = Column(String, nullable=False)
    name = Column(String)
    email = Column(String)
    avatar_url = Column(String)
    bio = Column(String)
    created_at = Column(String)
    github_token = Column(String)


class Comment(Base):
    __tablename__ = 'comment'

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(String, nullable=False)
    user_id = Column(Integer, nullable=False)
    content = Column(String, nullable=False)
    created_at = Column(String)
    updated_at = Column(String)
    is_deleted = Column(Boolean, default=False)


class Like(Base):
    __tablename__ = 'post_like'

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(String, nullable=False)
    user_id = Column(Integer, nullable=False)
    created_at = Column(String)

    __table_args__ = (
        UniqueConstraint('post_id', 'user_id', name='uq_post_like'),
    )


