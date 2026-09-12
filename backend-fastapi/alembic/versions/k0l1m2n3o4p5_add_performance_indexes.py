"""add performance indexes

Revision ID: k0l1m2n3o4p5
Revises: j9k0l1m2n3o4
Create Date: 2026-09-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'k0l1m2n3o4p5'
down_revision = 'j9k0l1m2n3o4'
branch_labels = None
depends_on = None

def upgrade():
    # Post indexes
    op.create_index('ix_post_user_id', 'post', ['user_id'], if_not_exists=True)
    op.create_index('ix_post_created_at', 'post', ['created_at'], if_not_exists=True)
    
    # User indexes
    op.create_index('ix_user_username', 'user', ['username'], unique=True, if_not_exists=True)
    
    # Comment indexes
    op.create_index('ix_comment_post_id', 'comment', ['post_id'], if_not_exists=True)
    
    # Like indexes
    op.create_index('ix_post_like_post_id', 'post_like', ['post_id'], if_not_exists=True)
    op.create_index('ix_post_like_user_id', 'post_like', ['user_id'], if_not_exists=True)
    op.create_index('ix_post_like_user_created', 'post_like', ['user_id', 'created_at', 'id'], if_not_exists=True)

def downgrade():
    op.drop_index('ix_post_like_user_created', table_name='post_like', if_exists=True)
    op.drop_index('ix_post_like_user_id', table_name='post_like', if_exists=True)
    op.drop_index('ix_post_like_post_id', table_name='post_like', if_exists=True)
    op.drop_index('ix_comment_post_id', table_name='comment', if_exists=True)
    op.drop_index('ix_user_username', table_name='user', if_exists=True)
    op.drop_index('ix_post_created_at', table_name='post', if_exists=True)
    op.drop_index('ix_post_user_id', table_name='post', if_exists=True)
