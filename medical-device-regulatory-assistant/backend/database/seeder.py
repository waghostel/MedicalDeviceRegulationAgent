"""
Enhanced database seeding functionality with JSON configuration support
"""

import asyncio
import logging
import json
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional
from pathlib import Path

from sqlalchemy.orm import Session
from sqlalchemy import text

from .connection import get_database_manager

# Import models with error handling for different import contexts
try:
    from ..models.user import User
    from ..models.project import Project, ProjectStatus
    from ..models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
    from ..models.predicate_device import PredicateDevice
    from ..models.agent_interaction import AgentInteraction
except ImportError:
    # Fallback for direct script execution
    import sys
    from pathlib import Path
    sys.path.insert(0, str(Path(__file__).parent.parent))
    
    from models.user import User
    from models.project import Project, ProjectStatus
    from models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
    from models.predicate_device import PredicateDevice
    from models.agent_interaction import AgentInteraction

logger = logging.getLogger(__name__)


class DatabaseSeeder:
    """Legacy database seeder for backward compatibility"""
    
    def __init__(self, db_manager=None):
        self.db_manager = db_manager or get_database_manager()
    
    async def seed_all(self) -> None:
        """Seed all sample data using enhanced seeder"""
        enhanced_seeder = EnhancedDatabaseSeeder()
        await enhanced_seeder.seed_all()
        logger.info("Database seeding completed successfully")
    
    async def clear_all_data(self) -> None:
        """Clear all data from database using enhanced seeder"""
        enhanced_seeder = EnhancedDatabaseSeeder()
        await enhanced_seeder.clear_all_data()


