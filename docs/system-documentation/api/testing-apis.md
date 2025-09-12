# Testing APIs Documentation

## Overview

This document provides comprehensive API documentation for all testing utilities and interfaces in the Medical Device Regulatory Assistant project. These APIs enable reliable, consistent testing across frontend and backend systems.

## Frontend Testing APIs

### React Testing Utilities

**Module**: `src/lib/testing/react-test-utils.tsx`

#### renderWithProviders

Enhanced render function with proper `act()` wrapping for all async operations.

```typescript
function renderWithProviders(
  ui: ReactElement,
  options?: EnhancedRenderOptions
): Promise<RenderResult & { mockRouter: MockRouter }>
```

**Parameters:**
- `ui: ReactElement` - The React component to render
- `options?: EnhancedRenderOptions` - Optional configuration

**EnhancedRenderOptions Interface:**
```typescript
interface EnhancedRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  session?: Session | null;           // Mock session for authentication
  router?: Partial<MockRouter>;       // Mock router configuration
  initialProps?: Record<string, any>; // Initial component props
  skipActWarnings?: boolean;          // Skip React act() warnings
}
```

**Returns:**
- `Promise<RenderResult & { mockRouter: MockRouter }>` - Enhanced render result with mock router

**Example:**
```typescript
const { getByText, mockRouter } = await renderWithProviders(
  <MyComponent />,
  {
    session: createMockSession({ name: 'Test User' }),
    router: { pathname: '/test-path' }
  }
);
```

#### renderWithProvidersSync

Synchronous version of renderWithProviders for cases where act() wrapping is not needed.

```typescript
function renderWithProvidersSync(
  ui: ReactElement,
  options?: EnhancedRenderOptions
): RenderResult & { mockRouter: MockRouter }
```

**Parameters:**
- Same as `renderWithProviders`

**Returns:**
- `RenderResult & { mockRouter: MockRouter }` - Synchronous render result

#### waitForAsyncUpdates

Utility for waiting for async state updates to complete with proper `act()` wrapping.

```typescript
function waitForAsyncUpdates(timeout?: number): Promise<void>
```

**Parameters:**
- `timeout?: number` - Maximum wait time in milliseconds (default: 1000)

**Returns:**
- `Promise<void>` - Resolves when async updates complete

#### waitForWithAct

Enhanced waitFor with proper `act()` wrapping.

```typescript
function waitForWithAct<T>(
  callback: () => T | Promise<T>,
  options?: Parameters<typeof waitFor>[1]
): Promise<T>
```

**Parameters:**
- `callback: () => T | Promise<T>` - Function to wait for
- `options?` - waitFor options from React Testing Library

**Returns:**
- `Promise<T>` - Result of the callback function

#### fireEventWithAct

Fire event with proper `act()` wrapping for async state updates.

```typescript
function fireEventWithAct(
  eventFunction: () => void | Promise<void>
): Promise<void>
```

**Parameters:**
- `eventFunction: () => void | Promise<void>` - Event function to execute

**Returns:**
- `Promise<void>` - Resolves when event and state updates complete

#### setupTestEnvironment

Setup test environment with enhanced configuration.

```typescript
function setupTestEnvironment(config?: TestConfig): {
  cleanup: () => void;
  mockRouter: MockRouter;
  session: Session | null;
}
```

**TestConfig Interface:**
```typescript
interface TestConfig {
  skipActWarnings?: boolean;    // Skip React act() warnings
  mockToasts?: boolean;         // Enable mock toast system
  mockRouter?: Partial<MockRouter>; // Mock router configuration
  session?: Session | null;     // Mock session
  timeout?: number;            // Test timeout in milliseconds
}
```

**Returns:**
- Object with cleanup function, mock router, and session

#### createMockRouter

Create mock Next.js router with proper defaults.

```typescript
function createMockRouter(initialRoute?: string): MockRouter
```

**MockRouter Interface:**
```typescript
interface MockRouter {
  push: jest.Mock;
  replace: jest.Mock;
  back: jest.Mock;
  forward: jest.Mock;
  refresh: jest.Mock;
  prefetch: jest.Mock;
  pathname: string;
  query: Record<string, string | string[]>;
  asPath: string;
  route: string;
  basePath: string;
  locale?: string;
  locales?: string[];
  defaultLocale?: string;
  isReady: boolean;
  isPreview: boolean;
}
```

**Parameters:**
- `initialRoute?: string` - Initial route path (default: '/')

**Returns:**
- `MockRouter` - Mock router instance

