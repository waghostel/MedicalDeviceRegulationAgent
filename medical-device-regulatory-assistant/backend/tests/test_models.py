"""
Unit tests for database models
"""

import pytest
from datetime import date
from sqlalchemy import select

from models.user import User
from models.project import Project, ProjectStatus
from models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument


class TestUserModel:
    """Test User model"""
    
    @pytest.mark.asyncio
    async def test_create_user(self, test_session):
        """Test creating a user"""
        user = User(
            email="john.doe@example.com",
            name="John Doe",
            google_id="google_123456"
        )
        
        test_session.add(user)
        await test_session.flush()
        
        assert user.id is not None
        assert user.email == "john.doe@example.com"
        assert user.name == "John Doe"
        assert user.google_id == "google_123456"
        assert user.created_at is not None
        assert user.updated_at is not None
    
    @pytest.mark.asyncio
    async def test_user_relationships(self, test_session, sample_user):
        """Test user relationships"""
        # Create a project for the user
        project = Project(
            user_id=sample_user.id,
            name="Test Project",
            description="Test description"
        )
        test_session.add(project)
        await test_session.flush()
        
        # Test relationship
        await test_session.refresh(sample_user, ["projects"])
        assert len(sample_user.projects) == 1
        assert sample_user.projects[0].name == "Test Project"
    
    @pytest.mark.asyncio
    async def test_user_to_dict(self, test_session, sample_user):
        """Test user to_dict method"""
        user_dict = sample_user.to_dict()
        
        assert "id" in user_dict
        assert "email" in user_dict
        assert "name" in user_dict
        assert "google_id" in user_dict
        assert "created_at" in user_dict
        assert "updated_at" in user_dict


class TestProjectModel:
    """Test Project model"""
    
    @pytest.mark.asyncio
    async def test_create_project(self, test_session, sample_user):
        """Test creating a project"""
        project = Project(
            user_id=sample_user.id,
            name="Cardiac Monitor",
            description="Wearable cardiac monitoring device",
            device_type="Class II Medical Device",
            intended_use="For continuous cardiac monitoring",
            status=ProjectStatus.IN_PROGRESS
        )
        
        test_session.add(project)
        await test_session.flush()
        
        assert project.id is not None
        assert project.user_id == sample_user.id
        assert project.name == "Cardiac Monitor"
        assert project.status == ProjectStatus.IN_PROGRESS
        assert project.created_at is not None
    
    @pytest.mark.asyncio
    async def test_project_status_enum(self, test_session, sample_user):
        """Test project status enumeration"""
        project = Project(
            user_id=sample_user.id,
            name="Test Project",
            status=ProjectStatus.COMPLETED
        )
        
        test_session.add(project)
        await test_session.flush()
        
        assert project.status == ProjectStatus.COMPLETED
        assert project.status.value == "completed"
    
    @pytest.mark.asyncio
    async def test_project_relationships(self, test_session, sample_project):
        """Test project relationships"""
        # Create a device classification
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_II,
            product_code="DPS"
        )
        test_session.add(classification)
        await test_session.flush()
        
        # Test relationship
        await test_session.refresh(sample_project, ["device_classifications"])
        assert len(sample_project.device_classifications) == 1
        assert sample_project.device_classifications[0].product_code == "DPS"


class TestDeviceClassificationModel:
    """Test DeviceClassification model"""
    
    @pytest.mark.asyncio
    async def test_create_device_classification(self, test_session, sample_project):
        """Test creating a device classification"""
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_II,
            product_code="DPS",
            regulatory_pathway=RegulatoryPathway.FIVE_TEN_K,
            cfr_sections=["870.2300", "870.2340"],
            confidence_score=0.92,
            reasoning="Device classified based on intended use",
            sources=[
                {
                    "url": "https://www.fda.gov/example",
                    "title": "FDA Guidance",
                    "document_type": "FDA_GUIDANCE"
                }
            ]
        )
        
        test_session.add(classification)
        await test_session.flush()
        
        assert classification.id is not None
        assert classification.device_class == DeviceClass.CLASS_II
        assert classification.product_code == "DPS"
        assert classification.regulatory_pathway == RegulatoryPathway.FIVE_TEN_K
        assert classification.confidence_score == 0.92
        assert len(classification.cfr_sections) == 2
        assert len(classification.sources) == 1
    
    @pytest.mark.asyncio
    async def test_device_class_enum(self, test_session, sample_project):
        """Test device class enumeration"""
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_III
        )
        
        test_session.add(classification)
        await test_session.flush()
        
        assert classification.device_class == DeviceClass.CLASS_III
        assert classification.device_class.value == "III"


