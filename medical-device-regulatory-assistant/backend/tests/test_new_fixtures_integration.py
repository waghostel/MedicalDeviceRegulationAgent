"""
Test integration of new fixtures with existing database infrastructure.

This test demonstrates that our new centralized test environment and
isolated database fixtures work correctly with the existing codebase.
"""

import pytest
import pytest_asyncio
from sqlalchemy import select, func

from tests.test_utils import DatabaseTestUtils


class TestNewFixturesIntegration:
    """Test integration of new fixtures with existing infrastructure"""

    @pytest.mark.asyncio
    async def test_database_session_works_with_models(self, test_db_session, test_data_factory):
        """Test that our new database session works with existing models"""
        # Create a user using the test data factory
        user = await test_data_factory.create_user(
            email="integration_test@example.com",
            name="Integration Test User"
        )
        await test_db_session.commit()
        
        # Verify the user was created and has proper attributes
        assert user.id is not None
        assert user.email == "integration_test@example.com"
        assert user.name == "Integration Test User"
        assert user.created_at is not None
        assert user.updated_at is not None
        
        # Test querying the user back from database
        from models.user import User
        result = await test_db_session.execute(
            select(User).where(User.email == "integration_test@example.com")
        )
        retrieved_user = result.scalar_one_or_none()
        
        assert retrieved_user is not None
        assert retrieved_user.id == user.id
        assert retrieved_user.email == user.email

    @pytest.mark.asyncio
    async def test_project_model_integration(self, test_db_session, test_data_factory):
        """Test that project models work with new fixtures"""
        # Create user and project
        user = await test_data_factory.create_user()
        project = await test_data_factory.create_project(user_id=user.id)
        await test_db_session.commit()
        
        # Verify project was created with proper relationships
        assert project.id is not None
        assert project.user_id == user.id
        assert project.name is not None
        assert project.status is not None
        
        # Test querying with relationships
        from models.project import Project
        from models.user import User
        
        result = await test_db_session.execute(
            select(Project).join(User).where(User.id == user.id)
        )
        retrieved_project = result.scalar_one_or_none()
        
        assert retrieved_project is not None
        assert retrieved_project.id == project.id
        assert retrieved_project.user_id == user.id

    @pytest.mark.asyncio
    async def test_predicate_device_model_integration(self, test_db_session, test_data_factory):
        """Test that predicate device models work with new fixtures"""
        # Create user, project, and predicate device
        user = await test_data_factory.create_user()
        project = await test_data_factory.create_project(user_id=user.id)
        predicate = await test_data_factory.create_predicate_device(project_id=project.id)
        await test_db_session.commit()
        
        # Verify predicate device was created
        assert predicate.id is not None
        assert predicate.project_id == project.id
        assert predicate.k_number is not None
        assert predicate.device_name is not None
        assert predicate.confidence_score is not None
        
        # Test complex query with multiple joins
        from models.predicate_device import PredicateDevice
        from models.project import Project
        from models.user import User
        
        result = await test_db_session.execute(
            select(PredicateDevice)
            .join(Project)
            .join(User)
            .where(User.id == user.id)
        )
        retrieved_predicate = result.scalar_one_or_none()
        
        assert retrieved_predicate is not None
        assert retrieved_predicate.id == predicate.id
        assert retrieved_predicate.project_id == project.id

    @pytest.mark.asyncio
    async def test_database_utils_integration(self, test_db_session, test_data_factory):
        """Test that database utilities work with new fixtures"""
        from models.user import User
        from models.project import Project
        
        # Test count_records with empty tables
        user_count = await DatabaseTestUtils.count_records(test_db_session, User)
        project_count = await DatabaseTestUtils.count_records(test_db_session, Project)
        
        assert user_count == 0
        assert project_count == 0
        
        # Create some data
        user1 = await test_data_factory.create_user(email="user1@example.com")
        user2 = await test_data_factory.create_user(email="user2@example.com")
        project1 = await test_data_factory.create_project(user_id=user1.id)
        project2 = await test_data_factory.create_project(user_id=user2.id)
        await test_db_session.commit()
        
        # Test count_records with data
        user_count = await DatabaseTestUtils.count_records(test_db_session, User)
        project_count = await DatabaseTestUtils.count_records(test_db_session, Project)
        
        assert user_count == 2
        assert project_count == 2
        
        # Test get_record_by_id
        retrieved_user = await DatabaseTestUtils.get_record_by_id(
            test_db_session, User, user1.id
        )
        assert retrieved_user is not None
        assert retrieved_user.email == "user1@example.com"

    @pytest.mark.asyncio
    async def test_isolation_between_tests(self, test_db_session):
        """Test that database isolation works between tests"""
        from models.user import User
        
        # This test should not see any data from previous tests
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 0
        
        # Create some data directly in this test
        user = User(
            email="isolation@example.com", 
            name="Isolation User", 
            google_id="iso123"
        )
        test_db_session.add(user)
        await test_db_session.commit()
        
        # Verify data exists in this test
        count = await DatabaseTestUtils.count_records(test_db_session, User)
        assert count == 1
        
        # The important thing is that we don't see data from other tests
        # and other tests won't see this data due to isolation

    def test_environment_variables_are_set(self):
        """Test that environment variables are properly configured"""
        import os
        
        # Verify test environment variables
        assert os.getenv("TESTING") == "true"
        assert os.getenv("DATABASE_URL") == "sqlite+aiosqlite:///:memory:"
        assert os.getenv("REDIS_URL") == ""
        assert os.getenv("JWT_SECRET") == "test_secret_key_for_testing_only"

    def test_test_client_works(self, test_client):
        """Test that TestClient fixture works"""
        # Test that we can make a request (even if endpoint doesn't exist)
        response = test_client.get("/nonexistent")
        
        # We expect 404 for non-existent endpoint, which means the client works
        assert response.status_code == 404

    def test_authenticated_client_has_headers(self, authenticated_test_client):
        """Test that authenticated client has proper headers"""
        # Verify authorization header is present
        assert "Authorization" in authenticated_test_client.headers
        auth_header = authenticated_test_client.headers["Authorization"]
        assert auth_header.startswith("Bearer ")
        assert len(auth_header) > 10  # Should have a token

    @pytest.mark.asyncio
    async def test_mock_services_work(self, mock_services):
        """Test that mock services are properly configured"""
        # Test OpenFDA mock
        openfda = mock_services["openfda"]
        results = await openfda.search_predicates("test device")
        assert len(results) == 1
        assert results[0]["k_number"] == "K123456"
        
        # Test Redis mock
        redis = mock_services["redis"]
        ping_result = await redis.ping()
        assert ping_result is True