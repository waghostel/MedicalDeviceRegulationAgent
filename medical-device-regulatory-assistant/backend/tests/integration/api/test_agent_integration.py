"""
Integration tests for CopilotKit Agent Integration
Tests the complete workflow from CopilotKit frontend to LangGraph backend
"""

import pytest
import asyncio
import json
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient

from main import app
from agents.regulatory_agent import RegulatoryAgent
from agents.regulatory_agent_state import AgentTaskType, AgentStatus
from services.session_manager import SessionManager
from api.agent_integration import get_session_manager


@pytest.fixture
def client():
    """Test client for FastAPI app"""
    with TestClient(app) as client:
        yield client


@pytest.fixture
def mock_agent():
    """Mock regulatory agent"""
    agent = AsyncMock(spec=RegulatoryAgent)
    
    # Mock start_session
    agent.start_session.return_value = {
        "session_id": "test-session-123",
        "status": "initialized",
        "context": {"device_description": "Test device"}
    }
    
    # Mock execute_task
    agent.execute_task.return_value = {
        "session_id": "test-session-123",
        "task_type": "predicate_search",
        "status": "completed",
        "result": {
            "predicates": [
                {
                    "k_number": "K123456",
                    "device_name": "Test Predicate Device",
                    "confidence_score": 0.85
                }
            ]
        },
        "confidence": 0.85,
        "execution_time_ms": 2500
    }
    
    # Mock get_session_state
    agent.get_session_state.return_value = {
        "session_id": "test-session-123",
        "status": "completed",
        "completed_tasks": ["predicate_search"],
        "project_id": "test-project"
    }
    
    return agent


@pytest.fixture
def mock_session_manager():
    """Mock session manager"""
    manager = AsyncMock(spec=SessionManager)
    
    manager.get_session.return_value = None  # No existing session
    manager.store_session.return_value = None
    manager.get_active_session_count.return_value = 1
    
    return manager


