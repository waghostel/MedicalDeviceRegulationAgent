# Testing Infrastructure Documentation

## Overview

The Medical Device Regulatory Assistant includes comprehensive testing infrastructure designed to provide reliable, fast, and maintainable tests across both frontend and backend systems. This documentation covers all testing utilities, patterns, and best practices.

## Frontend Testing Infrastructure

### React Testing Utilities

The enhanced React testing utilities provide proper `act()` wrapping and async state update handling to eliminate React lifecycle warnings and ensure consistent test behavior.

#### Core Components

**Location**: `src/lib/testing/react-test-utils.tsx`

##### renderWithProviders

Enhanced render function with proper `act()` wrapping for all async operations.

```typescript
import { renderWithProviders } from '@/lib/testing/react-test-utils';

// Basic usage
const { getByText, mockRouter } = await renderWithProviders(<MyComponent />);

// With session and router mocking
const { getByText, mockRouter } = await renderWithProviders(
  <MyComponent />,
  {
    session: createMockSession({ name: 'Test User' }),
    router: { pathname: '/test-path' }
  }
);
```

**Features**:
- Automatic `act()` wrapping for all async state updates
- Built-in session provider mocking
- Next.js router mocking
- Proper cleanup and error handling

##### waitForAsyncUpdates

Utility for waiting for async state updates to complete.

```typescript
import { waitForAsyncUpdates } from '@/lib/testing/react-test-utils';

test('async state updates', async () => {
  const { getByText } = await renderWithProviders(<AsyncComponent />);
  
  // Trigger async operation
  fireEvent.click(getByText('Load Data'));
  
  // Wait for async updates
  await waitForAsyncUpdates();
  
  // Assert on updated state
  expect(getByText('Data Loaded')).toBeInTheDocument();
});
```

##### Test Environment Setup

```typescript
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/testing/react-test-utils';

describe('My Component Tests', () => {
  let testEnv: any;
  
  beforeEach(() => {
    testEnv = setupTestEnvironment({
      mockToasts: true,
      skipActWarnings: false,
      timeout: 10000
    });
  });
  
  afterEach(() => {
    testEnv.cleanup();
    cleanupTestEnvironment();
  });
  
  // Your tests here
});
```

### Mock Toast System

The mock toast system handles toast notifications in tests without React lifecycle issues.

#### Core Components

**Location**: `src/lib/testing/mock-toast-system.ts`

##### MockToastSystem Class

```typescript
import { getMockToastSystem, toastTestUtils } from '@/lib/testing/mock-toast-system';

test('toast notifications', async () => {
  const mockToast = getMockToastSystem();
  
  // Render component that uses toasts
  const { getByText } = await renderWithProviders(<ComponentWithToasts />);
  
  // Trigger action that shows toast
  fireEvent.click(getByText('Save'));
  await waitForAsyncUpdates();
  
  // Assert toast was called
  toastTestUtils.expectToastCalledWith('Success', 'Data saved successfully', 'success');
  
  // Check toast call count
  toastTestUtils.expectToastCallCount(1);
  
  // Get detailed toast information
  const lastToast = toastTestUtils.getLastToast();
  expect(lastToast?.type).toBe('success');
});
```

##### Toast Test Utilities

```typescript
// Assert specific toast content
toastTestUtils.expectToastCalledWith('Title', 'Description', 'success');

// Assert no toasts were called
toastTestUtils.expectNoToastsCalled();

// Assert toast count
toastTestUtils.expectToastCallCount(3);

// Assert toast type count
toastTestUtils.expectToastTypeCount('error', 1);

// Get all toast calls for detailed assertions
const allToasts = toastTestUtils.getAllToastCalls();
expect(allToasts).toHaveLength(2);
```

### Performance Monitoring

Frontend test performance monitoring tracks component render times and memory usage.

#### Core Components

**Location**: `src/lib/testing/performance-monitor.ts`

