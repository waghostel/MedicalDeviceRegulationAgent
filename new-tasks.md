# Test Infrastructure Fix Tasks

## Task List

- [ ] 1. Fix Database Testing Infrastructure (Critical Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_database_integration.py -v`
  - Refactor database test fixtures to use proper async session management with isolated in-memory databases
  - Implement test-specific database configuration that bypasses the global database manager pattern
  - Create isolated database instances for each test function to ensure proper test isolation
  - Fix SQLite async connection pooling configuration for test environments
  - Update all database-dependent test fixtures to use the new pattern
  - Potential root cause: DatabaseManager class initialization fails in test environments due to improper async connection setup and global state conflicts
  - Potential solution: Create test-specific database fixtures using create_async_engine with StaticPool and proper async session management
  - Code snippet: 
    ```python
    @pytest_asyncio.fixture(scope="function")
    async def test_db_session():
        engine = create_async_engine(
            "sqlite+aiosqlite:///:memory:",
            poolclass=StaticPool,
            connect_args={"check_same_thread": False}
        )
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async_session = async_sessionmaker(engine, expire_on_commit=False)
        async with async_session() as session:
            yield session
        await engine.dispose()
    ```

- [ ] 2. Fix HTTP Client Testing Patterns (High Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_project_api.py -v`
  - Replace incorrect AsyncClient(app=app) usage with proper TestClient pattern as recommended by FastAPI documentation
  - Fix async generator issues in test fixtures that are returning generators instead of client instances
  - Implement proper async context management for HTTP tests using TestClient with context managers
  - Update all API endpoint tests to use synchronous TestClient pattern instead of AsyncClient
  - Remove httpx.AsyncClient usage from test files where TestClient should be used
  - Potential root cause: Incorrect usage of httpx.AsyncClient with FastAPI applications and async generators being returned instead of client objects
  - Potential solution: Use FastAPI's TestClient with proper context management for all API testing
  - Code snippet:
    ```python
    from fastapi.testclient import TestClient
    
    @pytest.fixture
    def client():
        with TestClient(app) as client:
            yield client
    
    def test_endpoint(client):
        response = client.get("/api/endpoint")
        assert response.status_code == 200
    ```

- [ ] 3. Fix Model Enum Definitions and Consistency (Medium Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_dashboard_integration.py::TestDashboardIntegration::test_get_dashboard_data_success -v`
  - Standardize ProjectStatus enum values across the entire codebase to include missing ACTIVE status
  - Update all test files to use correct enum values that match the model definitions
  - Review and fix any database schema inconsistencies related to enum values
  - Add database migration if schema updates are required for enum changes
  - Ensure consistent enum usage in services, models, and API responses
  - Potential root cause: Mismatch between expected enum values in tests (ACTIVE) and actual enum definitions (DRAFT, IN_PROGRESS, COMPLETED)
  - Potential solution: Add missing ACTIVE status to ProjectStatus enum and update all references
  - Code snippet:
    ```python
    class ProjectStatus(enum.Enum):
        DRAFT = "draft"
        ACTIVE = "active"  # Add missing status
        IN_PROGRESS = "in_progress"
        COMPLETED = "completed"
    ```

- [ ] 4. Fix OpenFDA Service Integration and Mocking (Medium Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_openfda_integration.py -v`
  - Create proper mock OpenFDA service instances for testing instead of async generators
  - Fix service instantiation pattern to return proper service objects with expected methods
  - Implement comprehensive async service testing fixtures with proper mocking
  - Update OpenFDA service class to ensure methods like search_predicates are properly defined
  - Create test-specific OpenFDA client configuration that doesn't require actual API access
  - Potential root cause: OpenFDA service returning async generators instead of service instances and missing expected methods
  - Potential solution: Implement proper service mocking with all required methods and fix service instantiation
  - Code snippet:
    ```python
    @pytest.fixture
    def mock_openfda_service():
        service = OpenFDAService(api_key="test_key")
        with patch.object(service, '_make_request') as mock_request:
            mock_request.return_value = {"results": []}
            yield service
    ```

- [ ] 5. Fix Authentication and JWT Token Testing (Medium Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_auth_endpoints.py::TestProjectsAuthentication::test_create_project_valid_auth -v`
  - Create proper JWT token generation and validation mocking for test environments
  - Fix authentication middleware configuration to work correctly in test scenarios
  - Implement comprehensive auth test fixtures with valid and invalid token scenarios
  - Update authentication service to handle test environment properly without causing server errors
  - Create mock user authentication that bypasses actual OAuth flow for testing
  - Potential root cause: Authentication middleware causing 500 server errors instead of proper auth validation responses
  - Potential solution: Implement test-specific authentication mocking and fix middleware error handling
  - Code snippet:
    ```python
    @pytest.fixture
    def auth_headers():
        token = create_test_jwt_token({"sub": "test_user", "email": "test@example.com"})
        return {"Authorization": f"Bearer {token}"}
    
    @pytest.fixture
    def mock_auth_service():
        with patch('services.auth.get_current_user') as mock_auth:
            mock_auth.return_value = TokenData(sub="test_user", email="test@example.com")
            yield mock_auth
    ```

- [ ] 6. Fix Service Property and Dependency Injection Issues (Low Priority)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_project_service.py -v`
  - Refactor service classes to use proper dependency injection instead of read-only properties
  - Update service initialization to accept database manager injection for testing
  - Create service factory functions that can be easily mocked in test environments
  - Fix property setter issues by implementing proper service configuration patterns
  - Update all service tests to use proper mocking and dependency injection
  - Potential root cause: Service classes have read-only properties that tests cannot modify and improper dependency injection patterns
  - Potential solution: Implement constructor-based dependency injection and remove read-only property constraints
  - Code snippet:
    ```python
    class ProjectService:
        def __init__(self, db_manager: DatabaseManager = None):
            self._db_manager = db_manager or get_database_manager()
        
        @property
        def db_manager(self):
            return self._db_manager
    ```

- [ ] 7. System Environment and Configuration Setup (System Setup Issue)
  - Test command: `cd medical-device-regulatory-assistant/backend && poetry run python -m pytest tests/test_health_check_service.py -v`
  - Configure proper test environment variables and settings for all test scenarios
  - Set up test-specific configuration that doesn't require external services like Redis
  - Create comprehensive test environment setup documentation and scripts
  - Implement proper test database seeding and cleanup procedures
  - Configure CI/CD environment to match test requirements and dependencies
  - Potential root cause: Missing or incorrect environment configuration causing service initialization failures
  - Potential solution: Create comprehensive test environment setup with proper configuration management
  - Code snippet:
    ```python
    # conftest.py
    @pytest.fixture(scope="session", autouse=True)
    def setup_test_environment():
        os.environ["TESTING"] = "true"
        os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///:memory:"
        os.environ["REDIS_URL"] = ""  # Disable Redis for testing
        yield
        # Cleanup
    ```