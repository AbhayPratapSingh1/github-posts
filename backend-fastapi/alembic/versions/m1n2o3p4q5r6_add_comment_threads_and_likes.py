"""add parent_id to comment and comment_like table

Revision ID: m1n2o3p4q5r6
Revises: l1m2n3o4p5q6
Create Date: 2026-09-13
"""
from alembic import op
import sqlalchemy as sa

revision = 'm1n2o3p4q5r6'
down_revision = 'l1m2n3o4p5q6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('comment', sa.Column('parent_id', sa.Integer(), nullable=True))
    op.create_index('ix_comment_parent_id', 'comment', ['parent_id'])

    op.create_table(
        'comment_like',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('comment_id', sa.Integer(), nullable=False, index=True),
        sa.Column('user_id', sa.Integer(), nullable=False, index=True),
        sa.Column('created_at', sa.String(), nullable=True),
        sa.UniqueConstraint('comment_id', 'user_id', name='uq_comment_like'),
    )


def downgrade() -> None:
    op.drop_table('comment_like')
    op.drop_index('ix_comment_parent_id', table_name='comment')
    op.drop_column('comment', 'parent_id')
