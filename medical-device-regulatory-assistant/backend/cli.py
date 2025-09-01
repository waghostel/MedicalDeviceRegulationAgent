#!/usr/bin/env python3
"""
CLI script for database management operations
"""

import asyncio
import argparse
import logging
from pathlib import Path

from database.connection import get_database_manager
from database.seeder import seed_database, clear_database
from database.backup import DatabaseBackupManager
from database.migrations import run_migrations, create_migration

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def init_database():
    """Initialize database with tables and sample data"""
    logger.info("Initializing database...")
    
    # Create tables
    db_manager = get_database_manager()
    await db_manager.create_tables()
    logger.info("Database tables created")
    
    # Seed with sample data
    await seed_database()
    logger.info("Sample data seeded")
    
    await db_manager.close()
    logger.info("Database initialization complete")


async def clear_data():
    """Clear all data from database"""
    logger.info("Clearing database data...")
    await clear_database()
    logger.info("Database data cleared")


async def backup_database():
    """Create database backup"""
    logger.info("Creating database backup...")
    backup_manager = DatabaseBackupManager()
    backup_path = backup_manager.create_backup()
    logger.info(f"Database backup created: {backup_path}")


async def list_backups():
    """List available backups"""
    backup_manager = DatabaseBackupManager()
    backups = backup_manager.list_backups()
    
    if not backups:
        logger.info("No backups found")
        return
    
    logger.info("Available backups:")
    for backup in backups:
        info = backup_manager.get_backup_info(backup)
        logger.info(f"  {info['name']} - {info['size_mb']} MB - {info['created']}")


async def health_check():
    """Check database health"""
    logger.info("Checking database health...")
    db_manager = get_database_manager()
    
    is_healthy = await db_manager.health_check()
    if is_healthy:
        logger.info("✅ Database is healthy")
    else:
        logger.error("❌ Database health check failed")
    
    await db_manager.close()
    return is_healthy


def run_migration_command(message: str):
    """Create a new migration"""
    logger.info(f"Creating migration: {message}")
    create_migration(message)
    logger.info("Migration created successfully")


def upgrade_database():
    """Run database migrations"""
    logger.info("Running database migrations...")
    run_migrations()
    logger.info("Database migrations completed")


async def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(description="Medical Device Regulatory Assistant Database CLI")
    subparsers = parser.add_subparsers(dest="command", help="Available commands")
    
    # Database initialization
    subparsers.add_parser("init", help="Initialize database with tables and sample data")
    subparsers.add_parser("clear", help="Clear all data from database")
    subparsers.add_parser("health", help="Check database health")
    
    # Migration commands
    migrate_parser = subparsers.add_parser("migrate", help="Create a new migration")
    migrate_parser.add_argument("message", help="Migration message")
    
    subparsers.add_parser("upgrade", help="Run database migrations")
    
    # Backup commands
    subparsers.add_parser("backup", help="Create database backup")
    subparsers.add_parser("list-backups", help="List available backups")
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        return
    
    try:
        if args.command == "init":
            await init_database()
        elif args.command == "clear":
            await clear_data()
        elif args.command == "health":
            await health_check()
        elif args.command == "migrate":
            run_migration_command(args.message)
        elif args.command == "upgrade":
            upgrade_database()
        elif args.command == "backup":
            await backup_database()
        elif args.command == "list-backups":
            await list_backups()
        else:
            parser.print_help()
    
    except Exception as e:
        logger.error(f"Command failed: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(main())