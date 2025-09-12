"""
Test script for Project Pydantic models validation
"""

import pytest
from datetime import datetime, timezone
from pydantic import ValidationError

from models.project_schemas import (
    ProjectCreateRequest,
    ProjectUpdateRequest,
    ProjectResponse,
    ProjectSearchFilters,
    ProjectDashboardData,
    ProjectExportData,
    ProjectListResponse,
    ProjectStatsResponse,
    ProjectPriority
)
from models.project import ProjectStatus


def test_project_create_request_valid():
    """Test valid ProjectCreateRequest"""
    data = {
        "name": "Test Cardiac Monitor",
        "description": "A wearable cardiac monitoring device",
        "device_type": "Cardiac Monitor",
        "intended_use": "For continuous monitoring of cardiac rhythm",
        "priority": "high",
        "tags": ["cardiac", "wearable", "monitoring"]
    }
    
    request = ProjectCreateRequest(**data)
    assert request.name == "Test Cardiac Monitor"
    assert request.priority == ProjectPriority.HIGH
    assert len(request.tags) == 3
    print("✓ ProjectCreateRequest validation passed")


def test_project_create_request_validation_errors():
    """Test ProjectCreateRequest validation errors"""
    
    # Test empty name
    try:
        ProjectCreateRequest(name="")
        assert False, "Should have raised validation error for empty name"
    except ValidationError as e:
        assert "String should have at least 1 character" in str(e)
        print("✓ Empty name validation works")
    
    # Test name too long
    try:
        ProjectCreateRequest(name="x" * 256)
        assert False, "Should have raised validation error for long name"
    except ValidationError as e:
        assert "String should have at most 255 characters" in str(e)
        print("✓ Name length validation works")
    
    # Test too many tags
    try:
        ProjectCreateRequest(name="Test", tags=["tag" + str(i) for i in range(11)])
        assert False, "Should have raised validation error for too many tags"
    except ValidationError as e:
        assert "List should have at most 10 items" in str(e)
        print("✓ Tags limit validation works")
    
    # Test invalid priority
    try:
        ProjectCreateRequest(name="Test", priority="invalid")
        assert False, "Should have raised validation error for invalid priority"
    except ValidationError as e:
        assert "Input should be" in str(e) and "high" in str(e)
        print("✓ Priority validation works")


def test_project_update_request_valid():
    """Test valid ProjectUpdateRequest"""
    data = {
        "name": "Updated Project Name",
        "status": ProjectStatus.IN_PROGRESS,
        "priority": "medium"
    }
    
    request = ProjectUpdateRequest(**data)
    assert request.name == "Updated Project Name"
    assert request.status == ProjectStatus.IN_PROGRESS
    assert request.priority == ProjectPriority.MEDIUM
    print("✓ ProjectUpdateRequest validation passed")


def test_project_update_request_empty():
    """Test ProjectUpdateRequest with no fields"""
    try:
        ProjectUpdateRequest()
        assert False, "Should have raised validation error for empty update"
    except ValidationError as e:
        assert "At least one field must be provided for update" in str(e)
        print("✓ Empty update validation works")


def test_project_response_valid():
    """Test valid ProjectResponse"""
    now = datetime.now(timezone.utc)
    data = {
        "id": 1,
        "name": "Test Project",
        "description": "Test description",
        "device_type": "Medical Device",
        "intended_use": "Test indication",
        "status": ProjectStatus.DRAFT,
        "priority": "high",
        "tags": ["test", "medical"],
        "created_at": now,
        "updated_at": now,
        "progress_percentage": 25.5,
        "last_activity": now
    }
    
    response = ProjectResponse(**data)
    assert response.id == 1
    assert response.name == "Test Project"
    assert response.progress_percentage == 25.5
    print("✓ ProjectResponse validation passed")


def test_project_search_filters_valid():
    """Test valid ProjectSearchFilters"""
    data = {
        "search": "cardiac",
        "status": ProjectStatus.IN_PROGRESS,
        "priority": "high",
        "device_type": "Monitor",
        "tags": ["cardiac", "wearable"],
        "limit": 50,
        "offset": 10,
        "sort_by": "updated_at",
        "sort_order": "desc"
    }
    
    filters = ProjectSearchFilters(**data)
    assert filters.search == "cardiac"
    assert filters.status == ProjectStatus.IN_PROGRESS
    assert filters.limit == 50
    assert filters.sort_by == "updated_at"
    print("✓ ProjectSearchFilters validation passed")


