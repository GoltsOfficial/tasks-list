"""add owner_id to tasks

Revision ID: 084795bc6d55
Revises: c80595aee7a0
Create Date: 2026-11-23 19:35:58.777347

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '084795bc6d55'
down_revision: Union[str, Sequence[str], None] = 'c80595aee7a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("tasks", sa.Column("owner_id", sa.Integer(), nullable=False))
    op.create_foreign_key(
        "fk_tasks_owner_id_users", "tasks", "users", ["owner_id"], ["id"]
    )


def downgrade() -> None:
    op.drop_constraint("fk_tasks_owner_id_users", "tasks", type_="foreignkey")
    op.drop_column("tasks", "owner_id")
