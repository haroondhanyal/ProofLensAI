"""Add user-configurable scan retention."""

from alembic import op
import sqlalchemy as sa


revision = "0004_scan_retention"
down_revision = "0003_profile_fields"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    inspector = sa.inspect(connection)
    existing = {column["name"] for column in inspector.get_columns("users")}
    if "scan_retention_days" not in existing:
        op.add_column("users", sa.Column("scan_retention_days", sa.Integer(), nullable=True, server_default="365"))

    # SQLite cannot ALTER COLUMN to remove a server default. Keeping the same
    # 365-day default is equivalent to the ORM default and preserves old rows.
    if connection.dialect.name != "sqlite":
        op.alter_column("users", "scan_retention_days", server_default=None)


def downgrade():
    op.drop_column("users", "scan_retention_days")
