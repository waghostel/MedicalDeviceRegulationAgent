# Test Infrastructure Troubleshooting Guide

Generated: 2025-09-13 21:52:28

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
token = create_test_jwt_token({"sub": "test_user", "email": "test@example.com"})
headers = {"Authorization": f"Bearer {token}"}
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
print(f"Memory usage: {current / 1024 / 1024:.2f} MB")
```

### Performance Profiling
```python
import cProfile
cProfile.run('your_test_function()')
```
