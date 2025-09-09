"""
Edge case test fixtures for comprehensive boundary and error testing
"""

import json
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, Any, List, Optional, Union
from dataclasses import dataclass, field
from enum import Enum

from models.project import Project, ProjectStatus
from models.user import User
from .project_fixtures import ProjectFixture, ProjectComplexity
from .user_fixtures import UserFixture, UserRole, UserScenario


class EdgeCaseCategory(Enum):
    """Categories of edge cases for testing"""
    DATA_VALIDATION = "data_validation"
    BOUNDARY_CONDITIONS = "boundary_conditions"
    UNICODE_HANDLING = "unicode_handling"
    SECURITY_INJECTION = "security_injection"
    MALFORMED_DATA = "malformed_data"
    EXTREME_VALUES = "extreme_values"
    CONCURRENT_ACCESS = "concurrent_access"
    RESOURCE_EXHAUSTION = "resource_exhaustion"


@dataclass
class EdgeCaseFixture:
    """Edge case test fixture with expected behaviors"""
    
    # Core data
    category: EdgeCaseCategory
    name: str
    description: str
    
    # Test data
    input_data: Dict[str, Any]
    expected_behavior: str  # "accept", "reject", "sanitize", "error"
    expected_errors: List[str] = field(default_factory=list)
    expected_warnings: List[str] = field(default_factory=list)
    
    # Test configuration
    should_pass_validation: bool = False
    should_trigger_security_alert: bool = False
    should_cause_performance_issue: bool = False
    
    # Metadata
    severity: str = "medium"  # low, medium, high, critical
    tags: List[str] = field(default_factory=list)
    test_assertions: Dict[str, Any] = field(default_factory=dict)


def create_edge_case_fixture(
    category: EdgeCaseCategory,
    name: str,
    description: str,
    input_data: Dict[str, Any],
    expected_behavior: str,
    **kwargs
) -> EdgeCaseFixture:
    """Create an edge case fixture with specified characteristics"""
    
    fixture = EdgeCaseFixture(
        category=category,
        name=name,
        description=description,
        input_data=input_data,
        expected_behavior=expected_behavior,
        tags=[category.value, "edge_case", "fixture"],
        **kwargs
    )
    
    return fixture


# Data validation edge cases
def create_data_validation_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for data validation testing"""
    
    edge_cases = []
    
    # Empty and null values
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.DATA_VALIDATION,
        name="Empty Project Name",
        description="Test project creation with empty name",
        input_data={
            "name": "",
            "description": "Valid description",
            "device_type": "Medical Device",
            "intended_use": "Valid intended use"
        },
        expected_behavior="reject",
        expected_errors=["Project name cannot be empty"],
        severity="high"
    ))
    
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.DATA_VALIDATION,
        name="Null Values",
        description="Test handling of null values in required fields",
        input_data={
            "name": None,
            "description": None,
            "device_type": None,
            "intended_use": None
        },
        expected_behavior="reject",
        expected_errors=["Required fields cannot be null"],
        severity="high"
    ))
    
    # Invalid email formats
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.DATA_VALIDATION,
        name="Invalid Email Format",
        description="Test user creation with invalid email formats",
        input_data={
            "email": "invalid-email-format",
            "name": "Test User",
            "google_id": "google_123"
        },
        expected_behavior="reject",
        expected_errors=["Invalid email format"],
        severity="medium"
    ))
    
    # Invalid date formats
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.DATA_VALIDATION,
        name="Invalid Date Format",
        description="Test predicate device with invalid clearance date",
        input_data={
            "k_number": "K123456",
            "device_name": "Test Device",
            "clearance_date": "invalid-date-format"
        },
        expected_behavior="reject",
        expected_errors=["Invalid date format"],
        severity="medium"
    ))
    
    return edge_cases


def create_boundary_condition_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for boundary condition testing"""
    
    edge_cases = []
    
    # Maximum length strings
    max_name = "A" * 255  # Assuming 255 char limit
    over_max_name = "A" * 256
    
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Maximum Length Project Name",
        description="Test project name at maximum allowed length",
        input_data={
            "name": max_name,
            "description": "Valid description",
            "device_type": "Medical Device"
        },
        expected_behavior="accept",
        severity="low"
    ))
    
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Over Maximum Length Project Name",
        description="Test project name exceeding maximum allowed length",
        input_data={
            "name": over_max_name,
            "description": "Valid description",
            "device_type": "Medical Device"
        },
        expected_behavior="reject",
        expected_errors=["Project name exceeds maximum length"],
        severity="medium"
    ))
    
    # Very long descriptions
    very_long_description = "A" * 10000
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Very Long Description",
        description="Test project with extremely long description",
        input_data={
            "name": "Test Device",
            "description": very_long_description,
            "device_type": "Medical Device"
        },
        expected_behavior="sanitize",
        expected_warnings=["Description truncated to maximum length"],
        severity="low"
    ))
    
    # Minimum values
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Minimum Confidence Score",
        description="Test classification with minimum confidence score",
        input_data={
            "confidence_score": 0.0,
            "device_class": "II",
            "product_code": "ABC"
        },
        expected_behavior="accept",
        expected_warnings=["Very low confidence score"],
        severity="low"
    ))
    
    # Maximum values
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Maximum Confidence Score",
        description="Test classification with maximum confidence score",
        input_data={
            "confidence_score": 1.0,
            "device_class": "II",
            "product_code": "ABC"
        },
        expected_behavior="accept",
        severity="low"
    ))
    
    # Out of range values
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.BOUNDARY_CONDITIONS,
        name="Out of Range Confidence Score",
        description="Test classification with confidence score > 1.0",
        input_data={
            "confidence_score": 1.5,
            "device_class": "II",
            "product_code": "ABC"
        },
        expected_behavior="reject",
        expected_errors=["Confidence score must be between 0 and 1"],
        severity="medium"
    ))
    
    return edge_cases


