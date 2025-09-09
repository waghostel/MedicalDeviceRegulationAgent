"""
Project-specific test fixtures for mock data testing framework
"""

import json
import asyncio
from datetime import datetime, timezone, date
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum

from models.project import Project, ProjectStatus
from models.device_classification import DeviceClassification, DeviceClass, RegulatoryPathway
from models.predicate_device import PredicateDevice
from models.agent_interaction import AgentInteraction
from models.user import User


class ProjectComplexity(Enum):
    """Project complexity levels for testing"""
    SIMPLE = "simple"
    MODERATE = "moderate"
    COMPLEX = "complex"
    EDGE_CASE = "edge_case"


@dataclass
class ProjectFixture:
    """Comprehensive project fixture for testing"""
    
    # Core project data
    project: Project
    user: User
    
    # Related data
    classifications: List[DeviceClassification] = field(default_factory=list)
    predicate_devices: List[PredicateDevice] = field(default_factory=list)
    agent_interactions: List[AgentInteraction] = field(default_factory=list)
    
    # Metadata
    complexity: ProjectComplexity = ProjectComplexity.SIMPLE
    scenario_name: str = "default"
    description: str = ""
    tags: List[str] = field(default_factory=list)
    
    # Test configuration
    should_fail_validation: bool = False
    expected_errors: List[str] = field(default_factory=list)
    test_assertions: Dict[str, Any] = field(default_factory=dict)


def create_project_fixture(
    name: str = "Test Medical Device",
    complexity: ProjectComplexity = ProjectComplexity.SIMPLE,
    status: ProjectStatus = ProjectStatus.DRAFT,
    user_email: str = "test@example.com",
    **overrides
) -> ProjectFixture:
    """
    Create a project fixture with specified complexity and characteristics
    
    Args:
        name: Project name
        complexity: Complexity level for testing
        status: Project status
        user_email: User email for the project owner
        **overrides: Additional overrides for project data
    """
    
    # Create user
    user = User(
        google_id=f"google_{hash(user_email) % 1000000}",
        email=user_email,
        name=user_email.split('@')[0].replace('.', ' ').title()
    )
    
    # Base project data
    project_data = {
        "name": name,
        "description": f"Test medical device project: {name}",
        "device_type": "Medical Device",
        "intended_use": "For testing purposes in medical device development",
        "status": status,
        "priority": "medium",
        "tags": json.dumps(["test", "medical-device"]),
        **overrides
    }
    
    # Adjust based on complexity
    if complexity == ProjectComplexity.SIMPLE:
        project_data.update({
            "device_type": "Class I Medical Device",
            "description": "Simple medical device for basic testing scenarios",
            "tags": json.dumps(["test", "simple", "class-i"])
        })
    
    elif complexity == ProjectComplexity.MODERATE:
        project_data.update({
            "device_type": "Class II Cardiac Monitor",
            "description": "Moderate complexity cardiac monitoring device with wireless capabilities",
            "intended_use": "For continuous monitoring of cardiac rhythm in ambulatory patients",
            "tags": json.dumps(["test", "moderate", "cardiac", "class-ii"])
        })
    
    elif complexity == ProjectComplexity.COMPLEX:
        project_data.update({
            "device_type": "Class III Implantable Cardioverter Defibrillator",
            "description": "Complex implantable device with advanced AI-powered arrhythmia detection and therapeutic intervention capabilities",
            "intended_use": "For detection and treatment of life-threatening arrhythmias in high-risk cardiac patients",
            "priority": "high",
            "tags": json.dumps(["test", "complex", "implantable", "class-iii", "ai"])
        })
    
    elif complexity == ProjectComplexity.EDGE_CASE:
        project_data.update({
            "name": "Test Device with Special Characters: <>&\"'",
            "description": "Edge case device with unicode: 测试设备 🏥 and special chars",
            "device_type": "Novel AI/ML Software as Medical Device (SaMD)",
            "intended_use": "For testing edge cases in data validation and processing systems",
            "tags": json.dumps(["test", "edge-case", "unicode", "special-chars", "ai-ml"])
        })
    
    # Create project
    project = Project(
        user_id=user.id,
        **project_data
    )
    
    # Create fixture
    fixture = ProjectFixture(
        project=project,
        user=user,
        complexity=complexity,
        scenario_name=f"{complexity.value}_{name.lower().replace(' ', '_')}",
        description=f"Test fixture for {complexity.value} project: {name}",
        tags=[complexity.value, "project", "fixture"]
    )
    
    # Add related data based on complexity
    if complexity in [ProjectComplexity.MODERATE, ProjectComplexity.COMPLEX]:
        fixture.classifications = _create_classifications_for_project(project, complexity)
        fixture.predicate_devices = _create_predicates_for_project(project, complexity)
        fixture.agent_interactions = _create_interactions_for_project(project, user, complexity)
    
    return fixture


