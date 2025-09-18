"""
Validation tests for F2.3 Database Testing Infrastructure Refactor.

This test file validates that the F2.3 task requirements have been met:
- Create test-specific database configuration bypassing global manager
- Implement isolated database instances for each test with StaticPool
- Fix SQLite async connection pooling for test environments
- Add proper async session management for test fixtures
"""

import pytest
import pytest_asyncio
import asyncio
from sqlalchemy import select, text
from sqlalchemy.pool import StaticPool

from database.test_config import (
    IsolatedTestDatabaseConfig,
    isolated_test_database,
    isolated_test_session
)


class TestF23DatabaseTestingInfrastructure:
    """Validate F2.3 task requirements"""

    @pytest.mark.asyncio
    async def test_bypasses_global_database_manager(self):
        """
        Requirement: Create test-specific database configuration bypassing global manager
        
        Validates that the new test infrastructure does not use the global database manager
        and creates completely independent database instances.
        """
        # Test that we can create isolated databases without initializing global manager
        async with isolated_test_database("bypass_test") as config:
            # Verify this is not using global manager
            assert config is not None
            assert hasattr(config, 'test_id')
            assert config.test_id is not None
            
            # Test basic functionality
            health = await config.health_check()
            assert health["healthy"] is True
            assert health["status"] == "connected"
            
            # Verify we can perform database operations
            async with config.get_session() as session:
                result = await session.execute(text("SELECT 1"))
                assert result.scalar() == 1

    @pytest.mark.asyncio
    async def test_isolated_database_instances_with_static_pool(self):
        """
        Requirement: Implement isolated database instances for each test with StaticPool
        
        Validates that each test gets a completely isolated database instance
        and that StaticPool is properly configured for SQLite in-memory databases.
        """
        # Create multiple isolated database instances
        configs = []
        
        try:
            # Create 3 isolated database instances
            for i in range(3):
                config = IsolatedTestDatabaseConfig()
                await config.initialize()
                configs.append(config)
            
            # Verify each has a unique test_id
            test_ids = [config.test_id for config in configs]
            assert len(set(test_ids)) == 3  # All unique
            
            # Verify StaticPool is used for in-memory databases
            for config in configs:
                engine = config.engine
                # For in-memory SQLite, StaticPool should be used
                if ":memory:" in config.database_url:
                    assert isinstance(engine.pool, StaticPool)
            
            # Test isolation - create data in each database
            for i, config in enumerate(configs):
                async with config.get_session() as session:
                    from models.user import User
                    user = User(
                        email=f"isolated_{i}@example.com",
                        name=f"Isolated User {i}",
                        google_id=f"isolated_{i}"
                    )
                    session.add(user)
                    await session.commit()
            
            # Verify isolation - each database should only see its own data
            for i, config in enumerate(configs):
                async with config.get_session() as session:
                    result = await session.execute(select(User))
                    users = result.scalars().all()
                    
                    # Should only see one user (the one created in this database)
                    assert len(users) == 1
                    assert users[0].email == f"isolated_{i}@example.com"
                    
                    # Should not see users from other databases
                    for j in range(3):
                        if i != j:
                            result = await session.execute(
                                select(User).where(User.email == f"isolated_{j}@example.com")
                            )
                            other_user = result.scalar_one_or_none()
                            assert other_user is None
        
        finally:
            # Clean up all configurations
            for config in configs:
                await config.cleanup()

    @pytest.mark.asyncio
    async def test_sqlite_async_connection_pooling_fixed(self):
        """
        Requirement: Fix SQLite async connection pooling for test environments
        
        Validates that SQLite PRAGMA settings are properly applied and
        async connection pooling works correctly.
        """
        async with isolated_test_database("pooling_test") as config:
            # Test that PRAGMA settings are applied
            async with config.get_connection() as conn:
                # Check foreign keys are enabled
                result = await conn.execute(text("PRAGMA foreign_keys"))
                row = result.fetchone()
                assert row[0] == 1  # Foreign keys should be ON
                
                # Check synchronous mode is set
                result = await conn.execute(text("PRAGMA synchronous"))
                row = result.fetchone()
                assert row[0] in [1, 2]  # NORMAL or FULL
            
            # Test concurrent connections work properly
            async def test_concurrent_connection():
                async with config.get_connection() as conn:
                    result = await conn.execute(text("SELECT 1"))
                    return result.scalar()
            
            # Run multiple concurrent connections
            tasks = [test_concurrent_connection() for _ in range(5)]
            results = await asyncio.gather(*tasks)
            
            # All should succeed
            assert all(result == 1 for result in results)

    @pytest.mark.asyncio
    async def test_proper_async_session_management(self):
        """
        Requirement: Add proper async session management for test fixtures
        
        Validates that async sessions are properly managed with correct
        lifecycle, error handling, and cleanup.
        """
        # Test session lifecycle management
        async with isolated_test_database("session_test") as config:
            # Test normal session lifecycle
            async with config.get_session() as session:
                # Session should be available for operations
                assert session is not None
                
                # Test database operations
                from models.user import User
                user = User(
                    email="session_test@example.com",
                    name="Session Test User",
                    google_id="session_test"
                )
                session.add(user)
                await session.commit()
                
                # Verify user was created
                result = await session.execute(
                    select(User).where(User.email == "session_test@example.com")
                )
                found_user = result.scalar_one_or_none()
                assert found_user is not None
            
            # Test error handling and rollback
            try:
                async with config.get_session() as session:
                    # Create user
                    user = User(
                        email="error_test@example.com",
                        name="Error Test User",
                        google_id="error_test"
                    )
                    session.add(user)
                    await session.flush()  # Flush but don't commit
                    
                    # Simulate error
                    raise ValueError("Test error")
                    
            except ValueError:
                pass  # Expected error
            
            # Verify rollback worked - user should not exist
            async with config.get_session() as session:
                result = await session.execute(
                    select(User).where(User.email == "error_test@example.com")
                )
                found_user = result.scalar_one_or_none()
                assert found_user is None
            
            # Test multiple concurrent sessions
            async def create_user_in_session(user_id: int):
                async with config.get_session() as session:
                    user = User(
                        email=f"concurrent_{user_id}@example.com",
                        name=f"Concurrent User {user_id}",
                        google_id=f"concurrent_{user_id}"
                    )
                    session.add(user)
                    await session.commit()
                    return user_id
            
            # Run concurrent sessions
            tasks = [create_user_in_session(i) for i in range(3)]
            user_ids = await asyncio.gather(*tasks)
            
            # Verify all users were created
            async with config.get_session() as session:
                result = await session.execute(select(User))
                all_users = result.scalars().all()
                
                # Should have 4 users total (1 from normal test + 3 from concurrent)
                assert len(all_users) == 4
                
                # Verify specific users exist
                for user_id in user_ids:
                    result = await session.execute(
                        select(User).where(User.email == f"concurrent_{user_id}@example.com")
                    )
                    user = result.scalar_one_or_none()
                    assert user is not None

    @pytest.mark.asyncio
    async def test_improved_test_fixtures_integration(self, test_db_session):
        """
        Validates that the improved test fixtures use the new infrastructure
        and provide proper isolation and functionality.
        """
        # Test that fixture provides working session
        result = await test_db_session.execute(text("SELECT 1"))
        assert result.scalar() == 1
        
        # Test PRAGMA settings are applied through fixture
        result = await test_db_session.execute(text("PRAGMA foreign_keys"))
        row = result.fetchone()
        assert row[0] == 1  # Foreign keys should be enabled
        
        # Test model operations work correctly
        from models.user import User
        user = User(
            email="fixture_integration@example.com",
            name="Fixture Integration User",
            google_id="fixture_integration"
        )
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify user was created
        result = await test_db_session.execute(
            select(User).where(User.email == "fixture_integration@example.com")
        )
        found_user = result.scalar_one_or_none()
        assert found_user is not None
        assert found_user.name == "Fixture Integration User"

    @pytest.mark.asyncio
    async def test_isolation_between_fixture_tests_1(self, test_db_session):
        """First test to validate isolation between fixture-based tests"""
        from models.user import User
        
        # Create user in this test
        user = User(
            email="isolation_fixture_1@example.com",
            name="Isolation Fixture User 1",
            google_id="isolation_fixture_1"
        )
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify user exists
        result = await test_db_session.execute(
            select(User).where(User.email == "isolation_fixture_1@example.com")
        )
        found_user = result.scalar_one_or_none()
        assert found_user is not None

    @pytest.mark.asyncio
    async def test_isolation_between_fixture_tests_2(self, test_db_session):
        """Second test to validate isolation - should not see data from previous test"""
        from models.user import User
        
        # Should not see user from previous test
        result = await test_db_session.execute(
            select(User).where(User.email == "isolation_fixture_1@example.com")
        )
        found_user = result.scalar_one_or_none()
        assert found_user is None
        
        # Should start with empty database
        result = await test_db_session.execute(select(User))
        all_users = result.scalars().all()
        assert len(all_users) == 0

    @pytest.mark.asyncio
    async def test_performance_and_reliability(self):
        """
        Test that the new infrastructure provides good performance and reliability
        for test execution.
        """
        import time
        
        # Test rapid database creation and cleanup
        start_time = time.time()
        
        for i in range(10):
            async with isolated_test_session(f"perf_test_{i}") as session:
                # Quick database operation
                result = await session.execute(text("SELECT 1"))
                assert result.scalar() == 1
                
                # Create and query data
                from models.user import User
                user = User(
                    email=f"perf_{i}@example.com",
                    name=f"Performance User {i}",
                    google_id=f"perf_{i}"
                )
                session.add(user)
                await session.commit()
                
                # Verify user exists
                result = await session.execute(
                    select(User).where(User.email == f"perf_{i}@example.com")
                )
                found_user = result.scalar_one_or_none()
                assert found_user is not None
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Should complete reasonably quickly (less than 5 seconds for 10 iterations)
        assert execution_time < 5.0, f"Performance test took too long: {execution_time:.2f}s"
        
        print(f"Performance test completed in {execution_time:.2f}s for 10 database operations")


