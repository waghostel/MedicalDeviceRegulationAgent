"""
Test Maintenance Documentation Generator

This module generates comprehensive documentation for test infrastructure
maintenance, best practices, and troubleshooting guides.
"""

import os
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Any, Optional


class TestMaintenanceDocGenerator:
    """Generate comprehensive test maintenance documentation"""
    
    def __init__(self, backend_path: str = "."):
        self.backend_path = Path(backend_path)
        self.docs_path = self.backend_path / "tests" / "docs"
        self.docs_path.mkdir(parents=True, exist_ok=True)
    
    def generate_all_documentation(self) -> Dict[str, str]:
        """Generate all maintenance documentation"""
        docs = {}
        
        docs["best_practices"] = self.generate_best_practices_guide()
        docs["troubleshooting"] = self.generate_troubleshooting_guide()
        docs["patterns"] = self.generate_testing_patterns_guide()
        docs["performance"] = self.generate_performance_guide()
        docs["ci_cd"] = self.generate_ci_cd_guide()
        
        # Save all documentation
        for doc_name, content in docs.items():
            doc_path = self.docs_path / f"{doc_name}_guide.md"
            doc_path.write_text(content)
        
        return docs
    
    def generate_best_practices_guide(self) -> str:
        """Generate best practices guide"""
        return f"""# Test Infrastructure Best Practices Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

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
    response = authenticated_test_client.post("/api/projects", json={{"name": "Test"}})
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
    response = test_client.post("/api/projects", json={{}})
    assert response.status_code == 422
    assert "name" in response.json()["detail"][0]["loc"]
```
"""
    
    def generate_troubleshooting_guide(self) -> str:
        """Generate troubleshooting guide"""
        return f"""# Test Infrastructure Troubleshooting Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Common Issues and Solutions

### Database Connection Errors

#### Error: "Database manager not initialized"
**Cause**: Database manager not properly set up for testing
**Solution**:
```python
# Ensure test environment is configured
os.environ["TESTING"] = "true"
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
```

#### Error: "no such table: users"
**Cause**: Database tables not created in test database
**Solution**: Use `test_db_session` fixture which automatically creates tables

### Authentication Errors

#### Error: "Invalid JWT token"
**Cause**: Token creation or validation issues in tests
**Solution**:
```python
# Use proper test token creation
token = create_test_jwt_token({{"sub": "test_user", "email": "test@example.com"}})
headers = {{"Authorization": f"Bearer {{token}}"}}
```

### API Testing Errors

#### Error: "httpx.ConnectError: All connection attempts failed"
**Cause**: Using AsyncClient incorrectly with FastAPI
**Solution**: Use TestClient instead of AsyncClient for most API tests

### Performance Issues

#### Slow Test Execution
**Symptoms**: Tests taking longer than expected
**Solutions**:
1. Check for inefficient database queries
2. Verify proper cleanup in fixtures
3. Use pytest-benchmark to identify slow tests
4. Consider test parallelization

#### Memory Leaks
**Symptoms**: Increasing memory usage during test runs
**Solutions**:
1. Ensure proper async resource cleanup
2. Check for unclosed database connections
3. Use memory profiling tools
4. Verify fixture cleanup

### Service Integration Issues

#### Error: "Service not available"
**Cause**: External service dependencies not properly mocked
**Solution**: Use mock service fixtures for external dependencies

### CI/CD Issues

#### Tests Pass Locally but Fail in CI
**Causes and Solutions**:
1. Environment variables not set in CI
2. Different Python versions or dependencies
3. Timing issues in CI environment
4. Missing system dependencies

## Debugging Techniques

### Enable SQL Logging
```python
# In test fixtures, set echo=True
engine = create_async_engine(
    "sqlite+aiosqlite:///:memory:",
    echo=True  # Shows all SQL queries
)
```

### Memory Profiling
```python
import tracemalloc
tracemalloc.start()
# Run your test
current, peak = tracemalloc.get_traced_memory()
print(f"Memory usage: {{current / 1024 / 1024:.2f}} MB")
```

### Performance Profiling
```python
import cProfile
cProfile.run('your_test_function()')
```
"""
    
    def generate_testing_patterns_guide(self) -> str:
        """Generate testing patterns guide"""
        return f"""# Testing Patterns and Architecture Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

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
    client.headers.update({{"Authorization": f"Bearer {{token}}"}})
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
    response = test_client.post("/api/endpoint", json={{"invalid": "data"}})
    assert response.status_code == 422
    assert "validation error details" in response.json()
```
"""
    
    def generate_performance_guide(self) -> str:
        """Generate performance optimization guide"""
        return f"""# Test Performance Optimization Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## Performance Targets

### Execution Time Targets
- **Unit Tests**: < 0.1 seconds per test
- **Integration Tests**: < 2.0 seconds per test
- **Full Test Suite**: < 60 seconds total
- **CI/CD Pipeline**: < 5 minutes including setup

### Memory Usage Targets
- **Memory Growth**: < 10MB during test execution
- **Peak Memory**: < 500MB for full test suite
- **Memory Leaks**: 0 tolerance for persistent leaks

## Optimization Strategies

### Database Performance

#### Use In-Memory SQLite for Tests
```python
# Fast, isolated database for each test
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
```

#### Optimize Database Fixtures
```python
@pytest_asyncio.fixture(scope="session")
async def db_engine():
    # Reuse engine across tests in session
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        poolclass=StaticPool,
        connect_args={{"check_same_thread": False}}
    )
    return engine
```

#### Batch Database Operations
```python
async def create_test_data_batch(session, count=10):
    # Create multiple records in single transaction
    users = [User(name=f"user_{{i}}") for i in range(count)]
    session.add_all(users)
    await session.commit()
```

### Test Parallelization

#### Use pytest-xdist for Parallel Execution
```bash
# Install pytest-xdist
poetry add --group dev pytest-xdist

# Run tests in parallel
poetry run python -m pytest -n auto tests/
```

#### Configure Parallel-Safe Tests
```python
# Use unique identifiers for parallel tests
import uuid

def test_with_unique_data():
    unique_id = str(uuid.uuid4())
    # Use unique_id in test data
```

### Mock Optimization

#### Efficient Mock Setup
```python
@pytest.fixture(scope="session")
def mock_external_service():
    # Reuse mocks across tests when possible
    mock = Mock()
    mock.expensive_operation.return_value = cached_result
    return mock
```

#### Lazy Mock Loading
```python
class LazyMockService:
    def __init__(self):
        self._mock = None
    
    @property
    def mock(self):
        if self._mock is None:
            self._mock = create_expensive_mock()
        return self._mock
```

### Memory Optimization

#### Proper Resource Cleanup
```python
@pytest_asyncio.fixture
async def service_with_cleanup():
    service = ExpensiveService()
    try:
        yield service
    finally:
        await service.cleanup()  # Always cleanup
```

#### Avoid Global State
```python
# Bad: Global state persists between tests
global_cache = {{}}

# Good: Fresh state per test
@pytest.fixture
def fresh_cache():
    return {{}}
```

### Test Selection Optimization

#### Use Markers for Test Categories
```python
@pytest.mark.fast
def test_quick_operation():
    pass

@pytest.mark.slow
def test_expensive_operation():
    pass

# Run only fast tests during development
# poetry run python -m pytest -m fast
```

#### Skip Expensive Tests in Development
```python
@pytest.mark.skipif(
    os.getenv("SKIP_SLOW_TESTS") == "true",
    reason="Skipping slow tests in development"
)
def test_expensive_operation():
    pass
```

## Performance Monitoring

### Benchmark Critical Tests
```python
def test_critical_performance(benchmark):
    result = benchmark(expensive_function, arg1, arg2)
    assert result is not None
```

### Memory Profiling
```python
import tracemalloc

def test_memory_usage():
    tracemalloc.start()
    
    # Your test code here
    
    current, peak = tracemalloc.get_traced_memory()
    tracemalloc.stop()
    
    # Assert memory usage is within limits
    assert current < 10 * 1024 * 1024  # 10MB limit
```

### Performance Regression Detection
```python
# Store baseline performance metrics
PERFORMANCE_BASELINES = {{
    "test_predicate_search": 2.0,  # seconds
    "test_device_classification": 0.5,  # seconds
}}

def test_performance_regression():
    start_time = time.time()
    # Run test
    execution_time = time.time() - start_time
    
    baseline = PERFORMANCE_BASELINES["test_predicate_search"]
    assert execution_time < baseline * 1.2  # 20% tolerance
```

## CI/CD Performance Optimization

### Caching Strategies
```yaml
# GitHub Actions example
- name: Cache dependencies
  uses: actions/cache@v3
  with:
    path: ~/.cache/pypoetry
    key: poetry-${{{{ hashFiles('poetry.lock') }}}}
```

### Parallel CI Jobs
```yaml
strategy:
  matrix:
    test-group: [unit, integration, performance]
```

### Selective Test Execution
```bash
# Only run tests affected by changes
poetry run python -m pytest --lf  # Last failed
poetry run python -m pytest --co  # Collect only, don't run
```

## Troubleshooting Performance Issues

### Identify Slow Tests
```bash
# Show test durations
poetry run python -m pytest --durations=10

# Profile specific test
poetry run python -m pytest --profile test_slow_function
```

### Memory Leak Detection
```python
def test_memory_leak_detection():
    import gc
    import psutil
    
    process = psutil.Process()
    initial_memory = process.memory_info().rss
    
    for i in range(100):
        # Repeat operation that might leak
        result = potentially_leaky_function()
        del result
        gc.collect()
    
    final_memory = process.memory_info().rss
    memory_growth = final_memory - initial_memory
    
    # Assert no significant memory growth
    assert memory_growth < 1024 * 1024  # 1MB tolerance
```

### Database Query Optimization
```python
# Enable SQL logging to identify slow queries
import logging
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Use EXPLAIN to analyze query performance
async def analyze_query_performance(session):
    result = await session.execute(
        text("EXPLAIN QUERY PLAN SELECT * FROM users WHERE email = :email"),
        {{"email": "test@example.com"}}
    )
    print(result.fetchall())
```
"""
    
    def generate_ci_cd_guide(self) -> str:
        """Generate CI/CD integration guide"""
        return f"""# CI/CD Integration Guide

Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

## GitHub Actions Configuration

### Basic Test Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Poetry
        uses: snok/install-poetry@v1
      
      - name: Install dependencies
        run: poetry install
      
      - name: Run tests
        run: poetry run python -m pytest tests/ -v
        env:
          TESTING: true
          DATABASE_URL: sqlite+aiosqlite:///:memory:
          JWT_SECRET: test-secret-key
          FDA_API_KEY: test-api-key
```

### Environment Variables for Testing
```yaml
env:
  TESTING: true
  DATABASE_URL: sqlite+aiosqlite:///:memory:
  JWT_SECRET: ${{{{ secrets.JWT_SECRET }}}}
  FDA_API_KEY: ${{{{ secrets.FDA_API_KEY }}}}
  LOG_LEVEL: INFO
```

### Test Coverage Reporting
```yaml
- name: Run tests with coverage
  run: |
    poetry run python -m pytest tests/ --cov=backend --cov-report=xml
    
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## Local Development Setup

### Environment Configuration
```bash
# .env.testing
TESTING=true
DATABASE_URL=sqlite+aiosqlite:///:memory:
JWT_SECRET=local-development-secret
FDA_API_KEY=your-test-api-key
LOG_LEVEL=DEBUG
```

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: poetry run python -m pytest tests/
        language: system
        pass_filenames: false
        always_run: true
```

## Quality Gates

### Test Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for critical regulatory logic
- No decrease in coverage for new code

### Performance Requirements
- Full test suite must complete in < 60 seconds
- No test should take longer than 10 seconds
- Memory usage must not exceed 500MB

### Security Requirements
- All tests must pass security linting
- No hardcoded secrets in test code
- Proper cleanup of sensitive test data

## Monitoring and Alerts

### Test Failure Notifications
```yaml
- name: Notify on test failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: Test suite failed on ${{{{ github.ref }}}}
```

### Performance Monitoring
```yaml
- name: Performance regression check
  run: |
    poetry run python -m pytest tests/performance/ --benchmark-only
    # Fail if performance degrades by more than 20%
```
"""