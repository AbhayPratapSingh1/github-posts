from sqlalchemy import Column, Integer, String, JSON
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Post(Base):
    __tablename__ = 'post'

    id = Column(String, primary_key=True)
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