```typescript
import { performanceMonitor } from '@/lib/testing/performance-monitor';

test('component performance', async () => {
  const monitor = performanceMonitor.startMonitoring('MyComponent render test');
  
  const { getByText } = await renderWithProviders(<MyComponent />);
  
  // Perform test operations
  fireEvent.click(getByText('Action'));
  await waitForAsyncUpdates();
  
  const metrics = performanceMonitor.stopMonitoring(monitor);
  
  // Assert performance thresholds
  expect(metrics.renderTime).toBeLessThan(100); // ms
  expect(metrics.memoryUsage).toBeLessThan(50); // MB
});
```

## Backend Testing Infrastructure

### Database Test Isolation

The database test isolation system ensures each test runs in its own transaction with automatic rollback.

#### Core Components

**Location**: `backend/testing/database_isolation.py`

##### DatabaseTestIsolation Class

```python
from backend.testing.database_isolation import DatabaseTestIsolation

# Create isolation instance
isolation = DatabaseTestIsolation()

# Use isolated session
async with isolation.isolated_session() as session:
    # Create test data
    user = User(email="test@example.com", name="Test User")
    session.add(user)
    await session.flush()  # Get ID without committing
    
    # Perform operations
    project = Project(name="Test Project", user_id=user.id)
    session.add(project)
    await session.flush()
    
    # Test operations here
    # All changes are automatically rolled back on exit
```

##### Validation and Health Checks

```python
# Validate isolation is working
async with isolation.isolated_session() as session:
    is_valid = await isolation.validate_isolation(session)
    assert is_valid, "Database isolation not working properly"

# Check database health for testing
health = await isolation.check_database_health()
assert health['test_database_ready'], "Database not ready for testing"
```

### Test Data Factory

The test data factory provides consistent test data creation with automatic cleanup tracking.

#### Core Components

**Location**: `backend/testing/test_data_factory.py`

```python
from backend.testing.test_data_factory import TestDataFactory

async def test_with_data_factory():
    async with isolation.isolated_session() as session:
        factory = TestDataFactory(session)
        
        # Create test user
        user = await factory.create_user(
            email="test@example.com",
            name="Test User"
        )
        
        # Create test project
        project = await factory.create_project(
            name="Test Project",
            user_id=user.id,
            device_type="Cardiac Monitor"
        )
        
        # Factory automatically tracks all created entities
        # Cleanup happens automatically with session rollback
```

### API Testing Client

The API testing client provides robust API testing with retry logic and graceful failure handling.

#### Core Components

**Location**: `backend/testing/api_client.py`

```python
from backend.testing.api_client import TestAPIClient

# Create API client with retry logic
client = TestAPIClient(
    base_url="http://localhost:8000",
    timeout=5.0,
    max_retries=3
)

# Test API endpoints with automatic retry
async def test_api_endpoint():
    # Check if API is available
    is_connected = await client.connect()
    if not is_connected:
        pytest.skip("API server not available")
    
    # Make API request with retry logic
    async with client.request_with_retry("GET", "/api/projects") as response:
        if response is None:
            pytest.skip("API request failed after retries")
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
```

### Performance Monitoring

Backend test performance monitoring tracks execution time, memory usage, and database queries.

#### Core Components

**Location**: `backend/testing/performance_monitor.py`

```python
from backend.testing.performance_monitor import TestPerformanceMonitor, monitor_performance

# Global performance monitoring
monitor = TestPerformanceMonitor()

# Context manager usage
async def test_with_performance_monitoring():
    with monitor_performance("database_operations_test") as monitor_id:
        # Perform database operations
        async with isolation.isolated_session() as session:
            # Record database queries
            monitor.record_database_query(monitor_id, {"query": "SELECT * FROM users"})
            
            # Perform operations
            users = await session.execute(select(User))
            
            # Record API calls
            monitor.record_api_call(monitor_id, {"endpoint": "/api/users"})

# Get performance summary
summary = monitor.get_performance_summary()
print(f"Average execution time: {summary['average_execution_time']:.2f}s")
print(f"Total database queries: {summary['total_database_queries']}")
```

## Exception Handling System

