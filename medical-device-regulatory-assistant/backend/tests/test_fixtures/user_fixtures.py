"""
User-specific test fixtures for mock data testing framework
"""

from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from dataclasses import dataclass, field
from enum import Enum

from models.user import User


class UserRole(Enum):
    """User roles for testing"""
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"
    GUEST = "guest"


class UserScenario(Enum):
    """User scenarios for testing"""
    NEW_USER = "new_user"
    ACTIVE_USER = "active_user"
    INACTIVE_USER = "inactive_user"
    POWER_USER = "power_user"
    EDGE_CASE_USER = "edge_case_user"


@dataclass
class UserFixture:
    """Comprehensive user fixture for testing"""
    
    # Core user data
    user: User
    
    # Metadata
    role: UserRole = UserRole.USER
    scenario: UserScenario = UserScenario.ACTIVE_USER
    description: str = ""
    tags: List[str] = field(default_factory=list)
    
    # Test configuration
    should_fail_validation: bool = False
    expected_errors: List[str] = field(default_factory=list)
    test_assertions: Dict[str, Any] = field(default_factory=dict)
    
    # Additional test data
    session_data: Optional[Dict[str, Any]] = None
    permissions: List[str] = field(default_factory=list)
    preferences: Dict[str, Any] = field(default_factory=dict)


def create_user_fixture(
    email: str = "test@example.com",
    name: Optional[str] = None,
    role: UserRole = UserRole.USER,
    scenario: UserScenario = UserScenario.ACTIVE_USER,
    **overrides
) -> UserFixture:
    """
    Create a user fixture with specified characteristics
    
    Args:
        email: User email address
        name: User display name (auto-generated if None)
        role: User role for permissions testing
        scenario: User scenario for behavior testing
        **overrides: Additional overrides for user data
    """
    
    # Generate name if not provided
    if name is None:
        name = email.split('@')[0].replace('.', ' ').replace('_', ' ').title()
    
    # Generate Google ID based on email
    google_id = f"google_{abs(hash(email)) % 1000000000}"
    
    # Base user data
    user_data = {
        "google_id": google_id,
        "email": email,
        "name": name,
        **overrides
    }
    
    # Adjust based on scenario
    if scenario == UserScenario.NEW_USER:
        user_data.update({
            "name": f"New User {name}"
        })
    
    elif scenario == UserScenario.POWER_USER:
        user_data.update({
            "name": f"Power User {name}"
        })
    
    elif scenario == UserScenario.EDGE_CASE_USER:
        user_data.update({
            "name": "Test User with Special Chars: <>&\"' 测试用户 🧪",
            "email": "edge.case+test@example-domain.co.uk",
            "google_id": "google_edge_case_123456789"
        })
    
    # Create user
    user = User(**user_data)
    
    # Create fixture
    fixture = UserFixture(
        user=user,
        role=role,
        scenario=scenario,
        description=f"Test fixture for {scenario.value} user with {role.value} role",
        tags=[scenario.value, role.value, "user", "fixture"]
    )
    
    # Set permissions based on role
    if role == UserRole.ADMIN:
        fixture.permissions = [
            "create_project", "read_project", "update_project", "delete_project",
            "manage_users", "view_audit_logs", "export_data", "system_admin"
        ]
    elif role == UserRole.USER:
        fixture.permissions = [
            "create_project", "read_project", "update_project", "delete_own_project",
            "export_own_data"
        ]
    elif role == UserRole.VIEWER:
        fixture.permissions = ["read_project", "view_own_data"]
    elif role == UserRole.GUEST:
        fixture.permissions = ["read_public_data"]
    
    # Set preferences based on scenario
    if scenario == UserScenario.POWER_USER:
        fixture.preferences = {
            "theme": "dark",
            "notifications": True,
            "advanced_features": True,
            "keyboard_shortcuts": True,
            "auto_save": True
        }
    elif scenario == UserScenario.NEW_USER:
        fixture.preferences = {
            "theme": "light",
            "notifications": True,
            "advanced_features": False,
            "show_onboarding": True,
            "tutorial_completed": False
        }
    else:
        fixture.preferences = {
            "theme": "light",
            "notifications": True,
            "advanced_features": False,
            "auto_save": False
        }
    
    # Set session data
    fixture.session_data = {
        "login_time": datetime.now(timezone.utc).isoformat(),
        "last_activity": datetime.now(timezone.utc).isoformat(),
        "session_duration": 3600,  # 1 hour
        "ip_address": "192.168.1.100",
        "user_agent": "Mozilla/5.0 (Test Browser)"
    }
    
    return fixture


