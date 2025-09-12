"""
Test the new database fixtures and test environment setup.

This test file verifies that the new centralized test environment and
isolated database fixtures work correctly.
"""

import pytest
import pytest_asyncio
import os
from sqlalchemy import select, func

from tests.test_utils import (
    APITestUtils, 
    DatabaseTestUtils, 
    TestEnvironmentUtils,
    create_test_user_and_project
)


class TestDatabaseFixtures:
    """Test the new database fixtures and isolation"""

    def test_environment_setup(self):
        """Test that test environment is properly configured"""
        TestEnvironmentUtils.verify_test_environment()
        
        # Verify environment variables are set correctly
        assert os.getenv("TESTING") == "true"
        assert os.getenv("DATABASE_URL") == "sqlite+aiosqlite:///:memory:"
        assert os.getenv("REDIS_URL") == ""
        assert os.getenv("JWT_SECRET") == "test_secret_key_for_testing_only"

    @pytest.mark.asyncio
    async def test_isolated_database_session(self, test_db_session):
        """Test that database session is properly isolated"""
        # Verify we have a valid session
        assert test_db_session is not None
        
        # Test basic database operation
        from sqlalchemy import text
        result = await test_db_session.execute(text("SELECT 1 as test"))
        row = result.fetchone()
        assert row[0] == 1

    @pytest.mark.asyncio
    async def test_database_isolation_between_tests(self, test_db_session, test_data_factory):
        """Test that each test gets a completely isolated database"""
        # Create a user in this test
        user = await test_data_factory.create_user(email="isolation_test@example.com")
        await test_db_session.commit()
        
        # Verify user exists
        from models.user import User
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 1
        
        # This user should not exist in other tests due to isolation

    @pytest.mark.asyncio
    async def test_database_isolation_verification(self, test_db_session):
        """Verify that previous test's data doesn't exist (isolation test)"""
        # This test should not see the user created in the previous test
        from models.user import User
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 0  # Should be 0 due to isolation

    @pytest.mark.asyncio
    async def test_test_data_factory(self, test_data_factory, test_db_session):
        """Test the test data factory functionality"""
        # Create test user
        user = await test_data_factory.create_user(
            email="factory_test@example.com",
            name="Factory Test User"
        )
        await test_db_session.commit()
        
        assert user.id is not None
        assert user.email == "factory_test@example.com"
        assert user.name == "Factory Test User"
        
        # Create test project
        project = await test_data_factory.create_project(
            user_id=user.id,
            name="Factory Test Project"
        )
        await test_db_session.commit()
        
        assert project.id is not None
        assert project.user_id == user.id
        assert project.name == "Factory Test Project"

    @pytest.mark.asyncio
    async def test_sample_fixtures(self, sample_user, sample_project, test_db_session):
        """Test the sample user and project fixtures"""
        # Verify sample user
        assert sample_user.id is not None
        assert sample_user.email == "test@example.com"
        assert sample_user.name == "Test User"
        
        # Verify sample project
        assert sample_project.id is not None
        assert sample_project.user_id == sample_user.id
        assert sample_project.name == "Test Device"
        
        # Verify they exist in database
        from models.user import User
        from models.project import Project
        
        user_count = await DatabaseTestUtils.count_records(test_db_session, User)
        project_count = await DatabaseTestUtils.count_records(test_db_session, Project)
        
        assert user_count == 1
        assert project_count == 1

    @pytest.mark.asyncio
    async def test_sequential_database_operations(self, test_db_session, test_data_factory):
        """Test that multiple database operations work correctly in isolated environment"""
        # Create multiple users sequentially (SQLAlchemy sessions are not thread-safe)
        users = []
        for i in range(5):
            user = await test_data_factory.create_user(
                email=f"sequential_user_{i}@example.com",
                name=f"Sequential User {i}"
            )
            users.append(user)
        
        await test_db_session.commit()
        
        # Verify all users were created
        assert len(users) == 5
        for i, user in enumerate(users):
            assert user.email == f"sequential_user_{i}@example.com"
            assert user.name == f"Sequential User {i}"
        
        # Verify count in database
        from models.user import User
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 5

    @pytest.mark.asyncio
    async def test_database_utils(self, test_db_session, test_data_factory):
        """Test the database utility functions"""
        from models.user import User
        
        # Test count_records with empty table
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 0
        
        # Create some users
        user1 = await test_data_factory.create_user(email="utils_test1@example.com")
        user2 = await test_data_factory.create_user(email="utils_test2@example.com")
        await test_db_session.commit()
        
        # Test count_records with data
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 2
        
        # Test get_record_by_id
        retrieved_user = await DatabaseTestUtils.get_record_by_id(
            test_db_session, User, user1.id
        )
        assert retrieved_user is not None
        assert retrieved_user.id == user1.id
        assert retrieved_user.email == "utils_test1@example.com"
        
        # Test get_record_by_id with non-existent ID
        non_existent = await DatabaseTestUtils.get_record_by_id(
            test_db_session, User, 99999
        )
        assert non_existent is None


