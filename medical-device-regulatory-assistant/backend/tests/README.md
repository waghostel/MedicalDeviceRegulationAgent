# Mock Data Testing Framework

A comprehensive testing framework for generating, managing, and validating mock data in the Medical Device Regulatory Assistant project.

## Overview

This framework provides utilities for:
- **Mock Data Generation**: Create realistic test data for projects, users, and related entities
- **Database Seeding**: Populate test databases with consistent, isolated data
- **Test Scenarios**: Predefined scenarios for common testing workflows
- **Edge Case Testing**: Comprehensive edge cases for boundary and error testing
- **Data Validation**: Validate test data structure and integrity
- **Cleanup & Isolation**: Automatic cleanup and test isolation mechanisms

## Quick Start

### Basic Usage

```python
import asyncio
from tests.test_framework import mock_data_framework

async def example_usage():
    # Generate mock project data
    projects = mock_data_framework.generate_project_data(
        count=3,
        complexity="moderate"
    )
    
    # Generate mock user data
    users = mock_data_framework.generate_user_data(
        count=2,
        role="user"
    )
    
    # Seed test database
    db_fixture = await mock_data_framework.seed_test_database(
        database_name="example_test",
        users=users,
        projects=projects
    )
    
    # Use the seeded database for testing
    print(f"Created {len(db_fixture.users)} users and {len(db_fixture.projects)} projects")
    
    # Cleanup
    await mock_data_framework.cleanup_all_test_environments()

# Run the example
asyncio.run(example_usage())
```

### Pytest Integration

```python
import pytest
from tests.test_framework import test_framework, isolated_test_db

@pytest.mark.asyncio
async def test_project_creation(test_framework):
    # Generate test data
    project_data = test_framework.generate_project_data(count=1)
    
    # Test your functionality
    assert len(project_data) == 1
    assert project_data[0].project.name is not None

@pytest.mark.asyncio
async def test_with_database(isolated_test_db):
    # Use isolated test database
    assert isolated_test_db.is_seeded
    assert len(isolated_test_db.projects) > 0
```

## Framework Components

### 1. Test Fixtures

#### Project Fixtures
Generate realistic medical device project data with varying complexity levels:

```python
from tests.test_fixtures import create_project_fixture, ProjectComplexity

# Simple project
simple_project = create_project_fixture(
    name="Basic Glucose Meter",
    complexity=ProjectComplexity.SIMPLE
)

# Complex project with related data
complex_project = create_project_fixture(
    name="AI-Powered Cardiac Monitor",
    complexity=ProjectComplexity.COMPLEX
)
```

**Complexity Levels:**
- `SIMPLE`: Basic medical devices (Class I)
- `MODERATE`: Standard devices with classifications and predicates (Class II)
- `COMPLEX`: Advanced devices with extensive related data (Class III)
- `EDGE_CASE`: Devices with special characters and edge case data

#### User Fixtures
Generate users with different roles and scenarios:

```python
from tests.test_fixtures import create_user_fixture, UserRole, UserScenario

# Admin user
admin = create_user_fixture(
    email="admin@company.com",
    role=UserRole.ADMIN,
    scenario=UserScenario.POWER_USER
)

# New user for onboarding tests
new_user = create_user_fixture(
    email="newuser@company.com",
    role=UserRole.USER,
    scenario=UserScenario.NEW_USER
)
```

**User Roles:**
- `ADMIN`: Full system access
- `USER`: Standard user permissions
- `VIEWER`: Read-only access
- `GUEST`: Limited access

**User Scenarios:**
- `NEW_USER`: First-time users
- `ACTIVE_USER`: Regular active users
- `POWER_USER`: Advanced users with complex workflows
- `EDGE_CASE_USER`: Users with special characters/edge cases

### 2. Database Fixtures

Create isolated test databases with automatic cleanup:

```python
from tests.test_fixtures import create_database_fixture

# Create test database
db_fixture = await create_database_fixture(
    fixture_name="my_test_db",
    seed_data=True,
    user_count=5,
    project_count=10
)

# Use database session
async with database_fixture_session("my_test_db") as session:
    # Perform database operations
    result = await session.execute("SELECT COUNT(*) FROM projects")
    count = result.scalar()
```

### 3. Scenario Fixtures

Predefined test scenarios for common workflows:

```python
from tests.test_fixtures import COMMON_SCENARIOS

# Available scenarios
scenarios = [
    "new_user_onboarding",
    "project_lifecycle", 
    "multi_user_collaboration",
    "data_validation",
    "performance_testing",
    "error_handling",
    "security_testing"
]

# Create scenario
scenario = await mock_data_framework.create_scenario_test_data(
    "new_user_onboarding"
)
```

### 4. Edge Case Fixtures

Comprehensive edge cases for boundary testing:

```python
from tests.test_fixtures import EdgeCaseCategory

# Get edge cases by category
security_cases = mock_data_framework.create_edge_case_test_data(
    "security_injection",
    severity="critical"
)

# Available categories
categories = [
    "data_validation",
    "boundary_conditions", 
    "unicode_handling",
    "security_injection",
    "malformed_data",
    "extreme_values",
    "concurrent_access",
    "resource_exhaustion"
]
```

