#!/usr/bin/env python3
"""
Simple test script for the Mock Data Testing Framework
"""

import asyncio
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from tests.test_fixtures.project_fixtures import create_project_fixture, ProjectComplexity
from tests.test_fixtures.user_fixtures import create_user_fixture, UserRole
from tests.test_fixtures.edge_case_fixtures import create_edge_case_fixture, EdgeCaseCategory

def test_basic_fixtures():
    """Test basic fixture creation"""
    print("Testing basic fixture creation...")
    
    # Test project fixture
    project = create_project_fixture(
        name="Test Device",
        complexity=ProjectComplexity.SIMPLE
    )
    assert project.project.name == "Test Device"
    assert project.complexity == ProjectComplexity.SIMPLE
    print("✅ Project fixture creation works")
    
    # Test user fixture
    user = create_user_fixture(
        email="test@example.com",
        role=UserRole.USER
    )
    assert user.user.email == "test@example.com"
    assert user.role == UserRole.USER
    print("✅ User fixture creation works")
    
    # Test edge case fixture
    edge_case = create_edge_case_fixture(
        category=EdgeCaseCategory.DATA_VALIDATION,
        name="Test Edge Case",
        description="Test description",
        input_data={"test": "data"},
        expected_behavior="reject"
    )
    assert edge_case.name == "Test Edge Case"
    assert edge_case.category == EdgeCaseCategory.DATA_VALIDATION
    print("✅ Edge case fixture creation works")
    
    print("All basic fixture tests passed!")

def main():
    """Main test function"""
    print("🧪 Simple Mock Data Framework Test")
    print("=" * 40)
    
    try:
        test_basic_fixtures()
        print("\n✅ All tests passed! Basic framework functionality is working.")
        return 0
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())