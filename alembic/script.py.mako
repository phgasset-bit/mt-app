"""${message if message else "empty message"}
Revision ID: ${up_revision}
Revises: ${down_revision if down_revision else None}
Create Date: ${create_date}

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '${up_revision}'
down_revision = ${repr(down_revision)}
branch_labels = ${repr(branch_labels)}
depends_on = ${repr(depends_on)}

def upgrade():
${(upgrades.replace('\n', '\n    ') if upgrades else '    pass')}


def downgrade():
${(downgrades.replace('\n', '\n    ') if downgrades else '    pass')}
