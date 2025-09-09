# Authentication Testing Guide

## Overview

This guide provides comprehensive information about testing authentication in the Medical Device Regulatory Assistant API. The authentication system uses JWT tokens and protects all sensitive endpoints.

## Authentication Framework

### AuthTestFramework Class

The `AuthTestFramework` class provides utilities for creating and managing test authentication tokens:

```python
from tests.auth_test_framework import AuthTestFramework

# Create framework instance
auth_framework = AuthTestFramework()

# Generate test tokens
valid_token = auth_framework.create_test_token("valid_user")
admin_token = auth_framework.create_test_token("admin_user")
expired_token = auth_framework.create_test_token("expired_user")
invalid_token = auth_framework.create_invalid_token("malformed")
```

### Test User Types

The framework provides several predefined test users:

- **valid_user**: Standard regulatory manager with normal permissions
- **admin_user**: Administrator with elevated permissions
- **expired_user**: User with expired token (for testing expiration)
- **invalid_user**: User with invalid role (for testing authorization)

### Token Types

#### Valid Tokens
- Standard JWT tokens with proper claims
- Configurable expiration time
- Custom claims support

#### Invalid Tokens
- **malformed**: Completely invalid token format
- **wrong_signature**: Valid format but wrong signing key
- **missing_claims**: Valid JWT but missing required claims

## Protected Endpoints

### Projects API (`/api/projects/`)

All project endpoints require authentication:

- `POST /api/projects/` - Create project
- `GET /api/projects/` - List projects
- `GET /api/projects/{id}` - Get project details
- `PUT /api/projects/{id}` - Update project
- `DELETE /api/projects/{id}` - Delete project
- `GET /api/projects/{id}/dashboard` - Get dashboard data
- `GET /api/projects/{id}/export` - Export project data

### Agent Integration API (`/api/agent/`)

All agent endpoints require authentication:

- `POST /api/agent/execute` - Execute agent task
- `GET /api/agent/session/{id}/status` - Get session status
- `GET /api/agent/session/{id}/stream` - Stream session updates
- `POST /api/agent/session/{id}/cancel` - Cancel session
- `GET /api/agent/sessions` - List user sessions

### Public Endpoints

These endpoints do NOT require authentication:

- `GET /health` - Health check
- `GET /api/health/*` - Health check endpoints
- `GET /` - Root endpoint
- `GET /docs` - API documentation

## Running Authentication Tests

### Quick Test

Run a simple authentication test:

```bash
cd medical-device-regulatory-assistant/backend
poetry run python test_auth_simple.py
```

### Comprehensive Test Suite

Run the full authentication test suite:

```bash
cd medical-device-regulatory-assistant/backend
poetry run python run_auth_tests.py
```

### Individual Test Categories

Run specific test categories:

```bash
# Test projects authentication
poetry run pytest tests/test_auth_endpoints.py::TestProjectsAuthentication -v

# Test agent authentication
poetry run pytest tests/test_auth_endpoints.py::TestAgentIntegrationAuthentication -v

# Test authentication scenarios
poetry run pytest tests/test_auth_endpoints.py::TestAuthenticationScenarios -v
```

## Test Scenarios

### 1. Valid Authentication

```python
def test_valid_auth(auth_client):
    # Authenticate as valid user
    auth_client.authenticate_as("valid_user")
    
    # Make authenticated request
    response = auth_client.get("/api/projects/")
    
    # Should succeed
    assert response.status_code == 200
```

### 2. No Authentication

```python
def test_no_auth(client):
    # Make request without authentication
    response = client.get("/api/projects/")
    
    # Should be rejected
    assert response.status_code in [401, 403]
```

### 3. Invalid Token

```python
def test_invalid_token(client, auth_framework):
    invalid_token = auth_framework.create_invalid_token("malformed")
    headers = {"Authorization": f"Bearer {invalid_token}"}
    
    response = client.get("/api/projects/", headers=headers)
    
    # Should be rejected
    assert response.status_code == 401
```

### 4. Expired Token

```python
def test_expired_token(client, auth_framework):
    expired_token = auth_framework.create_test_token("expired_user")
    headers = {"Authorization": f"Bearer {expired_token}"}
    
    response = client.get("/api/projects/", headers=headers)
    
    # Should be rejected
    assert response.status_code == 401
```

## Authentication Flow

### 1. Token Creation

```python
# Create test token
auth_framework = AuthTestFramework()
token = auth_framework.create_test_token("valid_user")

# Token contains:
# - sub: User ID
# - email: User email
# - name: User name
# - role: User role
# - iat: Issued at timestamp
# - exp: Expiration timestamp
```

