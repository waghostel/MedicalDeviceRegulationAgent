"""
Test the new database testing infrastructure.

This test file validates that the new TestDatabaseConfig and improved
fixtures provide proper isolation and functionality.
"""

import pytest
import pytest_asyncio
import asyncio
from sqlalchemy import select, text

from database.test_config import (
    IsolatedTestDatabaseConfig,
    IsolatedTestDatabaseManager,
    get_test_database_manager,
    isolated_test_database,
    isolated_test_session
)


class TestDatabaseTestingInfrastructure:
    """Test the new database testing infrastructure"""

    @pytest.mark.asyncio
    async def test_test_database_config_initialization(self):
        """Test that IsolatedTestDatabaseConfig initializes correctly"""
        config = IsolatedTestDatabaseConfig()
        
        # Test initialization
        await config.initialize()
        
        # Test health check
        health = await config.health_check()
        assert health["healthy"] is True
        assert health["status"] == "connected"
        assert "test_id" in health
        
        # Clean up
        await config.cleanup()

    @pytest.mark.asyncio
    async def test_test_database_config_session_isolation(self):
        """Test that sessions from IsolatedTestDatabaseConfig are properly isolated"""
        config = IsolatedTestDatabaseConfig()
        await config.initialize()
        
        try:
            # Create data in first session
            async with config.get_session() as session1:
                from models.user import User
                user = User(
                    email="test1@example.com",
                    name="Test User 1",
                    google_id="test_google_1"
                )
                session1.add(user)
                await session1.commit()
                
                # Verify user exists in same session
                result = await session1.execute(select(User).where(User.email == "test1@example.com"))
                found_user = result.scalar_one_or_none()
                assert found_user is not None
                assert found_user.email == "test1@example.com"
            
            # Verify data persists in new session (same database)
            async with config.get_session() as session2:
                result = await session2.execute(select(User).where(User.email == "test1@example.com"))
                found_user = result.scalar_one_or_none()
                assert found_user is not None
                assert found_user.email == "test1@example.com"
                
        finally:
            await config.cleanup()

    @pytest.mark.asyncio
    async def test_test_database_config_sqlite_pragma_settings(self):
        """Test that SQLite PRAGMA settings are properly applied"""
        config = IsolatedTestDatabaseConfig()
        await config.initialize()
        
        try:
            async with config.get_connection() as conn:
                # Check foreign keys are enabled
                result = await conn.execute(text("PRAGMA foreign_keys"))
                row = result.fetchone()
                assert row[0] == 1  # Foreign keys should be ON
                
                # Check synchronous mode
                result = await conn.execute(text("PRAGMA synchronous"))
                row = result.fetchone()
                assert row[0] in [1, 2]  # NORMAL or FULL
                
        finally:
            await config.cleanup()

    @pytest.mark.asyncio
    async def test_test_database_manager(self):
        """Test the IsolatedTestDatabaseManager functionality"""
        manager = IsolatedTestDatabaseManager()
        
        # Test creating multiple test databases
        config1 = await manager.create_test_database("test1")
        config2 = await manager.create_test_database("test2")
        
        assert manager.get_active_count() == 2
        
        # Test that databases are isolated
        async with config1.get_session() as session1:
            from models.user import User
            user1 = User(email="user1@example.com", name="User 1", google_id="google1")
            session1.add(user1)
            await session1.commit()
        
        async with config2.get_session() as session2:
            from models.user import User
            # Should not see user from config1
            result = await session2.execute(select(User).where(User.email == "user1@example.com"))
            found_user = result.scalar_one_or_none()
            assert found_user is None
            
            # Add different user to config2
            user2 = User(email="user2@example.com", name="User 2", google_id="google2")
            session2.add(user2)
            await session2.commit()
        
        # Verify isolation - config1 should not see user2
        async with config1.get_session() as session1:
            result = await session1.execute(select(User).where(User.email == "user2@example.com"))
            found_user = result.scalar_one_or_none()
            assert found_user is None
        
        # Clean up
        await manager.cleanup_test_database(config1)
        await manager.cleanup_test_database(config2)
        
        assert manager.get_active_count() == 0

    @pytest.mark.asyncio
    async def test_isolated_test_database_context_manager(self):
        """Test the isolated_test_database context manager"""
        # Test that context manager properly cleans up
        config_ref = None
        
        async with isolated_test_database("context_test") as config:
            config_ref = config
            
            # Test basic functionality
            health = await config.health_check()
            assert health["healthy"] is True
            
            # Create some data
            async with config.get_session() as session:
                from models.user import User
                user = User(email="context@example.com", name="Context User", google_id="context")
                session.add(user)
                await session.commit()
        
        # After context manager exits, config should be cleaned up
        # Health check should fail because engine is disposed
        health = await config_ref.health_check()
        assert health["healthy"] is False

    @pytest.mark.asyncio
    async def test_isolated_test_session_context_manager(self):
        """Test the isolated_test_session context manager"""
        async with isolated_test_session("session_test") as session:
            # Test basic session functionality
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
            
            # Test model operations
            from models.user import User
            user = User(email="session@example.com", name="Session User", google_id="session")
            session.add(user)
            await session.commit()
            
            # Verify user was created
            result = await session.execute(select(User).where(User.email == "session@example.com"))
            found_user = result.scalar_one_or_none()
            assert found_user is not None
            assert found_user.name == "Session User"

    @pytest.mark.asyncio
    async def test_concurrent_test_databases(self):
        """Test that multiple test databases can run concurrently"""
        async def create_user_in_isolated_db(user_email: str, user_name: str):
            async with isolated_test_session(f"concurrent_{user_email}") as session:
                from models.user import User
                user = User(email=user_email, name=user_name, google_id=f"google_{user_email}")
                session.add(user)
                await session.commit()
                
                # Verify user was created
                result = await session.execute(select(User).where(User.email == user_email))
                found_user = result.scalar_one_or_none()
                assert found_user is not None
                return found_user.id
        
        # Run multiple concurrent database operations
        tasks = [
            create_user_in_isolated_db("user1@concurrent.com", "Concurrent User 1"),
            create_user_in_isolated_db("user2@concurrent.com", "Concurrent User 2"),
            create_user_in_isolated_db("user3@concurrent.com", "Concurrent User 3"),
        ]
        
        user_ids = await asyncio.gather(*tasks)
        
        # All should succeed - IDs may be the same since each database is isolated
        assert len(user_ids) == 3
        # Each isolated database starts with ID 1, so IDs may be the same
        # This is correct behavior for isolated databases
        assert all(user_id >= 1 for user_id in user_ids)

    @pytest.mark.asyncio
    async def test_global_test_database_manager(self):
        """Test the global test database manager"""
        manager1 = get_test_database_manager()
        manager2 = get_test_database_manager()
        
        # Should return the same instance
        assert manager1 is manager2
        
        # Test functionality
        config = await manager1.create_test_database("global_test")
        assert manager1.get_active_count() >= 1
        
        await manager1.cleanup_test_database(config)