#### createMockSession

Create mock NextAuth session with proper typing.

```typescript
function createMockSession(userOverrides?: Partial<any>): Session
```

**Parameters:**
- `userOverrides?: Partial<any>` - User data overrides

**Returns:**
- `Session` - Mock session object

### Mock Toast System APIs

**Module**: `src/lib/testing/mock-toast-system.ts`

#### MockToastSystem Class

Main class for handling toast notifications in tests.

```typescript
class MockToastSystem {
  toast: jest.MockedFunction<ToastFunction>;
  dismiss: jest.MockedFunction<(id: string) => void>;
  update: jest.MockedFunction<(id: string, options: Partial<ToastOptions>) => void>;
  
  getActiveToasts(): ToastData[];
  getToastCalls(): ToastCall[];
  getLastToastCall(): ToastCall | undefined;
  getToastCallsByType(type: ToastType): ToastCall[];
  wasToastCalledWith(title?: string, description?: string, type?: ToastType): boolean;
  getToastCallCount(): number;
  clear(): void;
  resetMocks(): void;
}
```

**ToastData Interface:**
```typescript
interface ToastData {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  timestamp: number;
}
```

**ToastCall Interface:**
```typescript
interface ToastCall {
  id: string;
  title?: string;
  description?: string;
  type: ToastType;
  action?: {
    label: string;
    onClick: () => void;
  };
  duration?: number;
  calledAt: number;
}
```

**ToastType:**
```typescript
type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'destructive';
```

#### getMockToastSystem

Get or create the global mock toast system.

```typescript
function getMockToastSystem(): MockToastSystem
```

**Returns:**
- `MockToastSystem` - Global mock toast system instance

#### setupMockToastSystem

Setup mock toast system for testing.

```typescript
function setupMockToastSystem(): MockToastSystem
```

**Returns:**
- `MockToastSystem` - Configured mock toast system

#### toastTestUtils

Utility functions for toast assertions.

```typescript
const toastTestUtils = {
  expectToastCalledWith(title?: string, description?: string, type?: ToastType): void;
  expectNoToastsCalled(): void;
  expectToastCallCount(count: number): void;
  expectToastTypeCount(type: ToastType, count: number): void;
  getLastToast(): ToastCall | undefined;
  getAllToastCalls(): ToastCall[];
}
```

### Performance Monitor APIs

**Module**: `src/lib/testing/performance-monitor.ts`

#### FrontendPerformanceMonitor Class

```typescript
class FrontendPerformanceMonitor {
  startMonitoring(componentName: string): string;
  stopMonitoring(monitorId: string, componentName: string): ComponentPerformanceMetrics;
  recordInteraction(componentName: string, interactionName: string, interactionTime: number): void;
  getPerformanceReport(): PerformanceReport;
  clearMetrics(): void;
}
```

**ComponentPerformanceMetrics Interface:**
```typescript
interface ComponentPerformanceMetrics {
  componentName: string;
  renderTime: number;           // Component render time (ms)
  memoryUsage: number;         // Memory usage (MB)
  reRenderCount: number;       // Number of re-renders
  interactionTime: number;     // User interaction response time
  bundleSize?: number;         // Component bundle size
  warnings: string[];          // Performance warnings
}
```

#### usePerformanceMonitoring Hook

React hook for component performance monitoring.

```typescript
function usePerformanceMonitoring(componentName: string): {
  metrics: ComponentPerformanceMetrics | null;
  recordInteraction: (interactionName: string) => () => void;
}
```

**Parameters:**
- `componentName: string` - Name of the component being monitored

**Returns:**
- Object with metrics and interaction recording function

## Backend Testing APIs

### Database Test Isolation

**Module**: `backend/testing/database_isolation.py`

#### DatabaseTestIsolation Class

```python
class DatabaseTestIsolation:
    def __init__(self, db_manager: Optional[DatabaseManager] = None)
    
    async def isolated_session(self) -> AsyncGenerator[AsyncSession, None]
    async def validate_isolation(self, session: AsyncSession) -> bool
    async def get_session_info(self, session_id: str) -> Optional[Dict[str, Any]]
    async def get_active_sessions_count(self) -> int
    async def cleanup_all_sessions(self) -> None
    async def check_database_health(self) -> Dict[str, Any]
```

**Methods:**

##### isolated_session

Provide isolated database session for testing.

```python
@asynccontextmanager
async def isolated_session(self) -> AsyncGenerator[AsyncSession, None]
```

**Yields:**
- `AsyncSession` - Isolated database session with automatic rollback

