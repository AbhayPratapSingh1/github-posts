"""add is_deleted to comment

Revision ID: a1b2c3d4e5f6
Revises: 4953b631f4ff
Create Date: 2026-09-10 09:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '4953b631f4ff'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('comment', sa.Column('is_deleted', sa.Boolean(), nullable=True, server_default=sa.text('FALSE')))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('comment', 'is_deleted')