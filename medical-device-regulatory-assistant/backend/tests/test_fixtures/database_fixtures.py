"""
Database-specific test fixtures for mock data testing framework
"""

import asyncio
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union, Callable
from dataclasses import dataclass, field
from contextlib import asynccontextmanager
from pathlib import Path

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from sqlalchemy import text

from models.base import Base
from database.connection import DatabaseManager
from database.config import DatabaseConfig
from .project_fixtures import ProjectFixture, create_multiple_project_fixtures
from .user_fixtures import UserFixture, create_multiple_user_fixtures


logger = logging.getLogger(__name__)


@dataclass
class DatabaseFixture:
    """Comprehensive database fixture for testing"""
    
    # Database components
    manager: DatabaseManager
    config: DatabaseConfig
    session_factory: async_sessionmaker
    
    # Test data
    users: List[UserFixture] = field(default_factory=list)
    projects: List[ProjectFixture] = field(default_factory=list)
    
    # Metadata
    fixture_name: str = "default"
    description: str = ""
    tags: List[str] = field(default_factory=list)
    
    # Test configuration
    auto_cleanup: bool = True
    isolation_level: str = "READ_COMMITTED"
    enable_foreign_keys: bool = True
    
    # State tracking
    is_initialized: bool = False
    is_seeded: bool = False
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))