### Unified Exception Hierarchy

The exception system provides consistent error handling across all system layers.

#### Core Components

**Location**: `backend/core/exceptions.py`

##### Base Exception Class

```python
from backend.core.exceptions import RegulatoryAssistantException

class CustomError(RegulatoryAssistantException):
    def __init__(self, resource_id: str, additional_context: dict = None):
        super().__init__(
            message=f"Custom error occurred for resource {resource_id}",
            error_code="CUSTOM_ERROR",
            details={"resource_id": resource_id, **(additional_context or {})},
            user_message="A custom error occurred. Please try again.",
            suggestions=[
                "Check the resource ID is correct",
                "Verify you have proper permissions",
                "Contact support if the issue persists"
            ]
        )
```

##### Specific Exception Types

```python
from backend.core.exceptions import (
    ProjectNotFoundError,
    ValidationError,
    DatabaseError,
    AuthenticationError,
    ExternalServiceError
)

# Project not found
raise ProjectNotFoundError(
    project_id=123,
    user_id="user_456",
    additional_context={"attempted_action": "update"}
)

# Validation error
raise ValidationError(
    field="name",
    value="",
    constraint="required",
    validation_errors=[{"field": "name", "message": "Name is required"}]
)

# Database error
raise DatabaseError(
    operation="insert",
    table="projects",
    original_error=original_exception,
    query_info={"query": "INSERT INTO projects..."}
)
```

### Exception Mapping

The exception mapper converts application exceptions to HTTP responses.

#### Core Components

**Location**: `backend/core/exception_mapper.py`

```python
from backend.core.exception_mapper import ExceptionMapper

mapper = ExceptionMapper()

try:
    # Some operation that might fail
    result = await some_operation()
except RegulatoryAssistantException as e:
    # Map to HTTP exception
    http_exception = mapper.map_to_http_exception(e)
    
    # Create error response
    error_response = mapper.create_error_response(e)
    
    # Log error for tracking
    logger.error(f"Application error: {e.error_code}", extra=e.to_dict())
```

## Configuration and Environment Management

### Environment Validation

The environment validation system ensures proper setup for development and testing.

#### Core Components

**Location**: `backend/core/environment.py`

```python
from backend.core.environment import EnvironmentValidator

validator = EnvironmentValidator()

# Validate Python environment
python_result = validator.validate_python_environment()
if not python_result.is_valid:
    print("Python environment issues:")
    for error in python_result.errors:
        print(f"  ❌ {error}")
    
    print("Recommendations:")
    for rec in python_result.recommendations:
        print(f"  💡 {rec}")

# Validate database connection
db_result = validator.validate_database_connection()
assert db_result.is_valid, "Database validation failed"

# Generate setup instructions
if not python_result.is_valid:
    instructions = validator.generate_setup_instructions(python_result)
    print(instructions)
```

## Testing Patterns and Best Practices

### Test Structure

```python
# Backend test structure
import pytest
from backend.testing.database_isolation import DatabaseTestIsolation
from backend.testing.test_data_factory import TestDataFactory
from backend.testing.performance_monitor import monitor_performance

@pytest.fixture
async def isolation():
    return DatabaseTestIsolation()

@pytest.fixture
async def test_data(isolation):
    async with isolation.isolated_session() as session:
        factory = TestDataFactory(session)
        yield factory

async def test_project_creation(test_data):
    with monitor_performance("project_creation_test"):
        # Create test user
        user = await test_data.create_user(email="test@example.com")
        
        # Create test project
        project = await test_data.create_project(
            name="Test Project",
            user_id=user.id
        )
        
        # Assertions
        assert project.id is not None
        assert project.name == "Test Project"
        assert project.user_id == user.id
```