class EnhancedDatabaseSeeder:
    """Enhanced database seeder with JSON configuration support"""
    
    def __init__(self, config_path: Optional[str] = None):
        self.db_manager = get_database_manager()
        self.config_path = config_path or "mock_data/sample_mock_data_config.json"
        self.config: Optional[Dict[str, Any]] = None
        self._user_map: Dict[str, User] = {}
        self._project_map: Dict[str, Project] = {}
    
    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from JSON file"""
        # Try multiple possible paths
        possible_paths = [
            Path(self.config_path),
            Path("backend") / self.config_path,
            Path("medical-device-regulatory-assistant/backend") / self.config_path,
            Path(__file__).parent.parent / self.config_path
        ]
        
        config_file = None
        for path in possible_paths:
            if path.exists():
                config_file = path
                break
        
        if not config_file:
            raise FileNotFoundError(f"Configuration file not found. Tried paths: {[str(p) for p in possible_paths]}")
        
        logger.info(f"Loading configuration from: {config_file}")
        
        with open(config_file, 'r') as f:
            return json.load(f)
    
    async def seed_all(self, clear_existing: bool = False) -> None:
        """Seed all data from configuration"""
        try:
            self.config = self._load_config()
        except FileNotFoundError as e:
            logger.error(f"Failed to load configuration: {e}")
            logger.info("Creating sample data without configuration file")
            await self._create_minimal_sample_data()
            return
        
        if clear_existing:
            await self.clear_all_data()
        
        async with self.db_manager.get_session() as session:
            try:
                # Create users first (needed for foreign keys)
                await self._seed_users(session)
                
                # Create projects
                await self._seed_projects(session)
                
                # Create related data
                await self._seed_device_classifications(session)
                await self._seed_predicate_devices(session)
                await self._seed_agent_interactions(session)
                
                await session.commit()
                
                logger.info(f"Successfully seeded database with {len(self.config.get('projects', []))} projects")
                
            except Exception as e:
                logger.error(f"Error during seeding: {e}")
                await session.rollback()
                raise
    
    async def _seed_users(self, session: Session) -> None:
        """Seed users and populate user mapping"""
        users_data = self.config.get('users', [])
        
        for user_data in users_data:
            # Check if user already exists
            existing_user = await session.execute(
                text("SELECT * FROM users WHERE email = :email"),
                {"email": user_data['email']}
            )
            
            if existing_user.fetchone():
                logger.info(f"User {user_data['email']} already exists, skipping")
                # Still add to mapping for project creation
                user_result = await session.execute(
                    text("SELECT * FROM users WHERE email = :email"),
                    {"email": user_data['email']}
                )
                user_row = user_result.fetchone()
                if user_row:
                    user = User(
                        id=user_row.id,
                        email=user_row.email,
                        name=user_row.name,
                        google_id=user_row.google_id
                    )
                    self._user_map[user_data['email']] = user
                continue
            
            user = User(
                google_id=user_data['google_id'],
                email=user_data['email'],
                name=user_data['name']
            )
            session.add(user)
            await session.flush()  # Get the ID
            self._user_map[user_data['email']] = user
            
            logger.info(f"Created user: {user.name} ({user.email})")
    
    async def _seed_projects(self, session: Session) -> None:
        """Seed projects and populate project mapping"""
        projects_data = self.config.get('projects', [])
        
        for project_data in projects_data:
            user = self._user_map.get(project_data['user_email'])
            if not user:
                logger.warning(f"User not found for email {project_data['user_email']}, skipping project {project_data['name']}")
                continue
            
            # Check if project already exists
            existing_project = await session.execute(
                text("SELECT * FROM projects WHERE name = :name AND user_id = :user_id"),
                {"name": project_data['name'], "user_id": user.id}
            )
            
            if existing_project.fetchone():
                logger.info(f"Project '{project_data['name']}' already exists, skipping")
                continue
            
            # Parse status
            status = ProjectStatus.DRAFT
            if project_data.get('status'):
                try:
                    status = ProjectStatus(project_data['status'])
                except ValueError:
                    logger.warning(f"Invalid status '{project_data['status']}' for project {project_data['name']}, using DRAFT")
            
            # Handle tags
            tags_json = None
            if project_data.get('tags'):
                tags_json = json.dumps(project_data['tags'])
            
            project = Project(
                user_id=user.id,
                name=project_data['name'],
                description=project_data.get('description'),
                device_type=project_data.get('device_type'),
                intended_use=project_data.get('intended_use'),
                status=status,
                priority=project_data.get('priority'),
                tags=tags_json
            )
            session.add(project)
            await session.flush()
            self._project_map[project_data['name']] = project
            
            logger.info(f"Created project: {project.name} (Status: {project.status.value})")
    
    async def _seed_device_classifications(self, session: Session) -> None:
        """Seed device classifications"""
        classifications_data = self.config.get('device_classifications', [])
        
        for classification_data in classifications_data:
            project = self._project_map.get(classification_data['project_name'])
            if not project:
                logger.warning(f"Project not found for classification: {classification_data['project_name']}")
                continue
            
            # Parse device class
            device_class = None
            if classification_data.get('device_class'):
                try:
                    device_class = DeviceClass(classification_data['device_class'])
                except ValueError:
                    logger.warning(f"Invalid device class: {classification_data['device_class']}")
            
            # Parse regulatory pathway
            regulatory_pathway = None
            if classification_data.get('regulatory_pathway'):
                try:
                    regulatory_pathway = RegulatoryPathway(classification_data['regulatory_pathway'])
                except ValueError:
                    logger.warning(f"Invalid regulatory pathway: {classification_data['regulatory_pathway']}")
            
            classification = DeviceClassification(
                project_id=project.id,
                device_class=device_class,
                product_code=classification_data.get('product_code'),
                regulatory_pathway=regulatory_pathway,
                cfr_sections=classification_data.get('cfr_sections'),
                confidence_score=classification_data.get('confidence_score'),
                reasoning=classification_data.get('reasoning'),
                sources=[]  # Empty sources for mock data
            )
            session.add(classification)
            
            logger.info(f"Created classification for project: {project.name}")
    
    async def _seed_predicate_devices(self, session: Session) -> None:
        """Seed predicate devices"""
        predicates_data = self.config.get('predicate_devices', [])
        
        for predicate_data in predicates_data:
            project = self._project_map.get(predicate_data['project_name'])
            if not project:
                logger.warning(f"Project not found for predicate: {predicate_data['project_name']}")
                continue
            
            # Parse clearance date
            clearance_date = None
            if predicate_data.get('clearance_date'):
                try:
                    clearance_date = datetime.strptime(
                        predicate_data['clearance_date'], 
                        '%Y-%m-%d'
                    ).date()
                except ValueError:
                    logger.warning(f"Invalid clearance date: {predicate_data['clearance_date']}")
            
            predicate = PredicateDevice(
                project_id=project.id,
                k_number=predicate_data['k_number'],
                device_name=predicate_data.get('device_name'),
                intended_use=predicate_data.get('intended_use'),
                product_code=predicate_data.get('product_code'),
                clearance_date=clearance_date,
                confidence_score=predicate_data.get('confidence_score'),
                is_selected=predicate_data.get('is_selected', False),
                comparison_data=predicate_data.get('comparison_data', {})
            )
            session.add(predicate)
            
            logger.info(f"Created predicate device: {predicate.k_number} for project: {project.name}")
    
    async def _seed_agent_interactions(self, session: Session) -> None:
        """Seed agent interactions"""
        interactions_data = self.config.get('agent_interactions', [])
        
        for interaction_data in interactions_data:
            project = self._project_map.get(interaction_data['project_name'])
            user = self._user_map.get(interaction_data['user_email'])
            
            if not project or not user:
                logger.warning(f"Project or user not found for interaction: {interaction_data.get('project_name', 'unknown')}")
                continue
            
            interaction = AgentInteraction(
                project_id=project.id,
                user_id=user.id,
                agent_action=interaction_data['agent_action'],
                input_data=interaction_data.get('input_data', {}),
                output_data=interaction_data.get('output_data', {}),
                confidence_score=interaction_data.get('confidence_score'),
                reasoning=interaction_data.get('reasoning'),
                sources=[],  # Empty sources for mock data
                execution_time_ms=interaction_data.get('execution_time_ms', 1500)
            )
            session.add(interaction)
            
            logger.info(f"Created agent interaction: {interaction.agent_action} for project: {project.name}")
    
    async def _create_minimal_sample_data(self) -> None:
        """Create minimal sample data when no configuration file is available"""
        async with self.db_manager.get_session() as session:
            try:
                # Create a test user
                test_user = User(
                    google_id="test_user_123",
                    email="test@example.com",
                    name="Test User"
                )
                session.add(test_user)
                await session.flush()
                
                # Create a test project
                test_project = Project(
                    user_id=test_user.id,
                    name="Sample Medical Device",
                    description="A sample medical device for testing purposes",
                    device_type="Test Device",
                    intended_use="For testing the application",
                    status=ProjectStatus.DRAFT,
                    priority="medium",
                    tags=json.dumps(["test", "sample"])
                )
                session.add(test_project)
                await session.flush()
                
                # Create a test classification
                test_classification = DeviceClassification(
                    project_id=test_project.id,
                    device_class=DeviceClass.CLASS_II,
                    product_code="ABC",
                    regulatory_pathway=RegulatoryPathway.FIVE_TEN_K,
                    confidence_score=0.85,
                    reasoning="Sample classification for testing"
                )
                session.add(test_classification)
                
                await session.commit()
                logger.info("Created minimal sample data")
                
            except Exception as e:
                logger.error(f"Error creating minimal sample data: {e}")
                await session.rollback()
                raise
    
    async def clear_all_data(self) -> None:
        """Clear all data from database"""
        async with self.db_manager.get_session() as session:
            try:
                # Delete in reverse order of dependencies to avoid foreign key constraints
                await session.execute(text("DELETE FROM agent_interactions"))
                await session.execute(text("DELETE FROM predicate_devices"))
                await session.execute(text("DELETE FROM device_classifications"))
                await session.execute(text("DELETE FROM projects"))
                await session.execute(text("DELETE FROM users"))
                await session.commit()
                
                logger.info("All data cleared from database")
                
            except Exception as e:
                logger.error(f"Error clearing database: {e}")
                await session.rollback()
                raise
    
    async def seed_incremental(self, data_types: List[str] = None) -> None:
        """Seed specific data types incrementally"""
        if not data_types:
            data_types = ['users', 'projects', 'device_classifications', 'predicate_devices', 'agent_interactions']
        
        try:
            self.config = self._load_config()
        except FileNotFoundError as e:
            logger.error(f"Failed to load configuration: {e}")
            return
        
        async with self.db_manager.get_session() as session:
            try:
                if 'users' in data_types:
                    await self._seed_users(session)
                
                if 'projects' in data_types:
                    await self._seed_projects(session)
                
                if 'device_classifications' in data_types:
                    await self._seed_device_classifications(session)
                
                if 'predicate_devices' in data_types:
                    await self._seed_predicate_devices(session)
                
                if 'agent_interactions' in data_types:
                    await self._seed_agent_interactions(session)
                
                await session.commit()
                logger.info(f"Successfully seeded data types: {data_types}")
                
            except Exception as e:
                logger.error(f"Error during incremental seeding: {e}")
                await session.rollback()
                raise


async def seed_database() -> None:
    """Convenience function to seed the database"""
    seeder = EnhancedDatabaseSeeder()
    await seeder.seed_all()


async def clear_database() -> None:
    """Convenience function to clear the database"""
    seeder = EnhancedDatabaseSeeder()
    await seeder.clear_all_data()