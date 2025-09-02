"""
Tests for Audit Trail API endpoints
"""

import pytest
import json
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, patch, MagicMock
from fastapi.testclient import TestClient
from httpx import AsyncClient

from ..main import app
from ..services.audit_logger import AuditLogger, AuditLogEntry
from ..models.user import User


@pytest.fixture
def mock_user():
    """Mock user for authentication"""
    user = MagicMock()
    user.id = 1
    user.email = "test@example.com"
    user.name = "Test User"
    return user


@pytest.fixture
def mock_audit_logger():
    """Mock audit logger service"""
    logger = AsyncMock(spec=AuditLogger)
    return logger


@pytest.fixture
def sample_audit_entries():
    """Sample audit entries for testing"""
    return [
        {
            "id": 1,
            "project_id": 1,
            "user_id": 1,
            "action": "predicate_search",
            "input_data": {"device_description": "Test device"},
            "output_data": {"predicates": ["K123456"]},
            "confidence_score": 0.85,
            "sources": [{"url": "https://fda.gov", "title": "FDA Database"}],
            "reasoning": "Found similar devices",
            "execution_time_ms": 1500,
            "created_at": "2024-01-01T10:00:00"
        },
        {
            "id": 2,
            "project_id": 1,
            "user_id": 1,
            "action": "device_classification",
            "input_data": {"device_type": "Class II"},
            "output_data": {"classification": "Class II"},
            "confidence_score": 0.92,
            "sources": [{"url": "https://fda.gov", "title": "FDA Classification"}],
            "reasoning": "Clear classification criteria met",
            "execution_time_ms": 800,
            "created_at": "2024-01-01T11:00:00"
        }
    ]


@pytest.fixture
def sample_audit_summary():
    """Sample audit summary for testing"""
    return {
        "total_interactions": 2,
        "action_counts": {
            "predicate_search": 1,
            "device_classification": 1
        },
        "average_confidence": 0.885,
        "total_execution_time": 2300,
        "average_execution_time": 1150.0,
        "error_count": 0,
        "error_rate": 0.0,
        "date_range": {
            "start": "2024-01-01T10:00:00",
            "end": "2024-01-01T11:00:00"
        }
    }