def _create_classifications_for_project(
    project: Project, 
    complexity: ProjectComplexity
) -> List[DeviceClassification]:
    """Create device classifications based on project complexity"""
    
    classifications = []
    
    if complexity == ProjectComplexity.MODERATE:
        classification = DeviceClassification(
            project_id=project.id,
            device_class=DeviceClass.CLASS_II,
            product_code="DPS",
            regulatory_pathway=RegulatoryPathway.FIVE_TEN_K,
            cfr_sections=["21 CFR 870.2300"],
            confidence_score=0.87,
            reasoning="Device classified as Class II cardiac monitor based on intended use",
            sources=[]
        )
        classifications.append(classification)
    
    elif complexity == ProjectComplexity.COMPLEX:
        classification = DeviceClassification(
            project_id=project.id,
            device_class=DeviceClass.CLASS_III,
            product_code="MKJ",
            regulatory_pathway=RegulatoryPathway.PMA,
            cfr_sections=["21 CFR 870.3610"],
            confidence_score=0.95,
            reasoning="Device classified as Class III implantable cardioverter defibrillator requiring PMA",
            sources=[]
        )
        classifications.append(classification)
    
    return classifications


def _create_predicates_for_project(
    project: Project, 
    complexity: ProjectComplexity
) -> List[PredicateDevice]:
    """Create predicate devices based on project complexity"""
    
    predicates = []
    
    if complexity == ProjectComplexity.MODERATE:
        predicate = PredicateDevice(
            project_id=project.id,
            k_number="K193456",
            device_name="CardioWatch Pro",
            intended_use="Continuous cardiac rhythm monitoring",
            product_code="DPS",
            clearance_date=date(2019, 8, 15),
            confidence_score=0.89,
            is_selected=True,
            comparison_data={
                "similarities": ["Similar intended use", "Same product code"],
                "differences": ["Enhanced AI features", "Improved battery life"],
                "risk_assessment": "low",
                "testing_recommendations": ["Software validation", "Clinical evaluation"]
            }
        )
        predicates.append(predicate)
    
    elif complexity == ProjectComplexity.COMPLEX:
        # Multiple predicates for complex devices
        predicate1 = PredicateDevice(
            project_id=project.id,
            k_number="P050016",
            device_name="Advanced ICD System",
            intended_use="Treatment of life-threatening arrhythmias",
            product_code="MKJ",
            clearance_date=date(2018, 12, 3),
            confidence_score=0.92,
            is_selected=True,
            comparison_data={
                "similarities": ["Implantable design", "Arrhythmia detection", "Therapeutic intervention"],
                "differences": ["AI-powered detection", "Advanced algorithms", "Enhanced connectivity"],
                "risk_assessment": "high",
                "testing_recommendations": [
                    "Extensive clinical trials",
                    "Software validation",
                    "Biocompatibility testing",
                    "Electromagnetic compatibility"
                ]
            }
        )
        
        predicate2 = PredicateDevice(
            project_id=project.id,
            k_number="P040012",
            device_name="Smart Defibrillator",
            intended_use="Automated defibrillation therapy",
            product_code="MKJ",
            clearance_date=date(2017, 6, 20),
            confidence_score=0.85,
            is_selected=False,
            comparison_data={
                "similarities": ["Defibrillation capability", "Implantable"],
                "differences": ["Different detection algorithms", "No AI features"],
                "risk_assessment": "medium",
                "testing_recommendations": ["Comparative clinical study", "Algorithm validation"]
            }
        )
        
        predicates.extend([predicate1, predicate2])
    
    return predicates


