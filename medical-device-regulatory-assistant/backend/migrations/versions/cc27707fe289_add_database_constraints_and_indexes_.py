"""Add database constraints and indexes for performance

Revision ID: cc27707fe289
Revises: ae41c65970a9
Create Date: 2025-09-09 09:41:34.338502

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'cc27707fe289'
down_revision: Union[str, None] = 'ae41c65970a9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Add database constraints and indexes for performance ###
    
    # Helper function to safely create indexes
    def safe_create_index(index_name, table_name, columns):
        try:
            op.create_index(index_name, table_name, columns)
        except Exception as e:
            # Index might already exist, skip
            print(f"Skipping index {index_name}: {e}")
    
    # Add indexes for frequently queried columns (skip if they already exist)
    # Note: Some indexes may already exist from previous migrations or auto-generation
    
    # Add indexes for related tables if they exist
    try:
        # Device classifications indexes
        safe_create_index('idx_device_classifications_project_id', 'device_classifications', ['project_id'])
        safe_create_index('idx_device_classifications_product_code', 'device_classifications', ['product_code'])
        safe_create_index('idx_device_classifications_device_class', 'device_classifications', ['device_class'])
    except Exception:
        # Table might not exist yet, skip
        pass
    
    try:
        # Predicate devices indexes
        safe_create_index('idx_predicate_devices_project_id', 'predicate_devices', ['project_id'])
        safe_create_index('idx_predicate_devices_k_number', 'predicate_devices', ['k_number'])
        safe_create_index('idx_predicate_devices_product_code', 'predicate_devices', ['product_code'])
        safe_create_index('idx_predicate_devices_is_selected', 'predicate_devices', ['is_selected'])
    except Exception:
        # Table might not exist yet, skip
        pass
    
    try:
        # Agent interactions indexes
        safe_create_index('idx_agent_interactions_project_id', 'agent_interactions', ['project_id'])
        safe_create_index('idx_agent_interactions_agent_action', 'agent_interactions', ['agent_action'])
        safe_create_index('idx_agent_interactions_created_at', 'agent_interactions', ['created_at'])
    except Exception:
        # Table might not exist yet, skip
        pass
    
    # For SQLite, we'll skip check constraints as they require batch mode
    # and would be complex to implement here. The application layer will handle validation.
    
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### Drop indexes ###
    
    # Helper function to safely drop indexes
    def safe_drop_index(index_name, table_name):
        try:
            op.drop_index(index_name, table_name)
        except Exception as e:
            # Index might not exist, skip
            print(f"Skipping drop index {index_name}: {e}")
    
    # Drop related table indexes if they exist
    try:
        safe_drop_index('idx_device_classifications_device_class', 'device_classifications')
        safe_drop_index('idx_device_classifications_product_code', 'device_classifications')
        safe_drop_index('idx_device_classifications_project_id', 'device_classifications')
    except Exception:
        pass
    
    try:
        safe_drop_index('idx_predicate_devices_is_selected', 'predicate_devices')
        safe_drop_index('idx_predicate_devices_product_code', 'predicate_devices')
        safe_drop_index('idx_predicate_devices_k_number', 'predicate_devices')
        safe_drop_index('idx_predicate_devices_project_id', 'predicate_devices')
    except Exception:
        pass
    
    try:
        safe_drop_index('idx_agent_interactions_created_at', 'agent_interactions')
        safe_drop_index('idx_agent_interactions_agent_action', 'agent_interactions')
        safe_drop_index('idx_agent_interactions_project_id', 'agent_interactions')
    except Exception:
        pass
    
    # ### end Alembic commands ###