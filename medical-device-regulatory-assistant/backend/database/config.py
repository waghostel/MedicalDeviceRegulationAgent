"""
Database configuration settings
"""

import os
from pathlib import Path
from typing import Optional
from pydantic import Field
from pydantic_settings import BaseSettings


class DatabaseConfig(BaseSettings):
    """Database configuration settings"""
    
    # SQLite database settings
    database_url: str = Field(
        default="sqlite+aiosqlite:///./medical_device_assistant.db",
        description="Database connection URL"
    )
    database_path: Optional[Path] = Field(
        default=None,
        description="Path to SQLite database file"
    )
    
    # Connection pool settings
    pool_size: int = Field(default=5, description="Database connection pool size")
    max_overflow: int = Field(default=10, description="Maximum connection overflow")
    pool_timeout: int = Field(default=30, description="Connection pool timeout in seconds")
    pool_recycle: int = Field(default=3600, description="Connection recycle time in seconds")
    
    # Migration settings
    migration_directory: str = Field(
        default="migrations",
        description="Directory for database migrations"
    )
    
    # Backup settings
    backup_directory: str = Field(
        default="backups",
        description="Directory for database backups"
    )
    auto_backup: bool = Field(
        default=True,
        description="Enable automatic database backups"
    )
    backup_retention_days: int = Field(
        default=30,
        description="Number of days to retain backups"
    )
    
    model_config = {
        "env_file": ".env",
        "env_prefix": "DB_"
    }
        
    def model_post_init(self, __context) -> None:
        """Post-initialization processing"""
        if self.database_url and isinstance(self.database_url, str) and self.database_url.startswith("sqlite"):
            # Extract database path from URL for SQLite
            if ":///" in self.database_url:
                path_part = self.database_url.split("///")[1]
                self.database_path = Path(path_part)


def get_database_config() -> DatabaseConfig:
    """Get database configuration instance"""
    return DatabaseConfig()