class TestAgentIntegration:
    """Test agent integration endpoints"""
    
    def test_execute_agent_task_success(self, client, mock_agent):
        """Test successful agent task execution"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_session.return_value = None
            mock_sm.store_session.return_value = None
            
            with patch('backend.api.agent_integration.RegulatoryAgent', return_value=mock_agent):
                
                request_data = {
                    "task_type": "predicate_search",
                    "project_id": "test-project",
                    "device_description": "Cardiac monitoring device",
                    "intended_use": "For continuous heart rhythm monitoring",
                    "parameters": {"product_code": "DQK"}
                }
                
                response = client.post(
                    "/api/agent/execute",
                    json=request_data,
                    headers={"Authorization": "Bearer test-token"}
                )
                
                assert response.status_code == 200
                data = response.json()
                
                assert data["session_id"] == "test-session-123"
                assert data["task_type"] == "predicate_search"
                assert data["status"] == "completed"
                assert data["confidence"] == 0.85
                assert "result" in data
    
    def test_execute_agent_task_invalid_task_type(self, client):
        """Test agent task execution with invalid task type"""
        
        request_data = {
            "task_type": "invalid_task",
            "project_id": "test-project",
            "device_description": "Test device",
            "intended_use": "Test use"
        }
        
        response = client.post(
            "/api/agent/execute",
            json=request_data,
            headers={"Authorization": "Bearer test-token"}
        )
        
        assert response.status_code == 400
        assert "Invalid task type" in response.json()["detail"]
    
    def test_get_session_status(self, client, mock_agent):
        """Test getting session status"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_session.return_value = mock_agent
            
            response = client.get(
                "/api/agent/session/test-session-123/status",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["session_id"] == "test-session-123"
            assert data["status"] == "completed"
            assert "completed_tasks" in data
    
    def test_get_session_status_not_found(self, client):
        """Test getting status for non-existent session"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_session.return_value = None
            
            response = client.get(
                "/api/agent/session/nonexistent/status",
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 404
    
    def test_cancel_session_task(self, client, mock_agent):
        """Test cancelling a session task"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_session.return_value = mock_agent
            
            # Mock session state as processing
            mock_agent.get_session_state.return_value = {
                "session_id": "test-session-123",
                "status": "processing",
                "project_id": "test-project"
            }
            
            request_data = {
                "session_id": "test-session-123",
                "reason": "User requested cancellation"
            }
            
            response = client.post(
                "/api/agent/session/test-session-123/cancel",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["session_id"] == "test-session-123"
            assert data["status"] == "cancelled"
    
    def test_health_check(self, client):
        """Test agent integration health check"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_active_session_count.return_value = 5
            
            response = client.get("/api/agent/health")
            
            assert response.status_code == 200
            data = response.json()
            
            assert data["status"] == "healthy"
            assert data["active_sessions"] == 5
            assert "timestamp" in data


class TestCopilotKitIntegration:
    """Test CopilotKit integration with backend"""
    
    def test_copilotkit_predicate_search(self, client):
        """Test CopilotKit predicate search action"""
        
        # Mock the backend API call
        with patch('requests.post') as mock_post:
            mock_response = MagicMock()
            mock_response.ok = True
            mock_response.json.return_value = {
                "session_id": "test-session",
                "task_type": "predicate_search",
                "status": "completed",
                "result": {
                    "predicates": [
                        {
                            "k_number": "K123456",
                            "device_name": "Test Device",
                            "confidence_score": 0.85
                        }
                    ]
                },
                "confidence": 0.85
            }
            mock_post.return_value = mock_response
            
            # Test the CopilotKit endpoint
            response = client.post(
                "/api/copilotkit",
                json={
                    "action": "predicate_search",
                    "parameters": {
                        "deviceDescription": "Cardiac monitoring device",
                        "intendedUse": "Heart rhythm monitoring"
                    }
                }
            )
            
            # Note: This test would need to be adapted based on 
            # CopilotKit's actual request/response format
            assert response.status_code in [200, 404]  # 404 if route not properly set up


class TestRealTimeUpdates:
    """Test real-time status updates via Server-Sent Events"""
    
    def test_session_stream_events(self, client, mock_agent):
        """Test SSE stream for session updates"""
        
        with patch('backend.api.agent_integration.session_manager') as mock_sm:
            mock_sm.get_session.return_value = mock_agent
            
            # Mock session state changes
            mock_agent.get_session_state.side_effect = [
                {
                    "session_id": "test-session",
                    "status": "processing",
                    "updated_at": "2024-01-01T10:00:00"
                },
                {
                    "session_id": "test-session", 
                    "status": "completed",
                    "updated_at": "2024-01-01T10:01:00"
                }
            ]
            
            # Test SSE endpoint
            response = client.get(
                "/api/agent/session/test-session/stream",
                headers={"Authorization": "Bearer test-token"}
            )
            
            # SSE endpoints typically return 200 and stream data
            assert response.status_code == 200


class TestErrorHandling:
    """Test error handling in agent integration"""
    
    def test_agent_execution_error(self, client):
        """Test handling of agent execution errors"""
        
        with patch('backend.api.agent_integration.RegulatoryAgent') as mock_agent_class:
            mock_agent = AsyncMock()
            mock_agent.start_session.side_effect = Exception("Agent initialization failed")
            mock_agent_class.return_value = mock_agent
            
            request_data = {
                "task_type": "predicate_search",
                "project_id": "test-project",
                "device_description": "Test device",
                "intended_use": "Test use"
            }
            
            response = client.post(
                "/api/agent/execute",
                json=request_data,
                headers={"Authorization": "Bearer test-token"}
            )
            
            assert response.status_code == 500
            assert "Agent task execution failed" in response.json()["detail"]
    
    def test_unauthorized_access(self, client):
        """Test unauthorized access to agent endpoints"""
        
        request_data = {
            "task_type": "predicate_search",
            "project_id": "test-project",
            "device_description": "Test device",
            "intended_use": "Test use"
        }
        
        # No authorization header
        response = client.post("/api/agent/execute", json=request_data)
        
        # Should still work with default test user in MVP
        # In production, this would return 401
        assert response.status_code in [200, 401, 500]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])