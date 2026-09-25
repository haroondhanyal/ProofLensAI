"""Add refresh sessions, password reset tokens, and audit events."""

revision = "0002_sessions_resets_audit"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade():
    from alembic import op
    from app.db.session import Base
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    from alembic import op
    op.drop_table("audit_logs")
    op.drop_table("password_reset_tokens")
    op.drop_table("auth_sessions")