class TestPredicateDeviceModel:
    """Test PredicateDevice model"""
    
    @pytest.mark.asyncio
    async def test_create_predicate_device(self, test_session, sample_project):
        """Test creating a predicate device"""
        predicate = PredicateDevice(
            project_id=sample_project.id,
            k_number="K193456",
            device_name="CardioWatch Pro",
            intended_use="Continuous cardiac monitoring",
            product_code="DPS",
            clearance_date=date(2019, 8, 15),
            confidence_score=0.89,
            comparison_data={
                "similarities": ["intended_use", "technology"],
                "differences": ["form_factor"]
            },
            is_selected=True
        )
        
        test_session.add(predicate)
        await test_session.flush()
        
        assert predicate.id is not None
        assert predicate.k_number == "K193456"
        assert predicate.device_name == "CardioWatch Pro"
        assert predicate.confidence_score == 0.89
        assert predicate.is_selected is True
        assert predicate.clearance_date == date(2019, 8, 15)
        assert "similarities" in predicate.comparison_data
    
    @pytest.mark.asyncio
    async def test_predicate_device_defaults(self, test_session, sample_project):
        """Test predicate device default values"""
        predicate = PredicateDevice(
            project_id=sample_project.id,
            k_number="K123456"
        )
        
        test_session.add(predicate)
        await test_session.flush()
        
        assert predicate.is_selected is False  # Default value


class TestAgentInteractionModel:
    """Test AgentInteraction model"""
    
    @pytest.mark.asyncio
    async def test_create_agent_interaction(self, test_session, sample_project, sample_user):
        """Test creating an agent interaction"""
        interaction = AgentInteraction(
            project_id=sample_project.id,
            user_id=sample_user.id,
            agent_action="predicate_search",
            input_data={
                "device_description": "Wearable ECG monitor",
                "intended_use": "Cardiac monitoring"
            },
            output_data={
                "predicates_found": 5,
                "top_match": "K193456"
            },
            confidence_score=0.89,
            sources=[
                {
                    "url": "https://www.fda.gov/example",
                    "title": "510(k) Summary"
                }
            ],
            reasoning="Found predicates based on similarity",
            execution_time_ms=2340
        )
        
        test_session.add(interaction)
        await test_session.flush()
        
        assert interaction.id is not None
        assert interaction.agent_action == "predicate_search"
        assert interaction.confidence_score == 0.89
        assert interaction.execution_time_ms == 2340
        assert "device_description" in interaction.input_data
        assert "predicates_found" in interaction.output_data


class TestProjectDocumentModel:
    """Test ProjectDocument model"""
    
    @pytest.mark.asyncio
    async def test_create_project_document(self, test_session, sample_project):
        """Test creating a project document"""
        document = ProjectDocument(
            project_id=sample_project.id,
            filename="device_description.md",
            file_path="/projects/test/device_description.md",
            document_type="specification",
            content_markdown="# Device Description\n\nThis is a test device...",
            document_metadata={
                "version": "1.0",
                "author": "Test User",
                "tags": ["specification", "device"]
            }
        )
        
        test_session.add(document)
        await test_session.flush()
        
        assert document.id is not None
        assert document.filename == "device_description.md"
        assert document.document_type == "specification"
        assert "# Device Description" in document.content_markdown
        assert document.document_metadata["version"] == "1.0"
        assert len(document.document_metadata["tags"]) == 2


class TestModelRelationships:
    """Test model relationships and cascading"""
    
    @pytest.mark.asyncio
    async def test_cascade_delete_user(self, test_session):
        """Test cascading delete when user is deleted"""
        # Create user with project
        user = User(
            email="cascade@test.com",
            name="Cascade Test",
            google_id="cascade_123"
        )
        test_session.add(user)
        await test_session.flush()
        
        project = Project(
            user_id=user.id,
            name="Test Project"
        )
        test_session.add(project)
        await test_session.flush()
        
        # Delete user
        await test_session.delete(user)
        await test_session.flush()
        
        # Check that project is also deleted (cascade)
        result = await test_session.execute(
            select(Project).where(Project.id == project.id)
        )
        assert result.scalar_one_or_none() is None
    
    @pytest.mark.asyncio
    async def test_cascade_delete_project(self, test_session, sample_project):
        """Test cascading delete when project is deleted"""
        # Create related records
        classification = DeviceClassification(
            project_id=sample_project.id,
            device_class=DeviceClass.CLASS_II
        )
        test_session.add(classification)
        
        predicate = PredicateDevice(
            project_id=sample_project.id,
            k_number="K123456"
        )
        test_session.add(predicate)
        
        document = ProjectDocument(
            project_id=sample_project.id,
            filename="test.md",
            file_path="/test.md"
        )
        test_session.add(document)
        
        await test_session.flush()
        
        # Delete project
        await test_session.delete(sample_project)
        await test_session.flush()
        
        # Check that related records are deleted
        classification_result = await test_session.execute(
            select(DeviceClassification).where(DeviceClassification.id == classification.id)
        )
        assert classification_result.scalar_one_or_none() is None
        
        predicate_result = await test_session.execute(
            select(PredicateDevice).where(PredicateDevice.id == predicate.id)
        )
        assert predicate_result.scalar_one_or_none() is None
        
        document_result = await test_session.execute(
            select(ProjectDocument).where(ProjectDocument.id == document.id)
        )
        assert document_result.scalar_one_or_none() is None