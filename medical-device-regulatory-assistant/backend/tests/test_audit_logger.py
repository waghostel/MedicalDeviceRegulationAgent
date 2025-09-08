"""
Unit tests for Audit Logger Service
"""

import pytest
import asyncio
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.audit_logger import AuditLogger, AuditLogEntry
from backend.models.agent_interaction import AgentInteraction


class MockAsyncSession:
    """Mock async session for testing"""
    
    def __init__(self):
        self.added_objects = []
        self.committed = False
        self.rolled_back = False
    
    def add(self, obj):
        self.added_objects.append(obj)
    
    async def commit(self):
        self.committed = True
    
    async def rollback(self):
        self.rolled_back = True
    
    async def execute(self, query):
        # Mock query execution
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        return mock_result
    
    async def __aenter__(self):
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        pass


class TestAuditLogEntry:
    """Test cases for AuditLogEntry dataclass"""
    
    def test_audit_log_entry_creation(self):
        """Test creating audit log entry"""
        
        entry = AuditLogEntry(
            project_id=1,
            user_id=2,
            action="test_action",
            input_data={"param": "value"},
            output_data={"result": "success"},
            confidence_score=0.85,
            sources=[{"url": "https://test.com", "title": "Test Source"}],
            reasoning="Test reasoning",
            execution_time_ms=1500
        )
        
        assert entry.project_id == 1
        assert entry.user_id == 2
        assert entry.action == "test_action"
        assert entry.input_data == {"param": "value"}
        assert entry.output_data == {"result": "success"}
        assert entry.confidence_score == 0.85
        assert len(entry.sources) == 1
        assert entry.reasoning == "Test reasoning"
        assert entry.execution_time_ms == 1500
        assert entry.timestamp is not None  # Auto-generated
    
    def test_audit_log_entry_auto_timestamp(self):
        """Test automatic timestamp generation"""
        
        entry = AuditLogEntry(
            project_id=1,
            user_id=2,
            action="test_action",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test"
        )
        
        # Verify timestamp was auto-generated
        assert entry.timestamp is not None
        
        # Verify it's a valid ISO format timestamp
        parsed_time = datetime.fromisoformat(entry.timestamp)
        assert isinstance(parsed_time, datetime)


