"""
Test configuration and fixtures
"""

import asyncio
import pytest
import pytest_asyncio
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from models.base import Base
from database.connection import DatabaseManager
from database.config import DatabaseConfig


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for the test session."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="function")
async def test_db_config():
    """Test database configuration"""
    return DatabaseConfig(
        database_url="sqlite+aiosqlite:///:memory:",
        pool_size=1,
        max_overflow=0,
    )


@pytest_asyncio.fixture(scope="function")
async def test_db_manager(test_db_config):
    """Test database manager with in-memory database"""
    manager = DatabaseManager(test_db_config)
    
    # Create tables
    await manager.create_tables()
    
    yield manager
    
    # Cleanup
    await manager.close()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_db_manager):
    """Test database session"""
    async with test_db_manager.get_session() as session:
        yield session


@pytest_asyncio.fixture(scope="function")
async def sample_user(test_session):
    """Create a sample user for testing"""
    from models.user import User
    
    user = User(
        email="test@example.com",
        name="Test User",
        google_id="google_test_123"
    )
    test_session.add(user)
    await test_session.flush()
    return user


@pytest_asyncio.fixture(scope="function")
async def sample_project(test_session, sample_user):
    """Create a sample project for testing"""
    from models.project import Project, ProjectStatus
    
    project = Project(
        user_id=sample_user.id,
        name="Test Device",
        description="A test medical device",
        device_type="Class II",
        intended_use="For testing purposes",
        status=ProjectStatus.DRAFT
    )
    test_session.add(project)
    await test_session.flush()
    return project