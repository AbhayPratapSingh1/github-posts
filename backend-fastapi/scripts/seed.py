import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal
from app.models import Post
from all_posts import posts

db = session = SessionLocal()

count = 0

for post in posts:
    if db.query(Post).filter(Post.id == post["id"]).first() is None:
        new_post = Post(**post)
        db.add(new_post)
        count += 1

db.commit() 
print("✅ Seeded successfully! Total new posts added:", count)

db.close()