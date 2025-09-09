#!/usr/bin/env python3
"""
CLI interface for the enhanced database seeder
"""

import asyncio
import argparse
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.seeder import EnhancedDatabaseSeeder
from database.connection import init_database

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def main():
    """Main CLI function"""
    parser = argparse.ArgumentParser(
        description='Enhanced Database Seeder for Medical Device Regulatory Assistant',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Seed database with default configuration
  python seed_database.py

  # Clear existing data and seed with custom config
  python seed_database.py --config custom_config.json --clear

  # Only clear data, do not seed
  python seed_database.py --clear-only

  # Seed only specific data types
  python seed_database.py --incremental users projects

  # Verbose output
  python seed_database.py --verbose
        """
    )
    
    parser.add_argument(
        '--config', '-c',
        default='mock_data/sample_mock_data_config.json',
        help='Path to JSON configuration file (default: mock_data/sample_mock_data_config.json)'
    )
    
    parser.add_argument(
        '--clear',
        action='store_true',
        help='Clear existing data before seeding'
    )
    
    parser.add_argument(
        '--clear-only',
        action='store_true',
        help='Only clear data, do not seed'
    )
    
    parser.add_argument(
        '--incremental',
        nargs='*',
        choices=['users', 'projects', 'device_classifications', 'predicate_devices', 'agent_interactions'],
        help='Seed only specific data types incrementally'
    )
    
    parser.add_argument(
        '--verbose', '-v',
        action='store_true',
        help='Enable verbose logging'
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.getLogger('database.seeder').setLevel(logging.DEBUG)
    
    try:
        # Initialize database manager
        await init_database()
        
        seeder = EnhancedDatabaseSeeder(args.config)
        
        if args.clear_only:
            logger.info("Clearing database...")
            await seeder.clear_all_data()
            logger.info("Database cleared successfully")
            return
        
        if args.incremental is not None:
            logger.info(f"Running incremental seeding for: {args.incremental}")
            await seeder.seed_incremental(args.incremental)
            logger.info("Incremental seeding completed successfully")
            return
        
        logger.info("Starting database seeding...")
        if args.clear:
            logger.info("Will clear existing data first")
        
        await seeder.seed_all(clear_existing=args.clear)
        logger.info("Database seeding completed successfully")
        
    except FileNotFoundError as e:
        logger.error(f"Configuration file not found: {e}")
        logger.info("Make sure the configuration file exists or use --config to specify a different path")
        sys.exit(1)
        
    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())