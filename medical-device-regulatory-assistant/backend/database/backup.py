"""
Database backup and restore functionality
"""

import asyncio
import logging
import shutil
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import List, Optional

from .config import get_database_config

logger = logging.getLogger(__name__)


class DatabaseBackupManager:
    """Database backup and restore manager"""
    
    def __init__(self):
        self.config = get_database_config()
        self.backup_dir = Path(self.config.backup_directory)
        self.backup_dir.mkdir(exist_ok=True)
    
    def create_backup(self, backup_name: Optional[str] = None) -> Path:
        """Create a database backup"""
        if not self.config.database_path or not self.config.database_path.exists():
            raise FileNotFoundError("Database file not found")
        
        if backup_name is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_name = f"backup_{timestamp}.db"
        
        backup_path = self.backup_dir / backup_name
        
        try:
            # For SQLite, use the backup API for consistency
            if self.config.database_url.startswith("sqlite"):
                self._sqlite_backup(self.config.database_path, backup_path)
            else:
                # For other databases, use file copy as fallback
                shutil.copy2(self.config.database_path, backup_path)
            
            logger.info(f"Database backup created: {backup_path}")
            return backup_path
            
        except Exception as e:
            logger.error(f"Failed to create backup: {e}")
            raise
    
    def _sqlite_backup(self, source_path: Path, backup_path: Path) -> None:
        """Create SQLite backup using the backup API"""
        source_conn = sqlite3.connect(str(source_path))
        backup_conn = sqlite3.connect(str(backup_path))
        
        try:
            source_conn.backup(backup_conn)
        finally:
            source_conn.close()
            backup_conn.close()
    
    def restore_backup(self, backup_path: Path) -> None:
        """Restore database from backup"""
        if not backup_path.exists():
            raise FileNotFoundError(f"Backup file not found: {backup_path}")
        
        if not self.config.database_path:
            raise ValueError("Database path not configured")
        
        try:
            # Create a backup of current database before restore
            current_backup = self.create_backup("pre_restore_backup.db")
            logger.info(f"Current database backed up to: {current_backup}")
            
            # Restore from backup
            shutil.copy2(backup_path, self.config.database_path)
            logger.info(f"Database restored from: {backup_path}")
            
        except Exception as e:
            logger.error(f"Failed to restore backup: {e}")
            raise
    
    def list_backups(self) -> List[Path]:
        """List available backups"""
        try:
            backups = list(self.backup_dir.glob("*.db"))
            backups.sort(key=lambda x: x.stat().st_mtime, reverse=True)
            return backups
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    def cleanup_old_backups(self) -> None:
        """Remove old backups based on retention policy"""
        try:
            cutoff_date = datetime.now() - timedelta(days=self.config.backup_retention_days)
            
            for backup_path in self.backup_dir.glob("*.db"):
                backup_time = datetime.fromtimestamp(backup_path.stat().st_mtime)
                if backup_time < cutoff_date:
                    backup_path.unlink()
                    logger.info(f"Removed old backup: {backup_path}")
                    
        except Exception as e:
            logger.error(f"Failed to cleanup old backups: {e}")
    
    def get_backup_info(self, backup_path: Path) -> dict:
        """Get information about a backup file"""
        try:
            stat = backup_path.stat()
            return {
                "name": backup_path.name,
                "path": str(backup_path),
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_mtime),
                "size_mb": round(stat.st_size / (1024 * 1024), 2)
            }
        except Exception as e:
            logger.error(f"Failed to get backup info: {e}")
            return {}
    
    async def auto_backup(self) -> Optional[Path]:
        """Create automatic backup if enabled"""
        if not self.config.auto_backup:
            return None
        
        try:
            backup_path = self.create_backup()
            self.cleanup_old_backups()
            return backup_path
        except Exception as e:
            logger.error(f"Auto backup failed: {e}")
            return None