"""
Test configuration and fixtures for Medical Device Regulatory Assistant Backend

This module provides centralized test environment configuration and database fixtures
that ensure proper isolation and cleanup for all tests.

Key Features:
- Centralized environment variable configuration
- Isolated in-memory database for each test function
- Proper async session management with StaticPool
- Bypasses global database manager for test isolation
- Comprehensive cleanup and resource management
"""

import os
import asyncio
import pytest
import pytest_asyncio
import uuid
from typing import AsyncGenerator, Dict, Any
from pathlib import Path
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from models.base import Base


# Configure pytest-asyncio
pytest_plugins = ('pytest_asyncio',)


@pytest.fixture(scope="session", autouse=True)
def setup_test_environment():
    """
    Centralized test environment configuration.
    
    Sets all necessary environment variables before any tests run to ensure
    consistent configuration across all test executions.
    
    This fixture runs automatically for all tests and provides:
    - TESTING flag to indicate test environment
    - In-memory SQLite database URL
    - Disabled Redis for testing
    - Test JWT secret
    - Other test-specific configurations
    """
    # Store original environment values for restoration
    original_env = {}
    test_env_vars = {
        "TESTING": "true",
        "DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "REDIS_URL": "",  # Disable Redis for testing
        "JWT_SECRET": "test_secret_key_for_testing_only",
        "FDA_API_KEY": "test_fda_api_key",
        "LOG_LEVEL": "WARNING",  # Reduce log noise in tests
        "ENVIRONMENT": "test"
    }
    
    # Save original values and set test values
    for key, value in test_env_vars.items():
        original_env[key] = os.environ.get(key)
        os.environ[key] = value
    
    yield
    
    # Restore original environment values
    for key, original_value in original_env.items():
        if original_value is None:
            os.environ.pop(key, None)
        else:
            os.environ[key] = original_value


@pytest_asyncio.fixture(scope="function")
async def test_db_session() -> AsyncGenerator[AsyncSession, None]:
    """
    Provide completely isolated database session for each test function.
    
    This fixture creates a new, isolated in-memory SQLite database for each test,
    bypassing the global database manager entirely. It uses StaticPool for proper
    in-memory database handling and ensures complete cleanup after each test.
    
    Key features:
    - Creates isolated in-memory database per test
    - Uses StaticPool for SQLite in-memory databases
    - Bypasses global database manager for isolation
    - Automatic table creation and cleanup
    - Proper async session lifecycle management
    
    Returns:
        AsyncSession: Isolated database session for the test
    """
    # Create unique engine for this test with StaticPool
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={"check_same_thread": False},
        echo=False  # Set to True for SQL debugging
    )
    
    try:
        # Create all tables in the test database
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Create session factory
        async_session = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        
        # Provide session to test
        async with async_session() as session:
            yield session
            
    finally:
        # Ensure proper cleanup
        await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_data_factory(test_db_session: AsyncSession):
    """
    Provide test data factory for creating test entities.
    
    This fixture provides a factory for creating test data with automatic
    cleanup tracking. All created entities are tracked and can be cleaned
    up automatically.
    
    Args:
        test_db_session: Isolated database session
        
    Returns:
        TestDataFactory: Factory for creating test data
    """
    from datetime import datetime
    
    class TestDataFactory:
        def __init__(self, session: AsyncSession):
            self.session = session
            self.created_entities = []
        
        async def create_user(self, **kwargs) -> 'User':
            """Create a test user with default values"""
            from models.user import User
            
            default_data = {
                "google_id": f"test_user_{uuid.uuid4()}",
                "email": f"test_{uuid.uuid4()}@example.com",
                "name": "Test User",
                **kwargs
            }
            
            user = User(**default_data)
            self.session.add(user)
            await self.session.flush()  # Get ID without committing
            
            self.created_entities.append(('user', user.id))
            return user
        
        async def create_project(self, user_id: int, **kwargs) -> 'Project':
            """Create a test project with default values"""
            from models.project import Project, ProjectStatus
            
            default_data = {
                "user_id": user_id,
                "name": f"Test Project {uuid.uuid4()}",
                "description": "Test project description",
                "device_type": "Test Device",
                "intended_use": "Test intended use",
                "status": ProjectStatus.DRAFT,
                **kwargs
            }
            
            project = Project(**default_data)
            self.session.add(project)
            await self.session.flush()
            
            self.created_entities.append(('project', project.id))
            return project
        
        async def create_predicate_device(self, project_id: int, **kwargs) -> 'PredicateDevice':
            """Create a test predicate device with default values"""
            from models.predicate_device import PredicateDevice
            from datetime import date
            
            default_data = {
                "project_id": project_id,
                "k_number": f"K{uuid.uuid4().hex[:6].upper()}",
                "device_name": "Test Predicate Device",
                "intended_use": "Test predicate intended use",
                "product_code": "ABC",
                "clearance_date": date.today(),
                "confidence_score": 0.85,
                **kwargs
            }
            
            predicate = PredicateDevice(**default_data)
            self.session.add(predicate)
            await self.session.flush()
            
            self.created_entities.append(('predicate_device', predicate.id))
            return predicate
    
    factory = TestDataFactory(test_db_session)
    yield factory


