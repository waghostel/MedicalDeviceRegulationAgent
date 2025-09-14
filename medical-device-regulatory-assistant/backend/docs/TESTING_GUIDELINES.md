# Testing Guidelines for Medical Device Regulatory Assistant Backend

## Overview

This document provides guidelines for writing tests in the Medical Device Regulatory Assistant backend. It outlines the new centralized test environment and isolated database fixtures that ensure reliable, fast, and maintainable tests.

## Key Principles

### 1. Avoid Global State in Tests

**❌ DO NOT:**
- Use the global `db_manager` instance in tests
- Share database connections between tests
- Rely on external state or configuration

**✅ DO:**
- Use the provided `test_db_session` fixture for all database operations
- Create isolated test data using the `test_data_factory` fixture
- Ensure each test is completely independent

### 2. Use Centralized Test Environment

All tests automatically run with a centralized test environment that provides:
- `TESTING=true` environment variable
- In-memory SQLite database (`sqlite+aiosqlite:///:memory:`)
- Disabled Redis (`REDIS_URL=""`)
- Test JWT secret
- Reduced logging noise

### 3. Database Testing Best Practices

#### Use Isolated Database Sessions

```python
@pytest.mark.asyncio
async def test_user_creation(test_db_session, test_data_factory):
    """Example of proper database testing"""
    # Create test data using the factory
    user = await test_data_factory.create_user(
        email="test@example.com",
        name="Test User"
    )
    await test_db_session.commit()
    
    # Verify the user was created
    assert user.id is not None
    assert user.email == "test@example.com"
```

#### Use Test Data Factory

The `test_data_factory` fixture provides methods to create test entities:

```python
# Create a user
user = await test_data_factory.create_user(email="test@example.com")

# Create a project for the user
project = await test_data_factory.create_project(
    user_id=user.id,
    name="Test Project"
)

# Create a predicate device for the project
predicate = await test_data_factory.create_predicate_device(
    project_id=project.id,
    k_number="K123456"
)
```

### 4. HTTP Client Testing

#### Use TestClient for API Testing

**❌ DO NOT:**
```python
# Don't use httpx.AsyncClient with FastAPI apps
async with httpx.AsyncClient(app=app) as client:
    response = await client.get("/api/endpoint")
```

**✅ DO:**
```python
def test_api_endpoint(test_client):
    """Use TestClient for synchronous API testing"""
    response = test_client.get("/api/endpoint")
    assert response.status_code == 200
```

#### Use Authentication Fixtures

```python
def test_protected_endpoint(authenticated_test_client):
    """Test protected endpoints with authentication"""
    response = authenticated_test_client.get("/api/protected")
    assert response.status_code == 200
```

### 5. Mock External Services

Use the `mock_services` fixture for external dependencies:

```python
@pytest.mark.asyncio
async def test_fda_integration(mock_services):
    """Test with mocked external services"""
    openfda_mock = mock_services["openfda"]
    
    # Mock returns predefined data
    results = await openfda_mock.search_predicates("test device")
    assert len(results) == 1
    assert results[0]["k_number"] == "K123456"
```

## Available Fixtures

### Core Fixtures

- `test_db_session`: Isolated database session for each test
- `test_data_factory`: Factory for creating test entities
- `test_client`: FastAPI TestClient for API testing
- `authenticated_test_client`: TestClient with authentication headers
- `mock_services`: Mock external services (OpenFDA, Redis, etc.)

### Sample Data Fixtures

- `sample_user`: Pre-created test user
- `sample_project`: Pre-created test project (requires sample_user)

### Legacy Fixtures (Deprecated)

- `test_session`: Use `test_db_session` instead
- `async_client`: Use `test_client` instead

## Test Utilities

### APITestUtils

```python
from tests.test_utils import APITestUtils

def test_api_response(test_client):
    response = test_client.get("/api/endpoint")
    
    # Assert successful response
    data = APITestUtils.assert_success_response(response, 200)
    
    # Assert error response
    error_data = APITestUtils.assert_error_response(response, 400, "VALIDATION_ERROR")
    
    # Assert validation error
    validation_data = APITestUtils.assert_validation_error(response, "email")
```

### DatabaseTestUtils

```python
from tests.test_utils import DatabaseTestUtils

@pytest.mark.asyncio
async def test_database_operations(test_db_session):
    from models.user import User
    
    # Count records
    count = await DatabaseTestUtils.count_records(test_db_session, User)
    
    # Get record by ID
    user = await DatabaseTestUtils.get_record_by_id(test_db_session, User, user_id)
    
    # Delete all records (for cleanup)
    deleted_count = await DatabaseTestUtils.delete_all_records(test_db_session, User)
```

