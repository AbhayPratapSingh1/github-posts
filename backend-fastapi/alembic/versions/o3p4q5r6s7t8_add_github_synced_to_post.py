"""add githubSynced to post

Revision ID: o3p4q5r6s7t8
Revises: n2o3p4q5r6s7
Create Date: 2026-09-15
"""
from alembic import op
import sqlalchemy as sa

revision = 'o3p4q5r6s7t8'
down_revision = 'n2o3p4q5r6s7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('post', sa.Column('githubSynced', sa.Boolean(), nullable=True, server_default=sa.false()))


def downgrade() -> None:
    op.drop_column('post', 'githubSynced')