```typescript
// Frontend test structure
import { renderWithProviders, waitForAsyncUpdates } from '@/lib/testing/react-test-utils';
import { getMockToastSystem, toastTestUtils } from '@/lib/testing/mock-toast-system';

describe('ProjectForm Component', () => {
  beforeEach(() => {
    getMockToastSystem().clear();
  });

  test('successful project creation', async () => {
    const { getByLabelText, getByText } = await renderWithProviders(
      <ProjectForm onSubmit={mockSubmit} />
    );

    // Fill form
    fireEvent.change(getByLabelText('Project Name'), {
      target: { value: 'Test Project' }
    });

    // Submit form
    fireEvent.click(getByText('Create Project'));
    await waitForAsyncUpdates();

    // Assert success toast
    toastTestUtils.expectToastCalledWith(
      'Success',
      'Project created successfully',
      'success'
    );
  });
});
```

### Error Testing Patterns

```python
# Testing exception handling
async def test_project_not_found_error(test_data):
    with pytest.raises(ProjectNotFoundError) as exc_info:
        await project_service.get_project(999, "nonexistent_user")
    
    error = exc_info.value
    assert error.error_code == "PROJECT_NOT_FOUND"
    assert error.details["project_id"] == 999
    assert "not found" in error.user_message.lower()
    assert len(error.suggestions) > 0
```

```typescript
// Testing error boundaries
test('error boundary catches errors', async () => {
  const ThrowError = () => {
    throw new Error('Test error');
  };

  const { getByText } = await renderWithProviders(
    <ErrorBoundary>
      <ThrowError />
    </ErrorBoundary>
  );

  expect(getByText('Something went wrong')).toBeInTheDocument();
});
```

### Performance Testing Patterns

```python
# Performance testing with thresholds
async def test_bulk_operations_performance():
    thresholds = PerformanceThresholds(
        max_execution_time=2.0,  # 2 seconds
        max_memory_usage=50.0,   # 50 MB
        max_database_queries=10
    )
    
    monitor = TestPerformanceMonitor(thresholds)
    
    with monitor.monitor_test("bulk_operations") as monitor_id:
        # Perform bulk operations
        for i in range(100):
            monitor.record_database_query(monitor_id)
            # ... perform operation
    
    # Metrics are automatically validated against thresholds
    summary = monitor.get_performance_summary()
    assert len(summary['warnings']) == 0, "Performance thresholds exceeded"
```

## Integration with CI/CD

### Test Configuration

```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: corepack enable
      - run: pnpm install
      - run: pnpm test --coverage
      - run: pnpm test:performance

  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - run: pip install poetry
      - run: cd backend && poetry install
      - run: cd backend && poetry run pytest --cov=. --performance-report
```

### Performance Monitoring in CI

```python
# conftest.py - pytest configuration
import pytest
from backend.testing.performance_monitor import get_performance_monitor

@pytest.fixture(scope="session", autouse=True)
def performance_monitoring():
    monitor = get_performance_monitor()
    yield monitor
    
    # Export performance report for CI
    monitor.export_metrics("test-performance-report.json")
    
    # Fail CI if performance thresholds exceeded
    summary = monitor.get_performance_summary()
    if summary['warnings']:
        pytest.fail(f"Performance issues detected: {summary['warnings']}")
```

## Troubleshooting

### Common Issues

1. **React `act()` warnings**: Use `renderWithProviders` and `waitForAsyncUpdates`
2. **Database test interference**: Ensure proper use of `isolated_session`
3. **Memory leaks in tests**: Use performance monitoring to detect and fix
4. **Flaky tests**: Implement proper async handling and retry logic

### Debug Tools

```python
# Enable debug logging
import logging
logging.getLogger('backend.testing').setLevel(logging.DEBUG)

# Check database isolation health
health = await isolation.check_database_health()
print(f"Database health: {health}")

# Monitor active sessions
active_count = await isolation.get_active_sessions_count()
print(f"Active test sessions: {active_count}")
```

```typescript
// Enable test debugging
const testEnv = setupTestEnvironment({
  skipActWarnings: false,  // Show act warnings for debugging
  mockToasts: true,
  timeout: 30000  // Longer timeout for debugging
});
```

This testing infrastructure provides a robust foundation for reliable, fast, and maintainable tests across the entire Medical Device Regulatory Assistant application.