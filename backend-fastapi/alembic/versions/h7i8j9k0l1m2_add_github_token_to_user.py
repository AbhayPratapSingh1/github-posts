"""add github_token to user

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-09-08
"""
from alembic import op
import sqlalchemy as sa

revision = 'h7i8j9k0l1m2'
down_revision = 'g6h7i8j9k0l1'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS github_token VARCHAR')

def downgrade():
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS github_token')
