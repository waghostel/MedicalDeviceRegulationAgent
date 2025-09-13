# Test Infrastructure Best Practices Guide

Generated: 2025-09-13 21:52:28

## Database Testing Best Practices

### Use Isolated Database Sessions
```python
@pytest_asyncio.fixture
async def test_with_database(test_db_session):
    # Each test gets a fresh, isolated database
    async with test_db_session as session:
        # Your test code here
        pass
```

### Create Test Data with Factory Pattern
```python
async def test_project_creation(test_data_factory):
    user = await test_data_factory.create_user()
    project = await test_data_factory.create_project(user_id=user.id)
    # Test data is automatically cleaned up
```

## API Testing Best Practices

### Use TestClient for Synchronous Testing
```python
def test_api_endpoint(test_client):
    response = test_client.get("/api/projects")
    assert response.status_code == 200
```

### Authentication Testing
```python
def test_protected_endpoint(authenticated_test_client):
    response = authenticated_test_client.post("/api/projects", json={"name": "Test"})
    assert response.status_code == 201
```

## Service Testing Best Practices

### Mock External Dependencies
```python
def test_service_with_mocks(mock_openfda_service):
    service = ProjectService(openfda_service=mock_openfda_service)
    result = await service.search_predicates("test device")
    assert len(result) > 0
```

### Use Dependency Injection
```python
class ProjectService:
    def __init__(self, db_manager: DatabaseManager = None):
        self._db_manager = db_manager or get_database_manager()
```

## Performance Best Practices

### Target Execution Times
- Unit tests: < 0.1s each
- Integration tests: < 2.0s each
- Full test suite: < 60s total

### Memory Management
- Use context managers for resource cleanup
- Avoid global state in tests
- Clean up async resources properly

## Error Handling Best Practices

### Test Error Scenarios
```python
def test_service_handles_api_error(mock_openfda_service_error):
    service = ProjectService(openfda_service=mock_openfda_service_error)
    with pytest.raises(FDAAPIError):
        await service.search_predicates("test device")
```

### Validate Error Messages
```python
def test_validation_error_message(test_client):
    response = test_client.post("/api/projects", json={})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
```
