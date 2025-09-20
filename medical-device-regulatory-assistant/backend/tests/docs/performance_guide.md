# Test Performance Optimization Guide

Generated: 2025-09-13 21:52:28

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
        connect_args={"check_same_thread": False}
    )
    return engine
```

#### Batch Database Operations

```python
async def create_test_data_batch(session, count=10):
    # Create multiple records in single transaction
    users = [User(name=f"user_{i}") for i in range(count)]
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
global_cache = {}

# Good: Fresh state per test
@pytest.fixture
def fresh_cache():
    return {}
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
PERFORMANCE_BASELINES = {
    "test_predicate_search": 2.0,  # seconds
    "test_device_classification": 0.5,  # seconds
}

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
    key: poetry-${{ hashFiles('poetry.lock') }}
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
        {"email": "test@example.com"}
    )
    print(result.fetchall())
```
