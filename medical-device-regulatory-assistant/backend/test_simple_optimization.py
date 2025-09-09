"""
Simple test for database optimization components
"""

import asyncio
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_basic_imports():
    """Test basic imports"""
    logger.info("Testing basic imports...")
    
    try:
        from database.connection import init_database, close_database
        logger.info("✓ Database connection import OK")
        
        from database.config import get_database_config
        logger.info("✓ Database config import OK")
        
        from database.performance_indexes import DatabaseIndexManager
        logger.info("✓ Performance indexes import OK")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Import failed: {e}")
        return False


async def test_database_indexes():
    """Test database index creation"""
    logger.info("Testing database indexes...")
    
    try:
        from database.connection import init_database, close_database
        from database.performance_indexes import DatabaseIndexManager
        
        # Initialize database
        db_manager = await init_database()
        
        # Create index manager
        index_manager = DatabaseIndexManager(db_manager.engine)
        
        # Create performance indexes
        await index_manager.create_performance_indexes()
        logger.info("✓ Performance indexes created successfully")
        
        # Get table statistics
        stats = await index_manager.get_table_statistics()
        logger.info(f"✓ Table statistics retrieved: {len(stats)} tables")
        
        # Cleanup
        await close_database()
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Database index test failed: {e}")
        return False


async def main():
    """Run simple optimization tests"""
    logger.info("Starting simple database optimization tests...")
    
    test_results = {}
    
    # Run tests
    test_results["imports"] = await test_basic_imports()
    test_results["indexes"] = await test_database_indexes()
    
    # Summary
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    logger.info(f"\n{'='*50}")
    logger.info(f"SIMPLE OPTIMIZATION TEST RESULTS")
    logger.info(f"{'='*50}")
    
    for test_name, result in test_results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        logger.info(f"{test_name.upper():<20} {status}")
    
    logger.info(f"{'='*50}")
    logger.info(f"SUMMARY: {passed_tests}/{total_tests} tests passed")
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)