class TestAuditLogger:
    """Test cases for AuditLogger"""
    
    def setup_method(self):
        """Setup test fixtures"""
        self.mock_session_factory = Mock()
        self.mock_session = MockAsyncSession()
        self.mock_session_factory.return_value.__aenter__ = AsyncMock(return_value=self.mock_session)
        self.mock_session_factory.return_value.__aexit__ = AsyncMock(return_value=None)
        
        self.audit_logger = AuditLogger(session_factory=self.mock_session_factory)
    
    @pytest.mark.asyncio
    async def test_log_agent_action(self):
        """Test logging agent action"""
        
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="device_classification",
            input_data={"device": "pacemaker"},
            output_data={"class": "II", "product_code": "DQO"},
            confidence_score=0.85,
            sources=[{"url": "https://fda.gov", "title": "FDA Database"}],
            reasoning="Classification based on intended use",
            execution_time_ms=1500
        )
        
        # Verify session factory was called
        self.mock_session_factory.assert_called_once()
        
        # Verify object was added to session
        assert len(self.mock_session.added_objects) == 1
        
        interaction = self.mock_session.added_objects[0]
        assert isinstance(interaction, AgentInteraction)
        assert interaction.project_id == 1
        assert interaction.user_id == 2
        assert interaction.agent_action == "device_classification"
        assert interaction.input_data == {"device": "pacemaker"}
        assert interaction.output_data == {"class": "II", "product_code": "DQO"}
        assert interaction.confidence_score == 0.85
        assert interaction.sources == [{"url": "https://fda.gov", "title": "FDA Database"}]
        assert interaction.reasoning == "Classification based on intended use"
        assert interaction.execution_time_ms == 1500
        
        # Verify session was committed
        assert self.mock_session.committed is True
    
    @pytest.mark.asyncio
    async def test_log_error(self):
        """Test logging errors"""
        
        await self.audit_logger.log_error(
            project_id=1,
            user_id=2,
            error_type="fda_api_error",
            error_message="Connection timeout",
            error_details={"timeout": 30, "retries": 3},
            context={"task": "predicate_search"}
        )
        
        # Verify error was logged as agent action
        assert len(self.mock_session.added_objects) == 1
        
        interaction = self.mock_session.added_objects[0]
        assert interaction.agent_action == "error_fda_api_error"
        assert interaction.input_data == {"task": "predicate_search"}
        assert interaction.output_data["error_type"] == "fda_api_error"
        assert interaction.output_data["error_message"] == "Connection timeout"
        assert interaction.confidence_score == 0.0
        assert "Error occurred" in interaction.reasoning
    
    @pytest.mark.asyncio
    async def test_log_user_interaction(self):
        """Test logging user interactions"""
        
        await self.audit_logger.log_user_interaction(
            project_id=1,
            user_id=2,
            interaction_type="chat_message",
            user_input="Find predicates for my pacemaker",
            agent_response="I found 5 potential predicates...",
            context={"session_id": "session_123"}
        )
        
        # Verify interaction was logged
        assert len(self.mock_session.added_objects) == 1
        
        interaction = self.mock_session.added_objects[0]
        assert interaction.agent_action == "user_interaction_chat_message"
        assert interaction.input_data["user_input"] == "Find predicates for my pacemaker"
        assert interaction.output_data["agent_response"] == "I found 5 potential predicates..."
        assert interaction.confidence_score == 1.0
    
    @pytest.mark.asyncio
    async def test_log_tool_execution_success(self):
        """Test logging successful tool execution"""
        
        await self.audit_logger.log_tool_execution(
            project_id=1,
            user_id=2,
            tool_name="fda_predicate_search",
            tool_input={"device": "pacemaker", "intended_use": "bradycardia"},
            tool_output={
                "predicates": [{"k_number": "K123456"}],
                "sources": [{"url": "https://fda.gov"}]
            },
            execution_time_ms=2500,
            success=True
        )
        
        # Verify tool execution was logged
        assert len(self.mock_session.added_objects) == 1
        
        interaction = self.mock_session.added_objects[0]
        assert interaction.agent_action == "tool_execution_fda_predicate_search"
        assert interaction.input_data["device"] == "pacemaker"
        assert "predicates" in interaction.output_data
        assert interaction.confidence_score == 1.0
        assert interaction.execution_time_ms == 2500
        assert "successfully" in interaction.reasoning
    
    @pytest.mark.asyncio
    async def test_log_tool_execution_failure(self):
        """Test logging failed tool execution"""
        
        await self.audit_logger.log_tool_execution(
            project_id=1,
            user_id=2,
            tool_name="fda_predicate_search",
            tool_input={"device": "pacemaker"},
            tool_output={},
            execution_time_ms=1000,
            success=False,
            error_message="API connection failed"
        )
        
        # Verify failed execution was logged
        assert len(self.mock_session.added_objects) == 1
        
        interaction = self.mock_session.added_objects[0]
        assert interaction.confidence_score == 0.0
        assert interaction.output_data["error"] == "API connection failed"
        assert "with error" in interaction.reasoning
    
    @pytest.mark.asyncio
    async def test_get_audit_trail_basic(self):
        """Test retrieving basic audit trail"""
        
        # Mock query result
        mock_interactions = [
            Mock(
                id=1,
                project_id=1,
                user_id=2,
                agent_action="device_classification",
                input_data={"device": "pacemaker"},
                output_data={"class": "II"},
                confidence_score=0.85,
                sources=[],
                reasoning="Test reasoning",
                execution_time_ms=1500,
                created_at=datetime.now(timezone.utc)
            )
        ]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_interactions
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Get audit trail
        trail = await self.audit_logger.get_audit_trail(project_id=1)
        
        # Verify result
        assert len(trail) == 1
        entry = trail[0]
        assert entry["id"] == 1
        assert entry["project_id"] == 1
        assert entry["action"] == "device_classification"
        assert entry["confidence_score"] == 0.85
    
    @pytest.mark.asyncio
    async def test_get_audit_trail_with_filters(self):
        """Test retrieving audit trail with filters"""
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Test with various filters
        await self.audit_logger.get_audit_trail(
            project_id=1,
            user_id=2,
            action_filter="classification",
            start_date=datetime.now(timezone.utc) - timedelta(days=7),
            end_date=datetime.now(timezone.utc),
            limit=50
        )
        
        # Verify execute was called (query construction tested implicitly)
        self.mock_session.execute.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_audit_summary(self):
        """Test getting audit summary statistics"""
        
        # Mock interactions with various types
        mock_interactions = [
            Mock(
                agent_action="device_classification",
                confidence_score=0.85,
                execution_time_ms=1500,
                created_at=datetime.now(timezone.utc)
            ),
            Mock(
                agent_action="predicate_search",
                confidence_score=0.75,
                execution_time_ms=2500,
                created_at=datetime.now(timezone.utc) - timedelta(hours=1)
            ),
            Mock(
                agent_action="error_fda_api",
                confidence_score=0.0,
                execution_time_ms=500,
                created_at=datetime.now(timezone.utc) - timedelta(hours=2)
            )
        ]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_interactions
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Get summary
        summary = await self.audit_logger.get_audit_summary(project_id=1)
        
        # Verify summary statistics
        assert summary["total_interactions"] == 3
        assert summary["action_counts"]["device_classification"] == 1
        assert summary["action_counts"]["predicate_search"] == 1
        assert summary["action_counts"]["error_fda_api"] == 1
        assert summary["average_confidence"] == 0.533  # (0.85 + 0.75 + 0.0) / 3
        assert summary["total_execution_time"] == 4500  # 1500 + 2500 + 500
        assert summary["average_execution_time"] == 1500.0  # 4500 / 3
        assert summary["error_count"] == 1
        assert summary["error_rate"] == 33.33  # 1/3 * 100
        assert "date_range" in summary
    
    @pytest.mark.asyncio
    async def test_get_audit_summary_empty(self):
        """Test audit summary with no interactions"""
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = []
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        summary = await self.audit_logger.get_audit_summary(project_id=1)
        
        # Verify empty summary
        assert summary["total_interactions"] == 0
        assert summary["action_counts"] == {}
        assert summary["average_confidence"] == 0.0
        assert summary["total_execution_time"] == 0
        assert summary["error_count"] == 0
        assert summary["date_range"] is None
    
    @pytest.mark.asyncio
    async def test_export_audit_trail_json(self):
        """Test exporting audit trail as JSON"""
        
        mock_interactions = [
            Mock(
                id=1,
                project_id=1,
                user_id=2,
                agent_action="test_action",
                input_data={"test": "data"},
                output_data={"result": "success"},
                confidence_score=0.85,
                sources=[],
                reasoning="Test",
                execution_time_ms=1000,
                created_at=datetime.now(timezone.utc)
            )
        ]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_interactions
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Export as JSON
        json_export = await self.audit_logger.export_audit_trail(
            project_id=1,
            format_type="json"
        )
        
        # Verify JSON format
        import json
        parsed = json.loads(json_export)
        assert len(parsed) == 1
        assert parsed[0]["id"] == 1
        assert parsed[0]["action"] == "test_action"
    
    @pytest.mark.asyncio
    async def test_export_audit_trail_csv(self):
        """Test exporting audit trail as CSV"""
        
        mock_interactions = [
            Mock(
                id=1,
                project_id=1,
                user_id=2,
                agent_action="test_action",
                input_data={"test": "data"},
                output_data={"result": "success"},
                confidence_score=0.85,
                sources=[],
                reasoning="Test",
                execution_time_ms=1000,
                created_at=datetime.now(timezone.utc)
            )
        ]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_interactions
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        
        # Export as CSV
        csv_export = await self.audit_logger.export_audit_trail(
            project_id=1,
            format_type="csv"
        )
        
        # Verify CSV format
        lines = csv_export.strip().split('\n')
        assert len(lines) >= 2  # Header + at least one data row
        assert "id" in lines[0]  # Header contains id field
        assert "1" in lines[1]   # Data row contains id value
    
    @pytest.mark.asyncio
    async def test_export_audit_trail_unsupported_format(self):
        """Test error for unsupported export format"""
        
        with pytest.raises(ValueError, match="Unsupported export format: xml"):
            await self.audit_logger.export_audit_trail(
                project_id=1,
                format_type="xml"
            )
    
    @pytest.mark.asyncio
    async def test_buffer_mode_disabled(self):
        """Test logging with buffer mode disabled (auto-flush)"""
        
        # Buffer mode is disabled by default
        assert self.audit_logger.auto_flush is True
        assert len(self.audit_logger.log_buffer) == 0
        
        # Log an action
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="test_action",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test"
        )
        
        # Verify it was written immediately (not buffered)
        assert len(self.audit_logger.log_buffer) == 0
        assert len(self.mock_session.added_objects) == 1
    
    @pytest.mark.asyncio
    async def test_buffer_mode_enabled(self):
        """Test logging with buffer mode enabled"""
        
        # Enable buffer mode
        self.audit_logger.set_buffer_mode(enabled=True, buffer_size=2)
        assert self.audit_logger.auto_flush is False
        assert self.audit_logger.buffer_size == 2
        
        # Log first action (should be buffered)
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="test_action_1",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test 1"
        )
        
        # Verify it was buffered (not written to DB)
        assert len(self.audit_logger.log_buffer) == 1
        assert len(self.mock_session.added_objects) == 0
        
        # Log second action (should trigger flush)
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="test_action_2",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test 2"
        )
        
        # Verify buffer was flushed
        assert len(self.audit_logger.log_buffer) == 0
        assert len(self.mock_session.added_objects) == 2
    
    @pytest.mark.asyncio
    async def test_flush_buffer_manual(self):
        """Test manual buffer flush"""
        
        # Enable buffer mode
        self.audit_logger.set_buffer_mode(enabled=True, buffer_size=10)
        
        # Add entries to buffer
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="test_action",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test"
        )
        
        assert len(self.audit_logger.log_buffer) == 1
        
        # Manual flush
        await self.audit_logger.flush_buffer()
        
        # Verify buffer was flushed
        assert len(self.audit_logger.log_buffer) == 0
        assert len(self.mock_session.added_objects) == 1
    
    @pytest.mark.asyncio
    async def test_flush_buffer_error_handling(self):
        """Test buffer flush error handling"""
        
        # Enable buffer mode
        self.audit_logger.set_buffer_mode(enabled=True, buffer_size=10)
        
        # Add entry to buffer
        await self.audit_logger.log_agent_action(
            project_id=1,
            user_id=2,
            action="test_action",
            input_data={},
            output_data={},
            confidence_score=1.0,
            sources=[],
            reasoning="Test"
        )
        
        # Mock session to raise error on commit
        self.mock_session.commit = AsyncMock(side_effect=Exception("DB error"))
        
        # Flush should raise error and restore buffer
        with pytest.raises(Exception, match="DB error"):
            await self.audit_logger.flush_buffer()
        
        # Verify buffer was restored and rollback was called
        assert len(self.audit_logger.log_buffer) == 1
        assert self.mock_session.rolled_back is True
    
    @pytest.mark.asyncio
    async def test_cleanup_old_entries(self):
        """Test cleaning up old audit entries"""
        
        # Mock interactions to delete
        mock_interactions = [Mock(), Mock(), Mock()]
        
        mock_result = Mock()
        mock_result.scalars.return_value.all.return_value = mock_interactions
        self.mock_session.execute = AsyncMock(return_value=mock_result)
        self.mock_session.delete = AsyncMock()
        
        # Cleanup entries older than 30 days
        deleted_count = await self.audit_logger.cleanup_old_entries(
            retention_days=30,
            project_id=1
        )
        
        # Verify cleanup
        assert deleted_count == 3
        assert self.mock_session.delete.call_count == 3
        assert self.mock_session.committed is True


if __name__ == "__main__":
    pytest.main([__file__, "-v"])