# Error Handling System Documentation

## Overview

The Medical Device Regulatory Assistant implements a comprehensive error handling system that provides consistent, user-friendly error management across all application layers. This system includes unified exception hierarchies, error tracking, and standardized error responses.

## Architecture

The error handling system consists of several key components:

1. **Unified Exception Hierarchy** - Standardized exception classes with error codes and context
2. **Exception Mapping** - Automatic conversion of application exceptions to HTTP responses
3. **Error Tracking** - Categorized error tracking with trend analysis
4. **Global Error Handlers** - Centralized error handling for both frontend and backend
5. **User-Friendly Error Messages** - Clear, actionable error messages for users

## Backend Error Handling

### Unified Exception Hierarchy

**Location**: `backend/core/exceptions.py`

#### Base Exception Class

All application exceptions inherit from `RegulatoryAssistantException`:

```python
from backend.core.exceptions import RegulatoryAssistantException

class RegulatoryAssistantException(Exception):
    def __init__(
        self,
        message: str,
        error_code: str,
        details: Optional[Dict[str, Any]] = None,
        user_message: Optional[str] = None,
        suggestions: Optional[List[str]] = None,
        context: Optional[Dict[str, Any]] = None
    ):
        self.message = message              # Technical message for logging
        self.error_code = error_code        # Unique error code
        self.details = details or {}        # Additional error details
        self.user_message = user_message    # User-friendly message
        self.suggestions = suggestions or [] # Suggested actions
        self.context = context or {}        # Request context
        self.timestamp = datetime.utcnow()
        self.error_id = str(uuid.uuid4())   # Unique error instance ID
```

#### Specific Exception Types

##### ProjectNotFoundError

```python
from backend.core.exceptions import ProjectNotFoundError

# Usage
raise ProjectNotFoundError(
    project_id=123,
    user_id="user_456",
    additional_context={"attempted_action": "update"}
)

# Automatic features:
# - Error code: "PROJECT_NOT_FOUND"
# - User message: "Project with ID 123 was not found or you don't have access to it."
# - Suggestions: ["Verify the project ID is correct", "Check if the project was deleted", ...]
```

##### ValidationError

```python
from backend.core.exceptions import ValidationError

# Usage
raise ValidationError(
    field="name",
    value="",
    constraint="required",
    validation_errors=[
        {"field": "name", "message": "Name is required"},
        {"field": "name", "constraint": "min_length", "value": 1}
    ]
)

# Features:
# - Field-specific error messages
# - Multiple validation errors support
# - Contextual suggestions based on field type
```

##### DatabaseError

```python
from backend.core.exceptions import DatabaseError

# Usage
try:
    await session.execute(query)
except SQLAlchemyError as e:
    raise DatabaseError(
        operation="insert",
        table="projects",
        original_error=e,
        query_info={"query": str(query), "params": params}
    )

# Features:
# - Automatic error categorization (connection, constraint, etc.)
# - Original error preservation
# - Query context for debugging
```

##### ExternalServiceError

```python
from backend.core.exceptions import ExternalServiceError

# Usage for API failures
raise ExternalServiceError(
    service_name="FDA API",
    operation="predicate_search",
    status_code=429,
    service_message="Rate limit exceeded",
    retry_after=60
)

# Features:
# - Service-specific error handling
# - Rate limiting support
# - Retry guidance
```

### Exception Mapping

**Location**: `backend/core/exception_mapper.py`

The exception mapper converts application exceptions to standardized HTTP responses:

```python
from backend.core.exception_mapper import ExceptionMapper

class ExceptionMapper:
    def map_to_http_exception(self, exc: Exception) -> HTTPException:
        """Map application exceptions to HTTP exceptions"""
        
    def create_error_response(self, exc: Exception) -> Dict[str, Any]:
        """Create standardized error response"""

# Usage in FastAPI
from fastapi import HTTPException

mapper = ExceptionMapper()

try:
    result = await some_operation()
except RegulatoryAssistantException as e:
    http_exc = mapper.map_to_http_exception(e)
    raise http_exc
```

#### Standard Error Response Format

