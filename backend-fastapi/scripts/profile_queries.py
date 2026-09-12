"""
Database Query Profiling Script

This script profiles the database queries for the Post API to identify
performance bottlenecks and measure query execution times.

Usage:
    python scripts/profile_queries.py [--iterations N]

Requirements:
    - Database must be running and accessible
    - Run from the backend-fastapi directory
"""

import sys
import os
import time
import statistics
from typing import List, Dict, Any

# Add the parent directory to the path so we can import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import text, func
from sqlalchemy.orm import Session
from database import SessionLocal
from app.models import Post, User, Like, Comment
from handler.postHandler import Post_handler


class QueryProfiler:
    def __init__(self):
        self.db = SessionLocal()
        self.handler = Post_handler()
        self.results = {}
    
    def close(self):
        self.db.close()
    
    def measure_query_time(self, query_func, iterations: int = 10) -> Dict[str, float]:
        """Measure query execution time over multiple iterations."""
        times = []
        for _ in range(iterations):
            start = time.perf_counter()
            result = query_func()
            end = time.perf_counter()
            times.append((end - start) * 1000)  # Convert to milliseconds
        
        return {
            "min_ms": min(times),
            "max_ms": max(times),
            "avg_ms": statistics.mean(times),
            "median_ms": statistics.median(times),
            "p95_ms": sorted(times)[int(len(times) * 0.95)] if len(times) >= 20 else max(times),
            "iterations": iterations,
            "result_count": len(result) if isinstance(result, list) else 1,
        }
    
    def profile_get_all_posts(self) -> Dict[str, Any]:
        """Profile the get_all_posts query."""
        print("\n=== Profiling get_all_posts() ===")
        
        def query_func():
            return self.handler.get_all_posts(self.db, offset=0, limit=12, user=None)
        
        stats = self.measure_query_time(query_func)
        
        # Get the actual SQL query
        like_stats = (
            self.db.query(
                Like.post_id.label("post_id"),
                func.count(Like.id).label("like_count"),
            )
            .group_by(Like.post_id)
            .subquery()
        )
        
        query = (
            self.db.query(
                Post.id,
                Post.user_id,
                Post.title,
                Post.shortDescription,
                Post.githubOwner,
                Post.created_at,
                Post.hosted,
                Post.github,
                Post.type,
                User.name.label("author_name"),
                User.username.label("author_username"),
                func.coalesce(like_stats.c.like_count, 0).label("like_count"),
            )
            .outerjoin(User, User.id == Post.user_id)
            .outerjoin(like_stats, like_stats.c.post_id == Post.id)
            .order_by(Post.created_at.desc().nullslast())
            .offset(0)
            .limit(12)
        )
        
        # Get the compiled SQL
        compiled = query.statement.compile(compile_kwargs={"literal_binds": True})
        sql_str = str(compiled)
        
        print(f"SQL Query:\n{sql_str[:500]}...")
        print(f"\nStats: {stats}")
        
        self.results["get_all_posts"] = {
            "stats": stats,
            "sql_preview": sql_str[:1000],
        }
        
        return stats
    
    def profile_search_posts(self) -> Dict[str, Any]:
        """Profile the search_posts query."""
        print("\n=== Profiling search_posts() ===")
        
        search_term = "test"
        
        def query_func():
            return self.handler.search_posts(self.db, search_term, user=None, offset=0, limit=12)
        
        stats = self.measure_query_time(query_func)
        
        print(f"\nStats: {stats}")
        
        self.results["search_posts"] = {
            "stats": stats,
            "search_term": search_term,
        }
        
        return stats
    
    def profile_get_liked_posts(self) -> Dict[str, Any]:
        """Profile the get_liked_posts query."""
        print("\n=== Profiling get_liked_posts() ===")
        
        # Create a test user for profiling
        test_user = self.db.query(User).first()
        if not test_user:
            print("No users in database, skipping get_liked_posts profiling")
            return None
        
        def query_func():
            return self.handler.get_liked_posts(self.db, test_user, limit=50)
        
        stats = self.measure_query_time(query_func)
        
        print(f"\nStats: {stats}")
        
        self.results["get_liked_posts"] = {
            "stats": stats,
            "user_id": test_user.id,
        }
        
        return stats
    
    def profile_get_all_users(self) -> Dict[str, Any]:
        """Profile the get_all_users query."""
        print("\n=== Profiling get_all_users() ===")
        
        def query_func():
            return self.handler.get_all_users(self.db)
        
        stats = self.measure_query_time(query_func)
        
        print(f"\nStats: {stats}")
        
        self.results["get_all_users"] = {
            "stats": stats,
        }
        
        return stats
    
    def get_database_info(self) -> Dict[str, Any]:
        """Get database information."""
        print("\n=== Database Information ===")
        
        # Check database engine
        engine_url = str(self.db.bind.url)
        db_type = "postgresql" if "postgresql" in engine_url else "sqlite" if "sqlite" in engine_url else "other"
        
        print(f"Database URL: {engine_url[:50]}...")
        print(f"Database Type: {db_type}")
        
        # Get table counts
        post_count = self.db.query(func.count(Post.id)).scalar()
        user_count = self.db.query(func.count(User.id)).scalar()
        like_count = self.db.query(func.count(Like.id)).scalar()
        comment_count = self.db.query(func.count(Comment.id)).scalar()
        
        print(f"\nTable Counts:")
        print(f"  Posts: {post_count}")
        print(f"  Users: {user_count}")
        print(f"  Likes: {like_count}")
        print(f"  Comments: {comment_count}")
        
        return {
            "db_type": db_type,
            "post_count": post_count,
            "user_count": user_count,
            "like_count": like_count,
            "comment_count": comment_count,
        }
    
    def analyze_indexes(self) -> Dict[str, Any]:
        """Analyze database indexes."""
        print("\n=== Index Analysis ===")
        
        # For PostgreSQL, we can query pg_indexes
        # For SQLite, we can query sqlite_master
        # For now, we'll just report what we know from the models
        
        indexes = {
            "post": [
                "PRIMARY KEY (id)",
                "ix_post_user_id (user_id)",
                "ix_post_created_at (created_at)",
            ],
            "user": [
                "PRIMARY KEY (id)",
                "UNIQUE (github_id)",
                "ix_user_username (username)",
            ],
            "comment": [
                "PRIMARY KEY (id)",
                "ix_comment_post_id (post_id)",
            ],
            "post_like": [
                "PRIMARY KEY (id)",
                "UNIQUE (post_id, user_id)",
                "ix_post_like_post_id (post_id)",
                "ix_post_like_user_id (user_id)",
                "ix_post_like_user_created (user_id, created_at, id)",
            ],
        }
        
        print("\nDefined Indexes:")
        for table, idx_list in indexes.items():
            print(f"\n  {table}:")
            for idx in idx_list:
                print(f"    - {idx}")
        
        return indexes
    
    def run_full_profile(self) -> Dict[str, Any]:
        """Run full profiling suite."""
        print("=" * 60)
        print("Database Query Profiling Report")
        print("=" * 60)
        
        db_info = self.get_database_info()
        indexes = self.analyze_indexes()
        
        # Profile each query
        get_all_posts_stats = self.profile_get_all_posts()
        search_posts_stats = self.profile_search_posts()
        get_liked_posts_stats = self.profile_get_liked_posts()
        get_all_users_stats = self.profile_get_all_users()
        
        # Summary
        print("\n" + "=" * 60)
        print("Summary")
        print("=" * 60)
        
        summary = {
            "database": db_info,
            "indexes": indexes,
            "query_profiles": self.results,
        }
        
        if get_all_posts_stats:
            print(f"\nget_all_posts(): {get_all_posts_stats['avg_ms']:.2f}ms avg")
        if search_posts_stats:
            print(f"search_posts(): {search_posts_stats['avg_ms']:.2f}ms avg")
        if get_liked_posts_stats:
            print(f"get_liked_posts(): {get_liked_posts_stats['avg_ms']:.2f}ms avg")
        if get_all_users_stats:
            print(f"get_all_users(): {get_all_users_stats['avg_ms']:.2f}ms avg")
        
        return summary


def main():
    iterations = 10
    if len(sys.argv) > 1 and sys.argv[1] == "--iterations":
        iterations = int(sys.argv[2])
    
    profiler = QueryProfiler()
    try:
        summary = profiler.run_full_profile()
        
        print("\n" + "=" * 60)
        print("Profiling complete!")
        print("=" * 60)
        
        # Recommendations
        print("\nRecommendations:")
        print("1. For production, consider adding EXPLAIN ANALYZE to slow queries")
        print("2. Monitor query performance under realistic data volumes")
        print("3. Check connection pooling settings for remote database")
        print("4. Consider adding pg_trgm indexes for text search if using PostgreSQL")
        
    finally:
        profiler.close()


if __name__ == "__main__":
    main()
