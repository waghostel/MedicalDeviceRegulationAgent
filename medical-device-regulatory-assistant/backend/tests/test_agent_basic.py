"""
Basic tests for agent integration functionality
"""

import pytest
from unittest.mock import AsyncMock, patch

from ..agents.regulatory_agent_state import AgentTaskType, AgentStatus
from ..services.session_manager import SessionManager


class TestBasicAgentIntegration:
    """Basic tests for agent integration components"""
    
    def test_agent_task_type_enum(self):
        """Test AgentTaskType enum values"""
        assert AgentTaskType.DEVICE_CLASSIFICATION.value == "device_classification"
        assert AgentTaskType.PREDICATE_SEARCH.value == "predicate_search"
        assert AgentTaskType.PREDICATE_COMPARISON.value == "predicate_comparison"
        assert AgentTaskType.GUIDANCE_SEARCH.value == "guidance_search"
    
    def test_agent_status_enum(self):
        """Test AgentStatus enum values"""
        assert AgentStatus.IDLE.value == "idle"
        assert AgentStatus.PROCESSING.value == "processing"
        assert AgentStatus.COMPLETED.value == "completed"
        assert AgentStatus.ERROR.value == "error"
    
    @pytest.mark.asyncio
    async def test_session_manager_initialization(self):
        """Test SessionManager initialization"""
        manager = SessionManager(db_path=":memory:")
        
        # Test basic functionality
        count = await manager.get_active_session_count()
        assert count == 0
        
        # Test that manager is properly initialized
        assert manager.active_sessions == {}
        assert manager.session_metadata == {}
    
    def test_import_agent_integration_module(self):
        """Test that agent integration module can be imported"""
        try:
            from ..api.agent_integration import router
            assert router is not None
        except ImportError as e:
            pytest.fail(f"Failed to import agent integration module: {e}")
    
    def test_import_session_manager(self):
        """Test that session manager can be imported"""
        try:
            from ..services.session_manager import SessionManager, SessionMetadata
            assert SessionManager is not None
            assert SessionMetadata is not None
        except ImportError as e:
            pytest.fail(f"Failed to import session manager: {e}")


if __name__ == "__main__":
    pytest.main([__file__, "-v"])