```json
{
  "error": {
    "error_id": "550e8400-e29b-41d4-a716-446655440000",
    "error_code": "PROJECT_NOT_FOUND",
    "message": "Project 123 not found for user user_456",
    "user_message": "Project with ID 123 was not found or you don't have access to it.",
    "details": {
      "project_id": 123,
      "user_id": "user_456",
      "attempted_action": "update"
    },
    "suggestions": [
      "Verify the project ID is correct",
      "Check if the project was deleted or archived",
      "Ensure you have access permissions for this project"
    ],
    "context": {
      "request_id": "req_123",
      "user_agent": "Mozilla/5.0...",
      "timestamp": "2025-01-11T10:30:00Z"
    },
    "timestamp": "2025-01-11T10:30:00.123Z"
  }
}
```

### Global Error Handler

**Location**: `backend/core/error_handler.py`

The global error handler provides centralized exception handling for FastAPI:

```python
from backend.core.error_handler import GlobalErrorHandler
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse

app = FastAPI()
error_handler = GlobalErrorHandler()

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    return await error_handler.handle_exception(request, exc)

# Features:
# - Automatic error tracking
# - Request context collection
# - Structured logging
# - User-friendly error responses
```

### Error Tracking

**Location**: `backend/core/error_tracker.py`

The error tracking system categorizes and analyzes errors:

```python
from backend.core.error_tracker import ErrorTracker

tracker = ErrorTracker()

# Track error occurrence
error_report = tracker.create_error_report(
    exception=exc,
    request=request,
    additional_context={"feature": "project_management"}
)

# Analyze error trends
trends = tracker.analyze_error_trends(
    time_period="24h",
    error_categories=["PROJECT_NOT_FOUND", "VALIDATION_ERROR"]
)

# Get error statistics
stats = tracker.get_error_statistics()
print(f"Total errors: {stats['total_errors']}")
print(f"Error rate: {stats['error_rate']:.2%}")
```

#### Error Categories

```python
class ErrorCategory(str, Enum):
    FRONTEND_TESTING = "frontend_testing"
    BACKEND_INTEGRATION = "backend_integration"
    CONFIGURATION = "configuration"
    PERFORMANCE = "performance"
    ENVIRONMENT = "environment"
    USER_INPUT = "user_input"
    EXTERNAL_SERVICE = "external_service"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
```

#### Error Severity Levels

```python
class ErrorSeverity(str, Enum):
    CRITICAL = "critical"  # System down, blocks all users
    HIGH = "high"         # Feature broken, affects many users
    MEDIUM = "medium"     # Intermittent issues, affects some users
    LOW = "low"          # Minor issues, cosmetic problems
```

## Frontend Error Handling

### Error Boundary System

**Location**: `src/components/error-boundary.tsx`

React Error Boundary for catching and handling frontend errors:

```typescript
import { ErrorBoundary } from '@/components/error-boundary';

// Usage
<ErrorBoundary
  fallback={<CustomErrorFallback />}
  onError={(error, errorInfo) => {
    // Log to error tracking service
    errorTracker.logError(error, errorInfo);
  }}
>
  <MyComponent />
</ErrorBoundary>

// Features:
// - Automatic error catching
// - Custom fallback UI
// - Error logging integration
// - Recovery mechanisms
```

#### Error Boundary Implementation

```typescript
interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

export class ErrorBoundary extends Component<Props, State> {
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring system
    this.logErrorToService(error, errorInfo);
    
    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // Send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      errorTracker.captureException(error, {
        extra: errorInfo,
        tags: { component: 'ErrorBoundary' }
      });
    }
  }
}
```

### Error Handling Hooks

**Location**: `src/hooks/use-error-handling.ts`

Custom hooks for consistent error handling:

```typescript
import { useErrorHandling } from '@/hooks/use-error-handling';

function MyComponent() {
  const { handleError, clearError, error, isError } = useErrorHandling();

  const handleSubmit = async (data: FormData) => {
    try {
      await submitData(data);
    } catch (error) {
      handleError(error, {
        context: 'form_submission',
        userAction: 'submit_project_form'
      });
    }
  };

  if (isError) {
    return <ErrorDisplay error={error} onRetry={clearError} />;
  }

  return <MyForm onSubmit={handleSubmit} />;
}
```

#### Error Handling Hook Implementation

