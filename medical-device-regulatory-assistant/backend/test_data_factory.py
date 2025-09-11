"""
Test script for test data factory functionality.

This script tests the TestDataFactory class to ensure proper
entity creation and automatic cleanup tracking.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database.connection import init_database, close_database
from testing.database_isolation import DatabaseTestIsolation
from testing.test_data_factory import TestDataFactory
from models.user import User
from models.project import Project, ProjectStatus
from models.device_classification import DeviceClassification, DeviceClass
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.project_document import ProjectDocument
from sqlalchemy import select

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_test_data_factory():
    """Test test data factory functionality."""
    
    print("🏭 Testing Test Data Factory System")
    print("=" * 50)
    
    try:
        # Initialize database with test database
        test_db_url = "sqlite+aiosqlite:///:memory:"
        db_manager = await init_database(test_db_url)
        
        # Create tables
        await db_manager.create_tables()
        print("✅ Database initialized and tables created")
        
        # Create test isolation instance
        isolation = DatabaseTestIsolation(db_manager)
        
        # Test 1: Basic entity creation
        print("\n📋 Test 1: Basic Entity Creation")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create a user
            user = await factory.create_user()
            print(f"   Created user: {user.email} (ID: {user.id})")
            
            # Verify user was created
            result = await session.execute(select(User).where(User.id == user.id))
            found_user = result.scalar_one_or_none()
            
            if found_user and found_user.email == user.email:
                print("   ✅ PASS: User creation successful")
            else:
                print("   ❌ FAIL: User creation failed")
        
        # Test 2: Project creation with user relationship
        print("\n📋 Test 2: Project Creation with Relationships")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create user and project
            user = await factory.create_user(name="Project Test User")
            project = await factory.create_project(user=user, name="Test Project Alpha")
            
            print(f"   Created user: {user.name} (ID: {user.id})")
            print(f"   Created project: {project.name} (ID: {project.id}) for user {project.user_id}")
            
            # Verify relationship
            if project.user_id == user.id:
                print("   ✅ PASS: User-project relationship correct")
            else:
                print("   ❌ FAIL: User-project relationship incorrect")
        
        # Test 3: Device classification creation
        print("\n📋 Test 3: Device Classification Creation")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create project and classification
            project = await factory.create_project()
            classification = await factory.create_device_classification(project=project)
            
            print(f"   Created classification: {classification.device_class.value} (ID: {classification.id})")
            print(f"   Product code: {classification.product_code}")
            print(f"   Confidence score: {classification.confidence_score}")
            
            # Verify classification
            if classification.project_id == project.id and classification.device_class == DeviceClass.CLASS_II:
                print("   ✅ PASS: Device classification creation successful")
            else:
                print("   ❌ FAIL: Device classification creation failed")
        
        # Test 4: Predicate device creation
        print("\n📋 Test 4: Predicate Device Creation")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create project and predicate
            project = await factory.create_project()
            predicate = await factory.create_predicate_device(project=project)
            
            print(f"   Created predicate: {predicate.device_name} (K-number: {predicate.k_number})")
            print(f"   Confidence score: {predicate.confidence_score}")
            
            # Verify predicate
            if predicate.project_id == project.id and predicate.k_number.startswith('K'):
                print("   ✅ PASS: Predicate device creation successful")
            else:
                print("   ❌ FAIL: Predicate device creation failed")
        
        # Test 5: Agent interaction creation
        print("\n📋 Test 5: Agent Interaction Creation")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create project and interaction
            project = await factory.create_project()
            interaction = await factory.create_agent_interaction(project=project)
            
            print(f"   Created interaction: {interaction.agent_action} (ID: {interaction.id})")
            print(f"   Confidence score: {interaction.confidence_score}")
            
            # Verify interaction
            if (interaction.project_id == project.id and 
                interaction.user_id == project.user_id and
                interaction.input_data is not None):
                print("   ✅ PASS: Agent interaction creation successful")
            else:
                print("   ❌ FAIL: Agent interaction creation failed")
        
        # Test 6: Project document creation
        print("\n📋 Test 6: Project Document Creation")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create project and document
            project = await factory.create_project()
            document = await factory.create_project_document(project=project)
            
            print(f"   Created document: {document.filename} (ID: {document.id})")
            print(f"   Document type: {document.document_type}")
            
            # Verify document
            if (document.project_id == project.id and 
                document.filename.endswith('.pdf') and
                document.content_markdown is not None):
                print("   ✅ PASS: Project document creation successful")
            else:
                print("   ❌ FAIL: Project document creation failed")
        
        # Test 7: Complete project setup
        print("\n📋 Test 7: Complete Project Setup")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create complete setup
            setup = await factory.create_complete_project_setup(
                user_name="Complete Setup User",
                project_name="Complete Test Project"
            )
            
            print(f"   Created complete setup:")
            print(f"     User: {setup['user'].name} (ID: {setup['user'].id})")
            print(f"     Project: {setup['project'].name} (ID: {setup['project'].id})")
            print(f"     Classification: {setup['device_classification'].device_class.value} (ID: {setup['device_classification'].id})")
            print(f"     Predicate: {setup['predicate_device'].k_number} (ID: {setup['predicate_device'].id})")
            print(f"     Interaction: {setup['agent_interaction'].agent_action} (ID: {setup['agent_interaction'].id})")
            print(f"     Document: {setup['project_document'].filename} (ID: {setup['project_document'].id})")
            
            # Verify all relationships
            all_correct = (
                setup['project'].user_id == setup['user'].id and
                setup['device_classification'].project_id == setup['project'].id and
                setup['predicate_device'].project_id == setup['project'].id and
                setup['agent_interaction'].project_id == setup['project'].id and
                setup['agent_interaction'].user_id == setup['user'].id and
                setup['project_document'].project_id == setup['project'].id
            )
            
            if all_correct:
                print("   ✅ PASS: Complete project setup successful")
            else:
                print("   ❌ FAIL: Complete project setup relationships incorrect")
        
        # Test 8: Cleanup tracking
        print("\n📋 Test 8: Cleanup Tracking")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create some entities
            user1 = await factory.create_user(name="Cleanup Test User 1")
            user2 = await factory.create_user(name="Cleanup Test User 2")
            project1 = await factory.create_project(user=user1, name="Cleanup Test Project 1")
            project2 = await factory.create_project(user=user2, name="Cleanup Test Project 2")
            
            # Check tracking
            summary = factory.get_created_entities_summary()
            print(f"   Created entities summary: {summary}")
            
            expected_total = 4  # 2 users + 2 projects
            if summary['total_entities'] == expected_total:
                print("   ✅ PASS: Entity tracking working correctly")
            else:
                print(f"   ❌ FAIL: Expected {expected_total} entities, got {summary['total_entities']}")
            
            # Test cleanup
            print("   Performing cleanup...")
            await factory.cleanup_all()
            
            # Verify cleanup
            result = await session.execute(select(User))
            remaining_users = result.scalars().all()
            
            result = await session.execute(select(Project))
            remaining_projects = result.scalars().all()
            
            if len(remaining_users) == 0 and len(remaining_projects) == 0:
                print("   ✅ PASS: Cleanup successful - all entities removed")
            else:
                print(f"   ❌ FAIL: Cleanup failed - {len(remaining_users)} users and {len(remaining_projects)} projects remain")
        
        # Test 9: Custom attributes
        print("\n📋 Test 9: Custom Attributes")
        async with isolation.isolated_session() as session:
            factory = TestDataFactory(session)
            
            # Create entities with custom attributes
            user = await factory.create_user(
                name="Custom User",
                email="custom@example.com"
            )
            
            project = await factory.create_project(
                user=user,
                name="Custom Project",
                description="Custom description",
                device_type="Custom Device",
                status=ProjectStatus.IN_PROGRESS
            )
            
            print(f"   Created custom user: {user.name} ({user.email})")
            print(f"   Created custom project: {project.name} (Status: {project.status.value})")
            
            # Verify custom attributes
            if (user.name == "Custom User" and 
                user.email == "custom@example.com" and
                project.name == "Custom Project" and
                project.status == ProjectStatus.IN_PROGRESS):
                print("   ✅ PASS: Custom attributes working correctly")
            else:
                print("   ❌ FAIL: Custom attributes not applied correctly")
        
        print("\n🎉 Test Data Factory Tests Completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up
        try:
            await close_database()
            print("✅ Database connection closed")
        except Exception as e:
            print(f"⚠️  Warning: Error closing database: {e}")
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_test_data_factory())
    sys.exit(0 if success else 1)