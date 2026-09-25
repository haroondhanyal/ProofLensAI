"""Initial ProofLens account, scan, and evidence tables."""

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    from alembic import op
    from app.db.session import Base
    from app import models  # noqa: F401
    Base.metadata.create_all(bind=op.get_bind())


def downgrade():
    from alembic import op
    from app.db.session import Base
    from app import models  # noqa: F401
    Base.metadata.drop_all(bind=op.get_bind())