@pytest_asyncio.fixture(scope="function")
async def sample_user(test_data_factory):
    """Create a sample user for testing"""
    return await test_data_factory.create_user(
        email="test@example.com",
        name="Test User",
        google_id="google_test_123"
    )


@pytest_asyncio.fixture(scope="function")
async def sample_project(test_data_factory, sample_user):
    """Create a sample project for testing"""
    return await test_data_factory.create_project(
        user_id=sample_user.id,
        name="Test Device",
        description="A test medical device",
        device_type="Class II",
        intended_use="For testing purposes"
    )


@pytest.fixture(scope="function")
def test_client():
    """
    Create a TestClient for FastAPI application testing.
    
    Uses FastAPI's recommended TestClient pattern instead of httpx.AsyncClient
    for simpler, more reliable API endpoint testing.
    
    Returns:
        TestClient: Synchronous test client for API testing
    """
    from main import app
    
    with TestClient(app) as client:
        yield client


@pytest.fixture(scope="function")
def authenticated_test_client():
    """
    Create a TestClient with authentication headers for testing protected endpoints.
    
    Provides a test client with valid JWT token headers for testing
    authenticated API endpoints.
    
    Returns:
        TestClient: Test client with authentication headers
    """
    from main import app
    import jwt
    from datetime import datetime, timedelta, timezone
    
    # Create test JWT token
    payload = {
        "sub": "test_user_id",
        "email": "test@example.com",
        "name": "Test User",
        "exp": datetime.now(tz=timezone.utc) + timedelta(hours=1)
    }
    
    token = jwt.encode(payload, "test_secret_key_for_testing_only", algorithm="HS256")
    
    with TestClient(app) as client:
        client.headers.update({"Authorization": f"Bearer {token}"})
        yield client


@pytest_asyncio.fixture(scope="function")
async def mock_services():
    """
    Provide mock services for external dependencies.
    
    Creates mock instances of external services (OpenFDA, Redis, etc.)
    to prevent tests from making actual external API calls.
    
    Returns:
        Dict[str, Any]: Dictionary of mock service instances
    """
    from unittest.mock import AsyncMock, Mock
    
    # Mock OpenFDA service
    mock_openfda = AsyncMock()
    mock_openfda.search_predicates.return_value = [
        {
            "k_number": "K123456",
            "device_name": "Test Device",
            "intended_use": "Test indication",
            "product_code": "ABC",
            "clearance_date": "2023-01-01"
        }
    ]
    mock_openfda.get_device_details.return_value = {
        "k_number": "K123456",
        "device_name": "Test Device",
        "detailed_info": "Additional device information"
    }
    mock_openfda.health_check.return_value = {
        "healthy": True,
        "status": "connected"
    }
    
    # Mock Redis client
    mock_redis = AsyncMock()
    mock_redis.ping.return_value = True
    mock_redis.get.return_value = None
    mock_redis.set.return_value = True
    mock_redis.delete.return_value = 1
    mock_redis.exists.return_value = False
    mock_redis.info.return_value = {
        "redis_version": "7.0.0",
        "connected_clients": 1,
        "used_memory_human": "1.00M"
    }
    
    return {
        "openfda": mock_openfda,
        "redis": mock_redis
    }


# Legacy compatibility fixtures (deprecated - use new fixtures above)
@pytest_asyncio.fixture(scope="function")
async def test_session(test_db_session):
    """Legacy compatibility fixture - use test_db_session instead"""
    import warnings
    warnings.warn(
        "test_session fixture is deprecated. Use test_db_session instead.",
        DeprecationWarning,
        stacklevel=2
    )
    yield test_db_session


@pytest_asyncio.fixture(scope="function")
async def async_client():
    """Legacy compatibility fixture - use test_client instead"""
    import warnings
    warnings.warn(
        "async_client fixture is deprecated. Use test_client instead for API testing.",
        DeprecationWarning,
        stacklevel=2
    )
    import httpx
    async with httpx.AsyncClient() as client:
        yield client