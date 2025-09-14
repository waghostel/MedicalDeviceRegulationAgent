#!/usr/bin/env python3
"""
Test script for the enhanced database seeder
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.seeder import EnhancedDatabaseSeeder
from database.connection import get_database_manager, init_database
from sqlalchemy import text

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_seeder_functionality():
    """Test the enhanced database seeder functionality"""
    
    logger.info("Starting enhanced database seeder tests...")
    
    try:
        # Initialize database manager
        await init_database()
        
        # Initialize seeder
        seeder = EnhancedDatabaseSeeder()
        db_manager = get_database_manager()
        
        # Test 1: Clear database
        logger.info("Test 1: Clearing database...")
        await seeder.clear_all_data()
        
        # Verify database is empty
        async with db_manager.get_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM projects"))
            project_count = result.scalar()
            
            assert user_count == 0, f"Expected 0 users, found {user_count}"
            assert project_count == 0, f"Expected 0 projects, found {project_count}"
            
        logger.info("✓ Database cleared successfully")
        
        # Test 2: Seed all data
        logger.info("Test 2: Seeding all data...")
        await seeder.seed_all()
        
        # Verify data was created
        async with db_manager.get_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM projects"))
            project_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM device_classifications"))
            classification_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM predicate_devices"))
            predicate_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM agent_interactions"))
            interaction_count = result.scalar()
            
            logger.info(f"Created: {user_count} users, {project_count} projects, "
                       f"{classification_count} classifications, {predicate_count} predicates, "
                       f"{interaction_count} interactions")
            
            assert user_count > 0, "No users were created"
            assert project_count > 0, "No projects were created"
            
        logger.info("✓ Data seeded successfully")
        
        # Test 3: Test incremental seeding (should not duplicate)
        logger.info("Test 3: Testing incremental seeding...")
        await seeder.seed_incremental(['users', 'projects'])
        
        # Verify no duplicates were created
        async with db_manager.get_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            new_user_count = result.scalar()
            result = await session.execute(text("SELECT COUNT(*) FROM projects"))
            new_project_count = result.scalar()
            
            assert new_user_count == user_count, f"Users duplicated: {user_count} -> {new_user_count}"
            assert new_project_count == project_count, f"Projects duplicated: {project_count} -> {new_project_count}"
            
        logger.info("✓ Incremental seeding works correctly (no duplicates)")
        
        # Test 4: Test data relationships
        logger.info("Test 4: Testing data relationships...")
        async with db_manager.get_session() as session:
            # Check that projects have valid user_ids
            result = await session.execute(text("""
                SELECT COUNT(*) FROM projects p 
                LEFT JOIN users u ON p.user_id = u.id 
                WHERE u.id IS NULL
            """))
            orphaned_projects = result.scalar()
            
            assert orphaned_projects == 0, f"Found {orphaned_projects} projects without valid users"
            
            # Check that classifications have valid project_ids
            result = await session.execute(text("""
                SELECT COUNT(*) FROM device_classifications dc 
                LEFT JOIN projects p ON dc.project_id = p.id 
                WHERE p.id IS NULL
            """))
            orphaned_classifications = result.scalar()
            
            assert orphaned_classifications == 0, f"Found {orphaned_classifications} classifications without valid projects"
            
        logger.info("✓ Data relationships are valid")
        
        # Test 5: Test data content validation
        logger.info("Test 5: Testing data content validation...")
        async with db_manager.get_session() as session:
            # Check that users have required fields
            result = await session.execute(text("""
                SELECT COUNT(*) FROM users 
                WHERE email IS NULL OR name IS NULL OR google_id IS NULL
            """))
            invalid_users = result.scalar()
            
            assert invalid_users == 0, f"Found {invalid_users} users with missing required fields"
            
            # Check that projects have names
            result = await session.execute(text("""
                SELECT COUNT(*) FROM projects 
                WHERE name IS NULL OR name = ''
            """))
            invalid_projects = result.scalar()
            
            assert invalid_projects == 0, f"Found {invalid_projects} projects without names"
            
        logger.info("✓ Data content validation passed")
        
        logger.info("All tests passed! ✓")
        return True
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


async def test_error_handling():
    """Test error handling scenarios"""
    
    logger.info("Testing error handling scenarios...")
    
    try:
        # Test with non-existent config file
        seeder = EnhancedDatabaseSeeder("non_existent_config.json")
        
        # This should create minimal sample data instead of failing
        await seeder.seed_all()
        
        # Verify minimal data was created
        db_manager = get_database_manager()
        async with db_manager.get_session() as session:
            result = await session.execute(text("SELECT COUNT(*) FROM users"))
            user_count = result.scalar()
            
            assert user_count > 0, "No minimal sample data was created"
            
        logger.info("✓ Error handling works correctly (creates minimal data when config missing)")
        return True
        
    except Exception as e:
        logger.error(f"Error handling test failed: {e}")
        return False


async def main():
    """Run all tests"""
    
    logger.info("=" * 60)
    logger.info("Enhanced Database Seeder Test Suite")
    logger.info("=" * 60)
    
    # Run functionality tests
    test1_passed = await test_seeder_functionality()
    
    # Run error handling tests
    test2_passed = await test_error_handling()
    
    # Summary
    logger.info("=" * 60)
    if test1_passed and test2_passed:
        logger.info("All tests PASSED! ✓")
        sys.exit(0)
    else:
        logger.error("Some tests FAILED! ✗")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())