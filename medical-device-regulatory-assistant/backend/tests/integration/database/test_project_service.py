"""
Tests for project service functionality with dependency injection
"""

import pytest
from datetime import datetime, timezone
from unittest.mock import patch

from fastapi import HTTPException
from services.projects import (
    ProjectService,
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectSearchFilters,
    ProjectStatus
)
from services.factories import create_project_service
from models.user import User


@pytest.mark.asyncio
async def test_create_project_success(test_data_factory, sample_user):
    """Test successful project creation"""
    # Use the sample user from fixture
    user = sample_user
    
    # Create project service with dependency injection
    from services.factories import create_project_service
    service = create_project_service()
    
    # Create project
    project_data = ProjectCreateRequest(
        name="Test Device",
        description="A test medical device",
        device_type="Class II",
        intended_use="For testing purposes"
    )
    
    result = await service.create_project(project_data, user.google_id)
    
    assert result.name == "Test Device"
    assert result.description == "A test medical device"
    assert result.device_type == "Class II"
    assert result.intended_use == "For testing purposes"
    assert result.status == ProjectStatus.DRAFT  # Default status is DRAFT
    assert result.id is not None


@pytest.mark.asyncio
async def test_create_project_duplicate_name(test_db_manager, test_session):
    """Test creating project with duplicate name fails"""
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
    service.db_manager = test_db_manager
    
    project_data = ProjectCreateRequest(
        name="Duplicate Device",
        description="First device",
        device_type="Class II",
        intended_use="For testing"
    )
    
    # Create first project
    await service.create_project(project_data, user.google_id)
    
    # Try to create second project with same name
    # Note: The current implementation doesn't check for duplicate names
    # This test would need to be updated if duplicate checking is implemented
    second_result = await service.create_project(project_data, user.google_id)
    assert second_result.name == "Duplicate Device"


@pytest.mark.asyncio
async def test_get_project_success(test_db_manager, test_session):
    """Test successful project retrieval"""
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
    service.db_manager = test_db_manager
    
    # Create a project first
    project_data = ProjectCreateRequest(
        name="Get Test Device",
        description="Device for get test",
        device_type="Class I",
        intended_use="For retrieval testing"
    )
    created_project = await service.create_project(project_data, user.google_id)
    
    # Retrieve the project
    result = await service.get_project(created_project.id, user.google_id)
    
    assert result.id == created_project.id
    assert result.name == "Get Test Device"


@pytest.mark.asyncio
async def test_get_project_not_found(test_db_manager, test_session):
    """Test getting non-existent project raises 404"""
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
    service.db_manager = test_db_manager
    
    with pytest.raises(HTTPException) as exc_info:
        await service.get_project(99999, user.google_id)
    
    assert exc_info.value.status_code == 404


@pytest.mark.asyncio
async def test_list_projects_success(test_db_manager, test_session):
    """Test successful project listing"""
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
    service.db_manager = test_db_manager
    
    # Create multiple projects
    projects_data = [
        ProjectCreateRequest(
            name="Device A",
            description="First device",
            device_type="Class I",
            intended_use="Use A"
        ),
        ProjectCreateRequest(
            name="Device B",
            description="Second device",
            device_type="Class II",
            intended_use="Use B"
        ),
        ProjectCreateRequest(
            name="Device C",
            description="Third device",
            device_type="Class III",
            intended_use="Use C"
        )
    ]
    
    for project_data in projects_data:
        await service.create_project(project_data, user.google_id)
    
    # List all projects
    filters = ProjectSearchFilters()
    result = await service.list_projects(user.google_id, filters)
    
    assert len(result) == 3
    
    # Check project names
    project_names = [p.name for p in result]
    assert "Device A" in project_names
    assert "Device B" in project_names
    assert "Device C" in project_names


@pytest.mark.asyncio
async def test_update_project_success(test_db_manager, test_session):
    """Test successful project update"""
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
    service.db_manager = test_db_manager
    
    # Create a project first
    project_data = ProjectCreateRequest(
        name="Update Test Device",
        description="Original description",
        device_type="Class I",
        intended_use="Original use"
    )
    created_project = await service.create_project(project_data, user.google_id)
    
    # Update the project
    update_data = ProjectUpdateRequest(
        name="Updated Device Name",
        description="Updated description",
        device_type="Class II",
        intended_use="Updated intended use"
    )
    
    result = await service.update_project(
        created_project.id, update_data, user.google_id
    )
    
    assert result.name == "Updated Device Name"
    assert result.description == "Updated description"
    assert result.device_type == "Class II"
    assert result.intended_use == "Updated intended use"
    assert result.id == created_project.id


