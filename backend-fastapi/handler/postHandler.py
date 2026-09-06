from app.models import Post

class Post_handler:
    def __init__(self):
        pass

    def get_all_posts(self, db):
        return db.query(Post).all()

    def get_post_by_id(self, id, db):
        return db.query(Post).filter(Post.id == id).first()

    def create_post(self, db, data):
        post = Post(**data)
        db.add(post)
        db.commit()
        db.refresh(post)
        return post

    def delete_post(self, id, db):
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            return None
        db.delete(post)
        db.commit()
        return post

    def update_post(self, id, db, data):
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            return None
        for key, value in data.items():
            if value is not None:
                setattr(post, key, value)
        db.commit()
        db.refresh(post)
        return post