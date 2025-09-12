"""Add ACTIVE status to ProjectStatus enum

Revision ID: 8d03117a1704
Revises: cc27707fe289
Create Date: 2025-09-12 21:21:08.222675

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '8d03117a1704'
down_revision: Union[str, None] = 'cc27707fe289'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ### Custom migration for SQLite enum change ###
    
    # For SQLite, we need to recreate the table to modify the enum
    # This is because SQLite doesn't support ALTER TYPE directly
    
    # Step 1: Create new enum type with ACTIVE status
    # Note: SQLite doesn't have native enum types, so this is handled by the ORM
    
    # Step 2: For SQLite, the enum constraint is handled at the application level
    # The new ACTIVE status will be available once the model is updated
    
    # Step 3: Recreate indexes that were dropped (these are from previous migration issues)
    try:
        op.create_index('idx_agent_interactions_agent_action', 'agent_interactions', ['agent_action'])
        op.create_index('idx_agent_interactions_created_at', 'agent_interactions', ['created_at'])
        op.create_index('idx_agent_interactions_project_id', 'agent_interactions', ['project_id'])
        op.create_index('idx_device_classifications_device_class', 'device_classifications', ['device_class'])
        op.create_index('idx_device_classifications_product_code', 'device_classifications', ['product_code'])
        op.create_index('idx_device_classifications_project_id', 'device_classifications', ['project_id'])
        op.create_index('idx_predicate_devices_is_selected', 'predicate_devices', ['is_selected'])
        op.create_index('idx_predicate_devices_k_number', 'predicate_devices', ['k_number'])
        op.create_index('idx_predicate_devices_product_code', 'predicate_devices', ['product_code'])
        op.create_index('idx_predicate_devices_project_id', 'predicate_devices', ['project_id'])
    except Exception as e:
        # Indexes might already exist, continue
        print(f"Note: Some indexes may already exist: {e}")
    
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### Downgrade: Remove ACTIVE status from ProjectStatus enum ###
    
    # For SQLite, we would need to:
    # 1. Update any existing records with ACTIVE status to a different status
    # 2. The enum constraint is handled at the application level
    
    # Note: This downgrade assumes no data uses ACTIVE status
    # In production, you would need to migrate data first
    
    # Drop indexes (reverse of upgrade)
    try:
        op.drop_index('idx_predicate_devices_project_id', table_name='predicate_devices')
        op.drop_index('idx_predicate_devices_product_code', table_name='predicate_devices')
        op.drop_index('idx_predicate_devices_k_number', table_name='predicate_devices')
        op.drop_index('idx_predicate_devices_is_selected', table_name='predicate_devices')
        op.drop_index('idx_device_classifications_project_id', table_name='device_classifications')
        op.drop_index('idx_device_classifications_product_code', table_name='device_classifications')
        op.drop_index('idx_device_classifications_device_class', table_name='device_classifications')
        op.drop_index('idx_agent_interactions_project_id', table_name='agent_interactions')
        op.drop_index('idx_agent_interactions_created_at', table_name='agent_interactions')
        op.drop_index('idx_agent_interactions_agent_action', table_name='agent_interactions')
    except Exception as e:
        # Indexes might not exist, continue
        print(f"Note: Some indexes may not exist during downgrade: {e}")
    
    # ### end Alembic commands ###