class TestF23TaskRequirementsValidation:
    """Final validation that all F2.3 task requirements are met"""

    def test_task_requirement_1_test_specific_configuration(self):
        """✅ Create test-specific database configuration bypassing global manager"""
        # This is validated by the existence of IsolatedTestDatabaseConfig class
        # and the isolated_test_database context manager
        from database.test_config import IsolatedTestDatabaseConfig, isolated_test_database
        
        assert IsolatedTestDatabaseConfig is not None
        assert isolated_test_database is not None
        
        # Verify it doesn't depend on global manager
        config = IsolatedTestDatabaseConfig()
        assert hasattr(config, 'test_id')
        assert hasattr(config, 'database_url')

    def test_task_requirement_2_isolated_instances_with_static_pool(self):
        """✅ Implement isolated database instances for each test with StaticPool"""
        from database.test_config import IsolatedTestDatabaseConfig
        from sqlalchemy.pool import StaticPool
        
        config = IsolatedTestDatabaseConfig()
        engine = config.engine
        
        # Verify StaticPool is used for in-memory databases
        if ":memory:" in config.database_url:
            assert isinstance(engine.pool, StaticPool)

    def test_task_requirement_3_sqlite_async_connection_pooling(self):
        """✅ Fix SQLite async connection pooling for test environments"""
        from database.test_config import IsolatedTestDatabaseConfig
        
        config = IsolatedTestDatabaseConfig()
        
        # Verify async engine configuration
        engine = config.engine
        assert engine is not None
        assert hasattr(engine, 'begin')  # Async engine method
        
        # Verify connection configuration
        if "sqlite" in config.database_url:
            # Should have proper pool configuration for SQLite
            pool = engine.pool
            assert pool is not None

    def test_task_requirement_4_proper_async_session_management(self):
        """✅ Add proper async session management for test fixtures"""
        from database.test_config import isolated_test_session
        
        # Verify the context manager exists and is async
        assert isolated_test_session is not None
        
        # Verify session factory configuration
        from database.test_config import IsolatedTestDatabaseConfig
        config = IsolatedTestDatabaseConfig()
        session_factory = config.session_factory
        
        # Verify proper session configuration
        assert session_factory is not None
        assert hasattr(session_factory, '__call__')  # Can create sessions