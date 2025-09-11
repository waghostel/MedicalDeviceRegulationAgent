"""
Test script for database isolation functionality.

This script tests the DatabaseTestIsolation class to ensure proper
transaction management and test isolation.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database.connection import init_database, close_database
from testing.database_isolation import DatabaseTestIsolation
from models.user import User
from models.project import Project, ProjectStatus

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_database_isolation():
    """Test database isolation functionality."""
    
    print("🧪 Testing Database Isolation System")
    print("=" * 50)
    
    try:
        # Initialize database with test database
        test_db_url = "sqlite+aiosqlite:///:memory:"
        db_manager = await init_database(test_db_url)
        
        # Create tables
        await db_manager.create_tables()
        print("✅ Database initialized and tables created")
        
        # Create test isolation instance
        isolation = DatabaseTestIsolation(db_manager)
        
        # Test 1: Basic isolation functionality
        print("\n📋 Test 1: Basic Isolation Functionality")
        async with isolation.isolated_session() as session:
            # Validate isolation
            is_valid = await isolation.validate_isolation(session)
            print(f"   Isolation validation: {'✅ PASS' if is_valid else '❌ FAIL'}")
            
            # Create a test user
            user = User(
                email="test@example.com",
                name="Test User",
                google_id="test_google_id_123"
            )
            session.add(user)
            await session.flush()  # Get ID without committing
            
            user_id = user.id
            print(f"   Created test user with ID: {user_id}")
            
        # Test 2: Verify data doesn't persist after session
        print("\n📋 Test 2: Data Isolation Verification")
        async with isolation.isolated_session() as session:
            from sqlalchemy import select
            
            # Try to find the user created in the previous session
            result = await session.execute(select(User).where(User.email == "test@example.com"))
            found_user = result.scalar_one_or_none()
            
            if found_user is None:
                print("   ✅ PASS: Data properly isolated - user not found in new session")
            else:
                print("   ❌ FAIL: Data leaked between sessions - user found")
        
        # Test 3: Multiple concurrent sessions
        print("\n📋 Test 3: Concurrent Session Isolation")
        
        async def create_user_in_session(session_name: str, email: str):
            async with isolation.isolated_session() as session:
                user = User(
                    email=email,
                    name=f"User {session_name}",
                    google_id=f"google_id_{session_name}"
                )
                session.add(user)
                await session.flush()
                print(f"   Session {session_name}: Created user {email} with ID {user.id}")
                return user.id
        
        # Run multiple sessions concurrently
        tasks = [
            create_user_in_session("A", "user_a@example.com"),
            create_user_in_session("B", "user_b@example.com"),
            create_user_in_session("C", "user_c@example.com")
        ]
        
        user_ids = await asyncio.gather(*tasks)
        print(f"   ✅ PASS: Created users concurrently with IDs: {user_ids}")
        
        # Test 4: Verify no data persists from concurrent sessions
        print("\n📋 Test 4: Concurrent Session Cleanup Verification")
        async with isolation.isolated_session() as session:
            from sqlalchemy import select
            
            result = await session.execute(select(User))
            all_users = result.scalars().all()
            
            if len(all_users) == 0:
                print("   ✅ PASS: No users found - all concurrent sessions properly cleaned up")
            else:
                print(f"   ❌ FAIL: Found {len(all_users)} users - cleanup failed")
        
        # Test 5: Complex data relationships
        print("\n📋 Test 5: Complex Data Relationships")
        async with isolation.isolated_session() as session:
            # Create user and project with relationship
            user = User(
                email="complex@example.com",
                name="Complex Test User",
                google_id="complex_google_id"
            )
            session.add(user)
            await session.flush()
            
            project = Project(
                user_id=user.id,
                name="Test Project",
                description="A test project for isolation testing",
                device_type="Test Device",
                intended_use="Testing purposes",
                status=ProjectStatus.DRAFT
            )
            session.add(project)
            await session.flush()
            
            print(f"   Created user {user.id} with project {project.id}")
            
            # Verify relationship
            from sqlalchemy.orm import selectinload
            result = await session.execute(
                select(User).options(selectinload(User.projects)).where(User.id == user.id)
            )
            user_with_projects = result.scalar_one()
            
            if len(user_with_projects.projects) == 1:
                print("   ✅ PASS: User-project relationship working correctly")
            else:
                print("   ❌ FAIL: User-project relationship not working")
        
        # Test 6: Health check
        print("\n📋 Test 6: Health Check")
        health_result = await isolation.check_database_health()
        
        print(f"   Database healthy: {health_result.get('healthy', False)}")
        print(f"   Test isolation working: {health_result.get('test_isolation_working', False)}")
        print(f"   Test database ready: {health_result.get('test_database_ready', False)}")
        
        if health_result.get('test_database_ready', False):
            print("   ✅ PASS: Database health check successful")
        else:
            print("   ❌ FAIL: Database health check failed")
        
        # Test 7: Session tracking
        print("\n📋 Test 7: Session Tracking")
        active_sessions_before = await isolation.get_active_sessions_count()
        print(f"   Active sessions before: {active_sessions_before}")
        
        async with isolation.isolated_session() as session:
            active_sessions_during = await isolation.get_active_sessions_count()
            print(f"   Active sessions during: {active_sessions_during}")
            
            if active_sessions_during > active_sessions_before:
                print("   ✅ PASS: Session tracking working correctly")
            else:
                print("   ❌ FAIL: Session tracking not working")
        
        active_sessions_after = await isolation.get_active_sessions_count()
        print(f"   Active sessions after: {active_sessions_after}")
        
        if active_sessions_after == active_sessions_before:
            print("   ✅ PASS: Session cleanup working correctly")
        else:
            print("   ❌ FAIL: Session cleanup not working")
        
        print("\n🎉 Database Isolation Tests Completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up
        try:
            await close_database()
            print("✅ Database connection closed")
        except Exception as e:
            print(f"⚠️  Warning: Error closing database: {e}")
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_database_isolation())
    sys.exit(0 if success else 1)