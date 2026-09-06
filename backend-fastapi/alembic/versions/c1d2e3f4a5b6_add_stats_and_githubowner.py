"""Add stats and githubOwner columns

Revision ID: c1d2e3f4a5b6
Revises: b6755bd8cbe8
Create Date: 2026-08-29 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1d2e3f4a5b6'
down_revision: Union[str, Sequence[str], None] = 'b6755bd8cbe8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('post', sa.Column('stats', sa.JSON(), nullable=True))
    op.add_column('post', sa.Column('githubOwner', sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column('post', 'githubOwner')
    op.drop_column('post', 'stats')
