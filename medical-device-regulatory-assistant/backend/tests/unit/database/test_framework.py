"""
Comprehensive mock data testing framework for the Medical Device Regulatory Assistant

This module provides utilities for:
- Generating mock project data for testing
- Database seeding for test environments
- Test data cleanup and isolation mechanisms
- Fixtures for common test scenarios and edge cases
"""

import asyncio
import logging
import json
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, Union, Callable, Type
from contextlib import asynccontextmanager
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import AsyncSession

from database.connection import get_database_manager
from database.seeder import EnhancedDatabaseSeeder
from .test_fixtures import (
    ProjectFixture, UserFixture, DatabaseFixture, TestScenarioFixture, EdgeCaseFixture,
    create_project_fixture, create_user_fixture, create_database_fixture,
    create_scenario_fixture, create_edge_case_fixture,
    COMMON_PROJECT_FIXTURES, ALL_USER_FIXTURES, COMMON_SCENARIOS, EDGE_CASE_SCENARIOS
)

logger = logging.getLogger(__name__)


class MockDataTestFramework:
    """
    Comprehensive testing framework for mock data generation and management
    """
    
    def __init__(self):
        self.active_fixtures: Dict[str, Any] = {}
        self.cleanup_callbacks: List[Callable] = []
        self.test_session_data: Dict[str, Any] = {}
        
    # Project Data Generation
    def generate_project_data(
        self,
        count: int = 1,
        complexity: str = "simple",
        include_related_data: bool = True,
        **overrides
    ) -> List[ProjectFixture]:
        """
        Generate mock project data for testing
        
        Args:
            count: Number of projects to generate
            complexity: Project complexity level (simple, moderate, complex, edge_case)
            include_related_data: Include classifications, predicates, interactions
            **overrides: Additional project data overrides
        """
        
        from .test_fixtures.project_fixtures import ProjectComplexity, create_multiple_project_fixtures
        
        complexity_map = {
            "simple": ProjectComplexity.SIMPLE,
            "moderate": ProjectComplexity.MODERATE,
            "complex": ProjectComplexity.COMPLEX,
            "edge_case": ProjectComplexity.EDGE_CASE
        }
        
        complexity_enum = complexity_map.get(complexity, ProjectComplexity.SIMPLE)
        
        if count == 1:
            fixture = create_project_fixture(
                complexity=complexity_enum,
                **overrides
            )
            return [fixture]
        else:
            return create_multiple_project_fixtures(
                count=count,
                complexity_distribution={complexity_enum: count}
            )
    
    def generate_user_data(
        self,
        count: int = 1,
        role: str = "user",
        scenario: str = "active_user",
        **overrides
    ) -> List[UserFixture]:
        """
        Generate mock user data for testing
        
        Args:
            count: Number of users to generate
            role: User role (admin, user, viewer, guest)
            scenario: User scenario (new_user, active_user, power_user, etc.)
            **overrides: Additional user data overrides
        """
        
        from .test_fixtures.user_fixtures import UserRole, UserScenario, create_multiple_user_fixtures
        
        role_map = {
            "admin": UserRole.ADMIN,
            "user": UserRole.USER,
            "viewer": UserRole.VIEWER,
            "guest": UserRole.GUEST
        }
        
        scenario_map = {
            "new_user": UserScenario.NEW_USER,
            "active_user": UserScenario.ACTIVE_USER,
            "inactive_user": UserScenario.INACTIVE_USER,
            "power_user": UserScenario.POWER_USER,
            "edge_case_user": UserScenario.EDGE_CASE_USER
        }
        
        role_enum = role_map.get(role, UserRole.USER)
        scenario_enum = scenario_map.get(scenario, UserScenario.ACTIVE_USER)
        
        if count == 1:
            fixture = create_user_fixture(
                role=role_enum,
                scenario=scenario_enum,
                **overrides
            )
            return [fixture]
        else:
            return create_multiple_user_fixtures(
                count=count,
                role_distribution={role_enum: count},
                scenario_distribution={scenario_enum: count}
            )
    
    # Database Seeding
    async def seed_test_database(
        self,
        database_name: str = "test_db",
        users: Optional[List[UserFixture]] = None,
        projects: Optional[List[ProjectFixture]] = None,
        clear_existing: bool = True,
        use_json_config: bool = False,
        config_path: Optional[str] = None
    ) -> DatabaseFixture:
        """
        Seed test database with mock data
        
        Args:
            database_name: Name for the test database
            users: User fixtures to seed
            projects: Project fixtures to seed
            clear_existing: Clear existing data before seeding
            use_json_config: Use JSON configuration file for seeding
            config_path: Path to JSON configuration file
        """
        
        # Create database fixture
        db_fixture = await create_database_fixture(
            fixture_name=database_name,
            seed_data=False
        )
        
        if use_json_config:
            # Use enhanced seeder with JSON configuration
            seeder = EnhancedDatabaseSeeder(config_path)
            await seeder.seed_all(clear_existing=clear_existing)
        else:
            # Use fixture-based seeding
            if users is None:
                users = self.generate_user_data(count=3)
            
            if projects is None:
                projects = self.generate_project_data(count=5)
            
            # Seed database with fixtures
            from .test_fixtures.database_fixtures import _fixture_manager
            await _fixture_manager.seed_fixture(
                db_fixture,
                custom_users=users,
                custom_projects=projects
            )
        
        # Register for cleanup
        self.active_fixtures[database_name] = db_fixture
        self.cleanup_callbacks.append(lambda: self._cleanup_database(database_name))
        
        return db_fixture
    
    async def _cleanup_database(self, database_name: str) -> None:
        """Clean up test database"""
        fixture = self.active_fixtures.get(database_name)
        if fixture and hasattr(fixture, 'manager'):
            await fixture.manager.close()
            del self.active_fixtures[database_name]
    
    # Test Data Cleanup and Isolation
    async def create_isolated_test_environment(
        self,
        test_name: str,
        include_database: bool = True,
        include_users: bool = True,
        include_projects: bool = True
    ) -> Dict[str, Any]:
        """
        Create an isolated test environment with cleanup
        
        Args:
            test_name: Unique name for the test environment
            include_database: Create isolated database
            include_users: Include user fixtures
            include_projects: Include project fixtures
        """
        
        environment = {
            "test_name": test_name,
            "created_at": datetime.now(timezone.utc),
            "components": {}
        }
        
        if include_database:
            db_fixture = await self.seed_test_database(
                database_name=f"test_{test_name}",
                users=self.generate_user_data(count=2) if include_users else None,
                projects=self.generate_project_data(count=3) if include_projects else None
            )
            environment["components"]["database"] = db_fixture
        
        # Store environment for cleanup
        self.test_session_data[test_name] = environment
        
        return environment
    
    async def cleanup_test_environment(self, test_name: str) -> None:
        """Clean up isolated test environment"""
        environment = self.test_session_data.get(test_name)
        if not environment:
            return
        
        # Clean up database
        if "database" in environment["components"]:
            await self._cleanup_database(f"test_{test_name}")
        
        # Remove from session data
        del self.test_session_data[test_name]
    
    async def cleanup_all_test_environments(self) -> None:
        """Clean up all active test environments"""
        for callback in self.cleanup_callbacks:
            try:
                await callback()
            except Exception as e:
                logger.error(f"Error during cleanup: {e}")
        
        self.active_fixtures.clear()
        self.cleanup_callbacks.clear()
        self.test_session_data.clear()
    
    # Fixture Management
    def get_common_fixtures(self, fixture_type: str) -> List[Any]:
        """
        Get predefined common fixtures
        
        Args:
            fixture_type: Type of fixtures (projects, users, scenarios, edge_cases)
        """
        
        fixture_map = {
            "projects": COMMON_PROJECT_FIXTURES,
            "users": ALL_USER_FIXTURES,
            "scenarios": list(COMMON_SCENARIOS.keys()),
            "edge_cases": EDGE_CASE_SCENARIOS
        }
        
        return fixture_map.get(fixture_type, [])
    
    async def create_scenario_test_data(
        self,
        scenario_name: str,
        **kwargs
    ) -> TestScenarioFixture:
        """
        Create test data for a specific scenario
        
        Args:
            scenario_name: Name of the scenario
            **kwargs: Additional scenario configuration
        """
        
        if scenario_name in COMMON_SCENARIOS:
            scenario_creator = COMMON_SCENARIOS[scenario_name]
            return await scenario_creator()
        else:
            raise ValueError(f"Unknown scenario: {scenario_name}")
    
    def create_edge_case_test_data(
        self,
        category: str,
        severity: str = "all"
    ) -> List[EdgeCaseFixture]:
        """
        Create edge case test data
        
        Args:
            category: Edge case category
            severity: Severity filter (low, medium, high, critical, all)
        """
        
        from .test_fixtures.edge_case_fixtures import EdgeCaseCategory
        
        category_map = {
            "data_validation": EdgeCaseCategory.DATA_VALIDATION,
            "boundary_conditions": EdgeCaseCategory.BOUNDARY_CONDITIONS,
            "unicode_handling": EdgeCaseCategory.UNICODE_HANDLING,
            "security_injection": EdgeCaseCategory.SECURITY_INJECTION,
            "malformed_data": EdgeCaseCategory.MALFORMED_DATA,
            "extreme_values": EdgeCaseCategory.EXTREME_VALUES,
            "concurrent_access": EdgeCaseCategory.CONCURRENT_ACCESS,
            "resource_exhaustion": EdgeCaseCategory.RESOURCE_EXHAUSTION
        }
        
        if category == "all":
            all_fixtures = []
            for fixtures in EDGE_CASE_SCENARIOS.values():
                all_fixtures.extend(fixtures)
            edge_cases = all_fixtures
        else:
            category_enum = category_map.get(category)
            if not category_enum:
                raise ValueError(f"Unknown edge case category: {category}")
            edge_cases = EDGE_CASE_SCENARIOS.get(category_enum, [])
        
        # Filter by severity
        if severity != "all":
            edge_cases = [case for case in edge_cases if case.severity == severity]
        
        return edge_cases
    
    # Test Utilities
    def validate_test_data(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate test data structure and content
        
        Args:
            data: Test data to validate
            
        Returns:
            Validation results with errors and warnings
        """
        
        results = {
            "valid": True,
            "errors": [],
            "warnings": [],
            "suggestions": []
        }
        
        # Basic structure validation
        if not isinstance(data, dict):
            results["valid"] = False
            results["errors"].append("Test data must be a dictionary")
            return results
        
        # Check for required fields based on data type
        if "projects" in data:
            for i, project in enumerate(data["projects"]):
                if not project.get("name"):
                    results["errors"].append(f"Project {i} missing required 'name' field")
                if not project.get("user_email"):
                    results["errors"].append(f"Project {i} missing required 'user_email' field")
        
        if "users" in data:
            for i, user in enumerate(data["users"]):
                if not user.get("email"):
                    results["errors"].append(f"User {i} missing required 'email' field")
                if not user.get("google_id"):
                    results["errors"].append(f"User {i} missing required 'google_id' field")
        
        # Check referential integrity
        if "projects" in data and "users" in data:
            user_emails = {user["email"] for user in data["users"]}
            for i, project in enumerate(data["projects"]):
                if project.get("user_email") not in user_emails:
                    results["errors"].append(
                        f"Project {i} references non-existent user: {project.get('user_email')}"
                    )
        
        # Set overall validity
        results["valid"] = len(results["errors"]) == 0
        
        return results
    
    def generate_test_report(
        self,
        test_results: Dict[str, Any],
        output_path: Optional[str] = None
    ) -> str:
        """
        Generate comprehensive test report
        
        Args:
            test_results: Test execution results
            output_path: Optional path to save report
            
        Returns:
            Report content as string
        """
        
        report_lines = [
            "# Mock Data Testing Framework Report",
            f"Generated: {datetime.now(timezone.utc).isoformat()}",
            "",
            "## Test Summary",
            f"- Total Tests: {test_results.get('total_tests', 0)}",
            f"- Passed: {test_results.get('passed', 0)}",
            f"- Failed: {test_results.get('failed', 0)}",
            f"- Skipped: {test_results.get('skipped', 0)}",
            f"- Success Rate: {test_results.get('success_rate', 0):.2%}",
            ""
        ]
        
        # Add detailed results
        if "test_details" in test_results:
            report_lines.extend([
                "## Test Details",
                ""
            ])
            
            for test_name, details in test_results["test_details"].items():
                status = "✅ PASSED" if details.get("passed") else "❌ FAILED"
                report_lines.extend([
                    f"### {test_name} - {status}",
                    f"Duration: {details.get('duration', 0):.2f}s",
                    ""
                ])
                
                if details.get("errors"):
                    report_lines.extend([
                        "**Errors:**",
                        ""
                    ])
                    for error in details["errors"]:
                        report_lines.append(f"- {error}")
                    report_lines.append("")
        
        # Add recommendations
        if "recommendations" in test_results:
            report_lines.extend([
                "## Recommendations",
                ""
            ])
            for rec in test_results["recommendations"]:
                report_lines.append(f"- {rec}")
        
        report_content = "\n".join(report_lines)
        
        # Save to file if path provided
        if output_path:
            Path(output_path).write_text(report_content)
        
        return report_content


# Global framework instance
mock_data_framework = MockDataTestFramework()


# Pytest fixtures for easy integration
@pytest_asyncio.fixture
async def test_framework():
    """Pytest fixture for mock data testing framework"""
    yield mock_data_framework
    await mock_data_framework.cleanup_all_test_environments()


@pytest_asyncio.fixture
async def isolated_test_db():
    """Pytest fixture for isolated test database"""
    db_fixture = await mock_data_framework.seed_test_database(
        database_name="pytest_isolated_db"
    )
    yield db_fixture
    await mock_data_framework._cleanup_database("pytest_isolated_db")


@pytest_asyncio.fixture
async def sample_project_data():
    """Pytest fixture for sample project data"""
    return mock_data_framework.generate_project_data(count=3, complexity="moderate")


@pytest_asyncio.fixture
async def sample_user_data():
    """Pytest fixture for sample user data"""
    return mock_data_framework.generate_user_data(count=3, role="user")


@pytest_asyncio.fixture
async def edge_case_data():
    """Pytest fixture for edge case test data"""
    return mock_data_framework.create_edge_case_test_data("all", "high")


# Context managers for test isolation
@asynccontextmanager
async def isolated_test_environment(test_name: str, **kwargs):
    """Context manager for isolated test environment"""
    environment = await mock_data_framework.create_isolated_test_environment(
        test_name, **kwargs
    )
    try:
        yield environment
    finally:
        await mock_data_framework.cleanup_test_environment(test_name)


@asynccontextmanager
async def test_database_session(database_name: str = "test_session_db"):
    """Context manager for test database session"""
    from .test_fixtures.database_fixtures import database_fixture_session
    
    # Create database if it doesn't exist
    if database_name not in mock_data_framework.active_fixtures:
        await mock_data_framework.seed_test_database(database_name)
    
    async with database_fixture_session(database_name) as session:
        yield session


# Utility functions
def create_test_project(**kwargs) -> ProjectFixture:
    """Convenience function to create a test project fixture"""
    return create_project_fixture(**kwargs)


def create_test_user(**kwargs) -> UserFixture:
    """Convenience function to create a test user fixture"""
    return create_user_fixture(**kwargs)


async def create_test_scenario(scenario_name: str, **kwargs) -> TestScenarioFixture:
    """Convenience function to create a test scenario fixture"""
    return await mock_data_framework.create_scenario_test_data(scenario_name, **kwargs)


# Export main components
__all__ = [
    'MockDataTestFramework',
    'mock_data_framework',
    'test_framework',
    'isolated_test_db',
    'sample_project_data',
    'sample_user_data',
    'edge_case_data',
    'isolated_test_environment',
    'test_database_session',
    'create_test_project',
    'create_test_user',
    'create_test_scenario'
]