class TestImprovedTestFixtures:
    """Test the improved test fixtures"""

    @pytest.mark.asyncio
    async def test_test_db_session_fixture(self, test_db_session):
        """Test the improved test_db_session fixture"""
        # Test basic functionality
        result = await test_db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1
        
        # Test model operations
        from models.user import User
        user = User(email="fixture@example.com", name="Fixture User", google_id="fixture")
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify user was created
        result = await test_db_session.execute(select(User).where(User.email == "fixture@example.com"))
        found_user = result.scalar_one_or_none()
        assert found_user is not None
        assert found_user.name == "Fixture User"

    @pytest.mark.asyncio
    async def test_isolated_db_config_fixture(self, isolated_db_config):
        """Test the isolated_db_config fixture"""
        # Test health check
        health = await isolated_db_config.health_check()
        assert health["healthy"] is True
        assert "test_id" in health
        
        # Test multiple sessions from same config
        async with isolated_db_config.get_session() as session1:
            from models.user import User
            user = User(email="config1@example.com", name="Config User 1", google_id="config1")
            session1.add(user)
            await session1.commit()
        
        async with isolated_db_config.get_session() as session2:
            # Should see user from session1 (same database)
            result = await session2.execute(select(User).where(User.email == "config1@example.com"))
            found_user = result.scalar_one_or_none()
            assert found_user is not None

    @pytest.mark.asyncio
    async def test_test_db_connection_fixture(self, test_db_connection):
        """Test the test_db_connection fixture"""
        # Test raw SQL operations
        result = await test_db_connection.execute(text("SELECT 1 as test_value"))
        row = result.fetchone()
        assert row[0] == 1
        
        # Test PRAGMA settings
        result = await test_db_connection.execute(text("PRAGMA foreign_keys"))
        row = result.fetchone()
        assert row[0] == 1  # Foreign keys should be enabled

    @pytest.mark.asyncio
    async def test_multiple_test_sessions_fixture(self, multiple_test_sessions):
        """Test the multiple_test_sessions fixture"""
        assert len(multiple_test_sessions) == 3
        
        # Test that all sessions work
        for i, session in enumerate(multiple_test_sessions):
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
            
            # Create user in each session
            from models.user import User
            user = User(
                email=f"multi{i}@example.com",
                name=f"Multi User {i}",
                google_id=f"multi{i}"
            )
            session.add(user)
            await session.commit()
        
        # Verify all users exist (same database, different sessions)
        session = multiple_test_sessions[0]
        result = await session.execute(select(User))
        all_users = result.scalars().all()
        assert len(all_users) == 3


class TestDatabaseIsolationValidation:
    """Test that database isolation works correctly between tests"""

    @pytest.mark.asyncio
    async def test_isolation_test_1(self, test_db_session):
        """First isolation test - create data"""
        from models.user import User
        user = User(email="isolation1@example.com", name="Isolation User 1", google_id="isolation1")
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify user exists
        result = await test_db_session.execute(select(User).where(User.email == "isolation1@example.com"))
        found_user = result.scalar_one_or_none()
        assert found_user is not None

    @pytest.mark.asyncio
    async def test_isolation_test_2(self, test_db_session):
        """Second isolation test - should not see data from test_isolation_test_1"""
        from models.user import User
        
        # Should not see user from previous test
        result = await test_db_session.execute(select(User).where(User.email == "isolation1@example.com"))
        found_user = result.scalar_one_or_none()
        assert found_user is None
        
        # Create different user
        user = User(email="isolation2@example.com", name="Isolation User 2", google_id="isolation2")
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify only this user exists
        result = await test_db_session.execute(select(User))
        all_users = result.scalars().all()
        assert len(all_users) == 1
        assert all_users[0].email == "isolation2@example.com"

    @pytest.mark.asyncio
    async def test_isolation_test_3(self, test_db_session):
        """Third isolation test - should not see data from previous tests"""
        from models.user import User
        
        # Should not see users from previous tests
        result = await test_db_session.execute(select(User))
        all_users = result.scalars().all()
        assert len(all_users) == 0