"""Add editable profile contact and avatar fields."""

from alembic import op
import sqlalchemy as sa


revision = "0003_profile_fields"
down_revision = "0002_sessions_resets_audit"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("phone", sa.String(length=40), nullable=True))
    op.add_column("users", sa.Column("avatar_data", sa.LargeBinary(), nullable=True))


def downgrade():
    op.drop_column("users", "avatar_data")
    op.drop_column("users", "phone")
