import os

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from all_posts import posts
from handler.postHandler import Post_handler
from database import get_db
app = FastAPI()

cors_origins = os.getenv("CORS_ORIGINS", "*").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_origins],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


postHandler = Post_handler()

@app.get("/")
def testing():
    return {"data":"End point is working fine"}

@app.get('/api/posts')
def getPosts(db: Session = Depends(get_db)):
    try:
        return postHandler.get_all_posts(db)
    except Exception:
        return posts

@app.get('/api/posts/{id}')
def getPostById(id, db: Session = Depends(get_db)):
    try:
        post = postHandler.get_post_by_id(id, db)
    except Exception:
        post = next((x for x in posts if x["id"] == id), None)
    if post is None:
        return JSONResponse(
            status_code=404,
            content={"error": "Post ID doesn't exist"}
        )
    return post