class DatabaseFixtureManager:
    """Manager for database fixtures with cleanup and isolation"""
    
    def __init__(self):
        self.active_fixtures: Dict[str, DatabaseFixture] = {}
        self.cleanup_callbacks: List[Callable] = []
    
    async def create_fixture(
        self,
        fixture_name: str = "test_db",
        in_memory: bool = True,
        enable_logging: bool = False,
        **config_overrides
    ) -> DatabaseFixture:
        """
        Create a new database fixture with isolated environment
        
        Args:
            fixture_name: Unique name for the fixture
            in_memory: Use in-memory SQLite database
            enable_logging: Enable SQL query logging
            **config_overrides: Additional database configuration
        """
        
        if fixture_name in self.active_fixtures:
            raise ValueError(f"Database fixture '{fixture_name}' already exists")
        
        # Create database configuration
        if in_memory:
            database_url = "sqlite+aiosqlite:///:memory:"
        else:
            database_url = f"sqlite+aiosqlite:///test_{fixture_name}.db"
        
        config = DatabaseConfig(
            database_url=database_url,
            pool_size=1,
            max_overflow=0,
            **config_overrides
        )
        
        # Create database manager
        manager = DatabaseManager(config)
        
        # Create tables
        await manager.create_tables()
        
        # Create session factory
        session_factory = async_sessionmaker(
            manager.engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Create fixture
        fixture = DatabaseFixture(
            manager=manager,
            config=config,
            session_factory=session_factory,
            fixture_name=fixture_name,
            description=f"Test database fixture: {fixture_name}",
            tags=["database", "fixture", "test"]
        )
        
        fixture.is_initialized = True
        
        # Register fixture
        self.active_fixtures[fixture_name] = fixture
        
        # Register cleanup callback
        self.cleanup_callbacks.append(lambda: self._cleanup_fixture(fixture_name))
        
        logger.info(f"Created database fixture: {fixture_name}")
        return fixture
    
    async def seed_fixture(
        self,
        fixture: DatabaseFixture,
        user_count: int = 3,
        project_count: int = 5,
        custom_users: Optional[List[UserFixture]] = None,
        custom_projects: Optional[List[ProjectFixture]] = None
    ) -> None:
        """
        Seed database fixture with test data
        
        Args:
            fixture: Database fixture to seed
            user_count: Number of users to create
            project_count: Number of projects to create
            custom_users: Custom user fixtures to use
            custom_projects: Custom project fixtures to use
        """
        
        if not fixture.is_initialized:
            raise ValueError("Database fixture not initialized")
        
        async with fixture.session_factory() as session:
            try:
                # Create users
                if custom_users:
                    fixture.users = custom_users
                else:
                    fixture.users = create_multiple_user_fixtures(user_count)
                
                # Insert users into database
                for user_fixture in fixture.users:
                    session.add(user_fixture.user)
                
                await session.flush()  # Get user IDs
                
                # Create projects
                if custom_projects:
                    fixture.projects = custom_projects
                else:
                    fixture.projects = create_multiple_project_fixtures(project_count)
                
                # Assign projects to users (round-robin)
                for i, project_fixture in enumerate(fixture.projects):
                    user_fixture = fixture.users[i % len(fixture.users)]
                    project_fixture.project.user_id = user_fixture.user.id
                    
                    # Insert project
                    session.add(project_fixture.project)
                
                await session.flush()  # Get project IDs
                
                # Insert related data (classifications, predicates, interactions)
                for project_fixture in fixture.projects:
                    # Update foreign keys for related data
                    for classification in project_fixture.classifications:
                        classification.project_id = project_fixture.project.id
                        session.add(classification)
                    
                    for predicate in project_fixture.predicate_devices:
                        predicate.project_id = project_fixture.project.id
                        session.add(predicate)
                    
                    for interaction in project_fixture.agent_interactions:
                        interaction.project_id = project_fixture.project.id
                        # Find corresponding user
                        for user_fixture in fixture.users:
                            if user_fixture.user.id == project_fixture.project.user_id:
                                interaction.user_id = user_fixture.user.id
                                break
                        session.add(interaction)
                
                await session.commit()
                fixture.is_seeded = True
                
                logger.info(f"Seeded database fixture '{fixture.fixture_name}' with {len(fixture.users)} users and {len(fixture.projects)} projects")
                
            except Exception as e:
                await session.rollback()
                logger.error(f"Failed to seed database fixture '{fixture.fixture_name}': {e}")
                raise
    
    async def get_fixture(self, fixture_name: str) -> Optional[DatabaseFixture]:
        """Get an existing database fixture"""
        return self.active_fixtures.get(fixture_name)
    
    async def cleanup_fixture(self, fixture_name: str) -> None:
        """Clean up a specific database fixture"""
        await self._cleanup_fixture(fixture_name)
    
    async def cleanup_all_fixtures(self) -> None:
        """Clean up all active database fixtures"""
        for callback in self.cleanup_callbacks:
            try:
                await callback()
            except Exception as e:
                logger.error(f"Error during fixture cleanup: {e}")
        
        self.active_fixtures.clear()
        self.cleanup_callbacks.clear()
    
    async def _cleanup_fixture(self, fixture_name: str) -> None:
        """Internal cleanup method for a specific fixture"""
        fixture = self.active_fixtures.get(fixture_name)
        if not fixture:
            return
        
        try:
            # Close database connections
            await fixture.manager.close()
            
            # Remove from active fixtures
            del self.active_fixtures[fixture_name]
            
            logger.info(f"Cleaned up database fixture: {fixture_name}")
            
        except Exception as e:
            logger.error(f"Error cleaning up fixture '{fixture_name}': {e}")
    
    @asynccontextmanager
    async def fixture_session(self, fixture_name: str):
        """Context manager for database sessions with automatic cleanup"""
        fixture = self.active_fixtures.get(fixture_name)
        if not fixture:
            raise ValueError(f"Database fixture '{fixture_name}' not found")
        
        async with fixture.session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()


# Global fixture manager instance
_fixture_manager = DatabaseFixtureManager()


# Convenience functions
async def create_database_fixture(
    fixture_name: str = "test_db",
    seed_data: bool = True,
    user_count: int = 3,
    project_count: int = 5,
    **kwargs
) -> DatabaseFixture:
    """
    Create and optionally seed a database fixture
    
    Args:
        fixture_name: Unique name for the fixture
        seed_data: Whether to seed with test data
        user_count: Number of users to create
        project_count: Number of projects to create
        **kwargs: Additional configuration options
    """
    
    fixture = await _fixture_manager.create_fixture(fixture_name, **kwargs)
    
    if seed_data:
        await _fixture_manager.seed_fixture(
            fixture,
            user_count=user_count,
            project_count=project_count
        )
    
    return fixture


async def get_database_fixture(fixture_name: str) -> Optional[DatabaseFixture]:
    """Get an existing database fixture"""
    return await _fixture_manager.get_fixture(fixture_name)


async def cleanup_database_fixture(fixture_name: str) -> None:
    """Clean up a specific database fixture"""
    await _fixture_manager.cleanup_fixture(fixture_name)


async def cleanup_all_database_fixtures() -> None:
    """Clean up all database fixtures"""
    await _fixture_manager.cleanup_all_fixtures()


@asynccontextmanager
async def database_fixture_session(fixture_name: str):
    """Context manager for database fixture sessions"""
    async with _fixture_manager.fixture_session(fixture_name) as session:
        yield session


# Test utilities for database operations
class DatabaseTestUtils:
    """Utility class for database testing operations"""
    
    @staticmethod
    async def count_records(session: AsyncSession, table_name: str) -> int:
        """Count records in a table"""
        result = await session.execute(text(f"SELECT COUNT(*) FROM {table_name}"))
        return result.scalar()
    
    @staticmethod
    async def clear_table(session: AsyncSession, table_name: str) -> None:
        """Clear all records from a table"""
        await session.execute(text(f"DELETE FROM {table_name}"))
        await session.commit()
    
    @staticmethod
    async def verify_foreign_keys(session: AsyncSession) -> List[Dict[str, Any]]:
        """Verify foreign key constraints"""
        result = await session.execute(text("PRAGMA foreign_key_check"))
        violations = result.fetchall()
        return [dict(row._mapping) for row in violations]
    
    @staticmethod
    async def get_table_info(session: AsyncSession, table_name: str) -> List[Dict[str, Any]]:
        """Get table schema information"""
        result = await session.execute(text(f"PRAGMA table_info({table_name})"))
        columns = result.fetchall()
        return [dict(row._mapping) for row in columns]
    
    @staticmethod
    async def execute_raw_sql(session: AsyncSession, sql: str, params: Optional[Dict] = None) -> Any:
        """Execute raw SQL query"""
        result = await session.execute(text(sql), params or {})
        return result


# Predefined database fixtures for common scenarios
async def create_minimal_database_fixture() -> DatabaseFixture:
    """Create a minimal database fixture with basic data"""
    return await create_database_fixture(
        fixture_name="minimal_db",
        user_count=1,
        project_count=1
    )


async def create_comprehensive_database_fixture() -> DatabaseFixture:
    """Create a comprehensive database fixture with extensive data"""
    return await create_database_fixture(
        fixture_name="comprehensive_db",
        user_count=10,
        project_count=20
    )


async def create_performance_database_fixture() -> DatabaseFixture:
    """Create a database fixture for performance testing"""
    return await create_database_fixture(
        fixture_name="performance_db",
        user_count=50,
        project_count=200
    )


# Export utilities
database_test_utils = DatabaseTestUtils()

__all__ = [
    'DatabaseFixture',
    'DatabaseFixtureManager',
    'create_database_fixture',
    'get_database_fixture',
    'cleanup_database_fixture',
    'cleanup_all_database_fixtures',
    'database_fixture_session',
    'database_test_utils',
    'create_minimal_database_fixture',
    'create_comprehensive_database_fixture',
    'create_performance_database_fixture'
]