"""
Enhanced comprehensive tests for ProjectService CRUD operations.
Tests cover all service methods, error handling, validation, and edge cases.
"""

import pytest
import json
from datetime import datetime, timezone
from unittest.mock import patch, AsyncMock, MagicMock

from fastapi import HTTPException
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

from services.projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectSearchFilters,
    ProjectStatus,
    ProjectResponse,
    ProjectDashboardData,
    ProjectExportData
)
from models.user import User
from models.project import Project
from models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument
from exceptions.project_exceptions import (
    ProjectNotFoundError,
    ProjectAccessDeniedError,
    ProjectValidationError,
    ProjectStateError,
    ProjectExportError
)


class TestProjectServiceCRUD:
    """Test CRUD operations for ProjectService"""
    
    @pytest.mark.asyncio
    async def test_create_project_success(self, test_db_manager, test_session):
        """Test successful project creation with all fields"""
        # Create test user
        user = User(
            email="test@example.com",
            name="Test User",
            google_id="google_test_123"
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
        
        # Create project service
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Create project with all fields
        project_data = ProjectCreateRequest(
            name="Comprehensive Test Device",
            description="A comprehensive test medical device with all fields",
            device_type="Class II Cardiac Monitor",
            intended_use="For continuous monitoring of cardiac rhythm in ambulatory patients"
        )
        
        result = await service.create_project(project_data, user.google_id)
        
        assert result.name == "Comprehensive Test Device"
        assert result.description == "A comprehensive test medical device with all fields"
        assert result.device_type == "Class II Cardiac Monitor"
        assert result.intended_use == "For continuous monitoring of cardiac rhythm in ambulatory patients"
        assert result.status == ProjectStatus.DRAFT
        assert result.id is not None
        assert result.created_at is not None
        assert result.updated_at is not None
    
    @pytest.mark.asyncio
    async def test_create_project_minimal_fields(self, test_db_manager, test_session):
        """Test project creation with only required fields"""
        # Create test user
        user = User(
            email="test@example.com",
            name="Test User",
            google_id="google_test_123"
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Create project with minimal fields
        project_data = ProjectCreateRequest(name="Minimal Device")
        
        result = await service.create_project(project_data, user.google_id)
        
        assert result.name == "Minimal Device"
        assert result.description is None
        assert result.device_type is None
        assert result.intended_use is None
        assert result.status == ProjectStatus.DRAFT
    
    @pytest.mark.asyncio
    async def test_create_project_user_not_found(self, test_db_manager, test_session):
        """Test project creation with non-existent user"""
        service = ProjectService()
        service._db_manager = test_db_manager
        
        project_data = ProjectCreateRequest(name="Test Device")
        
        with pytest.raises(ProjectNotFoundError) as exc_info:
            await service.create_project(project_data, "non_existent_user")
        
        assert exc_info.value.error_code == "PROJECT_NOT_FOUND"
    
    @pytest.mark.asyncio
    async def test_get_project_success(self, test_db_manager, test_session, sample_user, sample_project):
        """Test successful project retrieval"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.get_project(sample_project.id, sample_user.google_id)
        
        assert result.id == sample_project.id
        assert result.name == sample_project.name
        assert result.description == sample_project.description
        assert result.device_type == sample_project.device_type
        assert result.intended_use == sample_project.intended_use
        assert result.status == sample_project.status
    
    @pytest.mark.asyncio
    async def test_get_project_not_found(self, test_db_manager, test_session, sample_user):
        """Test getting non-existent project"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        with pytest.raises(ProjectNotFoundError) as exc_info:
            await service.get_project(99999, sample_user.google_id)
        
        assert exc_info.value.error_code == "PROJECT_NOT_FOUND"
        assert "99999" in str(exc_info.value.details["project_id"])
    
    @pytest.mark.asyncio
    async def test_get_project_access_denied(self, test_db_manager, test_session, sample_project):
        """Test getting project with wrong user"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        with pytest.raises(ProjectNotFoundError):
            await service.get_project(sample_project.id, "wrong_user_id")
    
    @pytest.mark.asyncio
    async def test_update_project_success(self, test_db_manager, test_session, sample_user, sample_project):
        """Test successful project update"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        update_data = ProjectUpdateRequest(
            name="Updated Device Name",
            description="Updated description",
            device_type="Updated Class III",
            intended_use="Updated intended use statement",
            status=ProjectStatus.IN_PROGRESS
        )
        
        result = await service.update_project(sample_project.id, update_data, sample_user.google_id)
        
        assert result.name == "Updated Device Name"
        assert result.description == "Updated description"
        assert result.device_type == "Updated Class III"
        assert result.intended_use == "Updated intended use statement"
        assert result.status == ProjectStatus.IN_PROGRESS
        assert result.updated_at > result.created_at
    
    @pytest.mark.asyncio
    async def test_update_project_partial(self, test_db_manager, test_session, sample_user, sample_project):
        """Test partial project update"""
        await test_session.commit()
        original_description = sample_project.description
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Update only name and status
        update_data = ProjectUpdateRequest(
            name="Partially Updated Device",
            status=ProjectStatus.COMPLETED
        )
        
        result = await service.update_project(sample_project.id, update_data, sample_user.google_id)
        
        assert result.name == "Partially Updated Device"
        assert result.description == original_description  # Unchanged
        assert result.status == ProjectStatus.COMPLETED
    
    @pytest.mark.asyncio
    async def test_update_project_not_found(self, test_db_manager, test_session, sample_user):
        """Test updating non-existent project"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        update_data = ProjectUpdateRequest(name="Updated Name")
        
        with pytest.raises(HTTPException) as exc_info:
            await service.update_project(99999, update_data, sample_user.google_id)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_project_success(self, test_db_manager, test_session, sample_user, sample_project):
        """Test successful project deletion"""
        await test_session.commit()
        project_id = sample_project.id
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.delete_project(project_id, sample_user.google_id)
        
        assert "deleted successfully" in result["message"]
        
        # Verify project is deleted
        with pytest.raises(ProjectNotFoundError):
            await service.get_project(project_id, sample_user.google_id)
    
    @pytest.mark.asyncio
    async def test_delete_project_not_found(self, test_db_manager, test_session, sample_user):
        """Test deleting non-existent project"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        with pytest.raises(HTTPException) as exc_info:
            await service.delete_project(99999, sample_user.google_id)
        
        assert exc_info.value.status_code == 404


class TestProjectServiceSearch:
    """Test search and filtering functionality"""
    
    @pytest.mark.asyncio
    async def test_list_projects_empty(self, test_db_manager, test_session, sample_user):
        """Test listing projects when user has none"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        filters = ProjectSearchFilters()
        result = await service.list_projects(sample_user.google_id, filters)
        
        assert len(result) == 0
    
    @pytest.mark.asyncio
    async def test_list_projects_multiple(self, test_db_manager, test_session, sample_user):
        """Test listing multiple projects"""
        # Create multiple projects
        projects_data = [
            Project(
                user_id=sample_user.id,
                name="Cardiac Monitor",
                description="Heart monitoring device",
                device_type="Class II",
                intended_use="Cardiac monitoring",
                status=ProjectStatus.DRAFT
            ),
            Project(
                user_id=sample_user.id,
                name="Blood Pressure Cuff",
                description="BP measurement device",
                device_type="Class II",
                intended_use="Blood pressure measurement",
                status=ProjectStatus.IN_PROGRESS
            ),
            Project(
                user_id=sample_user.id,
                name="Surgical Scalpel",
                description="Cutting instrument",
                device_type="Class I",
                intended_use="Surgical cutting",
                status=ProjectStatus.COMPLETED
            )
        ]
        
        for project in projects_data:
            test_session.add(project)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        filters = ProjectSearchFilters()
        result = await service.list_projects(sample_user.google_id, filters)
        
        assert len(result) == 3
        project_names = [p.name for p in result]
        assert "Cardiac Monitor" in project_names
        assert "Blood Pressure Cuff" in project_names
        assert "Surgical Scalpel" in project_names
    
    @pytest.mark.asyncio
    async def test_list_projects_search_filter(self, test_db_manager, test_session, sample_user):
        """Test search filtering by name, description, and device type"""
        # Create test projects
        projects_data = [
            Project(
                user_id=sample_user.id,
                name="Cardiac Monitor Pro",
                description="Advanced heart monitoring device",
                device_type="Class II Cardiac",
                intended_use="Cardiac monitoring",
                status=ProjectStatus.DRAFT
            ),
            Project(
                user_id=sample_user.id,
                name="Blood Pressure Monitor",
                description="BP measurement device",
                device_type="Class II",
                intended_use="Blood pressure measurement",
                status=ProjectStatus.IN_PROGRESS
            ),
            Project(
                user_id=sample_user.id,
                name="Heart Rate Sensor",
                description="Cardiac rhythm detection",
                device_type="Class I",
                intended_use="Heart rate monitoring",
                status=ProjectStatus.COMPLETED
            )
        ]
        
        for project in projects_data:
            test_session.add(project)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Search by name
        filters = ProjectSearchFilters(search="Cardiac")
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 2  # Both "Cardiac Monitor Pro" and "Heart Rate Sensor" contain cardiac-related terms
        cardiac_names = [p.name for p in result]
        assert "Cardiac Monitor Pro" in cardiac_names
        
        # Search by description
        filters = ProjectSearchFilters(search="rhythm")
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 1
        assert result[0].name == "Heart Rate Sensor"
        
        # Search by device type
        filters = ProjectSearchFilters(search="Class II")
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 2
    
    @pytest.mark.asyncio
    async def test_list_projects_status_filter(self, test_db_manager, test_session, sample_user):
        """Test filtering by project status"""
        # Create projects with different statuses
        projects_data = [
            Project(
                user_id=sample_user.id,
                name="Draft Project",
                status=ProjectStatus.DRAFT
            ),
            Project(
                user_id=sample_user.id,
                name="In Progress Project",
                status=ProjectStatus.IN_PROGRESS
            ),
            Project(
                user_id=sample_user.id,
                name="Completed Project",
                status=ProjectStatus.COMPLETED
            )
        ]
        
        for project in projects_data:
            test_session.add(project)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Filter by draft status
        filters = ProjectSearchFilters(status=ProjectStatus.DRAFT)
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 1
        assert result[0].status == ProjectStatus.DRAFT
        
        # Filter by in progress status
        filters = ProjectSearchFilters(status=ProjectStatus.IN_PROGRESS)
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 1
        assert result[0].status == ProjectStatus.IN_PROGRESS
    
    @pytest.mark.asyncio
    async def test_list_projects_pagination(self, test_db_manager, test_session, sample_user):
        """Test pagination with limit and offset"""
        # Create many projects
        for i in range(15):
            project = Project(
                user_id=sample_user.id,
                name=f"Test Project {i:02d}",
                description=f"Description {i}",
                status=ProjectStatus.DRAFT
            )
            test_session.add(project)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Test first page
        filters = ProjectSearchFilters(limit=5, offset=0)
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 5
        
        # Test second page
        filters = ProjectSearchFilters(limit=5, offset=5)
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 5
        
        # Test third page
        filters = ProjectSearchFilters(limit=5, offset=10)
        result = await service.list_projects(sample_user.google_id, filters)
        assert len(result) == 5


class TestProjectServiceDashboard:
    """Test dashboard data functionality"""
    
    @pytest.mark.asyncio
    async def test_get_dashboard_data_basic(self, test_db_manager, test_session, sample_user, sample_project):
        """Test getting basic dashboard data"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.get_dashboard_data(sample_project.id, sample_user.google_id)
        
        assert isinstance(result, ProjectDashboardData)
        assert result.project.id == sample_project.id
        assert result.project.name == sample_project.name
        assert result.classification is None  # No classification yet
        assert len(result.predicate_devices) == 0  # No predicates yet
        assert result.progress is not None
        assert result.statistics is not None
    
    @pytest.mark.asyncio
    async def test_get_dashboard_data_with_classification(self, test_db_manager, test_session, sample_user, sample_project):
        """Test dashboard data with device classification"""
        # Add device classification
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_II,
            product_code="DPS",
            regulatory_pathway=RegulatoryPathway.FIVE_TEN_K,
            confidence_score=0.85,
            reasoning="Device is substantially equivalent to existing monitors"
        )
        test_session.add(classification)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.get_dashboard_data(sample_project.id, sample_user.google_id)
        
        assert result.classification is not None
        assert result.classification["deviceClass"] == "II"
        assert result.classification["productCode"] == "DPS"
        assert result.classification["regulatoryPathway"] == "510k"
        assert result.classification["confidenceScore"] == 0.85
    
    @pytest.mark.asyncio
    async def test_get_dashboard_data_with_predicates(self, test_db_manager, test_session, sample_user, sample_project):
        """Test dashboard data with predicate devices"""
        # Add predicate devices
        predicates_data = [
            PredicateDevice(
                project_id=sample_project.id,
                k_number="K123456",
                device_name="Similar Monitor A",
                intended_use="Cardiac monitoring",
                product_code="DPS",
                confidence_score=0.90,
                is_selected=True
            ),
            PredicateDevice(
                project_id=sample_project.id,
                k_number="K789012",
                device_name="Similar Monitor B",
                intended_use="Heart rate monitoring",
                product_code="DPS",
                confidence_score=0.75,
                is_selected=False
            )
        ]
        
        for predicate in predicates_data:
            test_session.add(predicate)
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.get_dashboard_data(sample_project.id, sample_user.google_id)
        
        assert len(result.predicate_devices) == 2
        assert result.statistics["totalPredicates"] == 2
        assert result.statistics["selectedPredicates"] == 1
        
        # Check predicate data structure
        selected_predicate = next(p for p in result.predicate_devices if p["isSelected"])
        assert selected_predicate["kNumber"] == "K123456"
        assert selected_predicate["deviceName"] == "Similar Monitor A"
        assert selected_predicate["confidenceScore"] == 0.90
    
    @pytest.mark.asyncio
    async def test_get_dashboard_data_not_found(self, test_db_manager, test_session, sample_user):
        """Test dashboard data for non-existent project"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        with pytest.raises(HTTPException) as exc_info:
            await service.get_dashboard_data(99999, sample_user.google_id)
        
        assert exc_info.value.status_code == 404


class TestProjectServiceExport:
    """Test project export functionality"""
    
    @pytest.mark.asyncio
    async def test_export_project_basic(self, test_db_manager, test_session, sample_user, sample_project):
        """Test basic project export"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.export_project(sample_project.id, sample_user.google_id, "json")
        
        assert isinstance(result, ProjectExportData)
        assert result.project.id == sample_project.id
        assert result.project.name == sample_project.name
        assert len(result.classifications) == 0
        assert len(result.predicates) == 0
        assert len(result.documents) == 0
        assert len(result.interactions) == 0
    
    @pytest.mark.asyncio
    async def test_export_project_comprehensive(self, test_db_manager, test_session, sample_user, sample_project):
        """Test comprehensive project export with all related data"""
        # Add related data
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_II,
            product_code="DPS",
            regulatory_pathway=RegulatoryPathway.FIVE_TEN_K,
            confidence_score=0.85
        )
        test_session.add(classification)
        
        predicate = PredicateDevice(
            project_id=sample_project.id,
            k_number="K123456",
            device_name="Test Predicate",
            confidence_score=0.90
        )
        test_session.add(predicate)
        
        interaction = AgentInteraction(
            project_id=sample_project.id,
            user_id=sample_user.id,  # Add required user_id
            agent_action="device_classification",
            input_data=json.dumps({"device_type": "monitor"}),
            output_data=json.dumps({"class": "II"}),
            confidence_score=0.85
        )
        test_session.add(interaction)
        
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        result = await service.export_project(sample_project.id, sample_user.google_id, "json")
        
        assert len(result.classifications) == 1
        assert result.classifications[0]["device_class"] == "II"
        assert len(result.predicates) == 1
        assert result.predicates[0]["k_number"] == "K123456"
        assert len(result.interactions) == 1
        assert result.interactions[0]["agent_action"] == "device_classification"
    
    @pytest.mark.asyncio
    async def test_export_project_not_found(self, test_db_manager, test_session, sample_user):
        """Test export for non-existent project"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        with pytest.raises(HTTPException) as exc_info:
            await service.export_project(99999, sample_user.google_id, "json")
        
        assert exc_info.value.status_code == 404


class TestProjectServiceErrorHandling:
    """Test error handling and edge cases"""
    
    @pytest.mark.asyncio
    async def test_database_connection_error(self, test_db_manager):
        """Test handling of database connection errors"""
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Mock database error
        with patch.object(test_db_manager, 'get_session') as mock_session:
            mock_session.side_effect = SQLAlchemyError("Database connection failed")
            
            project_data = ProjectCreateRequest(name="Test Device")
            
            with pytest.raises(SQLAlchemyError):
                await service.create_project(project_data, "test_user")
    
    @pytest.mark.asyncio
    async def test_websocket_notification_failure(self, test_db_manager, test_session, sample_user, sample_project):
        """Test handling of WebSocket notification failures"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Mock WebSocket failure (should not affect update operation)
        with patch('api.websocket.notify_project_updated', side_effect=Exception("WebSocket failed")):
            update_data = ProjectUpdateRequest(name="Updated Name")
            
            # Should succeed despite WebSocket failure
            result = await service.update_project(sample_project.id, update_data, sample_user.google_id)
            assert result.name == "Updated Name"
    
    @pytest.mark.asyncio
    async def test_concurrent_access_handling(self, test_db_manager, test_session, sample_user, sample_project):
        """Test handling of concurrent access scenarios"""
        await test_session.commit()
        
        service1 = ProjectService()
        service1._db_manager = test_db_manager
        service2 = ProjectService()
        service2._db_manager = test_db_manager
        
        # Simulate concurrent updates
        update_data1 = ProjectUpdateRequest(name="Update 1")
        update_data2 = ProjectUpdateRequest(name="Update 2")
        
        # Both should succeed (last one wins)
        result1 = await service1.update_project(sample_project.id, update_data1, sample_user.google_id)
        result2 = await service2.update_project(sample_project.id, update_data2, sample_user.google_id)
        
        assert result1.name == "Update 1"
        assert result2.name == "Update 2"
    
    @pytest.mark.asyncio
    async def test_invalid_user_id_format(self, test_db_manager, test_session):
        """Test handling of invalid user ID formats"""
        service = ProjectService()
        service._db_manager = test_db_manager
        
        project_data = ProjectCreateRequest(name="Test Device")
        
        # Test with None user ID
        with pytest.raises(Exception):  # Should raise some kind of error
            await service.create_project(project_data, None)
        
        # Test with empty string user ID
        with pytest.raises(ProjectNotFoundError):
            await service.create_project(project_data, "")
    
    @pytest.mark.asyncio
    async def test_large_data_handling(self, test_db_manager, test_session, sample_user):
        """Test handling of large data inputs"""
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Test with strings at the validation limit
        large_description = "A" * 1000  # At the limit
        large_intended_use = "B" * 2000  # At the limit
        
        project_data = ProjectCreateRequest(
            name="Large Data Test",
            description=large_description,
            intended_use=large_intended_use
        )
        
        # Should handle data at validation limits gracefully
        result = await service.create_project(project_data, sample_user.google_id)
        assert result.name == "Large Data Test"
        assert len(result.description) == 1000
        assert len(result.intended_use) == 2000
        
        # Test that exceeding limits raises validation error
        with pytest.raises(ValueError):
            ProjectCreateRequest(
                name="Test",
                description="A" * 1001  # Exceeds limit
            )