def create_multiple_user_fixtures(
    count: int = 3,
    role_distribution: Optional[Dict[UserRole, int]] = None,
    scenario_distribution: Optional[Dict[UserScenario, int]] = None
) -> List[UserFixture]:
    """
    Create multiple user fixtures with specified distributions
    
    Args:
        count: Total number of fixtures to create
        role_distribution: Distribution of user roles
        scenario_distribution: Distribution of user scenarios
    """
    
    if role_distribution is None:
        role_distribution = {
            UserRole.ADMIN: 1,
            UserRole.USER: count - 2,
            UserRole.VIEWER: 1
        }
    
    if scenario_distribution is None:
        scenario_distribution = {
            UserScenario.NEW_USER: 1,
            UserScenario.ACTIVE_USER: count - 2,
            UserScenario.POWER_USER: 1
        }
    
    fixtures = []
    fixture_id = 1
    
    # Create fixtures based on role distribution
    for role, role_count in role_distribution.items():
        for i in range(role_count):
            # Select scenario (cycle through available scenarios)
            scenarios = list(scenario_distribution.keys())
            scenario = scenarios[fixture_id % len(scenarios)]
            
            email = f"testuser{fixture_id}@example.com"
            name = f"Test User {fixture_id}"
            
            fixture = create_user_fixture(
                email=email,
                name=name,
                role=role,
                scenario=scenario
            )
            
            fixtures.append(fixture)
            fixture_id += 1
    
    return fixtures


def create_user_with_projects_fixture(
    user_email: str = "user.with.projects@example.com",
    project_count: int = 3
) -> UserFixture:
    """
    Create a user fixture that's designed to have multiple projects
    
    Args:
        user_email: Email for the user
        project_count: Number of projects this user should have
    """
    
    fixture = create_user_fixture(
        email=user_email,
        name="User With Projects",
        role=UserRole.USER,
        scenario=UserScenario.ACTIVE_USER
    )
    
    # Add metadata about expected projects
    fixture.test_assertions = {
        "expected_project_count": project_count,
        "should_have_projects": True,
        "can_create_projects": True
    }
    
    fixture.tags.append("has_projects")
    fixture.description += f" (expected to have {project_count} projects)"
    
    return fixture


# Predefined user fixtures for common scenarios
ADMIN_USER_FIXTURE = create_user_fixture(
    email="admin@example.com",
    name="Admin User",
    role=UserRole.ADMIN,
    scenario=UserScenario.POWER_USER
)

REGULAR_USER_FIXTURE = create_user_fixture(
    email="user@example.com",
    name="Regular User",
    role=UserRole.USER,
    scenario=UserScenario.ACTIVE_USER
)

VIEWER_USER_FIXTURE = create_user_fixture(
    email="viewer@example.com",
    name="Viewer User",
    role=UserRole.VIEWER,
    scenario=UserScenario.ACTIVE_USER
)

NEW_USER_FIXTURE = create_user_fixture(
    email="newuser@example.com",
    name="New User",
    role=UserRole.USER,
    scenario=UserScenario.NEW_USER
)

POWER_USER_FIXTURE = create_user_fixture(
    email="poweruser@example.com",
    name="Power User",
    role=UserRole.USER,
    scenario=UserScenario.POWER_USER
)

EDGE_CASE_USER_FIXTURE = create_user_fixture(
    email="edge.case@example.com",
    role=UserRole.USER,
    scenario=UserScenario.EDGE_CASE_USER
)

# User fixture sets
BASIC_USER_FIXTURES = [
    ADMIN_USER_FIXTURE,
    REGULAR_USER_FIXTURE,
    VIEWER_USER_FIXTURE
]

ALL_USER_FIXTURES = [
    ADMIN_USER_FIXTURE,
    REGULAR_USER_FIXTURE,
    VIEWER_USER_FIXTURE,
    NEW_USER_FIXTURE,
    POWER_USER_FIXTURE,
    EDGE_CASE_USER_FIXTURE
]

# Role-based fixture sets
ADMIN_FIXTURES = [ADMIN_USER_FIXTURE]
USER_FIXTURES = [REGULAR_USER_FIXTURE, NEW_USER_FIXTURE, POWER_USER_FIXTURE]
VIEWER_FIXTURES = [VIEWER_USER_FIXTURE]