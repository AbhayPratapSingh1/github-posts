"""add feedback table

Revision ID: n2o3p4q5r6s7
Revises: m1n2o3p4q5r6
Create Date: 2026-09-13
"""
from alembic import op
import sqlalchemy as sa

revision = 'n2o3p4q5r6s7'
down_revision = 'm1n2o3p4q5r6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'feedback',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('user_id', sa.Integer(), nullable=True, index=True),
        sa.Column('content', sa.String(), nullable=False),
        sa.Column('category', sa.String(), nullable=False, server_default='general'),
        sa.Column('is_anonymous', sa.Boolean(), server_default='false'),
        sa.Column('created_at', sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_table('feedback')
