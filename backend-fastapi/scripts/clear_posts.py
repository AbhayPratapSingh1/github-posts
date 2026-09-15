import os, sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from database import SessionLocal
from app.models import Post, Comment, CommentLike, Like, PostMedia

db = SessionLocal()

# Comments/likes/media have no DB-level cascade from post (see app/models.py),
# so they're cleared explicitly alongside the posts themselves.
comment_like_count = db.query(CommentLike).delete(synchronize_session=False)
comment_count = db.query(Comment).delete(synchronize_session=False)
like_count = db.query(Like).delete(synchronize_session=False)
media_count = db.query(PostMedia).delete(synchronize_session=False)
post_count = db.query(Post).delete(synchronize_session=False)

db.commit()

print(f"✅ Cleared successfully!")
print(f"   Posts deleted: {post_count}")
print(f"   Comments deleted: {comment_count}")
print(f"   Comment likes deleted: {comment_like_count}")
print(f"   Post likes deleted: {like_count}")
print(f"   Media records deleted: {media_count}")

db.close()