### 2. Token Verification

```python
# Server verifies token
from services.auth import AuthService

auth_service = AuthService()
token_data = auth_service.verify_token(token)

# Returns TokenData with:
# - sub: User ID
# - email: User email
# - name: User name
```

### 3. Authorization

```python
# Endpoints use dependency injection
from services.auth import get_current_user

@router.get("/protected")
async def protected_endpoint(
    current_user: TokenData = Depends(get_current_user)
):
    # current_user contains verified token data
    return {"user_id": current_user.sub}
```

## Expected Response Codes

### Authentication Success
- **200 OK**: Request successful with valid authentication
- **201 Created**: Resource created with valid authentication

### Authentication Failures
- **401 Unauthorized**: Invalid, expired, or missing token
- **403 Forbidden**: Valid token but insufficient permissions (FastAPI may return this instead of 401)

### Common Error Responses

#### Missing Token
```json
{
  "detail": "Not authenticated"
}
```

#### Invalid Token
```json
{
  "detail": "Could not validate credentials"
}
```

#### Expired Token
```json
{
  "detail": "Token expired"
}
```

## Mocking for Tests

### Mock Project Service

```python
from unittest.mock import patch

with patch('api.projects.project_service.list_projects') as mock_list:
    mock_list.return_value = []
    response = auth_client.get("/api/projects/")
    assert response.status_code == 200
```

### Mock Agent Service

```python
with patch('api.agent_integration.RegulatoryAgent') as mock_agent_class:
    mock_agent = AsyncMock()
    mock_agent_class.return_value = mock_agent
    
    mock_agent.execute_task.return_value = {
        "session_id": "test-session",
        "status": "completed"
    }
    
    response = auth_client.post("/api/agent/execute", json=request_data)
    assert response.status_code == 200
```

## Environment Setup

### Test Environment Variables

```bash
# Required for testing
export TESTING=true
export NEXTAUTH_SECRET=test-secret-key-for-medical-device-assistant

# Optional - disable external services
export DISABLE_FDA_API=true
export DISABLE_REDIS=true
```

### Python Setup

```python
from tests.auth_test_framework import setup_test_environment, cleanup_test_environment

# Setup test environment
setup_test_environment()

# Run tests...

# Cleanup
cleanup_test_environment()
```

## Troubleshooting

### Common Issues

#### 1. Wrong Endpoint Paths
- **Problem**: Tests fail with 404 Not Found
- **Solution**: Ensure using correct API paths (e.g., `/api/projects/` not `/projects/`)

#### 2. Missing Dependencies
- **Problem**: Import errors for models or services
- **Solution**: Ensure all required modules are available and properly mocked

#### 3. Database Errors
- **Problem**: Tests fail with database connection errors
- **Solution**: Mock database-dependent services or use test database

#### 4. Token Verification Fails
- **Problem**: Valid tokens are rejected
- **Solution**: Ensure `NEXTAUTH_SECRET` environment variable matches token signing key

### Debug Authentication

```python
# Debug token contents
import jwt

token = auth_framework.create_test_token("valid_user")
decoded = jwt.decode(token, options={"verify_signature": False})
print("Token contents:", decoded)

# Debug auth service
from services.auth import AuthService
auth_service = AuthService()

try:
    token_data = auth_service.verify_token(token)
    print("Token verified:", token_data)
except Exception as e:
    print("Token verification failed:", e)
```

## Integration with CI/CD

### GitHub Actions Example

```yaml
- name: Run Authentication Tests
  run: |
    cd medical-device-regulatory-assistant/backend
    poetry run python test_auth_simple.py
    poetry run pytest tests/test_auth_endpoints.py -v
  env:
    TESTING: true
    NEXTAUTH_SECRET: test-secret-key-for-ci
```

### Test Coverage

Ensure authentication tests cover:

- ✅ All protected endpoints
- ✅ Valid authentication scenarios
- ✅ Invalid token scenarios
- ✅ Missing authentication scenarios
- ✅ Expired token scenarios
- ✅ Different user roles/permissions
- ✅ Edge cases (malformed headers, etc.)

## Security Considerations

### Test Security

- Use separate test secrets (never production secrets)
- Test tokens should have short expiration times
- Clean up test data after tests complete
- Don't log sensitive token data in test output

### Production Security

- Use strong, unique JWT secrets
- Implement proper token expiration
- Use HTTPS for all authenticated endpoints
- Implement rate limiting for authentication endpoints
- Log authentication failures for security monitoring

This authentication testing framework ensures that all API endpoints are properly secured and that authentication works correctly across all scenarios.