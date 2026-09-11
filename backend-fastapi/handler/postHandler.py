from app.models import Post, User, Like
from sqlalchemy import func, case, literal

class Post_handler:
    def __init__(self):
        pass

    def _post_list_columns(self):
        return (
            Post.id,
            Post.user_id,
            Post.title,
            Post.shortDescription,
            Post.githubOwner,
            Post.created_at,
            Post.hosted,
            Post.github,
            Post.type,
        )

    def _post_to_dict(self, post, user=None, like_count=0, liked=False):
        return {
            "id": getattr(post, "id", None),
            "user_id": getattr(post, "user_id", None),
            "title": getattr(post, "title", None),
            "type": getattr(post, "type", None),
            "shortDescription": getattr(post, "shortDescription", None),
            "hosted": getattr(post, "hosted", None),
            "availableAt": getattr(post, "availableAt", None),
            "description": getattr(post, "description", None),
            "github": getattr(post, "github", None),
            "dateOfCreation": getattr(post, "dateOfCreation", None),
            "language": getattr(post, "language", None),
            "lastPushAt": getattr(post, "lastPushAt", None),
            "defaultBranch": getattr(post, "defaultBranch", None),
            "stats": getattr(post, "stats", None),
            "githubOwner": getattr(post, "githubOwner", None),
            "created_at": getattr(post, "created_at", None),
            "updated_at": getattr(post, "updated_at", None),
            "authorName": user.name if user else None,
            "authorUsername": user.username if user else None,
            "likeCount": like_count,
            "liked": liked,
        }

    def _resolve_user(self, db, post):
        user_id = getattr(post, "user_id", None)
        github_owner = getattr(post, "githubOwner", None)
        if user_id:
            return db.query(User).filter(User.id == user_id).first()
        if github_owner:
            return db.query(User).filter(User.username == github_owner).first()
        return None

    def _like_info(self, db, post, user):
        like_count = db.query(Like).filter(Like.post_id == post.id).count()
        liked = False
        if user is not None:
            liked = (
                db.query(Like)
                .filter(Like.post_id == post.id, Like.user_id == user.id)
                .first()
                is not None
            )
        return like_count, liked

    def get_all_posts(self, db, offset=0, limit=12, user=None):
        like_stats = (
            db.query(
                Like.post_id.label("post_id"),
                func.count(Like.id).label("like_count"),
                (
                    func.max(
                        case(
                            (Like.user_id == user.id, 1),
                            else_=0,
                        )
                    )
                    if user
                    else literal(0)
                ).label("liked"),
            )
            .group_by(Like.post_id)
            .subquery()
        )

        query = (
            db.query(
                *self._post_list_columns(),
                User.name.label("author_name"),
                User.username.label("author_username"),
                func.coalesce(like_stats.c.like_count, 0).label("like_count"),
                func.coalesce(like_stats.c.liked, 0).label("liked"),
            )
            .outerjoin(User, User.id == Post.user_id)
            .outerjoin(
                like_stats,
                like_stats.c.post_id == Post.id,
            )
            .order_by(
                Post.created_at.desc().nullslast()
            )
            .offset(offset)
            .limit(limit)
        )

        rows = query.all()

        result = []

        for row in rows:
            result.append({
                "id": row.id,
                "user_id": row.user_id,
                "title": row.title,
                "type": row.type,
                "shortDescription": row.shortDescription,
                "hosted": row.hosted,
                "github": row.github,
                "githubOwner": row.githubOwner,
                "created_at": row.created_at,
                "authorName": row.author_name,
                "authorUsername": row.author_username,
                "likeCount": row.like_count,
                "liked": bool(row.liked)
            })
            
        total = db.query(func.count(Post.id)).scalar()

        return {
            "posts": result,
            "total": total,
            "offset": offset,
            "limit": limit,
        }
    
    def search_posts(self, db, query, user=None, offset=0, limit=12):
        like = f"%{query}%"
        title_q = db.query(*self._post_list_columns()).filter(
            Post.title.ilike(like)
        ).order_by(Post.created_at.desc().nullslast())
        title_total = title_q.count()
        title_matches = title_q.offset(offset).limit(limit).all()
        if title_total >= 3:
            total = title_total
            results = title_matches
        else:
            desc_q = db.query(*self._post_list_columns()).filter(
                Post.shortDescription.ilike(like)
            ).order_by(Post.created_at.desc().nullslast())
            desc_total = desc_q.count()
            desc_matches = desc_q.all()
            seen = {p.id for p in title_matches}
            all_matches = title_matches + [p for p in desc_matches if p.id not in seen]
            total = title_total + desc_total - len(seen)
            results = all_matches[offset:offset + limit]
        result = []
        for post in results:
            author = self._resolve_user(db, post)
            like_count, liked = self._like_info(db, post, user)
            result.append(self._post_to_dict(post, author, like_count, liked))
        return {"posts": result, "total": total, "offset": offset, "limit": limit}

    def get_post_by_id(self, id, db, user=None):
        post = db.query(Post).filter(Post.id == id).first()
        if not post:
            return None
        author = self._resolve_user(db, post)
        like_count, liked = self._like_info(db, post, user)
        return self._post_to_dict(post, author, like_count, liked)

    def get_liked_posts(self, db, user, limit=50):
        likes = (
            db.query(Like.post_id)
            .filter(Like.user_id == user.id)
            .order_by(Like.created_at.desc(), Like.id.desc())
            .limit(limit)
            .all()
        )
        result = []
        for like in likes:
            post = db.query(*self._post_list_columns()).filter(
                Post.id == like.post_id
            ).first()
            if not post:
                continue
            author = self._resolve_user(db, post)
            like_count, liked = self._like_info(db, post, user)
            result.append(self._post_to_dict(post, author, like_count, liked))
        return {"posts": result, "total": len(result)}

    def get_post_raw(self, id, db):
        return db.query(Post).filter(Post.id == id).first()

    def get_all_users(self, db):
        users = db.query(User).order_by(User.id.desc()).all()
        result = []
        for u in users:
            post_count = db.query(Post).filter(Post.user_id == u.id).count()
            result.append({
                "id": u.id,
                "github_id": u.github_id,
                "username": u.username,
                "name": u.name,
                "avatar_url": u.avatar_url,
                "bio": u.bio,
                "created_at": u.created_at,
                "postCount": post_count,
            })
        return {"users": result, "total": len(result)}

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