**Example:**
```python
isolation = DatabaseTestIsolation()

async with isolation.isolated_session() as session:
    # Create test data
    user = User(email="test@example.com")
    session.add(user)
    await session.flush()  # Get ID without committing
    
    # All changes are automatically rolled back on exit
```

##### validate_isolation

Validate that test isolation is working correctly.

```python
async def validate_isolation(self, session: AsyncSession) -> bool
```

**Parameters:**
- `session: AsyncSession` - Database session to validate

**Returns:**
- `bool` - True if isolation is working correctly

##### check_database_health

Check the health of the database connection for testing.

```python
async def check_database_health(self) -> Dict[str, Any]
```

**Returns:**
- `Dict[str, Any]` - Health check results including test-specific metrics

**Response Format:**
```python
{
    "healthy": bool,
    "test_isolation_working": bool,
    "active_test_sessions": int,
    "test_database_ready": bool,
    "error": Optional[str]
}
```

### Test Data Factory

**Module**: `backend/testing/test_data_factory.py`

#### TestDataFactory Class

```python
class TestDataFactory:
    def __init__(self, session: AsyncSession)
    
    async def create_user(self, **kwargs) -> User
    async def create_project(self, **kwargs) -> Project
    async def create_predicate_device(self, **kwargs) -> PredicateDevice
    async def cleanup_all(self) -> None
```

**Methods:**

##### create_user

Create a test user with automatic cleanup tracking.

```python
async def create_user(self, **kwargs) -> User
```

**Parameters:**
- `**kwargs` - User attributes (email, name, etc.)

**Returns:**
- `User` - Created user instance

**Example:**
```python
user = await factory.create_user(
    email="test@example.com",
    name="Test User",
    google_id="test_google_id"
)
```

##### create_project

Create a test project with automatic cleanup tracking.

```python
async def create_project(self, **kwargs) -> Project
```

**Parameters:**
- `**kwargs` - Project attributes (name, description, user_id, etc.)

**Returns:**
- `Project` - Created project instance

### API Testing Client

**Module**: `backend/testing/api_client.py`

#### TestAPIClient Class

```python
class TestAPIClient:
    def __init__(
        self,
        base_url: str,
        timeout: float = 5.0,
        max_retries: int = 3
    )
    
    async def connect(self) -> bool
    async def request_with_retry(
        self,
        method: str,
        endpoint: str,
        **kwargs
    ) -> AsyncGenerator[Optional[httpx.Response], None]
    async def health_check(self) -> Dict[str, Any]
```

**Methods:**

##### connect

Attempt to connect to API server.

```python
async def connect(self) -> bool
```

**Returns:**
- `bool` - True if connection successful

##### request_with_retry

Make API request with retry logic.

```python
@asynccontextmanager
async def request_with_retry(
    self,
    method: str,
    endpoint: str,
    **kwargs
) -> AsyncGenerator[Optional[httpx.Response], None]
```

**Parameters:**
- `method: str` - HTTP method (GET, POST, etc.)
- `endpoint: str` - API endpoint path
- `**kwargs` - Additional request parameters

**Yields:**
- `Optional[httpx.Response]` - HTTP response or None if failed

**Example:**
```python
client = TestAPIClient("http://localhost:8000")

async with client.request_with_retry("GET", "/api/projects") as response:
    if response is None:
        pytest.skip("API request failed after retries")
    
    assert response.status_code == 200
    data = response.json()
```

### Performance Monitor

**Module**: `backend/testing/performance_monitor.py`

#### TestPerformanceMonitor Class

```python
class TestPerformanceMonitor:
    def __init__(self, thresholds: Optional[PerformanceThresholds] = None)
    
    def start_monitoring(self, test_name: str) -> str
    def stop_monitoring(self, monitor_id: str) -> TestPerformanceMetrics
    def record_database_query(self, monitor_id: str, query_info: Optional[Dict[str, Any]] = None)
    def record_api_call(self, monitor_id: str, api_info: Optional[Dict[str, Any]] = None)
    def get_performance_summary(self) -> Dict[str, Any]
    def export_metrics(self, filepath: str)
    
    @contextmanager
    def monitor_test(self, test_name: str)
    
    @asynccontextmanager
    async def monitor_async_test(self, test_name: str) -> AsyncGenerator[str, None]
```

**Data Classes:**

##### TestPerformanceMetrics