def _create_interactions_for_project(
    project: Project, 
    user: User, 
    complexity: ProjectComplexity
) -> List[AgentInteraction]:
    """Create agent interactions based on project complexity"""
    
    interactions = []
    
    base_interaction = AgentInteraction(
        project_id=project.id,
        user_id=user.id,
        agent_action="device_classification",
        input_data={
            "device_description": project.description,
            "intended_use": project.intended_use
        },
        output_data={
            "device_class": "II" if complexity == ProjectComplexity.MODERATE else "III",
            "product_code": "DPS" if complexity == ProjectComplexity.MODERATE else "MKJ",
            "regulatory_pathway": "510k" if complexity == ProjectComplexity.MODERATE else "PMA"
        },
        confidence_score=0.87 if complexity == ProjectComplexity.MODERATE else 0.95,
        reasoning=f"Device classified based on {complexity.value} analysis of intended use and risk profile",
        sources=[],
        execution_time_ms=2500
    )
    interactions.append(base_interaction)
    
    if complexity == ProjectComplexity.COMPLEX:
        # Add predicate search interaction
        predicate_interaction = AgentInteraction(
            project_id=project.id,
            user_id=user.id,
            agent_action="predicate_search",
            input_data={
                "device_type": project.device_type,
                "product_code": "MKJ"
            },
            output_data={
                "predicates_found": 5,
                "top_matches": ["P050016", "P040012"],
                "search_criteria": "product_code:MKJ AND device_class:III"
            },
            confidence_score=0.82,
            reasoning="Found multiple suitable predicate devices for Class III implantable devices",
            sources=[],
            execution_time_ms=4200
        )
        interactions.append(predicate_interaction)
    
    return interactions


def create_multiple_project_fixtures(
    count: int = 3,
    complexity_distribution: Optional[Dict[ProjectComplexity, int]] = None
) -> List[ProjectFixture]:
    """
    Create multiple project fixtures with specified distribution
    
    Args:
        count: Total number of fixtures to create
        complexity_distribution: Distribution of complexity levels
    """
    
    if complexity_distribution is None:
        complexity_distribution = {
            ProjectComplexity.SIMPLE: count // 3,
            ProjectComplexity.MODERATE: count // 3,
            ProjectComplexity.COMPLEX: count - (2 * (count // 3))
        }
    
    fixtures = []
    fixture_id = 1
    
    for complexity, complexity_count in complexity_distribution.items():
        for i in range(complexity_count):
            name = f"Test Device {fixture_id}"
            user_email = f"testuser{fixture_id}@example.com"
            
            fixture = create_project_fixture(
                name=name,
                complexity=complexity,
                user_email=user_email
            )
            
            fixtures.append(fixture)
            fixture_id += 1
    
    return fixtures


# Predefined project fixtures for common scenarios
CARDIAC_MONITOR_FIXTURE = create_project_fixture(
    name="Cardiac Monitoring Device",
    complexity=ProjectComplexity.MODERATE,
    status=ProjectStatus.IN_PROGRESS,
    device_type="Cardiac Monitor",
    intended_use="For continuous monitoring of cardiac rhythm in ambulatory patients",
    priority="high"
)

GLUCOSE_METER_FIXTURE = create_project_fixture(
    name="Blood Glucose Meter",
    complexity=ProjectComplexity.SIMPLE,
    status=ProjectStatus.DRAFT,
    device_type="Glucose Meter",
    intended_use="For quantitative measurement of glucose in capillary blood",
    priority="medium"
)

IMPLANTABLE_DEVICE_FIXTURE = create_project_fixture(
    name="Implantable Cardioverter Defibrillator",
    complexity=ProjectComplexity.COMPLEX,
    status=ProjectStatus.IN_PROGRESS,
    device_type="Implantable Cardioverter Defibrillator",
    intended_use="For detection and treatment of life-threatening arrhythmias",
    priority="high"
)

EDGE_CASE_FIXTURE = create_project_fixture(
    name="Edge Case Test Device",
    complexity=ProjectComplexity.EDGE_CASE,
    status=ProjectStatus.DRAFT,
    user_email="edge.case@test.com"
)

# Common fixture sets
COMMON_PROJECT_FIXTURES = [
    CARDIAC_MONITOR_FIXTURE,
    GLUCOSE_METER_FIXTURE,
    IMPLANTABLE_DEVICE_FIXTURE
]

ALL_PROJECT_FIXTURES = [
    CARDIAC_MONITOR_FIXTURE,
    GLUCOSE_METER_FIXTURE,
    IMPLANTABLE_DEVICE_FIXTURE,
    EDGE_CASE_FIXTURE
]