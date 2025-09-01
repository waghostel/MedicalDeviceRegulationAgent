"""
Database migration management using Alembic
"""

import asyncio
import logging
from pathlib import Path
from typing import Optional

from alembic import command
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from alembic.script import ScriptDirectory
from sqlalchemy import pool
from sqlalchemy.ext.asyncio import create_async_engine

from .config import get_database_config

logger = logging.getLogger(__name__)


class MigrationManager:
    """Database migration manager using Alembic"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.db_config = get_database_config()
        self.config_path = config_path or "alembic.ini"
        self.alembic_config = self._get_alembic_config()
    
    def _get_alembic_config(self) -> Config:
        """Get Alembic configuration"""
        config = Config(self.config_path)
        config.set_main_option("sqlalchemy.url", self.db_config.database_url.replace("+aiosqlite", ""))
        return config
    
    def create_migration(self, message: str, autogenerate: bool = True) -> None:
        """Create a new migration"""
        try:
            command.revision(
                self.alembic_config,
                message=message,
                autogenerate=autogenerate
            )
            logger.info(f"Created migration: {message}")
        except Exception as e:
            logger.error(f"Failed to create migration: {e}")
            raise
    
    def upgrade_database(self, revision: str = "head") -> None:
        """Upgrade database to specified revision"""
        try:
            command.upgrade(self.alembic_config, revision)
            logger.info(f"Database upgraded to revision: {revision}")
        except Exception as e:
            logger.error(f"Failed to upgrade database: {e}")
            raise
    
    def downgrade_database(self, revision: str) -> None:
        """Downgrade database to specified revision"""
        try:
            command.downgrade(self.alembic_config, revision)
            logger.info(f"Database downgraded to revision: {revision}")
        except Exception as e:
            logger.error(f"Failed to downgrade database: {e}")
            raise
    
    def get_current_revision(self) -> Optional[str]:
        """Get current database revision"""
        try:
            # Create synchronous engine for Alembic
            sync_url = self.db_config.database_url.replace("+aiosqlite", "")
            engine = create_async_engine(sync_url).sync_engine
            
            with engine.connect() as connection:
                context = MigrationContext.configure(connection)
                return context.get_current_revision()
        except Exception as e:
            logger.error(f"Failed to get current revision: {e}")
            return None
    
    def get_migration_history(self) -> list[str]:
        """Get migration history"""
        try:
            script = ScriptDirectory.from_config(self.alembic_config)
            revisions = []
            for revision in script.walk_revisions():
                revisions.append(f"{revision.revision}: {revision.doc}")
            return revisions
        except Exception as e:
            logger.error(f"Failed to get migration history: {e}")
            return []
    
    def initialize_alembic(self) -> None:
        """Initialize Alembic in the project"""
        try:
            command.init(self.alembic_config, self.db_config.migration_directory)
            logger.info("Alembic initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Alembic: {e}")
            raise


# Convenience functions
def run_migrations(revision: str = "head") -> None:
    """Run database migrations"""
    manager = MigrationManager()
    manager.upgrade_database(revision)


def create_migration(message: str, autogenerate: bool = True) -> None:
    """Create a new migration"""
    manager = MigrationManager()
    manager.create_migration(message, autogenerate)