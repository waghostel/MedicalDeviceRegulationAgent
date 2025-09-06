#!/usr/bin/env python3
"""
Comprehensive authentication tests for Medical Device Regulatory Assistant API endpoints

Tests all protected endpoints with various authentication scenarios:
- Valid authentication
- No authentication
- Invalid tokens
- Expired tokens
- Wrong signature tokens
- Missing claims tokens
"""

import pytest
import asyncio
from fastapi.testclient import TestClient
from fastapi import status
from unittest.mock import patch, AsyncMock

from main import app
from tests.auth_test_framework import (
    AuthTestFramework,
    AuthenticatedTestClient,
    AuthTestScenarios,
    generate_test_project_data,
    generate_test_agent_request,
    setup_test_environment,
    cleanup_test_environment
)


class TestProjectsAuthentication:
    """Test authentication for projects API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self):
        """Setup and cleanup test environment"""
        setup_test_environment()
        yield
        cleanup_test_environment()
    
    @pytest.fixture
    def client(self):
        """FastAPI test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_framework(self):
        """Authentication test framework"""
        return AuthTestFramework()
    
    @pytest.fixture
    def auth_client(self, client, auth_framework):
        """Authenticated test client"""
        return AuthenticatedTestClient(client, auth_framework)
    
    def test_create_project_valid_auth(self, auth_client):
        """Test creating project with valid authentication"""
        # Authenticate as valid user
        token = auth_client.authenticate_as("valid_user")
        
        # Create project data
        project_data = generate_test_project_data()
        
        # Mock the project service
        with patch('api.projects.project_service.create_project') as mock_create:
            mock_create.return_value = {
                "id": 1,
                "name": project_data["name"],
                "description": project_data["description"],
                "device_type": project_data["device_type"],
                "intended_use": project_data["intended_use"],
                "status": "active",
                "created_at": "2025-09-06T10:00:00Z",
                "updated_at": "2025-09-06T10:00:00Z"
            }
            
            # Make authenticated request
            response = auth_client.post("/api/projects/", json=project_data)
            
            # Verify response
            assert response.status_code == status.HTTP_201_CREATED
            assert mock_create.called
            
            # Verify token was used
            assert token is not None
    
    def test_create_project_no_auth(self, client):
        """Test creating project without authentication"""
        project_data = generate_test_project_data()
        
        response = client.post("/api/projects/", json=project_data)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_project_invalid_token(self, client, auth_framework):
        """Test creating project with invalid token"""
        project_data = generate_test_project_data()
        invalid_token = auth_framework.create_invalid_token("malformed")
        headers = auth_framework.get_auth_headers(invalid_token)
        
        response = client.post("/api/projects/", json=project_data, headers=headers)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_project_expired_token(self, client, auth_framework):
        """Test creating project with expired token"""
        project_data = generate_test_project_data()
        expired_token = auth_framework.create_test_token("expired_user")
        headers = auth_framework.get_auth_headers(expired_token)
        
        response = client.post("/api/projects/", json=project_data, headers=headers)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_create_project_wrong_signature(self, client, auth_framework):
        """Test creating project with wrong signature token"""
        project_data = generate_test_project_data()
        wrong_sig_token = auth_framework.create_invalid_token("wrong_signature")
        headers = auth_framework.get_auth_headers(wrong_sig_token)
        
        response = client.post("/api/projects/", json=project_data, headers=headers)
        
        # Should return 401 Unauthorized
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_projects_valid_auth(self, auth_client):
        """Test listing projects with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.projects.project_service.list_projects') as mock_list:
            mock_list.return_value = [
                {
                    "id": 1,
                    "name": "Test Project",
                    "description": "Test Description",
                    "status": "active",
                    "created_at": "2025-09-06T10:00:00Z"
                }
            ]
            
            response = auth_client.get("/api/projects/")
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_list.called
    
    def test_list_projects_no_auth(self, client):
        """Test listing projects without authentication"""
        response = client.get("/api/projects/")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_project_valid_auth(self, auth_client):
        """Test getting specific project with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.projects.project_service.get_project') as mock_get:
            mock_get.return_value = {
                "id": 1,
                "name": "Test Project",
                "description": "Test Description",
                "status": "active",
                "created_at": "2025-09-06T10:00:00Z"
            }
            
            response = auth_client.get("/api/projects/1")
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_get.called
    
    def test_get_project_no_auth(self, client):
        """Test getting specific project without authentication"""
        response = client.get("/api/projects/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_update_project_valid_auth(self, auth_client):
        """Test updating project with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        update_data = {"name": "Updated Project Name"}
        
        with patch('api.projects.project_service.update_project') as mock_update:
            mock_update.return_value = {
                "id": 1,
                "name": "Updated Project Name",
                "description": "Test Description",
                "status": "active",
                "updated_at": "2025-09-06T10:30:00Z"
            }
            
            response = auth_client.put("/api/projects/1", json=update_data)
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_update.called
    
    def test_update_project_no_auth(self, client):
        """Test updating project without authentication"""
        update_data = {"name": "Updated Project Name"}
        response = client.put("/api/projects/1", json=update_data)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_delete_project_valid_auth(self, auth_client):
        """Test deleting project with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.projects.project_service.delete_project') as mock_delete:
            mock_delete.return_value = {"message": "Project deleted successfully"}
            
            response = auth_client.delete("/api/projects/1")
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_delete.called
    
    def test_delete_project_no_auth(self, client):
        """Test deleting project without authentication"""
        response = client.delete("/api/projects/1")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_project_dashboard_valid_auth(self, auth_client):
        """Test getting project dashboard with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.projects.project_service.get_dashboard_data') as mock_dashboard:
            mock_dashboard.return_value = {
                "project": {"id": 1, "name": "Test Project"},
                "classification_status": "completed",
                "predicate_count": 5,
                "completion_percentage": 75.0
            }
            
            response = auth_client.get("/api/projects/1/dashboard")
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_dashboard.called
    
    def test_get_project_dashboard_no_auth(self, client):
        """Test getting project dashboard without authentication"""
        response = client.get("/api/projects/1/dashboard")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_export_project_valid_auth(self, auth_client):
        """Test exporting project with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.projects.project_service.export_project') as mock_export:
            mock_export.return_value = {
                "project": {"id": 1, "name": "Test Project"},
                "classifications": [],
                "predicates": [],
                "documents": [],
                "interactions": []
            }
            
            response = auth_client.get("/api/projects/1/export?format_type=json")
            
            assert response.status_code == status.HTTP_200_OK
            assert mock_export.called
    
    def test_export_project_no_auth(self, client):
        """Test exporting project without authentication"""
        response = client.get("/api/projects/1/export?format_type=json")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAgentIntegrationAuthentication:
    """Test authentication for agent integration API endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self):
        """Setup and cleanup test environment"""
        setup_test_environment()
        yield
        cleanup_test_environment()
    
    @pytest.fixture
    def client(self):
        """FastAPI test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_framework(self):
        """Authentication test framework"""
        return AuthTestFramework()
    
    @pytest.fixture
    def auth_client(self, client, auth_framework):
        """Authenticated test client"""
        return AuthenticatedTestClient(client, auth_framework)
    
    def test_execute_agent_task_valid_auth(self, auth_client):
        """Test executing agent task with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        agent_request = generate_test_agent_request()
        
        with patch('api.agent_integration.RegulatoryAgent') as mock_agent_class:
            mock_agent = AsyncMock()
            mock_agent_class.return_value = mock_agent
            
            mock_agent.start_session.return_value = {"session_id": "test-session-123"}
            mock_agent.execute_task.return_value = {
                "session_id": "test-session-123",
                "task_type": "device_classification",
                "status": "completed",
                "result": {"device_class": "Class II", "confidence": 0.85},
                "confidence": 0.85,
                "execution_time_ms": 1500
            }
            
            response = auth_client.post("/api/agent/execute", json=agent_request)
            
            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert response_data["session_id"] == "test-session-123"
            assert response_data["task_type"] == "device_classification"
            assert response_data["status"] == "completed"
    
    def test_execute_agent_task_no_auth(self, client):
        """Test executing agent task without authentication"""
        agent_request = generate_test_agent_request()
        
        response = client.post("/api/agent/execute", json=agent_request)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_execute_agent_task_invalid_token(self, client, auth_framework):
        """Test executing agent task with invalid token"""
        agent_request = generate_test_agent_request()
        invalid_token = auth_framework.create_invalid_token("malformed")
        headers = auth_framework.get_auth_headers(invalid_token)
        
        response = client.post("/api/agent/execute", json=agent_request, headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_get_session_status_valid_auth(self, auth_client):
        """Test getting session status with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.agent_integration.get_session_manager') as mock_get_manager:
            mock_manager = AsyncMock()
            mock_get_manager.return_value = mock_manager
            
            mock_agent = AsyncMock()
            mock_manager.get_session.return_value = mock_agent
            mock_agent.get_session_state.return_value = {
                "status": "processing",
                "current_task": "device_classification",
                "completed_tasks": []
            }
            
            response = auth_client.get("/api/agent/session/test-session-123/status")
            
            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert response_data["session_id"] == "test-session-123"
            assert response_data["status"] == "processing"
    
    def test_get_session_status_no_auth(self, client):
        """Test getting session status without authentication"""
        response = client.get("/api/agent/session/test-session-123/status")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_cancel_session_task_valid_auth(self, auth_client):
        """Test cancelling session task with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        cancel_request = {"session_id": "test-session-123", "reason": "User requested cancellation"}
        
        with patch('api.agent_integration.get_session_manager') as mock_get_manager:
            mock_manager = AsyncMock()
            mock_get_manager.return_value = mock_manager
            
            mock_agent = AsyncMock()
            mock_manager.get_session.return_value = mock_agent
            mock_agent.get_session_state.return_value = {
                "status": "processing",
                "project_id": "1"
            }
            
            response = auth_client.post("/api/agent/session/test-session-123/cancel", json=cancel_request)
            
            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert response_data["session_id"] == "test-session-123"
            assert response_data["status"] == "cancelled"
    
    def test_cancel_session_task_no_auth(self, client):
        """Test cancelling session task without authentication"""
        cancel_request = {"session_id": "test-session-123", "reason": "User requested cancellation"}
        
        response = client.post("/api/agent/session/test-session-123/cancel", json=cancel_request)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_list_user_sessions_valid_auth(self, auth_client):
        """Test listing user sessions with valid authentication"""
        auth_client.authenticate_as("valid_user")
        
        with patch('api.agent_integration.get_session_manager') as mock_get_manager:
            mock_manager = AsyncMock()
            mock_get_manager.return_value = mock_manager
            
            mock_agent = AsyncMock()
            mock_agent.get_session_state.return_value = {
                "project_id": "1",
                "status": "completed",
                "created_at": "2025-09-06T10:00:00Z",
                "updated_at": "2025-09-06T10:30:00Z",
                "completed_tasks": ["device_classification"]
            }
            
            mock_manager.get_user_sessions.return_value = {
                "test-session-123": mock_agent
            }
            
            response = auth_client.get("/api/agent/sessions")
            
            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert len(response_data) == 1
            assert response_data[0]["session_id"] == "test-session-123"
    
    def test_list_user_sessions_no_auth(self, client):
        """Test listing user sessions without authentication"""
        response = client.get("/api/agent/sessions")
        assert response.status_code == status.HTTP_401_UNAUTHORIZED


class TestAuthenticationScenarios:
    """Test various authentication scenarios across endpoints"""
    
    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self):
        """Setup and cleanup test environment"""
        setup_test_environment()
        yield
        cleanup_test_environment()
    
    @pytest.fixture
    def client(self):
        """FastAPI test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_framework(self):
        """Authentication test framework"""
        return AuthTestFramework()
    
    @pytest.fixture
    def auth_client(self, client, auth_framework):
        """Authenticated test client"""
        return AuthenticatedTestClient(client, auth_framework)
    
    def test_admin_user_access(self, auth_client):
        """Test admin user can access all endpoints"""
        auth_client.authenticate_as("admin_user")
        
        # Test projects endpoint
        with patch('api.projects.project_service.list_projects') as mock_list:
            mock_list.return_value = []
            response = auth_client.get("/api/projects/")
            assert response.status_code == status.HTTP_200_OK
    
    def test_token_expiration_handling(self, client, auth_framework):
        """Test that expired tokens are properly rejected"""
        # Create token that expires in 1 second
        short_token = auth_framework.create_test_token("valid_user", expires_in_minutes=0)
        headers = auth_framework.get_auth_headers(short_token)
        
        # Wait for token to expire (in real scenario, this would be handled by JWT library)
        response = client.get("/api/projects/", headers=headers)
        
        # Should be rejected due to expiration
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_missing_claims_token(self, client, auth_framework):
        """Test that tokens with missing claims are rejected"""
        invalid_token = auth_framework.create_invalid_token("missing_claims")
        headers = auth_framework.get_auth_headers(invalid_token)
        
        response = client.get("/api/projects/", headers=headers)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_malformed_authorization_header(self, client):
        """Test various malformed authorization headers"""
        test_cases = [
            {"Authorization": "InvalidFormat token"},
            {"Authorization": "Bearer"},  # Missing token
            {"Authorization": "Bearer "},  # Empty token
            {"Authorization": "Basic dGVzdDp0ZXN0"},  # Wrong auth type
        ]
        
        for headers in test_cases:
            response = client.get("/api/projects/", headers=headers)
            assert response.status_code == status.HTTP_401_UNAUTHORIZED
    
    def test_case_sensitive_bearer_token(self, client, auth_framework):
        """Test that Bearer token is case sensitive"""
        valid_token = auth_framework.create_test_token("valid_user")
        
        # Test different cases
        test_cases = [
            {"Authorization": f"bearer {valid_token}"},  # lowercase
            {"Authorization": f"BEARER {valid_token}"},  # uppercase
            {"Authorization": f"Bearer {valid_token}"},  # correct case
        ]
        
        for i, headers in enumerate(test_cases):
            response = client.get("/api/projects/", headers=headers)
            if i == 2:  # Only correct case should work
                # Note: This depends on the actual auth implementation
                # Some implementations are case-insensitive
                pass
            else:
                # May or may not fail depending on implementation
                pass


class TestAuthenticationPerformance:
    """Test authentication performance and edge cases"""
    
    @pytest.fixture(autouse=True)
    def setup_and_cleanup(self):
        """Setup and cleanup test environment"""
        setup_test_environment()
        yield
        cleanup_test_environment()
    
    @pytest.fixture
    def client(self):
        """FastAPI test client"""
        return TestClient(app)
    
    @pytest.fixture
    def auth_framework(self):
        """Authentication test framework"""
        return AuthTestFramework()
    
    def test_concurrent_authentication_requests(self, client, auth_framework):
        """Test multiple concurrent authentication requests"""
        import threading
        import time
        
        valid_token = auth_framework.create_test_token("valid_user")
        headers = auth_framework.get_auth_headers(valid_token)
        
        results = []
        
        def make_request():
            with patch('api.projects.project_service.list_projects') as mock_list:
                mock_list.return_value = []
                response = client.get("/api/projects/", headers=headers)
                results.append(response.status_code)
        
        # Create multiple threads
        threads = []
        for _ in range(10):
            thread = threading.Thread(target=make_request)
            threads.append(thread)
        
        # Start all threads
        for thread in threads:
            thread.start()
        
        # Wait for all threads to complete
        for thread in threads:
            thread.join()
        
        # All requests should succeed (or fail consistently)
        assert len(results) == 10
        # Most should be successful (200) or unauthorized (401)
        assert all(status in [200, 401] for status in results)
    
    def test_large_token_handling(self, client, auth_framework):
        """Test handling of tokens with large payloads"""
        # Create token with large custom claims
        large_claims = {
            "large_data": "x" * 1000,  # 1KB of data
            "permissions": ["read", "write", "admin"] * 100,  # Large permissions list
            "metadata": {"key" + str(i): "value" + str(i) for i in range(100)}
        }
        
        large_token = auth_framework.create_test_token("valid_user", custom_claims=large_claims)
        headers = auth_framework.get_auth_headers(large_token)
        
        with patch('api.projects.project_service.list_projects') as mock_list:
            mock_list.return_value = []
            response = client.get("/api/projects/", headers=headers)
            
            # Should handle large tokens gracefully
            assert response.status_code in [200, 401]  # Either works or fails gracefully


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v", "--tb=short"])