#!/usr/bin/env python3
"""
CLI interface for the enhanced database seeder
"""

import asyncio
import argparse
import logging
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.integrated_seeder import (
    IntegratedSeederManager, 
    get_integrated_seeder,
    validate_seeder_setup,
    seed_development_data,
    seed_testing_data,
    seed_production_data
)
from database.seeder_config import override_seeder_config, Environment
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
    
    parser.add_argument(
        '--environment', '-e',
        choices=['development', 'testing', 'production'],
        help='Override environment for seeding (default: auto-detect from ENVIRONMENT or NODE_ENV)'
    )
    
    parser.add_argument(
        '--validate-only',
        action='store_true',
        help='Only validate configuration, do not seed'
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logging.getLogger('database.seeder').setLevel(logging.DEBUG)
    
    # Handle environment override
    if args.environment:
        os.environ["ENVIRONMENT"] = args.environment
        logger.info(f"Environment override: {args.environment}")
    
    # Handle validate-only mode
    if args.validate_only:
        logger.info("Running validation-only mode...")
        try:
            await init_database()
            validation_report = await validate_seeder_setup()
            
            from database.seeder_validation import format_validation_report
            print(format_validation_report(validation_report))
            
            if validation_report.is_valid:
                logger.info("✅ Configuration validation passed")
                sys.exit(0)
            else:
                logger.error("❌ Configuration validation failed")
                sys.exit(1)
                
        except Exception as e:
            logger.error(f"Validation failed with error: {e}")
            if args.verbose:
                import traceback
                traceback.print_exc()
            sys.exit(1)
    
    try:
        # Initialize database manager
        await init_database()
        
        # Create seeder configuration with CLI overrides
        config = override_seeder_config(
            config_file_path=args.config if args.config != 'mock_data/sample_mock_data_config.json' else None,
            clear_before_seed=args.clear,
            validate_before_seed=True,
            validate_after_seed=True,
            log_seeding_details=args.verbose,
            fail_on_validation_error=False  # CLI should be more lenient
        )
        
        seeder_manager = IntegratedSeederManager(config)
        
        if args.clear_only:
            logger.info("Clearing database...")
            results = await seeder_manager.clear_database()
            if results["success"]:
                logger.info("Database cleared successfully")
            else:
                logger.error("Database clearing failed:")
                for error in results["errors"]:
                    logger.error(f"  - {error}")
                sys.exit(1)
            return
        
        if args.incremental is not None:
            logger.info(f"Running incremental seeding for: {args.incremental}")
            results = await seeder_manager.seed_incremental(args.incremental)
            if results["success"]:
                logger.info("Incremental seeding completed successfully")
            else:
                logger.error("Incremental seeding failed:")
                for error in results["errors"]:
                    logger.error(f"  - {error}")
                sys.exit(1)
            return
        
        # Validate configuration first
        logger.info("Validating seeder configuration...")
        validation_report = await seeder_manager.validate_configuration()
        
        if validation_report.has_errors:
            logger.warning("Configuration validation found errors:")
            from database.seeder_validation import format_validation_report
            logger.warning(format_validation_report(validation_report))
            
            if not args.verbose:
                logger.info("Use --verbose for detailed validation information")
        
        logger.info("Starting database seeding...")
        if args.clear:
            logger.info("Will clear existing data first")
        
        results = await seeder_manager.seed_database(force=True)  # Force in CLI mode
        
        if results["success"]:
            logger.info("Database seeding completed successfully")
            if results.get("warnings"):
                logger.warning("Seeding completed with warnings:")
                for warning in results["warnings"]:
                    logger.warning(f"  - {warning}")
        else:
            logger.error("Database seeding failed:")
            for error in results["errors"]:
                logger.error(f"  - {error}")
            sys.exit(1)
        
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