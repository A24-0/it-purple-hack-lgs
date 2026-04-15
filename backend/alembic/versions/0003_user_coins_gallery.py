"""user coins, today_xp tracking, profile photo gallery

Revision ID: 0003
Revises: 0002
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("coins", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("today_xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("today_xp_date", sa.Date(), nullable=True))
    op.add_column(
        "users",
        sa.Column("profile_photos", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "profile_photos")
    op.drop_column("users", "today_xp_date")
    op.drop_column("users", "today_xp")
    op.drop_column("users", "coins")