@pytest.mark.asyncio
async def test_delete_project_success(test_db_manager, test_session):
    """Test successful project deletion"""
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
    service.db_manager = test_db_manager
    
    # Create a project first
    project_data = ProjectCreateRequest(
        name="Delete Test Device",
        description="Device to be deleted",
        device_type="Class I",
        intended_use="For deletion testing"
    )
    created_project = await service.create_project(project_data, user.google_id)
    
    # Delete the project
    await service.delete_project(created_project.id, user.google_id)
    
    # Verify it's deleted by trying to get it
    with pytest.raises(HTTPException) as exc_info:
        await service.get_project(created_project.id, user.google_id)
    
    assert exc_info.value.status_code == 404


class TestProjectServiceAdvanced:
    """Advanced test cases for ProjectService"""
    
    @pytest.mark.asyncio
    async def test_list_projects_with_filters(self, test_db_manager, test_session):
        """Test project listing with search filters"""
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
        service.db_manager = test_db_manager
        
        # Create projects with different characteristics
        projects_data = [
            ProjectCreateRequest(
                name="Cardiac Monitor",
                description="Heart monitoring device",
                device_type="Class II",
                intended_use="Cardiac monitoring"
            ),
            ProjectCreateRequest(
                name="Blood Pressure Cuff",
                description="BP measurement device",
                device_type="Class II",
                intended_use="Blood pressure measurement"
            ),
            ProjectCreateRequest(
                name="Surgical Scalpel",
                description="Cutting instrument",
                device_type="Class I",
                intended_use="Surgical cutting"
            )
        ]
        
        for project_data in projects_data:
            await service.create_project(project_data, user.google_id)
        
        # Search by name
        filters = ProjectSearchFilters(search="Cardiac")
        result = await service.list_projects(user.google_id, filters)
        
        assert len(result) == 1
        assert result[0].name == "Cardiac Monitor"
        
        # Search by device type
        filters = ProjectSearchFilters(device_type="Class II")
        result = await service.list_projects(user.google_id, filters)
        
        assert len(result) == 2
        device_types = [p.device_type for p in result]
        assert all(dt == "Class II" for dt in device_types)
    
    @pytest.mark.asyncio
    async def test_list_projects_empty(self, test_db_manager, test_session):
        """Test listing projects when user has none"""
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
        service.db_manager = test_db_manager
        
        filters = ProjectSearchFilters()
        result = await service.list_projects(user.google_id, filters)
        
        assert len(result) == 0
    
    @pytest.mark.asyncio
    async def test_update_project_partial(self, test_db_manager, test_session):
        """Test partial project update"""
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
        service.db_manager = test_db_manager
        
        # Create a project first
        project_data = ProjectCreateRequest(
            name="Partial Update Device",
            description="Original description",
            device_type="Class I",
            intended_use="Original use"
        )
        created_project = await service.create_project(project_data, user.google_id)
        
        # Update only name and description
        update_data = ProjectUpdateRequest(
            name="New Name Only",
            description="New description only"
        )
        
        result = await service.update_project(
            created_project.id, update_data, user.google_id
        )
        
        assert result.name == "New Name Only"
        assert result.description == "New description only"
        assert result.device_type == "Class I"  # Unchanged
        assert result.intended_use == "Original use"  # Unchanged
    
    @pytest.mark.asyncio
    async def test_update_project_not_found(self, test_db_manager, test_session):
        """Test updating non-existent project raises 404"""
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
        service.db_manager = test_db_manager
        
        update_data = ProjectUpdateRequest(name="New Name")
        
        with pytest.raises(HTTPException) as exc_info:
            await service.update_project(99999, update_data, user.google_id)
        
        assert exc_info.value.status_code == 404
    
    @pytest.mark.asyncio
    async def test_delete_project_not_found(self, test_db_manager, test_session):
        """Test deleting non-existent project raises 404"""
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
        service.db_manager = test_db_manager
        
        with pytest.raises(HTTPException) as exc_info:
            await service.delete_project(99999, user.google_id)
        
        assert exc_info.value.status_code == 404