## Test Organization

### Directory Structure

```
tests/
├── conftest.py                 # Central test configuration
├── test_utils.py              # Test utilities and helpers
├── unit/                      # Unit tests
│   ├── models/               # Model tests
│   ├── services/             # Service tests
│   └── utils/                # Utility tests
├── integration/              # Integration tests
│   ├── api/                  # API endpoint tests
│   ├── database/             # Database integration tests
│   └── services/             # Service integration tests
└── fixtures/                 # Test fixtures and data
```

### Naming Conventions

- Test files: `test_*.py`
- Test functions: `test_*`
- Test classes: `Test*`
- Async tests: Use `@pytest.mark.asyncio` decorator

## Common Patterns

### Testing Database Models

```python
@pytest.mark.asyncio
async def test_user_model(test_db_session, test_data_factory):
    """Test user model creation and validation"""
    user = await test_data_factory.create_user(
        email="test@example.com",
        name="Test User"
    )
    await test_db_session.commit()
    
    # Test model attributes
    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.created_at is not None
    
    # Test model methods
    user_dict = user.to_dict()
    assert "email" in user_dict
    assert user_dict["email"] == "test@example.com"
```

### Testing API Endpoints

```python
def test_create_user_endpoint(test_client):
    """Test user creation endpoint"""
    user_data = {
        "email": "test@example.com",
        "name": "Test User"
    }
    
    response = test_client.post("/api/users", json=user_data)
    
    from tests.test_utils import APITestUtils
    data = APITestUtils.assert_success_response(response, 201)
    
    assert data["email"] == user_data["email"]
    assert data["name"] == user_data["name"]
    assert "id" in data
```

### Testing Services

```python
@pytest.mark.asyncio
async def test_user_service(test_db_session, test_data_factory):
    """Test user service functionality"""
    from services.user_service import UserService
    
    # Create service with test database session
    user_service = UserService(db_session=test_db_session)
    
    # Test service method
    user = await user_service.create_user(
        email="test@example.com",
        name="Test User"
    )
    
    assert user.id is not None
    assert user.email == "test@example.com"
```

## Performance Guidelines

### Test Execution Speed

- Target: Full test suite should complete in <60 seconds
- Individual tests should complete in <1 second
- Use in-memory databases for speed
- Mock external services to avoid network delays

### Resource Management

- Database sessions are automatically cleaned up
- No manual cleanup required for test data
- Each test gets a fresh, isolated database
- Memory usage is optimized through proper fixture scoping

## Debugging Tests

### Enable SQL Logging

```python
# In conftest.py, set echo=True for debugging
engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    poolclass=StaticPool,
    connect_args={"check_same_thread": False},
    echo=True  # Enable SQL logging
)
```

### Test Isolation Debugging

If tests are interfering with each other:

1. Verify you're using `test_db_session` fixture
2. Check that you're not using global database manager
3. Ensure proper async/await usage
4. Verify test data is created through `test_data_factory`

### Common Issues

#### "Session is already flushing" Error

This occurs when trying to use the same session concurrently:

```python
# ❌ Don't do this
async def concurrent_operations():
    tasks = [create_user_task(i) for i in range(5)]
    await asyncio.gather(*tasks)  # All use same session

# ✅ Do this instead
async def sequential_operations():
    for i in range(5):
        await create_user_task(i)  # Sequential operations
```

#### "Could not parse SQLAlchemy URL" Error

This indicates use of old database patterns:

```python
# ❌ Don't use global database manager in tests
from database.connection import get_database_manager
db_manager = get_database_manager()

# ✅ Use test fixtures instead
def test_something(test_db_session):
    # Use test_db_session for all database operations
```

## Migration from Old Test Patterns

### Before (Old Pattern)

```python
@pytest.fixture
async def test_db_manager():
    manager = DatabaseManager("sqlite:///:memory:")
    await manager.initialize()
    yield manager
    await manager.close()

async def test_old_pattern(test_db_manager):
    async with test_db_manager.get_session() as session:
        # Test code
```

### After (New Pattern)

```python
@pytest.mark.asyncio
async def test_new_pattern(test_db_session, test_data_factory):
    # Direct use of isolated session
    user = await test_data_factory.create_user()
    await test_db_session.commit()
    # Test code
```

## Conclusion

These guidelines ensure that all tests in the Medical Device Regulatory Assistant backend are:

- **Isolated**: Each test runs in complete isolation
- **Fast**: In-memory databases and proper mocking
- **Reliable**: No flaky tests due to shared state
- **Maintainable**: Clear patterns and utilities
- **Comprehensive**: Full coverage of functionality

By following these guidelines, developers can write robust tests that support the development of a reliable medical device regulatory assistant system.