def create_unicode_handling_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for Unicode and international character handling"""
    
    edge_cases = []
    
    # Unicode characters in names
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.UNICODE_HANDLING,
        name="Unicode Project Name",
        description="Test project with Unicode characters in name",
        input_data={
            "name": "测试医疗设备 🏥 Test Device",
            "description": "Device with Unicode name",
            "device_type": "Medical Device"
        },
        expected_behavior="accept",
        severity="medium"
    ))
    
    # Emoji in descriptions
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.UNICODE_HANDLING,
        name="Emoji in Description",
        description="Test project with emoji characters",
        input_data={
            "name": "Test Device",
            "description": "Medical device for testing 🧪⚕️💊 with emoji support",
            "device_type": "Medical Device"
        },
        expected_behavior="accept",
        severity="low"
    ))
    
    # Right-to-left text
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.UNICODE_HANDLING,
        name="RTL Text",
        description="Test project with right-to-left text",
        input_data={
            "name": "جهاز طبي للاختبار",  # Arabic text
            "description": "Medical device with Arabic text",
            "device_type": "Medical Device"
        },
        expected_behavior="accept",
        severity="medium"
    ))
    
    # Mixed scripts
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.UNICODE_HANDLING,
        name="Mixed Scripts",
        description="Test project with mixed writing scripts",
        input_data={
            "name": "Test 测试 тест устройство Device",
            "description": "Mixed English, Chinese, and Russian text",
            "device_type": "Medical Device"
        },
        expected_behavior="accept",
        severity="medium"
    ))
    
    return edge_cases


def create_security_injection_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for security injection testing"""
    
    edge_cases = []
    
    # SQL injection attempts
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.SECURITY_INJECTION,
        name="SQL Injection in Name",
        description="Test SQL injection attempt in project name",
        input_data={
            "name": "Test'; DROP TABLE projects; --",
            "description": "SQL injection test",
            "device_type": "Medical Device"
        },
        expected_behavior="sanitize",
        should_trigger_security_alert=True,
        severity="critical"
    ))
    
    # XSS attempts
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.SECURITY_INJECTION,
        name="XSS in Description",
        description="Test XSS attempt in project description",
        input_data={
            "name": "Test Device",
            "description": "<script>alert('XSS')</script>",
            "device_type": "Medical Device"
        },
        expected_behavior="sanitize",
        should_trigger_security_alert=True,
        severity="critical"
    ))
    
    # Command injection
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.SECURITY_INJECTION,
        name="Command Injection",
        description="Test command injection attempt",
        input_data={
            "name": "Test Device; rm -rf /",
            "description": "Command injection test",
            "device_type": "Medical Device"
        },
        expected_behavior="sanitize",
        should_trigger_security_alert=True,
        severity="critical"
    ))
    
    # Path traversal
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.SECURITY_INJECTION,
        name="Path Traversal",
        description="Test path traversal attempt",
        input_data={
            "name": "../../../etc/passwd",
            "description": "Path traversal test",
            "device_type": "Medical Device"
        },
        expected_behavior="sanitize",
        should_trigger_security_alert=True,
        severity="high"
    ))
    
    return edge_cases