## Advanced Usage

### Custom Test Environments

Create isolated test environments with automatic cleanup:

```python
from tests.test_framework import isolated_test_environment

async def test_complex_workflow():
    async with isolated_test_environment("complex_test") as env:
        db = env["components"]["database"]
        
        # Perform complex testing
        # Environment automatically cleaned up
```

### Data Validation

Validate test data structure and integrity:

```python
test_data = {
    "users": [...],
    "projects": [...],
    "device_classifications": [...]
}

validation_result = mock_data_framework.validate_test_data(test_data)

if not validation_result["valid"]:
    print("Validation errors:", validation_result["errors"])
```

### Performance Testing

Test with large datasets:

```python
# Generate large dataset
large_projects = mock_data_framework.generate_project_data(count=1000)
large_users = mock_data_framework.generate_user_data(count=100)

# Seed performance test database
perf_db = await mock_data_framework.seed_test_database(
    database_name="performance_test",
    users=large_users,
    projects=large_projects
)
```

## Configuration

### JSON Configuration

Use JSON files for complex test data scenarios:

```python
# Seed from JSON configuration
db_fixture = await mock_data_framework.seed_test_database(
    database_name="json_test",
    use_json_config=True,
    config_path="mock_data/comprehensive_mock_data_config.json"
)
```

### Environment Variables

Configure framework behavior:

```bash
# Enable debug logging
export MOCK_DATA_DEBUG=true

# Set default database type
export MOCK_DATA_DB_TYPE=sqlite

# Set cleanup timeout
export MOCK_DATA_CLEANUP_TIMEOUT=30
```

## Testing Best Practices

### 1. Test Isolation

Always use isolated test environments:

```python
@pytest.mark.asyncio
async def test_isolated_feature():
    async with isolated_test_environment("feature_test") as env:
        # Test code here
        # Automatic cleanup ensures no interference
```

### 2. Data Consistency

Use fixtures for consistent test data:

```python
# Define reusable fixtures
STANDARD_USER = create_user_fixture(
    email="standard@test.com",
    role=UserRole.USER
)

CARDIAC_PROJECT = create_project_fixture(
    name="Cardiac Monitor Test",
    complexity=ProjectComplexity.MODERATE
)
```

### 3. Edge Case Coverage

Include edge cases in your test suite:

```python
@pytest.mark.parametrize("edge_case", [
    mock_data_framework.create_edge_case_test_data("data_validation", "critical")
])
async def test_edge_cases(edge_case):
    # Test edge case handling
```

### 4. Performance Monitoring

Monitor test performance:

```python
import time

start_time = time.time()
# Test code
duration = time.time() - start_time

assert duration < 5.0, f"Test took too long: {duration}s"
```

## Troubleshooting

### Common Issues

1. **Database Connection Errors**
   ```python
   # Ensure proper cleanup
   await mock_data_framework.cleanup_all_test_environments()
   ```

2. **Memory Issues with Large Datasets**
   ```python
   # Use smaller datasets for unit tests
   projects = mock_data_framework.generate_project_data(count=10)  # Not 1000
   ```

3. **Foreign Key Constraint Errors**
   ```python
   # Ensure users are created before projects
   users = mock_data_framework.generate_user_data(count=2)
   projects = mock_data_framework.generate_project_data(count=5)
   ```

### Debug Mode

Enable debug logging for troubleshooting:

```python
import logging
logging.getLogger('tests.test_framework').setLevel(logging.DEBUG)
```

### Validation Errors

Check data validation results:

```python
validation = mock_data_framework.validate_test_data(test_data)
if not validation["valid"]:
    for error in validation["errors"]:
        print(f"Validation error: {error}")
```

## API Reference

### MockDataTestFramework

Main framework class providing all testing utilities.

#### Methods

- `generate_project_data(count, complexity, **kwargs)` - Generate project fixtures
- `generate_user_data(count, role, scenario, **kwargs)` - Generate user fixtures  
- `seed_test_database(database_name, users, projects, **kwargs)` - Seed test database
- `create_isolated_test_environment(test_name, **kwargs)` - Create isolated environment
- `validate_test_data(data)` - Validate test data structure
- `cleanup_all_test_environments()` - Clean up all test resources

### Pytest Fixtures

- `test_framework` - Main framework instance
- `isolated_test_db` - Isolated test database
- `sample_project_data` - Sample project fixtures
- `sample_user_data` - Sample user fixtures
- `edge_case_data` - Edge case fixtures

### Context Managers

- `isolated_test_environment(test_name)` - Isolated test environment
- `test_database_session(database_name)` - Database session

## Examples

See the `test_mock_data_framework.py` file for comprehensive examples and validation tests.

## Contributing

When adding new fixtures or test scenarios:

1. Follow the existing fixture patterns
2. Add comprehensive documentation
3. Include validation and edge cases
4. Update this README with new features
5. Add tests to validate new functionality

## License

This testing framework is part of the Medical Device Regulatory Assistant project and follows the same license terms.