class TestAuditTrailAPI:
    """Test audit trail API endpoints"""
    
    @pytest.mark.asyncio
    async def test_get_audit_trail_success(
        self,
        mock_user,
        mock_audit_logger,
        sample_audit_entries,
        sample_audit_summary
    ):
        """Test successful audit trail retrieval"""
        
        # Setup mocks
        mock_audit_logger.get_audit_trail.return_value = sample_audit_entries
        mock_audit_logger.get_audit_summary.return_value = sample_audit_summary
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.get("/api/audit/trail/1")
        
        assert response.status_code == 200
        data = response.json()
        
        assert "audit_entries" in data
        assert "summary" in data
        assert data["total_count"] == 2
        assert len(data["audit_entries"]) == 2
        
        # Verify audit logger was called correctly
        mock_audit_logger.get_audit_trail.assert_called_once_with(
            project_id=1,
            user_id=None,
            action_filter=None,
            start_date=None,
            end_date=None,
            limit=100
        )
    
    @pytest.mark.asyncio
    async def test_get_audit_trail_with_filters(
        self,
        mock_user,
        mock_audit_logger,
        sample_audit_entries,
        sample_audit_summary
    ):
        """Test audit trail retrieval with filters"""
        
        mock_audit_logger.get_audit_trail.return_value = sample_audit_entries
        mock_audit_logger.get_audit_summary.return_value = sample_audit_summary
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.get(
                        "/api/audit/trail/1",
                        params={
                            "user_id": 1,
                            "action_filter": "predicate",
                            "limit": 50
                        }
                    )
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["filters_applied"]["user_id"] == 1
        assert data["filters_applied"]["action_filter"] == "predicate"
        assert data["filters_applied"]["limit"] == 50
    
    @pytest.mark.asyncio
    async def test_export_audit_trail_json(
        self,
        mock_user,
        mock_audit_logger
    ):
        """Test audit trail export in JSON format"""
        
        export_data = json.dumps([{"id": 1, "action": "test"}], indent=2)
        mock_audit_logger.export_audit_trail.return_value = export_data
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.post(
                        "/api/audit/export",
                        json={
                            "project_id": 1,
                            "format_type": "json"
                        }
                    )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "application/json; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
        
        # Verify audit logger was called correctly
        mock_audit_logger.export_audit_trail.assert_called_once_with(
            project_id=1,
            format_type="json",
            user_id=None,
            start_date=None,
            end_date=None
        )
    
    @pytest.mark.asyncio
    async def test_export_audit_trail_csv(
        self,
        mock_user,
        mock_audit_logger
    ):
        """Test audit trail export in CSV format"""
        
        export_data = "id,action\n1,test\n"
        mock_audit_logger.export_audit_trail.return_value = export_data
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.post(
                        "/api/audit/export",
                        json={
                            "project_id": 1,
                            "format_type": "csv"
                        }
                    )
        
        assert response.status_code == 200
        assert response.headers["content-type"] == "text/csv; charset=utf-8"
        assert "attachment" in response.headers["content-disposition"]
    
    @pytest.mark.asyncio
    async def test_generate_compliance_report(
        self,
        mock_user,
        mock_audit_logger,
        sample_audit_entries,
        sample_audit_summary
    ):
        """Test compliance report generation"""
        
        mock_audit_logger.get_audit_trail.return_value = sample_audit_entries
        mock_audit_logger.get_audit_summary.return_value = sample_audit_summary
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                with patch('backend.api.audit.verify_audit_integrity') as mock_integrity:
                    mock_integrity.return_value = {
                        "is_valid": True,
                        "integrity_score": 1.0
                    }
                    
                    async with AsyncClient(app=app, base_url="http://test") as ac:
                        response = await ac.post(
                            "/api/audit/compliance-report",
                            json={
                                "project_id": 1,
                                "report_type": "full",
                                "include_integrity_check": True
                            }
                        )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "report_metadata" in data
        assert "compliance_metrics" in data
        assert "audit_summary" in data
        assert "integrity_verification" in data
        assert "regulatory_compliance" in data
        
        # Check regulatory compliance flags
        compliance = data["regulatory_compliance"]
        assert compliance["fda_traceability"] is True
    
    @pytest.mark.asyncio
    async def test_verify_audit_integrity(
        self,
        mock_user,
        mock_audit_logger,
        sample_audit_entries
    ):
        """Test audit integrity verification"""
        
        mock_audit_logger.get_audit_trail.return_value = sample_audit_entries
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                with patch('backend.api.audit._verify_entry_integrity', return_value=True):
                    async with AsyncClient(app=app, base_url="http://test") as ac:
                        response = await ac.get("/api/audit/integrity/1")
        
        assert response.status_code == 200
        data = response.json()
        
        assert data["is_valid"] is True
        assert data["total_entries"] == 2
        assert data["verified_entries"] == 2
        assert data["tampered_entries"] == []
        assert data["integrity_score"] == 1.0
        assert data["hash_algorithm"] == "SHA-256"
    
    @pytest.mark.asyncio
    async def test_log_audit_entry(
        self,
        mock_user,
        mock_audit_logger
    ):
        """Test logging new audit entry"""
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.post(
                        "/api/audit/log",
                        params={"project_id": 1, "action": "test_action"},
                        json={
                            "input_data": {"test": "input"},
                            "output_data": {"test": "output"},
                            "confidence_score": 0.9,
                            "sources": [{"url": "test.com"}],
                            "reasoning": "Test reasoning"
                        }
                    )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert "timestamp" in data
        
        # Verify audit logger was called
        mock_audit_logger.log_agent_action.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_apply_retention_policy(
        self,
        mock_user,
        mock_audit_logger
    ):
        """Test applying retention policy"""
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.post(
                        "/api/audit/retention-policy",
                        json={
                            "retention_days": 365,
                            "project_id": 1,
                            "archive_before_delete": True
                        }
                    )
        
        assert response.status_code == 200
        data = response.json()
        
        assert "message" in data
        assert data["retention_days"] == 365
        assert data["project_id"] == 1
        assert data["archive_before_delete"] is True


