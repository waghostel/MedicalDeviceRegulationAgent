"""
Integration tests for project database operations and relationships.
Tests the complete flow from API to database with real database operations.
"""

import pytest
import json
from datetime import datetime, timezone, date
from fastapi.testclient import TestClient

from main import app
from models.user import User
from models.project import Project, ProjectStatus
from models.device_classification import DeviceClassification
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument
from services.projects import ProjectService
from services.auth import TokenData


@pytest.fixture
def integration_client(test_db_manager):
    """Create test client with real database integration"""
    # Override database manager in the app
    from database.connection import get_database_manager
    
    def override_get_database_manager():
        return test_db_manager
    
    app.dependency_overrides[get_database_manager] = override_get_database_manager
    
    # Mock authentication
    def override_get_current_user():
        return TokenData(
            sub="integration_test_user",
            email="integration@test.com",
            name="Integration Test User",
            exp=datetime.now(timezone.utc),
            iat=datetime.now(timezone.utc)
        )
    
    from api.projects import get_current_user
    app.dependency_overrides[get_current_user] = override_get_current_user
    
    with TestClient(app) as client:
        yield client
    
    # Clean up
    app.dependency_overrides.clear()


class TestProjectDatabaseIntegration:
    """Test project operations with real database"""
    
    @pytest.mark.asyncio
    async def test_complete_project_lifecycle(self, test_db_manager, test_session):
        """Test complete project lifecycle from creation to deletion"""
        # Create test user
        user = User(
            email="lifecycle@test.com",
            name="Lifecycle Test User",
            google_id="lifecycle_test_user"
        )
        test_session.add(user)
        await test_session.commit()
        await test_session.refresh(user)
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # 1. Create project
        from services.projects import ProjectCreateRequest
        create_data = ProjectCreateRequest(
            name="Lifecycle Test Device",
            description="Testing complete lifecycle",
            device_type="Class II Monitor",
            intended_use="For lifecycle testing"
        )
        
        created_project = await service.create_project(create_data, user.google_id)
        assert created_project.id is not None
        assert created_project.name == "Lifecycle Test Device"
        assert created_project.status == ProjectStatus.DRAFT
        
        # 2. Retrieve project
        retrieved_project = await service.get_project(created_project.id, user.google_id)
        assert retrieved_project.id == created_project.id
        assert retrieved_project.name == created_project.name
        
        # 3. Update project
        from services.projects import ProjectUpdateRequest
        update_data = ProjectUpdateRequest(
            name="Updated Lifecycle Device",
            status=ProjectStatus.IN_PROGRESS
        )
        
        updated_project = await service.update_project(
            created_project.id, update_data, user.google_id
        )
        assert updated_project.name == "Updated Lifecycle Device"
        assert updated_project.status == ProjectStatus.IN_PROGRESS
        
        # 4. List projects
        from services.projects import ProjectSearchFilters
        filters = ProjectSearchFilters()
        projects_list = await service.list_projects(user.google_id, filters)
        assert len(projects_list) == 1
        assert projects_list[0].id == created_project.id
        
        # 5. Delete project
        delete_result = await service.delete_project(created_project.id, user.google_id)
        assert "deleted successfully" in delete_result["message"]
        
        # 6. Verify deletion
        from exceptions.project_exceptions import ProjectNotFoundError
        with pytest.raises(ProjectNotFoundError):
            await service.get_project(created_project.id, user.google_id)
    
    @pytest.mark.asyncio
    async def test_project_relationships_cascade(self, test_db_manager, test_session):
        """Test that project deletion cascades to related entities"""
        # Create test user and project
        user = User(
            email="cascade@test.com",
            name="Cascade Test User",
            google_id="cascade_test_user"
        )
        test_session.add(user)
        await test_session.flush()
        
        project = Project(
            user_id=user.id,
            name="Cascade Test Project",
            description="Testing cascade deletion",
            status=ProjectStatus.DRAFT
        )
        test_session.add(project)
        await test_session.flush()
        
        # Add related entities
        classification = DeviceClassification(
            project_id=project.id,
            device_class="II",
            product_code="DPS",
            regulatory_pathway="510k",
            confidence_score=0.85
        )
        test_session.add(classification)
        
        predicate = PredicateDevice(
            project_id=project.id,
            k_number="K123456",
            device_name="Test Predicate",
            intended_use="Testing",
            confidence_score=0.90
        )
        test_session.add(predicate)
        
        interaction = AgentInteraction(
            project_id=project.id,
            agent_action="test_action",
            input_data=json.dumps({"test": "data"}),
            output_data=json.dumps({"result": "success"}),
            confidence_score=0.95
        )
        test_session.add(interaction)
        
        document = ProjectDocument(
            project_id=project.id,
            filename="test_document.pdf",
            file_path="/test/path",
            document_type="specification"
        )
        test_session.add(document)
        
        await test_session.commit()
        
        # Verify entities exist
        from sqlalchemy import select
        classification_count = await test_session.scalar(
            select(func.count(DeviceClassification.id)).where(
                DeviceClassification.project_id == project.id
            )
        )
        assert classification_count == 1
        
        # Delete project using service
        service = ProjectService()
        service._db_manager = test_db_manager
        
        await service.delete_project(project.id, user.google_id)
        
        # Verify all related entities are deleted (cascade)
        classification_count = await test_session.scalar(
            select(func.count(DeviceClassification.id)).where(
                DeviceClassification.project_id == project.id
            )
        )
        assert classification_count == 0
        
        predicate_count = await test_session.scalar(
            select(func.count(PredicateDevice.id)).where(
                PredicateDevice.project_id == project.id
            )
        )
        assert predicate_count == 0
        
        interaction_count = await test_session.scalar(
            select(func.count(AgentInteraction.id)).where(
                AgentInteraction.project_id == project.id
            )
        )
        assert interaction_count == 0
        
        document_count = await test_session.scalar(
            select(func.count(ProjectDocument.id)).where(
                ProjectDocument.project_id == project.id
            )
        )
        assert document_count == 0
    
    @pytest.mark.asyncio
    async def test_project_search_database_queries(self, test_db_manager, test_session):
        """Test search functionality with real database queries"""
        # Create test user
        user = User(
            email="search@test.com",
            name="Search Test User",
            google_id="search_test_user"
        )
        test_session.add(user)
        await test_session.flush()
        
        # Create projects with different characteristics
        projects_data = [
            {
                "name": "Cardiac Monitor Advanced",
                "description": "Advanced heart monitoring system",
                "device_type": "Class II Cardiac",
                "intended_use": "Continuous cardiac monitoring",
                "status": ProjectStatus.DRAFT
            },
            {
                "name": "Blood Pressure Cuff",
                "description": "Automated BP measurement",
                "device_type": "Class II",
                "intended_use": "Blood pressure monitoring",
                "status": ProjectStatus.IN_PROGRESS
            },
            {
                "name": "Heart Rate Sensor",
                "description": "Wearable cardiac sensor",
                "device_type": "Class I",
                "intended_use": "Heart rate detection",
                "status": ProjectStatus.COMPLETED
            },
            {
                "name": "Surgical Monitor",
                "description": "Operating room monitoring",
                "device_type": "Class II",
                "intended_use": "Surgical monitoring",
                "status": ProjectStatus.DRAFT
            }
        ]
        
        for project_data in projects_data:
            project = Project(
                user_id=user.id,
                **project_data
            )
            test_session.add(project)
        
        await test_session.commit()
        
        service = ProjectService()
        service._db_manager = test_db_manager
        
        # Test search by name
        from services.projects import ProjectSearchFilters
        filters = ProjectSearchFilters(search="Cardiac")
        results = await service.list_projects(user.google_id, filters)
        assert len(results) == 1
        assert "Cardiac" in results[0].name
        
        # Test search by description
        filters = ProjectSearchFilters(search="monitoring")
        results = await service.list_projects(user.google_id, filters)
        assert len(results) >= 3  # Should match multiple projects
        
        # Test search by device type
        filters = ProjectSearchFilters(device_type="Class II")
        results = await service.list_projects(user.google_id, filters)
        assert len(results) == 3  # Three Class II devices
        
        # Test status filter
        filters = ProjectSearchFilters(status=ProjectStatus.DRAFT)
        results = await service.list_projects(user.google_id, filters)
        assert len(results) == 2  # Two draft projects
        
        # Test combined filters
        filters = ProjectSearchFilters(
            search="monitor",
            status=ProjectStatus.DRAFT
        )
        results = await service.list_projects(user.google_id, filters)
        assert len(results) == 2  # Cardiac Monitor and Surgical Monitor
        
        # Test pagination
        filters = ProjectSearchFilters(limit=2, offset=0)
        page1 = await service.list_projects(user.google_id, filters)
        assert len(page1) == 2
        
        filters = ProjectSearchFilters(limit=2, offset=2)
        page2 = await service.list_projects(user.google_id, filters)
        assert len(page2) == 2
        
        # Verify no overlap between pages
        page1_ids = {p.id for p in page1}
        page2_ids = {p.id for p in page2}
        assert page1_ids.isdisjoint(page2_ids)
    
    @pytest.mark.asyncio
    async def test_dashboard_data_with_relationships(self, test_db_manager, test_session):
        """Test dashboard data retrieval with complex relationships"""
        # Create test user and project
        user = User(
            email="dashboard@test.com",
            name="Dashboard Test User",
            google_id="dashboard_test_user"
        )
        test_session.add(user)
        await test_session.flush()
        
        project = Project(
            user_id=user.id,
            name="Dashboard Test Project",
            description="Testing dashboard functionality",
            device_type="Class II Monitor",
            intended_use="Comprehensive monitoring",
            status=ProjectStatus.IN_PROGRESS
        )
        test_session.add(project)
        await test_session.flush()
        
        # Add device classification
        classification = DeviceClassification(
            project_id=project.id,
            device_class="II",
            product_code="DPS",
            regulatory_pathway="510k",
            cfr_sections=json.dumps(["880.2920"]),
            confidence_score=0.92,
            reasoning="Device matches existing product code requirements",
            sources=json.dumps([
                {"url": "https://fda.gov/test", "title": "Test Guidance"}
            ])
        )
        test_session.add(classification)
        
        # Add predicate devices
        predicates_data = [
            {
                "k_number": "K123456",
                "device_name": "Similar Monitor A",
                "intended_use": "Cardiac monitoring",
                "product_code": "DPS",
                "clearance_date": date(2023, 1, 15),
                "confidence_score": 0.88,
                "is_selected": True,
                "comparison_data": json.dumps({
                    "similarities": ["Same intended use", "Similar technology"],
                    "differences": ["Different materials"],
                    "riskAssessment": "low",
                    "testingRecommendations": ["Biocompatibility testing"]
                })
            },
            {
                "k_number": "K789012",
                "device_name": "Similar Monitor B",
                "intended_use": "Heart rate monitoring",
                "product_code": "DPS",
                "clearance_date": date(2022, 8, 20),
                "confidence_score": 0.75,
                "is_selected": False,
                "comparison_data": json.dumps({
                    "similarities": ["Similar product code"],
                    "differences": ["Different intended use", "Different design"],
                    "riskAssessment": "medium",
                    "testingRecommendations": ["Clinical testing", "Software validation"]
                })
            }
        ]
        
        for predicate_data in predicates_data:
            predicate = PredicateDevice(
                project_id=project.id,
                **predicate_data
            )
            test_session.add(predicate)
        
        # Add agent interactions
        interactions_data = [
            {
                "agent_action": "device_classification",
                "input_data": json.dumps({
                    "device_description": "Cardiac monitoring device",
                    "intended_use": "Continuous monitoring"
                }),
                "output_data": json.dumps({
                    "device_class": "II",
                    "product_code": "DPS",
                    "confidence": 0.92
                }),
                "confidence_score": 0.92,
                "reasoning": "Device classified based on intended use and risk profile",
                "sources": json.dumps([]),
                "execution_time_ms": 1500
            },
            {
                "agent_action": "predicate_search",
                "input_data": json.dumps({
                    "device_type": "cardiac monitor",
                    "product_code": "DPS"
                }),
                "output_data": json.dumps({
                    "predicates_found": 2,
                    "top_matches": ["K123456", "K789012"]
                }),
                "confidence_score": 0.85,
                "reasoning": "Found multiple suitable predicate devices",
                "sources": json.dumps([]),
                "execution_time_ms": 3200
            }
        ]
        
        for interaction_data in interactions_data:
            interaction = AgentInteraction(
                project_id=project.id,
                **interaction_data
            )
            test_session.add(interaction)
        
        # Add project documents
        documents_data = [
            {
                "filename": "device_specification.pdf",
                "file_path": "/uploads/spec.pdf",
                "document_type": "specification",
                "metadata": json.dumps({"pages": 25, "size": "2.5MB"})
            },
            {
                "filename": "test_protocol.docx",
                "file_path": "/uploads/protocol.docx",
                "document_type": "protocol",
                "metadata": json.dumps({"pages": 12, "size": "1.2MB"})
            }
        ]
        
        for doc_data in documents_data:
            document = ProjectDocument(
                project_id=project.id,
                **doc_data
            )
            test_session.add(document)
        
        await test_session.commit()
        
        # Test dashboard data retrieval
        service = ProjectService()
        service._db_manager = test_db_manager
        
        dashboard_data = await service.get_dashboard_data(project.id, user.google_id)
        
        # Verify project data
        assert dashboard_data.project.id == project.id
        assert dashboard_data.project.name == "Dashboard Test Project"
        
        # Verify classification data
        assert dashboard_data.classification is not None
        assert dashboard_data.classification["deviceClass"] == "II"
        assert dashboard_data.classification["productCode"] == "DPS"
        assert dashboard_data.classification["confidenceScore"] == 0.92
        
        # Verify predicate devices
        assert len(dashboard_data.predicate_devices) == 2
        selected_predicates = [p for p in dashboard_data.predicate_devices if p["isSelected"]]
        assert len(selected_predicates) == 1
        assert selected_predicates[0]["kNumber"] == "K123456"
        
        # Verify statistics
        assert dashboard_data.statistics["totalPredicates"] == 2
        assert dashboard_data.statistics["selectedPredicates"] == 1
        assert dashboard_data.statistics["documentsCount"] == 2
        assert dashboard_data.statistics["agentInteractions"] == 2
        
        # Verify progress calculation
        assert dashboard_data.progress["overallProgress"] > 0
        assert "nextActions" in dashboard_data.progress
        
        # Verify recent activity
        assert len(dashboard_data.recent_activity) == 2
        activity_types = [a["type"] for a in dashboard_data.recent_activity]
        assert "classification" in activity_types
        assert "predicate_search" in activity_types


