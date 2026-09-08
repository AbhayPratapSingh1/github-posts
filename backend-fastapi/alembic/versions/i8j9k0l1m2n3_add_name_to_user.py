"""add name column to user

Revision ID: i8j9k0l1m2n3
Revises: h7i8j9k0l1m2
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa

revision = 'i8j9k0l1m2n3'
down_revision = 'h7i8j9k0l1m2'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE "user" ADD COLUMN IF NOT EXISTS name VARCHAR')

def downgrade():
    op.execute('ALTER TABLE "user" DROP COLUMN IF EXISTS name')