def test_project_search_filters_validation():
    """Test ProjectSearchFilters validation errors"""
    
    # Test invalid limit
    try:
        ProjectSearchFilters(limit=101)
        assert False, "Should have raised validation error for limit > 100"
    except ValidationError as e:
        assert "Input should be less than or equal to 100" in str(e)
        print("✓ Limit validation works")
    
    # Test invalid sort_by
    try:
        ProjectSearchFilters(sort_by="invalid_field")
        assert False, "Should have raised validation error for invalid sort_by"
    except ValidationError as e:
        assert "String should match pattern" in str(e)
        print("✓ Sort field validation works")
    
    # Test date range validation
    now = datetime.now(timezone.utc)
    try:
        ProjectSearchFilters(
            created_after=now,
            created_before=now  # Same time, should fail
        )
        assert False, "Should have raised validation error for invalid date range"
    except ValidationError as e:
        assert "created_after must be before created_before" in str(e)
        print("✓ Date range validation works")


def test_project_dashboard_data_valid():
    """Test valid ProjectDashboardData"""
    now = datetime.now(timezone.utc)
    project_data = {
        "id": 1,
        "name": "Test Project",
        "description": "Test description",
        "device_type": "Medical Device",
        "intended_use": "Test indication",
        "status": ProjectStatus.DRAFT,
        "priority": "high",
        "tags": ["test"],
        "created_at": now,
        "updated_at": now
    }
    
    dashboard_data = {
        "project": ProjectResponse(**project_data),
        "total_classifications": 2,
        "total_predicates": 5,
        "selected_predicates": 1,
        "total_interactions": 10,
        "total_documents": 3,
        "recent_interactions": [
            {"action": "classification", "timestamp": now.isoformat()}
        ],
        "classification_completed": True,
        "predicate_search_completed": False,
        "predicate_analysis_completed": False,
        "overall_progress": 33.3
    }
    
    dashboard = ProjectDashboardData(**dashboard_data)
    assert dashboard.total_classifications == 2
    assert dashboard.overall_progress == 33.3
    assert dashboard.classification_completed is True
    print("✓ ProjectDashboardData validation passed")


def test_project_list_response_valid():
    """Test valid ProjectListResponse"""
    now = datetime.now(timezone.utc)
    project_data = {
        "id": 1,
        "name": "Test Project",
        "description": "Test description",
        "device_type": "Medical Device",
        "intended_use": "Test indication",
        "status": ProjectStatus.DRAFT,
        "priority": "high",
        "tags": ["test"],
        "created_at": now,
        "updated_at": now
    }
    
    list_data = {
        "projects": [ProjectResponse(**project_data)],
        "total_count": 1,
        "has_more": False,
        "next_offset": None
    }
    
    response = ProjectListResponse(**list_data)
    assert len(response.projects) == 1
    assert response.total_count == 1
    assert response.has_more is False
    print("✓ ProjectListResponse validation passed")


def test_project_stats_response_valid():
    """Test valid ProjectStatsResponse"""
    stats_data = {
        "total_projects": 10,
        "projects_by_status": {
            "draft": 3,
            "in_progress": 5,
            "completed": 2
        },
        "projects_by_priority": {
            "high": 2,
            "medium": 5,
            "low": 3
        },
        "projects_by_device_type": {
            "Cardiac Monitor": 3,
            "Glucose Meter": 2,
            "Other": 5
        },
        "recent_activity_count": 15,
        "completion_rate": 20.0
    }
    
    stats = ProjectStatsResponse(**stats_data)
    assert stats.total_projects == 10
    assert stats.completion_rate == 20.0
    assert stats.projects_by_status["draft"] == 3
    print("✓ ProjectStatsResponse validation passed")


def test_tags_deduplication():
    """Test that tags are deduplicated and cleaned"""
    data = {
        "name": "Test Project",
        "tags": ["cardiac", "cardiac", "wearable", "", "  monitoring  ", "cardiac"]
    }
    
    request = ProjectCreateRequest(**data)
    # Should have deduplicated tags and removed empty ones
    assert len(request.tags) == 3
    assert "cardiac" in request.tags
    assert "wearable" in request.tags
    assert "monitoring" in request.tags
    assert "" not in request.tags
    print("✓ Tags deduplication works")


def test_text_field_trimming():
    """Test that text fields are properly trimmed"""
    data = {
        "name": "  Test Project  ",
        "description": "  Test description  ",
        "device_type": "  Medical Device  ",
        "intended_use": "  Test indication  "
    }
    
    request = ProjectCreateRequest(**data)
    assert request.name == "Test Project"
    assert request.description == "Test description"
    assert request.device_type == "Medical Device"
    assert request.intended_use == "Test indication"
    print("✓ Text field trimming works")


def run_all_tests():
    """Run all tests"""
    print("Running Project Schema Validation Tests...")
    print("=" * 50)
    
    try:
        test_project_create_request_valid()
        test_project_create_request_validation_errors()
        test_project_update_request_valid()
        test_project_update_request_empty()
        test_project_response_valid()
        test_project_search_filters_valid()
        test_project_search_filters_validation()
        test_project_dashboard_data_valid()
        test_project_list_response_valid()
        test_project_stats_response_valid()
        test_tags_deduplication()
        test_text_field_trimming()
        
        print("=" * 50)
        print("✅ All tests passed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    exit(0 if success else 1)