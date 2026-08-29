from app.models import Post

class Post_handler:
    def __init__(self):
        pass

    def get_all_posts(self, db):
        return db.query(Post).all()

    def get_post_by_id(self, id, db):
        return db.query(Post).filter(Post.id == id).first()