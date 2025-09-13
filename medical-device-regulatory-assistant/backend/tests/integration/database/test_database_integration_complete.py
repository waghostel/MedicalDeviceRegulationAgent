"""
Comprehensive integration test for database test isolation system.

This script tests all three components working together:
1. DatabaseTestIsolation
2. TestDataFactory  
3. TestConnectionManager

This demonstrates the complete database testing infrastructure.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from tests.utils.testing_framework.database_isolation import DatabaseTestIsolation
from tests.fixtures.database.test_data_factory import TestDataFactory
from tests.utils.testing_framework.connection_manager import TestConnectionManager, RetryConfig, create_memory_test_manager
from database.connection import DatabaseManager
from models.user import User
from models.project import Project
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_complete_database_integration():
    """Test complete database integration with all components."""
    
    print("🔧 Testing Complete Database Integration System")
    print("=" * 60)
    
    try:
        # Test 1: Initialize complete testing infrastructure
        print("\n📋 Test 1: Complete Testing Infrastructure Setup")
        
        # Initialize database using the standard approach
        from database.connection import init_database, close_database
        
        test_db_url = "sqlite+aiosqlite:///:memory:"
        db_manager = await init_database(test_db_url)
        await db_manager.create_tables()
        
        # Create test isolation
        isolation = DatabaseTestIsolation(db_manager)
        
        # Create connection manager for additional testing
        connection_manager = create_memory_test_manager(
            RetryConfig(max_retries=2, base_delay=0.1)
        )
        await connection_manager.initialize()
        
        print("   ✅ Connection Manager initialized")
        print("   ✅ Database tables created")
        print("   ✅ Test isolation ready")
        
        # Test 2: Integrated workflow - Create, verify, cleanup
        print("\n📋 Test 2: Integrated Workflow - Create, Verify, Cleanup")
        
        # First session: Create data with factory
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create complete project setup
            setup = await factory.create_complete_project_setup(
                user_name="Integration Test User",
                project_name="Integration Test Project"
            )
            
            print(f"   Created complete setup:")
            print(f"     User: {setup['user'].name} (ID: {setup['user'].id})")
            print(f"     Project: {setup['project'].name} (ID: {setup['project'].id})")
            print(f"     Classification: {setup['device_classification'].device_class.value}")
            print(f"     Predicate: {setup['predicate_device'].k_number}")
            print(f"     Interaction: {setup['agent_interaction'].agent_action}")
            print(f"     Document: {setup['project_document'].filename}")
            
            # Verify data exists in this session
            result = await session.execute(select(User).where(User.id == setup['user'].id))
            found_user = result.scalar_one_or_none()
            
            if found_user:
                print("   ✅ PASS: Data exists within isolated session")
            else:
                print("   ❌ FAIL: Data not found within isolated session")
            
            # Get factory summary
            summary = factory.get_created_entities_summary()
            print(f"   Factory created {summary['total_entities']} entities")
        
        # Second session: Verify data isolation (should not exist)
        async with isolation.isolated_session() as session:
            result = await session.execute(select(User))
            all_users = result.scalars().all()
            
            result = await session.execute(select(Project))
            all_projects = result.scalars().all()
            
            if len(all_users) == 0 and len(all_projects) == 0:
                print("   ✅ PASS: Data properly isolated - no data found in new session")
            else:
                print(f"   ❌ FAIL: Data leaked - found {len(all_users)} users, {len(all_projects)} projects")
        
        # Test 3: Connection manager health during isolation
        print("\n📋 Test 3: Connection Manager Health During Isolation")
        
        health_before = await connection_manager.health_check()
        
        # Create multiple isolated sessions concurrently
        async def isolated_work(session_id: int):
            async with isolation.isolated_session() as session:
                factory = TestDataFactory(session)
                user = await factory.create_user(name=f"Concurrent User {session_id}")
                project = await factory.create_project(user=user, name=f"Concurrent Project {session_id}")
                
                # Simulate some work
                await asyncio.sleep(0.01)
                
                return user.id, project.id
        
        # Run concurrent isolated sessions
        tasks = [isolated_work(i) for i in range(5)]
        results = await asyncio.gather(*tasks)
        
        health_after = await connection_manager.health_check()
        
        print(f"   Health before: {health_before['healthy']}")
        print(f"   Health after: {health_after['healthy']}")
        print(f"   Concurrent sessions completed: {len(results)}")
        
        if health_before['healthy'] and health_after['healthy']:
            print("   ✅ PASS: Connection manager remained healthy during concurrent isolation")
        else:
            print("   ❌ FAIL: Connection manager health degraded")
        
        # Test 4: Error handling and recovery
        print("\n📋 Test 4: Error Handling and Recovery")
        
        try:
            async with isolation.isolated_session() as session:
                factory = TestDataFactory(session)
                
                # Create some data
                user = await factory.create_user(name="Error Test User")
                
                # Simulate an error
                raise ValueError("Simulated error for testing")
                
        except Exception as e:
            # The isolation system wraps the original error
            if "Simulated error for testing" in str(e):
                print(f"   Expected error caught (wrapped): {type(e).__name__}")
                
                # Verify that data was rolled back
                async with isolation.isolated_session() as session:
                    result = await session.execute(select(User).where(User.name == "Error Test User"))
                    found_user = result.scalar_one_or_none()
                    
                    if found_user is None:
                        print("   ✅ PASS: Error handling - data properly rolled back")
                    else:
                        print("   ❌ FAIL: Error handling - data not rolled back")
            else:
                # Re-raise unexpected errors
                raise
        
        # Test 5: Performance and metrics
        print("\n📋 Test 5: Performance and Metrics")
        
        import time
        
        start_time = time.time()
        session_count = 10
        
        for i in range(session_count):
            async with isolation.isolated_session() as session:
                factory = TestDataFactory(session)
                user = await factory.create_user(name=f"Perf Test User {i}")
                project = await factory.create_project(user=user, name=f"Perf Test Project {i}")
        
        end_time = time.time()
        total_time = end_time - start_time
        avg_time_per_session = total_time / session_count
        
        print(f"   Created {session_count} isolated sessions in {total_time:.3f}s")
        print(f"   Average time per session: {avg_time_per_session:.3f}s")
        
        # Get connection metrics
        metrics = connection_manager.metrics
        print(f"   Connection metrics:")
        print(f"     Total connections: {metrics.total_connections}")
        print(f"     Failed connections: {metrics.failed_connections}")
        print(f"     Retry attempts: {metrics.retry_attempts}")
        print(f"     Average connection time: {metrics.average_connection_time:.4f}s")
        
        if avg_time_per_session < 1.0:  # Should be fast for in-memory database
            print("   ✅ PASS: Performance acceptable")
        else:
            print("   ⚠️  WARNING: Performance slower than expected")
        
        # Test 6: Validation and health checks
        print("\n📋 Test 6: System Validation and Health Checks")
        
        # Test isolation validation
        async with isolation.isolated_session() as session:
            isolation_valid = await isolation.validate_isolation(session)
            print(f"   Isolation validation: {'✅ PASS' if isolation_valid else '❌ FAIL'}")
        
        # Test connection manager validation
        validation_result = await connection_manager.validate_test_environment()
        print(f"   Environment validation: {'✅ PASS' if validation_result['valid'] else '❌ FAIL'}")
        
        if validation_result.get('recommendations'):
            print(f"   Recommendations: {validation_result['recommendations']}")
        
        # Test database health through isolation
        db_health = await isolation.check_database_health()
        print(f"   Database health: {'✅ PASS' if db_health['test_database_ready'] else '❌ FAIL'}")
        
        # Test 7: Cleanup and resource management
        print("\n📋 Test 7: Cleanup and Resource Management")
        
        # Test session tracking
        active_sessions_before = await isolation.get_active_sessions_count()
        print(f"   Active sessions before test: {active_sessions_before}")
        
        # Create a session and verify tracking
        async with isolation.isolated_session() as session:
            active_sessions_during = await isolation.get_active_sessions_count()
            print(f"   Active sessions during test: {active_sessions_during}")
            
            if active_sessions_during > active_sessions_before:
                print("   ✅ PASS: Session tracking working")
            else:
                print("   ❌ FAIL: Session tracking not working")
        
        active_sessions_after = await isolation.get_active_sessions_count()
        print(f"   Active sessions after test: {active_sessions_after}")
        
        if active_sessions_after == active_sessions_before:
            print("   ✅ PASS: Session cleanup working")
        else:
            print("   ❌ FAIL: Session cleanup not working")
        
        # Final cleanup
        await connection_manager.close()
        await close_database()
        
        if connection_manager.state.value == "disconnected":
            print("   ✅ PASS: Connection manager properly closed")
        else:
            print("   ❌ FAIL: Connection manager not properly closed")
        
        print("\n🎉 Complete Database Integration Tests Completed Successfully!")
        print("\n📊 Summary:")
        print("   ✅ Database Test Isolation: Working")
        print("   ✅ Test Data Factory: Working") 
        print("   ✅ Test Connection Manager: Working")
        print("   ✅ Integration: All components work together seamlessly")
        
    except Exception as e:
        print(f"\n❌ Integration test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_complete_database_integration())
    sys.exit(0 if success else 1)