class TestAuditHelperFunctions:
    """Test audit helper functions"""
    
    @pytest.mark.asyncio
    async def test_generate_compliance_metrics_empty(self):
        """Test compliance metrics with empty audit entries"""
        
        from backend.api.audit import _generate_compliance_metrics
        
        metrics = await _generate_compliance_metrics([])
        
        assert metrics["reasoning_completeness"] == 0.0
        assert metrics["citation_completeness"] == 0.0
        assert metrics["confidence_score_coverage"] == 0.0
        assert metrics["average_confidence"] == 0.0
        assert metrics["action_distribution"] == {}
        assert metrics["error_rate"] == 0.0
    
    @pytest.mark.asyncio
    async def test_generate_compliance_metrics_with_data(self, sample_audit_entries):
        """Test compliance metrics with sample data"""
        
        from backend.api.audit import _generate_compliance_metrics
        
        metrics = await _generate_compliance_metrics(sample_audit_entries)
        
        assert metrics["reasoning_completeness"] == 1.0  # All entries have reasoning
        assert metrics["citation_completeness"] == 1.0   # All entries have sources
        assert metrics["confidence_score_coverage"] == 1.0  # All entries have confidence scores
        assert metrics["average_confidence"] == 0.885  # Average of 0.85 and 0.92
        assert metrics["error_rate"] == 0.0  # No error actions
        assert metrics["total_entries_analyzed"] == 2
    
    @pytest.mark.asyncio
    async def test_verify_entry_integrity_valid(self):
        """Test entry integrity verification with valid entry"""
        
        from backend.api.audit import _verify_entry_integrity
        
        valid_entry = {
            "id": 1,
            "project_id": 1,
            "action": "test_action",
            "created_at": "2024-01-01T10:00:00",
            "confidence_score": 0.85
        }
        
        result = await _verify_entry_integrity(valid_entry)
        assert result is True
    
    @pytest.mark.asyncio
    async def test_verify_entry_integrity_invalid(self):
        """Test entry integrity verification with invalid entry"""
        
        from backend.api.audit import _verify_entry_integrity
        
        # Missing required fields
        invalid_entry = {
            "id": 1,
            "action": "test_action"
            # Missing project_id and created_at
        }
        
        result = await _verify_entry_integrity(invalid_entry)
        assert result is False
        
        # Invalid confidence score
        invalid_confidence = {
            "id": 1,
            "project_id": 1,
            "action": "test_action",
            "created_at": "2024-01-01T10:00:00",
            "confidence_score": 1.5  # Invalid range
        }
        
        result = await _verify_entry_integrity(invalid_confidence)
        assert result is False


class TestAuditAPIErrorHandling:
    """Test error handling in audit API"""
    
    @pytest.mark.asyncio
    async def test_get_audit_trail_error(self, mock_user, mock_audit_logger):
        """Test error handling in get_audit_trail"""
        
        mock_audit_logger.get_audit_trail.side_effect = Exception("Database error")
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.get("/api/audit/trail/1")
        
        assert response.status_code == 500
        assert "Failed to retrieve audit trail" in response.json()["detail"]
    
    @pytest.mark.asyncio
    async def test_export_unsupported_format(self, mock_user, mock_audit_logger):
        """Test export with unsupported format"""
        
        with patch('backend.api.audit.get_current_user', return_value=mock_user):
            with patch('backend.api.audit.get_audit_logger', return_value=mock_audit_logger):
                async with AsyncClient(app=app, base_url="http://test") as ac:
                    response = await ac.post(
                        "/api/audit/export",
                        json={
                            "project_id": 1,
                            "format_type": "xml"  # Unsupported format
                        }
                    )
        
        assert response.status_code == 422  # Validation error from Pydantic


if __name__ == "__main__":
    pytest.main([__file__, "-v"])