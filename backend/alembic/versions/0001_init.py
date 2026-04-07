"""init

Revision ID: 0001
Revises:
Create Date: 2026-04-06
"""

from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # users
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("telegram_id", sa.BigInteger(), nullable=False),
        sa.Column("username", sa.String(64), nullable=True),
        sa.Column("first_name", sa.String(128), nullable=True),
        sa.Column("last_name", sa.String(128), nullable=True),
        sa.Column("avatar_url", sa.String(512), nullable=True),
        sa.Column("role", sa.String(16), nullable=False, server_default="user"),
        sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("last_activity_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_users_telegram_id", "users", ["telegram_id"], unique=True)

    # scenarios
    op.create_table(
        "scenarios",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("difficulty", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="50"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # scenario_steps
    op.create_table(
        "scenario_steps",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("scenario_id", sa.Integer(),
                  sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("prompt", sa.Text(), nullable=False),
        sa.Column("choices", sa.JSON(), nullable=True),
        sa.Column("correct_answer", sa.Text(), nullable=True),
    )

    # user_progress
    op.create_table(
        "user_progress",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scenario_id", sa.Integer(),
                  sa.ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False),
        sa.Column("current_step", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(16), nullable=False, server_default="in_progress"),
        sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )

    # leaderboard
    op.create_table(
        "leaderboard",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("total_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("scenarios_completed", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("games_played", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
        sa.UniqueConstraint("user_id"),
    )

    # games
    op.create_table(
        "games",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(),
                  sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("game_type", sa.String(64), nullable=False),
        sa.Column("score", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("xp_earned", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("played_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )

    # quizzes
    op.create_table(
        "quizzes",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("title", sa.String(256), nullable=False),
        sa.Column("scheduled_date", sa.Date(), nullable=True),
        sa.Column("is_daily", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="20"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.text("now()")),
    )
    op.create_index("ix_quizzes_scheduled_date", "quizzes", ["scheduled_date"])

    # quiz_questions
    op.create_table(
        "quiz_questions",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("quiz_id", sa.Integer(),
                  sa.ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=False),
        sa.Column("order", sa.Integer(), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("options", sa.JSON(), nullable=False),
        sa.Column("correct_index", sa.Integer(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("quiz_questions")
    op.drop_table("quizzes")
    op.drop_table("games")
    op.drop_table("leaderboard")
    op.drop_table("user_progress")
    op.drop_table("scenario_steps")
    op.drop_table("scenarios")
    op.drop_index("ix_users_telegram_id", "users")
    op.drop_table("users")