```typescript
interface ErrorContext {
  context?: string;
  userAction?: string;
  additionalData?: Record<string, any>;
}

export function useErrorHandling() {
  const [error, setError] = useState<Error | null>(null);
  const { toast } = useToast();

  const handleError = useCallback((
    error: Error | string,
    context?: ErrorContext
  ) => {
    const errorObj = typeof error === 'string' ? new Error(error) : error;
    
    // Log error
    console.error('Error occurred:', errorObj, context);
    
    // Set error state
    setError(errorObj);
    
    // Show user-friendly toast
    const userMessage = getUserFriendlyMessage(errorObj);
    toast({
      title: 'Error',
      description: userMessage,
      variant: 'destructive',
      action: {
        label: 'Retry',
        onClick: () => clearError()
      }
    });
    
    // Track error for analytics
    trackError(errorObj, context);
  }, [toast]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    error,
    isError: error !== null,
    handleError,
    clearError
  };
}
```

### API Error Handling

**Location**: `src/lib/api-client.ts`

Centralized API error handling:

```typescript
import { apiClient } from '@/lib/api-client';

class APIClient {
  async request<T>(
    method: string,
    url: string,
    data?: any,
    options?: RequestOptions
  ): Promise<T> {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers
        },
        body: data ? JSON.stringify(data) : undefined
      });

      if (!response.ok) {
        await this.handleAPIError(response);
      }

      return await response.json();
    } catch (error) {
      throw this.transformError(error);
    }
  }

  private async handleAPIError(response: Response): Promise<never> {
    const errorData = await response.json().catch(() => ({}));
    
    const apiError = new APIError(
      errorData.error?.user_message || 'An error occurred',
      response.status,
      errorData.error?.error_code || 'UNKNOWN_ERROR',
      errorData.error?.details || {},
      errorData.error?.suggestions || []
    );

    throw apiError;
  }
}

// Custom API Error class
class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public errorCode: string,
    public details: Record<string, any>,
    public suggestions: string[]
  ) {
    super(message);
    this.name = 'APIError';
  }
}
```

## Error Monitoring and Analytics

### Error Tracking Service Integration

```typescript
// Error tracking service integration
class ErrorTracker {
  captureException(error: Error, context?: ErrorContext) {
    // Send to monitoring service (e.g., Sentry)
    if (process.env.NODE_ENV === 'production') {
      Sentry.captureException(error, {
        tags: {
          component: context?.component,
          userAction: context?.userAction
        },
        extra: context?.additionalData,
        user: {
          id: getCurrentUserId(),
          email: getCurrentUserEmail()
        }
      });
    }
  }

  trackError(error: Error, context?: ErrorContext) {
    // Track for analytics
    analytics.track('Error Occurred', {
      errorMessage: error.message,
      errorCode: error.name,
      context: context?.context,
      userAction: context?.userAction,
      timestamp: new Date().toISOString()
    });
  }
}
```

### Performance Impact Monitoring

```python
# Monitor error impact on performance
from backend.core.error_tracker import ErrorTracker
from backend.testing.performance_monitor import TestPerformanceMonitor

class ErrorPerformanceTracker:
    def __init__(self):
        self.error_tracker = ErrorTracker()
        self.performance_monitor = TestPerformanceMonitor()
    
    async def track_error_with_performance(
        self,
        error: Exception,
        operation_name: str,
        execution_time: float
    ):
        # Track the error
        error_report = self.error_tracker.create_error_report(error)
        
        # Track performance impact
        if execution_time > 5.0:  # Slow operation
            error_report.add_context('performance_impact', 'high')
            error_report.add_suggestion('Consider optimizing this operation')
        
        # Correlate errors with performance degradation
        await self.analyze_error_performance_correlation()
```

## Error Recovery Strategies

### Automatic Retry Logic

```typescript
// Automatic retry with exponential backoff
class RetryableOperation {
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxRetries) {
          break;
        }
        
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        const delay = baseDelay * Math.pow(2, attempt);
        await this.sleep(delay);
      }
    }
    
    throw lastError!;
  }

  private isRetryableError(error: any): boolean {
    // Network errors, timeouts, 5xx status codes
    return (
      error.name === 'NetworkError' ||
      error.name === 'TimeoutError' ||
      (error.statusCode >= 500 && error.statusCode < 600) ||
      error.statusCode === 429 // Rate limited
    );
  }
}
```

### Graceful Degradation

```typescript
// Graceful degradation for external service failures
class ExternalServiceClient {
  async fetchData(id: string): Promise<Data | null> {
    try {
      return await this.apiClient.get(`/data/${id}`);
    } catch (error) {
      if (error instanceof ExternalServiceError) {
        // Log error but don't fail the entire operation
        this.errorTracker.captureException(error, {
          context: 'external_service_degradation',
          severity: 'medium'
        });
        
        // Return cached data or default values
        return await this.getCachedData(id) || this.getDefaultData();
      }
      
      throw error; // Re-throw non-service errors
    }
  }
}
```

