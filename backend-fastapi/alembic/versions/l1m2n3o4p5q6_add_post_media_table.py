"""add post_media table

Revision ID: l1m2n3o4p5q6
Revises: k0l1m2n3o4p5
Create Date: 2026-09-12
"""
from alembic import op
import sqlalchemy as sa

revision = 'l1m2n3o4p5q6'
down_revision = 'k0l1m2n3o4p5'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('post_media',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('post_id', sa.String(), nullable=False),
    sa.Column('client_media_id', sa.String(), nullable=False),
    sa.Column('type', sa.String(), nullable=False),
    sa.Column('status', sa.String(), nullable=False, server_default='pending'),
    sa.Column('mime_type', sa.String(), nullable=True),
    sa.Column('file_size', sa.Integer(), nullable=True),
    sa.Column('original_filename', sa.String(), nullable=True),
    sa.Column('cloudinary_public_id', sa.String(), nullable=True),
    sa.Column('cloudinary_resource_type', sa.String(), nullable=True),
    sa.Column('cloudinary_url', sa.String(), nullable=True),
    sa.Column('cloudinary_secure_url', sa.String(), nullable=True),
    sa.Column('created_at', sa.String(), nullable=True),
    sa.Column('updated_at', sa.String(), nullable=True),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('post_id', 'client_media_id', name='uq_post_media_client')
    )
    op.create_index('ix_post_media_post_id', 'post_media', ['post_id'], if_not_exists=True)
    op.create_index('ix_post_media_status', 'post_media', ['status'], if_not_exists=True)

def downgrade():
    op.drop_index('ix_post_media_status', table_name='post_media')
    op.drop_index('ix_post_media_post_id', table_name='post_media')
    op.drop_table('post_media')