```python
@dataclass
class TestPerformanceMetrics:
    test_name: str
    execution_time: float
    memory_usage: float
    peak_memory_usage: float
    database_queries: int
    api_calls: int
    start_time: datetime
    end_time: datetime
    warnings: List[str]
    context: Dict[str, Any]
```

##### PerformanceThresholds

```python
@dataclass
class PerformanceThresholds:
    max_execution_time: float = 5.0      # seconds
    max_memory_usage: float = 100.0      # MB
    max_database_queries: int = 50
    max_api_calls: int = 10
    memory_leak_threshold: float = 10.0   # MB
```

**Methods:**

##### monitor_test

Context manager for monitoring test performance.

```python
@contextmanager
def monitor_test(self, test_name: str)
```

**Parameters:**
- `test_name: str` - Name of the test being monitored

**Yields:**
- `str` - Monitor ID for tracking operations

**Example:**
```python
monitor = TestPerformanceMonitor()

with monitor.monitor_test("database_operations_test") as monitor_id:
    # Perform operations
    monitor.record_database_query(monitor_id, {"query": "SELECT * FROM users"})
    # Test operations here
```

##### get_performance_summary

Get summary of all performance metrics.

```python
def get_performance_summary(self) -> Dict[str, Any]
```

**Returns:**
- `Dict[str, Any]` - Performance summary statistics

**Response Format:**
```python
{
    'total_tests': int,
    'average_execution_time': float,
    'average_memory_usage': float,
    'total_database_queries': int,
    'total_api_calls': int,
    'slow_tests': List[Dict[str, Any]],
    'memory_intensive_tests': List[Dict[str, Any]],
    'warnings': List[str]
}
```

## Utility Functions

### Global Functions

#### get_performance_monitor

Get the global performance monitor instance.

```python
def get_performance_monitor() -> TestPerformanceMonitor
```

**Returns:**
- `TestPerformanceMonitor` - Global monitor instance

#### create_test_isolation

Create a new DatabaseTestIsolation instance.

```python
def create_test_isolation(
    db_manager: Optional[DatabaseManager] = None
) -> DatabaseTestIsolation
```

**Parameters:**
- `db_manager: Optional[DatabaseManager]` - Database manager instance

**Returns:**
- `DatabaseTestIsolation` - New test isolation instance

#### monitor_performance

Simple context manager for monitoring test performance.

```python
@contextmanager
def monitor_performance(test_name: str)
```

**Parameters:**
- `test_name: str` - Name of the test being monitored

**Yields:**
- `str` - Monitor ID for tracking operations

## Integration Examples

### Pytest Integration

```python
# conftest.py
import pytest
from backend.testing.database_isolation import DatabaseTestIsolation
from backend.testing.test_data_factory import TestDataFactory
from backend.testing.performance_monitor import get_performance_monitor

@pytest.fixture
async def isolation():
    return DatabaseTestIsolation()

@pytest.fixture
async def test_data(isolation):
    async with isolation.isolated_session() as session:
        factory = TestDataFactory(session)
        yield factory

@pytest.fixture
def performance_monitor():
    return get_performance_monitor()

# Test usage
async def test_project_operations(test_data, performance_monitor):
    with performance_monitor.monitor_test("project_operations") as monitor_id:
        # Create test data
        user = await test_data.create_user(email="test@example.com")
        project = await test_data.create_project(name="Test Project", user_id=user.id)
        
        # Record operations
        performance_monitor.record_database_query(monitor_id)
        
        # Assertions
        assert project.name == "Test Project"
```

### Jest Integration

```typescript
// setupTests.ts
import { setupTestEnvironment, cleanupTestEnvironment } from '@/lib/testing/react-test-utils';
import { setupMockToastSystem, cleanupMockToastSystem } from '@/lib/testing/mock-toast-system';

beforeEach(() => {
  setupTestEnvironment({
    mockToasts: true,
    skipActWarnings: false
  });
  setupMockToastSystem();
});

afterEach(() => {
  cleanupTestEnvironment();
  cleanupMockToastSystem();
});

// Test usage
import { renderWithProviders, waitForAsyncUpdates } from '@/lib/testing/react-test-utils';
import { toastTestUtils } from '@/lib/testing/mock-toast-system';

test('component with toast notifications', async () => {
  const { getByText } = await renderWithProviders(<MyComponent />);
  
  fireEvent.click(getByText('Save'));
  await waitForAsyncUpdates();
  
  toastTestUtils.expectToastCalledWith('Success', 'Data saved', 'success');
});
```

This comprehensive API documentation provides all the interfaces and utilities needed for effective testing across the Medical Device Regulatory Assistant application.