## Testing Error Handling

### Exception Testing Patterns

```python
# Testing exception handling
import pytest
from backend.core.exceptions import ProjectNotFoundError, ValidationError

async def test_project_not_found_exception():
    with pytest.raises(ProjectNotFoundError) as exc_info:
        await project_service.get_project(999, "nonexistent_user")
    
    error = exc_info.value
    assert error.error_code == "PROJECT_NOT_FOUND"
    assert error.details["project_id"] == 999
    assert error.details["user_id"] == "nonexistent_user"
    assert "not found" in error.user_message.lower()
    assert len(error.suggestions) > 0
    assert error.error_id is not None

async def test_validation_error_details():
    with pytest.raises(ValidationError) as exc_info:
        await project_service.create_project("", user_id="test_user")
    
    error = exc_info.value
    assert error.error_code == "VALIDATION_ERROR"
    assert error.details["field"] == "name"
    assert error.details["constraint"] == "required"
    assert "required" in error.user_message.lower()
```

### Error Boundary Testing

```typescript
// Testing error boundaries
import { render } from '@testing-library/react';
import { ErrorBoundary } from '@/components/error-boundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

test('error boundary catches and displays errors', () => {
  const onError = jest.fn();
  
  const { getByText, rerender } = render(
    <ErrorBoundary onError={onError}>
      <ThrowError shouldThrow={false} />
    </ErrorBoundary>
  );

  expect(getByText('No error')).toBeInTheDocument();

  rerender(
    <ErrorBoundary onError={onError}>
      <ThrowError shouldThrow={true} />
    </ErrorBoundary>
  );

  expect(getByText('Something went wrong')).toBeInTheDocument();
  expect(onError).toHaveBeenCalledWith(
    expect.any(Error),
    expect.objectContaining({
      componentStack: expect.any(String)
    })
  );
});
```

## Configuration and Environment

### Error Handling Configuration

```python
# Error handling configuration
from pydantic import BaseSettings

class ErrorHandlingSettings(BaseSettings):
    # Error tracking
    enable_error_tracking: bool = True
    error_tracking_service: str = "sentry"
    error_tracking_dsn: Optional[str] = None
    
    # Error reporting
    enable_error_reporting: bool = True
    error_report_email: Optional[str] = None
    
    # Performance monitoring
    enable_performance_monitoring: bool = True
    performance_threshold_seconds: float = 5.0
    
    # Retry configuration
    default_max_retries: int = 3
    default_retry_delay: float = 1.0
    
    # Development settings
    show_detailed_errors: bool = False
    log_error_details: bool = True
    
    class Config:
        env_prefix = "ERROR_HANDLING_"
```

### Environment-Specific Error Handling

```typescript
// Environment-specific error configuration
const errorConfig = {
  development: {
    showDetailedErrors: true,
    enableErrorTracking: false,
    logLevel: 'debug'
  },
  testing: {
    showDetailedErrors: true,
    enableErrorTracking: false,
    logLevel: 'error'
  },
  production: {
    showDetailedErrors: false,
    enableErrorTracking: true,
    logLevel: 'error'
  }
};

const currentConfig = errorConfig[process.env.NODE_ENV || 'development'];
```

## Best Practices

### Error Message Guidelines

1. **User Messages**: Clear, non-technical, actionable
2. **Technical Messages**: Detailed, include context, aid debugging
3. **Error Codes**: Consistent, hierarchical, searchable
4. **Suggestions**: Specific, actionable, prioritized

### Error Handling Patterns

1. **Fail Fast**: Validate inputs early, fail with clear messages
2. **Graceful Degradation**: Continue operation with reduced functionality
3. **Circuit Breaker**: Prevent cascading failures
4. **Bulkhead**: Isolate failures to prevent system-wide impact

### Monitoring and Alerting

1. **Error Rate Monitoring**: Track error rates and trends
2. **Critical Error Alerts**: Immediate notification for critical errors
3. **Performance Impact**: Monitor error impact on system performance
4. **User Impact**: Track how errors affect user experience

This comprehensive error handling system ensures consistent, user-friendly error management across the entire Medical Device Regulatory Assistant application while providing detailed information for debugging and system monitoring.