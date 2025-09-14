"""
Test utilities for Medical Device Regulatory Assistant Backend

This module provides utility functions and classes to support testing
with the new isolated database fixtures and centralized test environment.
"""

import json
from typing import Dict, Any, Optional, List
from httpx import Response
from fastapi.testclient import TestClient


class APITestUtils:
    """Utilities for API endpoint testing with FastAPI TestClient"""

    @staticmethod
    def assert_success_response(response: Response, expected_status: int = 200) -> Dict[str, Any]:
        """
        Assert successful response and return JSON data.
        
        Args:
            response: HTTP response from TestClient
            expected_status: Expected HTTP status code
            
        Returns:
            Dict containing response JSON data
            
        Raises:
            AssertionError: If response status or format is incorrect
        """
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text}"
        )

        try:
            return response.json()
        except json.JSONDecodeError:
            assert False, f"Response is not valid JSON: {response.text}"

    @staticmethod
    def assert_error_response(
        response: Response, 
        expected_status: int, 
        expected_error_code: str = None
    ) -> Dict[str, Any]:
        """
        Assert error response with expected status and error code.
        
        Args:
            response: HTTP response from TestClient
            expected_status: Expected HTTP status code
            expected_error_code: Expected error code in response
            
        Returns:
            Dict containing response JSON data
            
        Raises:
            AssertionError: If response status, format, or error code is incorrect
        """
        assert response.status_code == expected_status, (
            f"Expected status {expected_status}, got {response.status_code}. "
            f"Response: {response.text}"
        )

        try:
            data = response.json()
        except json.JSONDecodeError:
            assert False, f"Error response is not valid JSON: {response.text}"

        if expected_error_code:
            error_info = data.get("detail", {})
            if isinstance(error_info, dict):
                actual_error_code = error_info.get("error_code")
                assert actual_error_code == expected_error_code, (
                    f"Expected error code {expected_error_code}, got {actual_error_code}"
                )

        return data

    @staticmethod
    def assert_validation_error(response: Response, field_name: str) -> Dict[str, Any]:
        """
        Assert validation error for specific field.
        
        Args:
            response: HTTP response from TestClient
            field_name: Name of field that should have validation error
            
        Returns:
            Dict containing response JSON data
            
        Raises:
            AssertionError: If validation error is not found for the field
        """
        data = APITestUtils.assert_error_response(response, 422)

        # Check if it's a Pydantic validation error
        if "detail" in data and isinstance(data["detail"], list):
            field_errors = [
                error for error in data["detail"] 
                if error.get("loc", [])[-1] == field_name
            ]
            assert field_errors, f"No validation error found for field '{field_name}'"

        return data


class DatabaseTestUtils:
    """Utilities for database testing with isolated sessions"""

    @staticmethod
    async def count_records(session, model_class) -> int:
        """
        Count records in a table.
        
        Args:
            session: Database session
            model_class: SQLAlchemy model class
            
        Returns:
            Number of records in the table
        """
        from sqlalchemy import select, func
        
        result = await session.execute(
            select(func.count()).select_from(model_class)
        )
        return result.scalar()

    @staticmethod
    async def get_record_by_id(session, model_class, record_id: int):
        """
        Get a record by ID.
        
        Args:
            session: Database session
            model_class: SQLAlchemy model class
            record_id: ID of the record to retrieve
            
        Returns:
            Model instance or None if not found
        """
        from sqlalchemy import select
        
        result = await session.execute(
            select(model_class).where(model_class.id == record_id)
        )
        return result.scalar_one_or_none()

    @staticmethod
    async def delete_all_records(session, model_class) -> int:
        """
        Delete all records from a table.
        
        Args:
            session: Database session
            model_class: SQLAlchemy model class
            
        Returns:
            Number of records deleted
        """
        from sqlalchemy import delete
        
        result = await session.execute(delete(model_class))
        await session.commit()
        return result.rowcount


class MockServiceUtils:
    """Utilities for creating and managing mock services"""

    @staticmethod
    def create_mock_openfda_response(
        k_numbers: List[str] = None,
        device_names: List[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Create mock OpenFDA API response data.
        
        Args:
            k_numbers: List of K-numbers to include
            device_names: List of device names to include
            
        Returns:
            List of mock predicate device data
        """
        if k_numbers is None:
            k_numbers = ["K123456", "K789012"]
        if device_names is None:
            device_names = ["Test Device 1", "Test Device 2"]

        results = []
        for i, (k_num, name) in enumerate(zip(k_numbers, device_names)):
            results.append({
                "k_number": k_num,
                "device_name": name,
                "intended_use": f"Test indication {i+1}",
                "product_code": f"AB{i+1}",
                "clearance_date": "2023-01-01"
            })

        return results

    @staticmethod
    def create_mock_health_check_response(
        healthy: bool = True,
        service_name: str = "test_service"
    ) -> Dict[str, Any]:
        """
        Create mock health check response.
        
        Args:
            healthy: Whether the service is healthy
            service_name: Name of the service
            
        Returns:
            Mock health check response data
        """
        return {
            "healthy": healthy,
            "status": "connected" if healthy else "disconnected",
            "service": service_name,
            "message": "Service is healthy" if healthy else "Service is unhealthy"
        }


class TestEnvironmentUtils:
    """Utilities for managing test environment state"""

    @staticmethod
    def verify_test_environment():
        """
        Verify that we're running in test environment.
        
        Raises:
            AssertionError: If not running in test environment
        """
        import os
        assert os.getenv("TESTING") == "true", "Not running in test environment"

    @staticmethod
    def get_test_database_url() -> str:
        """
        Get the test database URL.
        
        Returns:
            Test database URL
        """
        import os
        return os.getenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")

    @staticmethod
    def is_redis_disabled() -> bool:
        """
        Check if Redis is disabled for testing.
        
        Returns:
            True if Redis is disabled
        """
        import os
        return os.getenv("REDIS_URL", "") == ""


# Convenience functions for common test patterns
async def create_test_user_and_project(test_data_factory):
    """
    Create a test user and project for common test scenarios.
    
    Args:
        test_data_factory: Test data factory fixture
        
    Returns:
        Tuple of (user, project)
    """
    user = await test_data_factory.create_user()
    project = await test_data_factory.create_project(user_id=user.id)
    return user, project


def assert_response_has_fields(response_data: Dict[str, Any], required_fields: List[str]):
    """
    Assert that response data contains all required fields.
    
    Args:
        response_data: Response data dictionary
        required_fields: List of required field names
        
    Raises:
        AssertionError: If any required field is missing
    """
    missing_fields = [field for field in required_fields if field not in response_data]
    assert not missing_fields, f"Missing required fields: {missing_fields}"


def assert_model_matches_data(model_instance, expected_data: Dict[str, Any], exclude_fields: List[str] = None):
    """
    Assert that model instance matches expected data.
    
    Args:
        model_instance: SQLAlchemy model instance
        expected_data: Expected data dictionary
        exclude_fields: Fields to exclude from comparison
        
    Raises:
        AssertionError: If model data doesn't match expected data
    """
    if exclude_fields is None:
        exclude_fields = ['id', 'created_at', 'updated_at']

    for field, expected_value in expected_data.items():
        if field not in exclude_fields:
            actual_value = getattr(model_instance, field, None)
            assert actual_value == expected_value, (
                f"Field {field}: expected {expected_value}, got {actual_value}"
            )