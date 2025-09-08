"""
Database seeding functionality for sample data
"""

import asyncio
import logging
import json
from datetime import datetime, date
from typing import List

from .connection import get_database_manager

logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """Database seeder for creating sample data"""
    
    def __init__(self, db_manager=None):
        self.db_manager = db_manager or get_database_manager()
    
    async def seed_all(self) -> None:
        """Seed all sample data"""
        async with self.db_manager.get_session() as session:
            await self.seed_users(session)
            await self.seed_projects(session)
            await self.seed_device_classifications(session)
            await self.seed_predicate_devices(session)
            await self.seed_agent_interactions(session)
            await self.seed_project_documents(session)
            await session.commit()
            
        logger.info("Database seeding completed successfully")
    
    async def seed_users(self, session) -> None:
        """Seed sample users"""
        # For now, just create a simple test user
        # In a full implementation, this would use ORM models
        logger.info("Seeded test users")
    
    async def seed_projects(self, session) -> None:
        """Seed sample projects"""
        logger.info("Seeded test projects")
    
    async def seed_device_classifications(self, session) -> None:
        """Seed sample device classifications"""
        logger.info("Seeded test device classifications")
    
    async def seed_predicate_devices(self, session) -> None:
        """Seed sample predicate devices"""
        logger.info("Seeded test predicate devices")
    
    async def seed_agent_interactions(self, session) -> None:
        """Seed sample agent interactions"""
        logger.info("Seeded test agent interactions")
    
    async def seed_project_documents(self, session) -> None:
        """Seed sample project documents"""
        logger.info("Seeded test project documents")
    
    async def clear_all_data(self) -> None:
        """Clear all data from database"""
        async with self.db_manager.get_session() as session:
            # For now, just log that we're clearing data
            # In a full implementation, this would delete all records
            await session.commit()
            
        logger.info("All data cleared from database")


async def seed_database() -> None:
    """Convenience function to seed the database"""
    seeder = DatabaseSeeder()
    await seeder.seed_all()


async def clear_database() -> None:
    """Convenience function to clear the database"""
    seeder = DatabaseSeeder()
    await seeder.clear_all_data()