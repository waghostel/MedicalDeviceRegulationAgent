"""
Database seeder main module
Run with: poetry run python -m database.seeder
"""

import asyncio
import logging
import sys
import os
from .seeder import seed_database, clear_database
from .connection import init_database, close_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def main():
    """Main function to run database seeding"""
    try:
        # Initialize database manager
        database_url = os.getenv("DATABASE_URL", "sqlite:./medical_device_assistant.db")
        logger.info(f"Initializing database: {database_url}")
        await init_database(database_url)
        
        if len(sys.argv) > 1 and sys.argv[1] == "--clear":
            logger.info("Clearing database...")
            await clear_database()
            logger.info("Database cleared successfully")
        else:
            logger.info("Starting database seeding...")
            await seed_database()
            logger.info("Database seeding completed successfully")
            
    except Exception as e:
        logger.error(f"Database operation failed: {e}")
        raise
    finally:
        # Clean up database connection
        try:
            await close_database()
        except Exception as e:
            logger.warning(f"Error closing database: {e}")


if __name__ == "__main__":
    asyncio.run(main())