def create_malformed_data_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for malformed data handling"""
    
    edge_cases = []
    
    # Invalid JSON in tags
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.MALFORMED_DATA,
        name="Invalid JSON Tags",
        description="Test project with malformed JSON in tags",
        input_data={
            "name": "Test Device",
            "description": "Valid description",
            "tags": "invalid json string"
        },
        expected_behavior="reject",
        expected_errors=["Invalid JSON format in tags"],
        severity="medium"
    ))
    
    # Circular references in JSON
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.MALFORMED_DATA,
        name="Circular JSON Reference",
        description="Test handling of circular references in JSON data",
        input_data={
            "name": "Test Device",
            "metadata": {"self_ref": "circular"}  # Simplified representation
        },
        expected_behavior="reject",
        expected_errors=["Circular reference detected"],
        severity="medium"
    ))
    
    # Invalid K-number format
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.MALFORMED_DATA,
        name="Invalid K-Number Format",
        description="Test predicate with invalid K-number format",
        input_data={
            "k_number": "INVALID123",
            "device_name": "Test Device"
        },
        expected_behavior="reject",
        expected_errors=["Invalid K-number format"],
        severity="medium"
    ))
    
    # Malformed email addresses
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.MALFORMED_DATA,
        name="Malformed Email",
        description="Test various malformed email formats",
        input_data={
            "email": "@domain.com",  # Missing local part
            "name": "Test User",
            "google_id": "google_123"
        },
        expected_behavior="reject",
        expected_errors=["Invalid email format"],
        severity="medium"
    ))
    
    return edge_cases


def create_extreme_value_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for extreme value testing"""
    
    edge_cases = []
    
    # Very large numbers
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.EXTREME_VALUES,
        name="Very Large Project ID",
        description="Test handling of very large project ID",
        input_data={
            "id": 9223372036854775807,  # Max 64-bit integer
            "name": "Test Device"
        },
        expected_behavior="accept",
        severity="low"
    ))
    
    # Negative values where not expected
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.EXTREME_VALUES,
        name="Negative Confidence Score",
        description="Test negative confidence score",
        input_data={
            "confidence_score": -0.5,
            "device_class": "II"
        },
        expected_behavior="reject",
        expected_errors=["Confidence score cannot be negative"],
        severity="medium"
    ))
    
    # Zero values
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.EXTREME_VALUES,
        name="Zero Execution Time",
        description="Test agent interaction with zero execution time",
        input_data={
            "execution_time_ms": 0,
            "agent_action": "test_action"
        },
        expected_behavior="accept",
        expected_warnings=["Unusually fast execution time"],
        severity="low"
    ))
    
    # Very large execution times
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.EXTREME_VALUES,
        name="Very Large Execution Time",
        description="Test agent interaction with extremely long execution time",
        input_data={
            "execution_time_ms": 3600000,  # 1 hour
            "agent_action": "test_action"
        },
        expected_behavior="accept",
        expected_warnings=["Unusually long execution time"],
        severity="low"
    ))
    
    return edge_cases