class TestHTTPClientFixtures:
    """Test the HTTP client fixtures"""

    def test_test_client_fixture(self, test_client):
        """Test that TestClient fixture works correctly"""
        # Test basic health check endpoint (if it exists)
        response = test_client.get("/health")
        
        # The response might be 404 if health endpoint doesn't exist yet
        # That's fine - we're just testing that the client works
        assert response.status_code in [200, 404, 503]

    def test_authenticated_test_client(self, authenticated_test_client):
        """Test that authenticated TestClient has proper headers"""
        # Verify that authorization header is set
        assert "Authorization" in authenticated_test_client.headers
        assert authenticated_test_client.headers["Authorization"].startswith("Bearer ")


class TestMockServices:
    """Test the mock services fixture"""

    @pytest.mark.asyncio
    async def test_mock_services_fixture(self, mock_services):
        """Test that mock services are properly configured"""
        # Test mock OpenFDA service
        openfda_mock = mock_services["openfda"]
        
        # Test search_predicates mock
        results = await openfda_mock.search_predicates("test device")
        assert len(results) == 1
        assert results[0]["k_number"] == "K123456"
        assert results[0]["device_name"] == "Test Device"
        
        # Test get_device_details mock
        details = await openfda_mock.get_device_details("K123456")
        assert details["k_number"] == "K123456"
        assert details["device_name"] == "Test Device"
        
        # Test health_check mock
        health = await openfda_mock.health_check()
        assert health["healthy"] is True
        assert health["status"] == "connected"
        
        # Test mock Redis client
        redis_mock = mock_services["redis"]
        
        # Test basic Redis operations
        ping_result = await redis_mock.ping()
        assert ping_result is True
        
        get_result = await redis_mock.get("test_key")
        assert get_result is None
        
        set_result = await redis_mock.set("test_key", "test_value")
        assert set_result is True


class TestUtilityFunctions:
    """Test the utility functions"""

    def test_api_test_utils(self):
        """Test API testing utilities"""
        from unittest.mock import Mock
        
        # Mock successful response
        success_response = Mock()
        success_response.status_code = 200
        success_response.json.return_value = {"status": "success", "data": "test"}
        success_response.text = '{"status": "success", "data": "test"}'
        
        # Test assert_success_response
        data = APITestUtils.assert_success_response(success_response)
        assert data["status"] == "success"
        assert data["data"] == "test"
        
        # Mock error response
        error_response = Mock()
        error_response.status_code = 400
        error_response.json.return_value = {"detail": {"error_code": "VALIDATION_ERROR"}}
        error_response.text = '{"detail": {"error_code": "VALIDATION_ERROR"}}'
        
        # Test assert_error_response
        error_data = APITestUtils.assert_error_response(
            error_response, 400, "VALIDATION_ERROR"
        )
        assert error_data["detail"]["error_code"] == "VALIDATION_ERROR"

    @pytest.mark.asyncio
    async def test_convenience_functions(self, test_data_factory):
        """Test convenience functions"""
        # Test create_test_user_and_project
        user, project = await create_test_user_and_project(test_data_factory)
        
        assert user.id is not None
        assert project.id is not None
        assert project.user_id == user.id