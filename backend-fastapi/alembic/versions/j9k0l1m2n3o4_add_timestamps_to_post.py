"""add created_at and updated_at to post

Revision ID: j9k0l1m2n3o4
Revises: i8j9k0l1m2n3
Create Date: 2026-09-09
"""
from alembic import op
import sqlalchemy as sa

revision = 'j9k0l1m2n3o4'
down_revision = 'i8j9k0l1m2n3'
branch_labels = None
depends_on = None

def upgrade():
    op.execute('ALTER TABLE "post" ADD COLUMN IF NOT EXISTS created_at VARCHAR')
    op.execute('ALTER TABLE "post" ADD COLUMN IF NOT EXISTS updated_at VARCHAR')

def downgrade():
    op.execute('ALTER TABLE "post" DROP COLUMN IF EXISTS created_at')
    op.execute('ALTER TABLE "post" DROP COLUMN IF EXISTS updated_at')
