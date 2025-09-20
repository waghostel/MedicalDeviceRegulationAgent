# Testing Patterns and Architecture Guide

Generated: 2025-09-13 21:52:28

## Test Organization Patterns

### Directory Structure

```
tests/
├── fixtures/           # Reusable test fixtures
├── integration/        # Integration tests
│   ├── api/           # API endpoint tests
│   ├── database/      # Database integration
│   └── services/      # Service integration
├── unit/              # Unit tests
│   ├── models/        # Model unit tests
│   ├── services/      # Service unit tests
│   └── utils/         # Utility unit tests
├── performance/       # Performance tests
├── security/          # Security tests
└── utils/             # Test utilities
```

### Fixture Patterns

#### Database Fixtures

```python
@pytest_asyncio.fixture(scope="function")
async def test_db_session():
    # Isolated database per test
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    # ... setup and cleanup
```

#### Data Factory Pattern

```python
class TestDataFactory:
    def __init__(self, session):
        self.session = session
        self.created_entities = []

    async def create_user(self, **kwargs):
        # Create user with defaults and track for cleanup
        pass
```

### Service Testing Patterns

#### Dependency Injection Pattern

```python
class ServiceUnderTest:
    def __init__(self, dependency: Dependency = None):
        self.dependency = dependency or get_default_dependency()

# In tests
def test_service(mock_dependency):
    service = ServiceUnderTest(dependency=mock_dependency)
    # Test with controlled dependency
```

#### Mock Service Factory Pattern

```python
@pytest.fixture
def mock_external_service():
    service = Mock()
    service.method.return_value = expected_result
    return service
```

## API Testing Patterns

### TestClient Pattern (Recommended)

```python
def test_endpoint(test_client):
    response = test_client.get("/api/endpoint")
    assert response.status_code == 200
```

### Authentication Patterns

```python
@pytest.fixture
def authenticated_client():
    token = create_test_jwt_token(user_data)
    client = TestClient(app)
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
```

## Error Testing Patterns

### Exception Testing

```python
def test_service_error_handling():
    with pytest.raises(SpecificException) as exc_info:
        service.method_that_should_fail()
    assert "expected error message" in str(exc_info.value)
```

### API Error Testing

```python
def test_api_validation_error(test_client):
    response = test_client.post("/api/endpoint", json={"invalid": "data"})
    assert response.status_code == 422
    assert "validation error details" in response.json()
```
