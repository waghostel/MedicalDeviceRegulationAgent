"""
Unit tests for Regulatory Agent and State Management
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone
from typing import Dict, Any

from backend.agents.regulatory_agent_state import (
    RegulatoryAgentState,
    RegulatoryAgentStateManager,
    AgentTaskType,
    AgentStatus,
    ConfidenceScore,
    SourceCitation
)
from backend.agents.regulatory_agent import RegulatoryAgent
from backend.tools.tool_registry import ToolRegistry
from backend.services.audit_logger import AuditLogger


class TestRegulatoryAgentStateManager:
    """Test cases for RegulatoryAgentStateManager"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.state_manager = RegulatoryAgentStateManager()
        self.test_project_id = "test_project_123"
        self.test_user_id = "test_user_456"
        self.test_device_description = "Cardiac pacemaker device"
        self.test_intended_use = "Treatment of bradycardia"
    
    def test_create_initial_state(self):
        """Test creating initial agent state"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use,
            device_type="Class II"
        )
        
        # Verify basic state structure
        assert state["project_id"] == self.test_project_id
        assert state["user_id"] == self.test_user_id
        assert state["device_description"] == self.test_device_description
        assert state["intended_use"] == self.test_intended_use
        assert state["device_type"] == "Class II"
        
        # Verify initial values
        assert state["current_task"] is None
        assert state["status"] == AgentStatus.IDLE
        assert len(state["messages"]) == 0
        assert len(state["results"]) == 0
        assert len(state["action_history"]) == 0
        assert len(state["error_log"]) == 0
        
        # Verify session metadata
        assert "session_" in state["session_id"]
        assert state["created_at"] is not None
        assert state["updated_at"] is not None
        
        # Verify default tools
        assert "fda_predicate_search" in state["available_tools"]
        assert "device_classification" in state["available_tools"]
    
    def test_update_state(self):
        """Test updating agent state"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        original_updated_at = state["updated_at"]
        
        # Update state
        updated_state = self.state_manager.update_state(
            state,
            current_task=AgentTaskType.DEVICE_CLASSIFICATION,
            status=AgentStatus.PROCESSING
        )
        
        # Verify updates
        assert updated_state["current_task"] == AgentTaskType.DEVICE_CLASSIFICATION
        assert updated_state["status"] == AgentStatus.PROCESSING
        assert updated_state["updated_at"] != original_updated_at
    
    def test_add_result(self):
        """Test adding results to agent state"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        # Create test result data
        confidence = ConfidenceScore(
            score=0.85,
            reasoning="High confidence based on clear device description",
            factors=["clear_intended_use", "established_product_code"]
        )
        
        sources = [
            SourceCitation(
                url="https://www.fda.gov/test",
                title="Test FDA Document",
                effective_date="2023-01-01",
                document_type="FDA_GUIDANCE"
            )
        ]
        
        result_data = {
            "device_class": "II",
            "product_code": "DQO",
            "regulatory_pathway": "510k"
        }
        
        # Add result
        updated_state = self.state_manager.add_result(
            state=state,
            task_type=AgentTaskType.DEVICE_CLASSIFICATION,
            result_data=result_data,
            confidence=confidence,
            sources=sources,
            reasoning_trace=["Step 1: Analyzed device", "Step 2: Determined class"],
            execution_time_ms=1500
        )
        
        # Verify result was added
        assert "device_classification" in updated_state["results"]
        assert updated_state["confidence_scores"]["device_classification"] == 0.85
        
        result = updated_state["results"]["device_classification"]
        assert result.task_type == AgentTaskType.DEVICE_CLASSIFICATION
        assert result.data == result_data
        assert result.confidence.score == 0.85
        assert len(result.sources) == 1
        assert result.execution_time_ms == 1500
        
        # Verify action history
        assert len(updated_state["action_history"]) == 1
        action = updated_state["action_history"][0]
        assert action["action"] == "completed_device_classification"
        assert action["confidence"] == 0.85
        assert action["execution_time_ms"] == 1500
    
    def test_add_error(self):
        """Test adding errors to agent state"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        # Add error
        updated_state = self.state_manager.add_error(
            state=state,
            error_type="fda_api_error",
            error_message="Connection timeout",
            error_details={"timeout_seconds": 30, "retry_count": 3}
        )
        
        # Verify error was added
        assert len(updated_state["error_log"]) == 1
        assert updated_state["status"] == AgentStatus.ERROR
        
        error = updated_state["error_log"][0]
        assert error["error_type"] == "fda_api_error"
        assert error["message"] == "Connection timeout"
        assert error["details"]["timeout_seconds"] == 30
        assert "timestamp" in error
    
    def test_create_checkpoint(self):
        """Test creating checkpoints"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        checkpoint_data = {
            "search_progress": 50,
            "results_found": 10
        }
        
        # Create checkpoint
        updated_state = self.state_manager.create_checkpoint(
            state=state,
            checkpoint_name="predicate_search_progress",
            checkpoint_data=checkpoint_data
        )
        
        # Verify checkpoint
        assert "predicate_search_progress" in updated_state["checkpoint_data"]
        assert updated_state["last_checkpoint"] == "predicate_search_progress"
        
        checkpoint = updated_state["checkpoint_data"]["predicate_search_progress"]
        assert checkpoint["data"] == checkpoint_data
        assert "timestamp" in checkpoint
    
    def test_restore_from_checkpoint(self):
        """Test restoring from checkpoint"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        # Create checkpoint with state data
        checkpoint_data = {
            "status": AgentStatus.PROCESSING,
            "task_parameters": {"search_terms": ["pacemaker"]}
        }
        
        state = self.state_manager.create_checkpoint(
            state=state,
            checkpoint_name="test_checkpoint",
            checkpoint_data=checkpoint_data
        )
        
        # Modify state
        state["status"] = AgentStatus.ERROR
        state["task_parameters"] = {}
        
        # Restore from checkpoint
        restored_state = self.state_manager.restore_from_checkpoint(
            state=state,
            checkpoint_name="test_checkpoint"
        )
        
        # Verify restoration
        assert restored_state["status"] == AgentStatus.PROCESSING
        assert restored_state["task_parameters"]["search_terms"] == ["pacemaker"]
    
    def test_restore_nonexistent_checkpoint(self):
        """Test error handling for nonexistent checkpoint"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        with pytest.raises(ValueError, match="Checkpoint 'nonexistent' not found"):
            self.state_manager.restore_from_checkpoint(
                state=state,
                checkpoint_name="nonexistent"
            )
    
    def test_get_context_summary(self):
        """Test getting context summary"""
        
        state = self.state_manager.create_initial_state(
            project_id=self.test_project_id,
            user_id=self.test_user_id,
            device_description=self.test_device_description,
            intended_use=self.test_intended_use
        )
        
        # Add some results and errors
        state["results"]["device_classification"] = Mock()
        state["confidence_scores"]["device_classification"] = 0.85
        state["error_log"].append({"error": "test"})
        state["checkpoint_data"]["test"] = {"data": {}}
        
        summary = self.state_manager.get_context_summary(state)
        
        # Verify summary structure
        assert summary["project_id"] == self.test_project_id
        assert summary["device_description"] == self.test_device_description
        assert summary["intended_use"] == self.test_intended_use
        assert summary["current_task"] is None
        assert summary["status"] == AgentStatus.IDLE.value
        assert "device_classification" in summary["completed_tasks"]
        assert summary["confidence_scores"]["device_classification"] == 0.85
        assert summary["error_count"] == 1
        assert summary["checkpoint_count"] == 1
        assert "session_duration" in summary


class TestRegulatoryAgent:
    """Test cases for RegulatoryAgent"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_tool_registry = Mock(spec=ToolRegistry)
        self.mock_audit_logger = Mock(spec=AuditLogger)
        self.mock_memory_saver = Mock()
        
        # Create agent with mocked dependencies
        self.agent = RegulatoryAgent(
            tool_registry=self.mock_tool_registry,
            audit_logger=self.mock_audit_logger,
            memory_saver=self.mock_memory_saver
        )
    
    @pytest.mark.asyncio
    async def test_start_session(self):
        """Test starting a new agent session"""
        
        # Mock the workflow app
        mock_result = {
            "session_id": "test_session_123",
            "status": AgentStatus.IDLE,
            "project_id": "test_project",
            "results": {},
            "confidence_scores": {},
            "error_log": [],
            "checkpoint_data": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.agent.app = AsyncMock()
        self.agent.app.ainvoke.return_value = mock_result
        
        # Mock audit logger
        self.mock_audit_logger.log_agent_action = AsyncMock()
        
        # Start session
        result = await self.agent.start_session(
            project_id="test_project",
            user_id="test_user",
            device_description="Test device",
            intended_use="Test use"
        )
        
        # Verify result
        assert result["status"] == "initialized"
        assert "session_id" in result
        assert "context" in result
        
        # Verify audit logging
        self.mock_audit_logger.log_agent_action.assert_called_once()
        call_args = self.mock_audit_logger.log_agent_action.call_args
        assert call_args[1]["action"] == "session_started"
        assert call_args[1]["confidence_score"] == 1.0
    
    @pytest.mark.asyncio
    async def test_start_session_error(self):
        """Test error handling in start_session"""
        
        # Mock workflow to raise exception
        self.agent.app = AsyncMock()
        self.agent.app.ainvoke.side_effect = Exception("Test error")
        
        # Mock audit logger
        self.mock_audit_logger.log_agent_action = AsyncMock()
        
        # Test error handling
        with pytest.raises(Exception, match="Test error"):
            await self.agent.start_session(
                project_id="test_project",
                user_id="test_user",
                device_description="Test device",
                intended_use="Test use"
            )
        
        # Verify error was logged
        self.mock_audit_logger.log_agent_action.assert_called_once()
        call_args = self.mock_audit_logger.log_agent_action.call_args
        assert call_args[1]["action"] == "session_start_failed"
        assert call_args[1]["confidence_score"] == 0.0
    
    @pytest.mark.asyncio
    async def test_execute_task(self):
        """Test executing a regulatory task"""
        
        # Mock current state
        mock_state = Mock()
        mock_state.values = {
            "session_id": "test_session",
            "project_id": "test_project",
            "status": AgentStatus.IDLE,
            "results": {"device_classification": Mock()},
            "confidence_scores": {"device_classification": 0.85},
            "error_log": [],
            "checkpoint_data": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Mock workflow app
        self.agent.app = AsyncMock()
        self.agent.app.aget_state.return_value = mock_state
        self.agent.app.ainvoke.return_value = {
            "status": AgentStatus.COMPLETED,
            "results": {"device_classification": {"device_class": "II"}},
            "confidence_scores": {"device_classification": 0.85},
            "error_log": [],
            "checkpoint_data": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Execute task
        result = await self.agent.execute_task(
            session_id="test_session",
            task_type=AgentTaskType.DEVICE_CLASSIFICATION,
            task_parameters={"device_description": "Test device"}
        )
        
        # Verify result
        assert result["session_id"] == "test_session"
        assert result["task_type"] == "device_classification"
        assert result["status"] == AgentStatus.COMPLETED.value
        assert result["confidence"] == 0.85
        assert "context" in result
    
    @pytest.mark.asyncio
    async def test_execute_task_session_not_found(self):
        """Test error handling when session not found"""
        
        # Mock empty state
        mock_state = Mock()
        mock_state.values = None
        
        self.agent.app = AsyncMock()
        self.agent.app.aget_state.return_value = mock_state
        
        # Test error handling
        with pytest.raises(ValueError, match="Session test_session not found"):
            await self.agent.execute_task(
                session_id="test_session",
                task_type=AgentTaskType.DEVICE_CLASSIFICATION,
                task_parameters={}
            )
    
    @pytest.mark.asyncio
    async def test_get_session_state(self):
        """Test getting session state"""
        
        # Mock state
        mock_state = Mock()
        mock_state.values = {
            "session_id": "test_session",
            "project_id": "test_project",
            "device_description": "Test device",
            "intended_use": "Test use",
            "status": AgentStatus.IDLE,
            "results": {},
            "confidence_scores": {},
            "error_log": [],
            "checkpoint_data": {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        self.agent.app = AsyncMock()
        self.agent.app.aget_state.return_value = mock_state
        
        # Get session state
        result = await self.agent.get_session_state("test_session")
        
        # Verify result structure
        assert "project_id" in result
        assert "device_description" in result
        assert "status" in result
        assert "completed_tasks" in result
        assert "confidence_scores" in result
    
    def test_determine_next_step(self):
        """Test workflow routing logic"""
        
        # Test error state
        error_state = {"status": AgentStatus.ERROR}
        assert self.agent._determine_next_step(error_state) == "error"
        
        # Test no current task
        idle_state = {"status": AgentStatus.IDLE, "current_task": None}
        assert self.agent._determine_next_step(idle_state) == "end"
        
        # Test device classification task
        classification_state = {
            "status": AgentStatus.PROCESSING,
            "current_task": AgentTaskType.DEVICE_CLASSIFICATION
        }
        assert self.agent._determine_next_step(classification_state) == "device_classification"
        
        # Test predicate search task
        search_state = {
            "status": AgentStatus.PROCESSING,
            "current_task": AgentTaskType.PREDICATE_SEARCH
        }
        assert self.agent._determine_next_step(search_state) == "predicate_search"
    
    def test_format_task_response(self):
        """Test response formatting"""
        
        # Create mock result
        mock_result = Mock()
        mock_result.confidence.score = 0.85
        mock_result.confidence.reasoning = "High confidence classification"
        mock_result.data = {
            "device_class": "II",
            "product_code": "DQO",
            "regulatory_pathway": "510k",
            "cfr_sections": ["21 CFR 870.3610"]
        }
        mock_result.sources = [
            Mock(title="FDA Guidance", url="https://fda.gov/test", effective_date="2023-01-01")
        ]
        
        # Format response
        response = self.agent._format_task_response(
            AgentTaskType.DEVICE_CLASSIFICATION,
            mock_result
        )
        
        # Verify formatting
        assert "Device Classification Results" in response
        assert "85%" in response
        assert "High confidence classification" in response
        assert "Device Class**: II" in response
        assert "Product Code**: DQO" in response
        assert "Sources" in response
        assert "FDA Guidance" in response


if __name__ == "__main__":
    pytest.main([__file__, "-v"])