def create_concurrent_access_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for concurrent access testing"""
    
    edge_cases = []
    
    # Simultaneous project creation
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.CONCURRENT_ACCESS,
        name="Simultaneous Project Creation",
        description="Test multiple users creating projects simultaneously",
        input_data={
            "concurrent_operations": 10,
            "operation_type": "create_project",
            "same_user": False
        },
        expected_behavior="accept",
        test_assertions={
            "all_projects_created": True,
            "no_data_corruption": True,
            "proper_isolation": True
        },
        severity="high"
    ))
    
    # Concurrent updates to same project
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.CONCURRENT_ACCESS,
        name="Concurrent Project Updates",
        description="Test concurrent updates to the same project",
        input_data={
            "concurrent_operations": 5,
            "operation_type": "update_project",
            "same_project": True
        },
        expected_behavior="accept",
        test_assertions={
            "last_write_wins": True,
            "no_data_corruption": True,
            "proper_locking": True
        },
        severity="high"
    ))
    
    # Race condition in user creation
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.CONCURRENT_ACCESS,
        name="User Creation Race Condition",
        description="Test race condition in user creation with same email",
        input_data={
            "concurrent_operations": 3,
            "operation_type": "create_user",
            "same_email": True
        },
        expected_behavior="reject",
        expected_errors=["Duplicate email address"],
        test_assertions={
            "only_one_user_created": True,
            "proper_constraint_enforcement": True
        },
        severity="high"
    ))
    
    return edge_cases


def create_resource_exhaustion_edge_cases() -> List[EdgeCaseFixture]:
    """Create edge cases for resource exhaustion testing"""
    
    edge_cases = []
    
    # Memory exhaustion
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.RESOURCE_EXHAUSTION,
        name="Large Data Upload",
        description="Test handling of very large data uploads",
        input_data={
            "data_size": "100MB",
            "operation_type": "file_upload"
        },
        expected_behavior="reject",
        expected_errors=["File size exceeds limit"],
        should_cause_performance_issue=False,
        severity="medium"
    ))
    
    # Connection pool exhaustion
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.RESOURCE_EXHAUSTION,
        name="Connection Pool Exhaustion",
        description="Test behavior when database connection pool is exhausted",
        input_data={
            "concurrent_connections": 100,
            "operation_type": "database_query"
        },
        expected_behavior="error",
        expected_errors=["Connection pool exhausted"],
        severity="high"
    ))
    
    # Disk space exhaustion
    edge_cases.append(create_edge_case_fixture(
        category=EdgeCaseCategory.RESOURCE_EXHAUSTION,
        name="Disk Space Exhaustion",
        description="Test behavior when disk space is exhausted",
        input_data={
            "operation_type": "database_write",
            "simulate_disk_full": True
        },
        expected_behavior="error",
        expected_errors=["Insufficient disk space"],
        severity="critical"
    ))
    
    return edge_cases


# Comprehensive edge case collections
def create_all_edge_case_fixtures() -> Dict[EdgeCaseCategory, List[EdgeCaseFixture]]:
    """Create all edge case fixtures organized by category"""
    
    return {
        EdgeCaseCategory.DATA_VALIDATION: create_data_validation_edge_cases(),
        EdgeCaseCategory.BOUNDARY_CONDITIONS: create_boundary_condition_edge_cases(),
        EdgeCaseCategory.UNICODE_HANDLING: create_unicode_handling_edge_cases(),
        EdgeCaseCategory.SECURITY_INJECTION: create_security_injection_edge_cases(),
        EdgeCaseCategory.MALFORMED_DATA: create_malformed_data_edge_cases(),
        EdgeCaseCategory.EXTREME_VALUES: create_extreme_value_edge_cases(),
        EdgeCaseCategory.CONCURRENT_ACCESS: create_concurrent_access_edge_cases(),
        EdgeCaseCategory.RESOURCE_EXHAUSTION: create_resource_exhaustion_edge_cases()
    }


# Predefined edge case scenarios
CRITICAL_EDGE_CASES = [
    fixture for fixtures in create_all_edge_case_fixtures().values()
    for fixture in fixtures if fixture.severity == "critical"
]

HIGH_PRIORITY_EDGE_CASES = [
    fixture for fixtures in create_all_edge_case_fixtures().values()
    for fixture in fixtures if fixture.severity in ["critical", "high"]
]

SECURITY_EDGE_CASES = [
    fixture for fixtures in create_all_edge_case_fixtures().values()
    for fixture in fixtures if fixture.should_trigger_security_alert
]

EDGE_CASE_SCENARIOS = create_all_edge_case_fixtures()

__all__ = [
    'EdgeCaseCategory',
    'EdgeCaseFixture',
    'create_edge_case_fixture',
    'create_all_edge_case_fixtures',
    'CRITICAL_EDGE_CASES',
    'HIGH_PRIORITY_EDGE_CASES',
    'SECURITY_EDGE_CASES',
    'EDGE_CASE_SCENARIOS'
]