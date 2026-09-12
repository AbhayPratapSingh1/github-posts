from app.models import Post, User, Like, Comment
from sqlalchemy import exists, func, case, literal, select

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

    def get_all_posts(self, db, offset=0, limit=12, user=None, sort="newest"):
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

        if sort == "oldest":
            order = Post.created_at.asc().nullslast()
        elif sort == "most_liked":
            order = func.coalesce(like_stats.c.like_count, 0).desc()
        else:
            order = Post.created_at.desc().nullslast()

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
            .order_by(order)
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
    
    def search_posts(self, db, query, user=None, offset=0, limit=12, sort="newest"):
        like = f"%{query}%"
        
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

        search_filter = Post.title.ilike(like) | Post.shortDescription.ilike(like)

        if sort == "oldest":
            order = Post.created_at.asc().nullslast()
        elif sort == "most_liked":
            order = func.coalesce(like_stats.c.like_count, 0).desc()
        else:
            order = Post.created_at.desc().nullslast()
        
        query_result = (
            db.query(
                *self._post_list_columns(),
                User.name.label("author_name"),
                User.username.label("author_username"),
                func.coalesce(like_stats.c.like_count, 0).label("like_count"),
                func.coalesce(like_stats.c.liked, 0).label("liked"),
            )
            .outerjoin(User, User.id == Post.user_id)
            .outerjoin(like_stats, like_stats.c.post_id == Post.id)
            .filter(search_filter)
            .order_by(order)
            .offset(offset)
            .limit(limit)
        )

        rows = query_result.all()
        
        total_query = (
            db.query(func.count(Post.id))
            .filter(search_filter)
        )
        total = total_query.scalar()

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
        
        return {"posts": result, "total": total, "offset": offset, "limit": limit}

    def get_post_by_id(self, id, db, user=None):

        if user:
            liked_expr = exists(
                select(Like.id).where(
                    (Like.post_id == Post.id) &
                    (Like.user_id == user.id)
                ).correlate(Post)
            )
        else:
            liked_expr = literal(False)
        result = (
            db.query(
                Post,
                User,
                func.count(Like.id).label("like_count"),
                liked_expr.label("liked"),
            )
            .join(User, User.id == Post.user_id)
            .outerjoin(Like, Like.post_id == Post.id)
            .filter(Post.id == id)
            .group_by(Post.id, User.id)
            .first()
        )

        if not result:
            return None

        post, author, like_count, liked = result

        result = self._post_to_dict(
            post,
            author,
            int(like_count or 0),
            bool(liked),
        )
        comments_raw = (
            db.query(
                Comment.id,
                Comment.user_id,
                Comment.content,
                Comment.is_deleted,
                Comment.created_at,
                Comment.updated_at,
                User.github_id,
                User.username,
                User.name,
                User.avatar_url,
            )
            .join(User, User.id == Comment.user_id)
            .filter(Comment.post_id == id)
            .order_by(Comment.created_at.desc())
            .limit(6)
            .all()
        )

        comments = [
            {
                "id": comment_id,
                "user_id": comment_user_id,
                "github_id": github_id,
                "username": username,
                "name": name or "",
                "avatar_url": avatar_url,
                "content": "" if is_deleted else content,
                "is_deleted": bool(is_deleted),
                "created_at": created_at,
                "updated_at": updated_at,
            }
            for (
                comment_id,
                comment_user_id,
                content,
                is_deleted,
                created_at,
                updated_at,
                github_id,
                username,
                name,
                avatar_url,
            ) in comments_raw
        ]

        result["comments"] = comments[:5]
        result["has_more_comments"] = len(comments) == 6

        return result

    def get_liked_posts(self, db, user, limit=50):
        like_stats = (
            db.query(
                Like.post_id.label("post_id"),
                func.count(Like.id).label("like_count"),
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
            )
            .join(Like, Like.post_id == Post.id)
            .filter(Like.user_id == user.id)
            .outerjoin(User, User.id == Post.user_id)
            .outerjoin(like_stats, like_stats.c.post_id == Post.id)
            .order_by(Like.created_at.desc(), Like.id.desc())
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
                "liked": True
            })
        
        return {"posts": result, "total": len(result)}

    def get_post_raw(self, id, db):
        return db.query(Post).filter(Post.id == id).first()

    def get_all_users(self, db):
        post_counts = (
            db.query(
                Post.user_id.label("user_id"),
                func.count(Post.id).label("post_count")
            )
            .group_by(Post.user_id)
            .subquery()
        )

        users = (
            db.query(
                User,
                func.coalesce(post_counts.c.post_count, 0).label("post_count")
            )
            .outerjoin(post_counts, post_counts.c.user_id == User.id)
            .order_by(User.id.desc())
            .all()
        )

        result = []
        for user, post_count in users:
            result.append({
                "id": user.id,
                "github_id": user.github_id,
                "username": user.username,
                "name": user.name,
                "avatar_url": user.avatar_url,
                "bio": user.bio,
                "created_at": user.created_at,
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