class TestProjectAPIIntegration:
    """Test API endpoints with real database integration"""
    
    @pytest.mark.asyncio
    async def test_api_create_and_retrieve_flow(self, integration_client, test_session):
        """Test complete API flow from creation to retrieval"""
        # Create user for the test
        user = User(
            email="integration@test.com",
            name="Integration Test User",
            google_id="integration_test_user"
        )
        test_session.add(user)
        await test_session.commit()
        
        # 1. Create project via API
        create_response = integration_client.post(
            "/api/projects/",
            json={
                "name": "API Integration Test Device",
                "description": "Testing API integration",
                "device_type": "Class II",
                "intended_use": "For API testing"
            }
        )
        
        assert create_response.status_code == 201
        created_data = create_response.json()
        project_id = created_data["id"]
        
        # 2. Retrieve project via API
        get_response = integration_client.get(f"/api/projects/{project_id}")
        
        assert get_response.status_code == 200
        retrieved_data = get_response.json()
        assert retrieved_data["id"] == project_id
        assert retrieved_data["name"] == "API Integration Test Device"
        
        # 3. Update project via API
        update_response = integration_client.put(
            f"/api/projects/{project_id}",
            json={
                "name": "Updated API Test Device",
                "status": "in_progress"
            }
        )
        
        assert update_response.status_code == 200
        updated_data = update_response.json()
        assert updated_data["name"] == "Updated API Test Device"
        assert updated_data["status"] == "in_progress"
        
        # 4. List projects via API
        list_response = integration_client.get("/api/projects/")
        
        assert list_response.status_code == 200
        list_data = list_response.json()
        assert len(list_data) == 1
        assert list_data[0]["id"] == project_id
        
        # 5. Get dashboard data via API
        dashboard_response = integration_client.get(f"/api/projects/{project_id}/dashboard")
        
        assert dashboard_response.status_code == 200
        dashboard_data = dashboard_response.json()
        assert dashboard_data["project"]["id"] == project_id
        assert "progress" in dashboard_data
        assert "statistics" in dashboard_data
        
        # 6. Export project via API
        export_response = integration_client.get(f"/api/projects/{project_id}/export?format_type=json")
        
        assert export_response.status_code == 200
        assert "application/json" in export_response.headers["content-type"]
        
        # 7. Delete project via API
        delete_response = integration_client.delete(f"/api/projects/{project_id}")
        
        assert delete_response.status_code == 200
        delete_data = delete_response.json()
        assert "deleted successfully" in delete_data["message"]
        
        # 8. Verify deletion
        get_deleted_response = integration_client.get(f"/api/projects/{project_id}")
        assert get_deleted_response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_api_search_and_filtering(self, integration_client, test_session):
        """Test API search and filtering with real database"""
        # Create user
        user = User(
            email="integration@test.com",
            name="Integration Test User",
            google_id="integration_test_user"
        )
        test_session.add(user)
        await test_session.flush()
        
        # Create multiple projects
        projects_data = [
            {
                "name": "Cardiac Monitor Pro",
                "description": "Advanced cardiac monitoring",
                "device_type": "Class II Cardiac",
                "intended_use": "Cardiac monitoring"
            },
            {
                "name": "Blood Pressure Monitor",
                "description": "Automated BP measurement",
                "device_type": "Class II",
                "intended_use": "Blood pressure monitoring"
            },
            {
                "name": "Heart Rate Sensor",
                "description": "Wearable heart sensor",
                "device_type": "Class I",
                "intended_use": "Heart rate detection"
            }
        ]
        
        created_ids = []
        for project_data in projects_data:
            response = integration_client.post("/api/projects/", json=project_data)
            assert response.status_code == 201
            created_ids.append(response.json()["id"])
        
        # Test search by name
        response = integration_client.get("/api/projects/?search=Cardiac")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert "Cardiac" in data[0]["name"]
        
        # Test search by description
        response = integration_client.get("/api/projects/?search=monitoring")
        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        
        # Test device type filter
        response = integration_client.get("/api/projects/?device_type=Class II")
        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        
        # Test pagination
        response = integration_client.get("/api/projects/?limit=2&offset=0")
        assert response.status_code == 200
        page1 = response.json()
        assert len(page1) == 2
        
        response = integration_client.get("/api/projects/?limit=2&offset=2")
        assert response.status_code == 200
        page2 = response.json()
        assert len(page2) == 1
        
        # Verify no overlap
        page1_ids = {p["id"] for p in page1}
        page2_ids = {p["id"] for p in page2}
        assert page1_ids.isdisjoint(page2_ids)


# Import required modules for database operations
from sqlalchemy import func