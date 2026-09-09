from app.models import Post, User

class Post_handler:
    def __init__(self):
        pass

    def _post_to_dict(self, post, user=None):
        return {
            "id": post.id,
            "user_id": post.user_id,
            "title": post.title,
            "type": post.type,
            "shortDescription": post.shortDescription,
            "hosted": post.hosted,
            "availableAt": post.availableAt,
            "description": post.description,
            "github": post.github,
            "dateOfCreation": post.dateOfCreation,
            "language": post.language,
            "lastPushAt": post.lastPushAt,
            "defaultBranch": post.defaultBranch,
            "stats": post.stats,
            "githubOwner": post.githubOwner,
            "created_at": post.created_at,
            "updated_at": post.updated_at,
            "authorName": user.name if user else None,
            "authorUsername": user.username if user else None,
        }

    def _resolve_user(self, db, post):
        if post.user_id:
            return db.query(User).filter(User.id == post.user_id).first()
        if post.githubOwner:
            return db.query(User).filter(User.username == post.githubOwner).first()
        return None

    def get_all_posts(self, db, offset=0, limit=12):
        total = db.query(Post).count()
        posts = db.query(Post).order_by(Post.dateOfCreation.desc().nullslast()).offset(offset).limit(limit).all()
        result = []
        for post in posts:
            user = self._resolve_user(db, post)
            result.append(self._post_to_dict(post, user))
        return {"posts": result, "total": total, "offset": offset, "limit": limit}

    def get_post_by_id(self, id, db):
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            return None
        user = self._resolve_user(db, post)
        return self._post_to_dict(post, user)

    def get_post_raw(self, id, db):
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