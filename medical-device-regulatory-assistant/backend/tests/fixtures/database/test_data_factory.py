"""
Test data factory system with automatic cleanup tracking.

This module provides the TestDataFactory class that creates test entities
with proper relationships and automatic cleanup tracking to ensure
clean test environments.
"""

import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional, Union, Type, TypeVar
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete
from sqlalchemy.orm import selectinload

from models.user import User
from models.project import Project, ProjectStatus
from models.device_classification import DeviceClassification
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument

logger = logging.getLogger(__name__)

T = TypeVar('T')


@dataclass
class CreatedEntity:
    """Represents a created test entity for cleanup tracking."""
    entity_type: str
    entity_id: Union[int, str]
    created_at: datetime
    dependencies: List['CreatedEntity'] = field(default_factory=list)
    cleanup_order: int = 0  # Lower numbers are cleaned up first


class TestDataFactory:
    """
    Test data factory for creating test entities with automatic cleanup tracking.
    
    This factory creates realistic test data with proper relationships and
    tracks all created entities for automatic cleanup after tests complete.
    """
    
    def __init__(self, session: AsyncSession):
        """
        Initialize the test data factory.
        
        Args:
            session: The database session to use for creating entities
        """
        self.session = session
        self.created_entities: List[CreatedEntity] = []
        self.entity_counter = 0
        self._cleanup_order_map = {
            'agent_interaction': 1,
            'project_document': 2,
            'predicate_device': 3,
            'device_classification': 4,
            'project': 5,
            'user': 6,  # Users should be cleaned up last due to foreign key constraints
        }
    
    def _get_unique_identifier(self) -> str:
        """Generate a unique identifier for test data."""
        self.entity_counter += 1
        return f"test_{uuid.uuid4().hex[:8]}_{self.entity_counter}"
    
    def _track_entity(self, entity_type: str, entity_id: Union[int, str], 
                     dependencies: Optional[List[CreatedEntity]] = None) -> CreatedEntity:
        """
        Track a created entity for cleanup.
        
        Args:
            entity_type: Type of the entity (e.g., 'user', 'project')
            entity_id: ID of the created entity
            dependencies: List of entities this entity depends on
            
        Returns:
            CreatedEntity: The tracked entity record
        """
        created_entity = CreatedEntity(
            entity_type=entity_type,
            entity_id=entity_id,
            created_at=datetime.utcnow(),
            dependencies=dependencies or [],
            cleanup_order=self._cleanup_order_map.get(entity_type, 999)
        )
        
        self.created_entities.append(created_entity)
        logger.debug(f"Tracking created entity: {entity_type}#{entity_id}")
        
        return created_entity
    
    async def create_user(self, **kwargs) -> User:
        """
        Create a test user with automatic cleanup tracking.
        
        Args:
            **kwargs: Optional user attributes to override defaults
            
        Returns:
            User: The created user instance
        """
        unique_id = self._get_unique_identifier()
        
        user_data = {
            "email": f"user_{unique_id}@example.com",
            "name": f"Test User {unique_id}",
            "google_id": f"google_{unique_id}",
            **kwargs
        }
        
        user = User(**user_data)
        self.session.add(user)
        await self.session.flush()  # Get ID without committing
        
        self._track_entity('user', user.id)
        
        logger.debug(f"Created test user: {user.email} (ID: {user.id})")
        return user
    
    async def create_project(self, user: Optional[User] = None, **kwargs) -> Project:
        """
        Create a test project with automatic cleanup tracking.
        
        Args:
            user: Optional user to associate with the project. If None, creates a new user.
            **kwargs: Optional project attributes to override defaults
            
        Returns:
            Project: The created project instance
        """
        if user is None:
            user = await self.create_user()
        
        unique_id = self._get_unique_identifier()
        
        project_data = {
            "user_id": user.id,
            "name": f"Test Project {unique_id}",
            "description": f"Test project description for {unique_id}",
            "device_type": f"Test Device Type {unique_id}",
            "intended_use": f"Test intended use for {unique_id}",
            "status": ProjectStatus.DRAFT,
            **kwargs
        }
        
        project = Project(**project_data)
        self.session.add(project)
        await self.session.flush()
        
        # Find the user entity record for dependency tracking
        user_entity = next((e for e in self.created_entities if e.entity_type == 'user' and e.entity_id == user.id), None)
        dependencies = [user_entity] if user_entity else []
        
        self._track_entity('project', project.id, dependencies)
        
        logger.debug(f"Created test project: {project.name} (ID: {project.id}) for user {user.id}")
        return project
    
    async def create_device_classification(self, project: Optional[Project] = None, **kwargs) -> DeviceClassification:
        """
        Create a test device classification with automatic cleanup tracking.
        
        Args:
            project: Optional project to associate with. If None, creates a new project.
            **kwargs: Optional classification attributes to override defaults
            
        Returns:
            DeviceClassification: The created device classification instance
        """
        if project is None:
            project = await self.create_project()
        
        unique_id = self._get_unique_identifier()
        
        from models.device_classification import DeviceClass, RegulatoryPathway
        
        classification_data = {
            "project_id": project.id,
            "device_class": DeviceClass.CLASS_II,
            "product_code": f"ABC{unique_id[:3].upper()}",
            "regulatory_pathway": RegulatoryPathway.FIVE_TEN_K,
            "cfr_sections": [f"21 CFR 123.{unique_id[:3]}"],
            "confidence_score": 0.85,
            "reasoning": f"Test classification reasoning for {unique_id}",
            "sources": [{"url": f"https://fda.gov/test/{unique_id}", "title": f"Test Source {unique_id}"}],
            **kwargs
        }
        
        classification = DeviceClassification(**classification_data)
        self.session.add(classification)
        await self.session.flush()
        
        # Find project entity for dependency tracking
        project_entity = next((e for e in self.created_entities if e.entity_type == 'project' and e.entity_id == project.id), None)
        dependencies = [project_entity] if project_entity else []
        
        self._track_entity('device_classification', classification.id, dependencies)
        
        logger.debug(f"Created test device classification: {classification.device_class.value if classification.device_class else 'Unknown'} (ID: {classification.id})")
        return classification
    
    async def create_predicate_device(self, project: Optional[Project] = None, **kwargs) -> PredicateDevice:
        """
        Create a test predicate device with automatic cleanup tracking.
        
        Args:
            project: Optional project to associate with. If None, creates a new project.
            **kwargs: Optional predicate device attributes to override defaults
            
        Returns:
            PredicateDevice: The created predicate device instance
        """
        if project is None:
            project = await self.create_project()
        
        unique_id = self._get_unique_identifier()
        
        predicate_data = {
            "project_id": project.id,
            "k_number": f"K{unique_id[:6].upper()}",
            "device_name": f"Test Predicate Device {unique_id}",
            "intended_use": f"Test predicate intended use {unique_id}",
            "product_code": f"XYZ{unique_id[:3].upper()}",
            "clearance_date": datetime.utcnow().date(),
            "confidence_score": 0.75,
            **kwargs
        }
        
        predicate = PredicateDevice(**predicate_data)
        self.session.add(predicate)
        await self.session.flush()
        
        # Find project entity for dependency tracking
        project_entity = next((e for e in self.created_entities if e.entity_type == 'project' and e.entity_id == project.id), None)
        dependencies = [project_entity] if project_entity else []
        
        self._track_entity('predicate_device', predicate.id, dependencies)
        
        logger.debug(f"Created test predicate device: {predicate.device_name} (ID: {predicate.id})")
        return predicate
    
    async def create_agent_interaction(self, project: Optional[Project] = None, 
                                     user: Optional[User] = None, **kwargs) -> AgentInteraction:
        """
        Create a test agent interaction with automatic cleanup tracking.
        
        Args:
            project: Optional project to associate with. If None, creates a new project.
            user: Optional user to associate with. If None, uses project's user or creates new.
            **kwargs: Optional interaction attributes to override defaults
            
        Returns:
            AgentInteraction: The created agent interaction instance
        """
        if project is None:
            project = await self.create_project()
        
        if user is None:
            # Load the project's user
            result = await self.session.execute(
                select(Project).options(selectinload(Project.user)).where(Project.id == project.id)
            )
            project_with_user = result.scalar_one()
            user = project_with_user.user
        
        unique_id = self._get_unique_identifier()
        
        interaction_data = {
            "project_id": project.id,
            "user_id": user.id,
            "agent_action": f"test_action_{unique_id}",
            "input_data": {"test_input": f"input_{unique_id}"},
            "output_data": {"test_output": f"output_{unique_id}"},
            "confidence_score": 0.80,
            "sources": [{"url": f"https://test.example.com/{unique_id}", "title": f"Test Source {unique_id}"}],
            "reasoning": f"Test reasoning for {unique_id}",
            **kwargs
        }
        
        interaction = AgentInteraction(**interaction_data)
        self.session.add(interaction)
        await self.session.flush()
        
        # Find dependencies
        project_entity = next((e for e in self.created_entities if e.entity_type == 'project' and e.entity_id == project.id), None)
        user_entity = next((e for e in self.created_entities if e.entity_type == 'user' and e.entity_id == user.id), None)
        dependencies = [e for e in [project_entity, user_entity] if e is not None]
        
        self._track_entity('agent_interaction', interaction.id, dependencies)
        
        logger.debug(f"Created test agent interaction: {interaction.agent_action} (ID: {interaction.id})")
        return interaction
    
    async def create_project_document(self, project: Optional[Project] = None, **kwargs) -> ProjectDocument:
        """
        Create a test project document with automatic cleanup tracking.
        
        Args:
            project: Optional project to associate with. If None, creates a new project.
            **kwargs: Optional document attributes to override defaults
            
        Returns:
            ProjectDocument: The created project document instance
        """
        if project is None:
            project = await self.create_project()
        
        unique_id = self._get_unique_identifier()
        
        document_data = {
            "project_id": project.id,
            "filename": f"test_document_{unique_id}.pdf",
            "file_path": f"/test/path/test_document_{unique_id}.pdf",
            "document_type": "test_document",
            "content_markdown": f"# Test Document {unique_id}\n\nThis is test content for document {unique_id}.",
            "document_metadata": {"test_key": f"test_value_{unique_id}", "file_size": 1024 * (hash(unique_id) % 1000 + 1)},
            **kwargs
        }
        
        document = ProjectDocument(**document_data)
        self.session.add(document)
        await self.session.flush()
        
        # Find project entity for dependency tracking
        project_entity = next((e for e in self.created_entities if e.entity_type == 'project' and e.entity_id == project.id), None)
        dependencies = [project_entity] if project_entity else []
        
        self._track_entity('project_document', document.id, dependencies)
        
        logger.debug(f"Created test project document: {document.filename} (ID: {document.id})")
        return document
    
    async def create_complete_project_setup(self, **kwargs) -> Dict[str, Any]:
        """
        Create a complete project setup with all related entities.
        
        This method creates a user, project, device classification, predicate device,
        agent interaction, and project document all properly linked together.
        
        Args:
            **kwargs: Optional attributes to override defaults for any entity
            
        Returns:
            Dict containing all created entities
        """
        # Extract entity-specific kwargs
        user_kwargs = {k[5:]: v for k, v in kwargs.items() if k.startswith('user_')}
        project_kwargs = {k[8:]: v for k, v in kwargs.items() if k.startswith('project_')}
        classification_kwargs = {k[15:]: v for k, v in kwargs.items() if k.startswith('classification_')}
        predicate_kwargs = {k[10:]: v for k, v in kwargs.items() if k.startswith('predicate_')}
        interaction_kwargs = {k[12:]: v for k, v in kwargs.items() if k.startswith('interaction_')}
        document_kwargs = {k[9:]: v for k, v in kwargs.items() if k.startswith('document_')}
        
        # Create entities in dependency order
        user = await self.create_user(**user_kwargs)
        project = await self.create_project(user=user, **project_kwargs)
        classification = await self.create_device_classification(project=project, **classification_kwargs)
        predicate = await self.create_predicate_device(project=project, **predicate_kwargs)
        interaction = await self.create_agent_interaction(project=project, user=user, **interaction_kwargs)
        document = await self.create_project_document(project=project, **document_kwargs)
        
        setup = {
            'user': user,
            'project': project,
            'device_classification': classification,
            'predicate_device': predicate,
            'agent_interaction': interaction,
            'project_document': document
        }
        
        logger.info(f"Created complete project setup for user {user.email}")
        return setup
    
    async def cleanup_all(self) -> None:
        """
        Clean up all created test entities.
        
        This method deletes all tracked entities in the correct order to
        respect foreign key constraints.
        """
        if not self.created_entities:
            logger.debug("No entities to clean up")
            return
        
        # Sort entities by cleanup order (lower numbers first)
        sorted_entities = sorted(self.created_entities, key=lambda e: e.cleanup_order)
        
        cleanup_count = 0
        
        for entity in sorted_entities:
            try:
                # Get the appropriate model class
                model_class = self._get_model_class(entity.entity_type)
                
                if model_class:
                    # Delete the entity
                    await self.session.execute(
                        delete(model_class).where(model_class.id == entity.entity_id)
                    )
                    cleanup_count += 1
                    logger.debug(f"Cleaned up {entity.entity_type}#{entity.entity_id}")
                
            except Exception as e:
                logger.error(f"Failed to clean up {entity.entity_type}#{entity.entity_id}: {e}")
        
        # Clear the tracking list
        self.created_entities.clear()
        
        logger.info(f"Cleaned up {cleanup_count} test entities")
    
    def _get_model_class(self, entity_type: str) -> Optional[Type]:
        """
        Get the SQLAlchemy model class for an entity type.
        
        Args:
            entity_type: The entity type string
            
        Returns:
            The corresponding model class or None if not found
        """
        model_map = {
            'user': User,
            'project': Project,
            'device_classification': DeviceClassification,
            'predicate_device': PredicateDevice,
            'agent_interaction': AgentInteraction,
            'project_document': ProjectDocument,
        }
        
        return model_map.get(entity_type)
    
    def get_created_entities_summary(self) -> Dict[str, Any]:
        """
        Get a summary of all created entities.
        
        Returns:
            Dict containing summary information about created entities
        """
        entity_counts = {}
        for entity in self.created_entities:
            entity_counts[entity.entity_type] = entity_counts.get(entity.entity_type, 0) + 1
        
        return {
            'total_entities': len(self.created_entities),
            'entity_counts': entity_counts,
            'creation_timespan': {
                'earliest': min((e.created_at for e in self.created_entities), default=None),
                'latest': max((e.created_at for e in self.created_entities), default=None)
            }
        }