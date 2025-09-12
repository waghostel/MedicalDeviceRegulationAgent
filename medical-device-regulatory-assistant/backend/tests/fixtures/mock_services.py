"""
Mock Service Factory for Testing

This module provides comprehensive mock services for external dependencies
to ensure tests don't make actual external API calls while maintaining
proper service interface compatibility.
"""

from typing import Dict, Any, List, Optional
from unittest.mock import Mock, AsyncMock, patch
from datetime import datetime

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    FDAAPIError,
    PredicateNotFoundError
)


class MockServiceFactory:
    """Factory for creating mock services with consistent behavior"""
    
    @staticmethod
    def create_mock_openfda_service(**kwargs) -> OpenFDAService:
        """
        Create mock OpenFDA service with standard methods and responses.
        
        Args:
            **kwargs: Override default mock responses
            
        Returns:
            OpenFDAService: Service instance with mocked methods
        """
        service = OpenFDAService(api_key="test_key")
        
        # Default search results
        default_search_results = kwargs.get('search_results', [
            FDASearchResult(
                k_number="K123456",
                device_name="Test Device",
                intended_use="Test indication for medical use",
                product_code="ABC",
                clearance_date="2023-01-01",
                applicant="Test Medical Inc.",
                contact="John Doe",
                decision_description="Substantially Equivalent",
                statement_or_summary="Test device summary",
                confidence_score=0.85
            ),
            FDASearchResult(
                k_number="K789012",
                device_name="Another Test Device",
                intended_use="Alternative test indication",
                product_code="XYZ",
                clearance_date="2023-06-15",
                applicant="Another Medical Corp.",
                contact="Jane Smith",
                decision_description="Substantially Equivalent",
                statement_or_summary="Another device summary",
                confidence_score=0.72
            )
        ])
        
        # Default classification results
        default_classification_results = kwargs.get('classification_results', [
            DeviceClassificationResult(
                device_class="2",
                product_code="ABC",
                device_name="Test Medical Device",
                regulation_number="21 CFR 123.456",
                medical_specialty_description="General Hospital",
                device_class_description="Class II Medical Device",
                confidence_score=0.90
            )
        ])
        
        # Default adverse event results
        default_adverse_events = kwargs.get('adverse_events', [
            AdverseEventResult(
                report_number="12345",
                event_date="20230115",
                device_name="Test Device",
                manufacturer_name="Test Manufacturer",
                event_type="Malfunction",
                patient_outcome="No Adverse Event",
                device_problem_flag="Y"
            )
        ])
        
        # Mock the _make_request method to return appropriate responses
        async def mock_make_request(endpoint: str, params: Optional[Dict[str, Any]] = None, use_cache: bool = True):
            if "510k" in endpoint:
                return {
                    "results": [result.to_dict() for result in default_search_results]
                }
            elif "classification" in endpoint:
                return {
                    "results": [result.to_dict() for result in default_classification_results]
                }
            elif "event" in endpoint:
                return {
                    "results": [result.to_dict() for result in default_adverse_events]
                }
            else:
                return {"results": []}
        
        # Apply the mock permanently to the service instance
        service._make_request = mock_make_request
        return service
    
    @staticmethod
    def create_mock_redis_client(**kwargs) -> AsyncMock:
        """
        Create mock Redis client with standard operations.
        
        Args:
            **kwargs: Override default mock responses
            
        Returns:
            AsyncMock: Mock Redis client
        """
        mock_client = AsyncMock()
        
        # Mock basic Redis operations
        mock_client.ping = AsyncMock(return_value=kwargs.get('ping_response', True))
        mock_client.get = AsyncMock(return_value=kwargs.get('get_response', None))
        mock_client.set = AsyncMock(return_value=kwargs.get('set_response', True))
        mock_client.setex = AsyncMock(return_value=kwargs.get('setex_response', True))
        mock_client.delete = AsyncMock(return_value=kwargs.get('delete_response', 1))
        mock_client.exists = AsyncMock(return_value=kwargs.get('exists_response', False))
        mock_client.close = AsyncMock()
        
        # Mock info command
        mock_client.info = AsyncMock(return_value=kwargs.get('info_response', {
            "redis_version": "7.0.0",
            "connected_clients": 1,
            "used_memory_human": "1.00M"
        }))
        
        return mock_client
    
    @staticmethod
    def create_mock_auth_service(**kwargs) -> Mock:
        """
        Create mock authentication service.
        
        Args:
            **kwargs: Override default mock responses
            
        Returns:
            Mock: Mock authentication service
        """
        mock_service = Mock()
        
        # Default user data
        default_user = kwargs.get('user_data', {
            "id": "test_user",
            "email": "test@example.com",
            "name": "Test User",
            "google_id": "google_test_123"
        })
        
        # Mock authentication methods
        mock_service.get_current_user = AsyncMock(return_value=default_user)
        mock_service.verify_token = AsyncMock(return_value=kwargs.get('token_valid', True))
        mock_service.create_token = Mock(return_value=kwargs.get('token', "test_token"))
        
        return mock_service


class MockOpenFDAServiceBuilder:
    """Builder pattern for creating customized mock OpenFDA services"""
    
    def __init__(self):
        self.search_results = []
        self.classification_results = []
        self.adverse_events = []
        self.should_raise_error = False
        self.error_type = FDAAPIError
        self.error_message = "Test error"
    
    def with_search_results(self, results: List[FDASearchResult]) -> 'MockOpenFDAServiceBuilder':
        """Add search results to the mock service"""
        self.search_results = results
        return self
    
    def with_classification_results(self, results: List[DeviceClassificationResult]) -> 'MockOpenFDAServiceBuilder':
        """Add classification results to the mock service"""
        self.classification_results = results
        return self
    
    def with_adverse_events(self, events: List[AdverseEventResult]) -> 'MockOpenFDAServiceBuilder':
        """Add adverse events to the mock service"""
        self.adverse_events = events
        return self
    
    def with_error(self, error_type: type = FDAAPIError, message: str = "Test error") -> 'MockOpenFDAServiceBuilder':
        """Configure the mock service to raise errors"""
        self.should_raise_error = True
        self.error_type = error_type
        self.error_message = message
        return self
    
    def with_empty_results(self) -> 'MockOpenFDAServiceBuilder':
        """Configure the mock service to return empty results"""
        self.search_results = []
        self.classification_results = []
        self.adverse_events = []
        return self
    
    def build(self) -> OpenFDAService:
        """Build the configured mock OpenFDA service"""
        service = OpenFDAService(api_key="test_key")
        
        if self.should_raise_error:
            async def mock_make_request_error(*args, **kwargs):
                raise self.error_type(self.error_message)
            
            service._make_request = mock_make_request_error
            return service
        else:
            async def mock_make_request(endpoint: str, params: Optional[Dict[str, Any]] = None, use_cache: bool = True):
                if "510k" in endpoint:
                    return {
                        "results": [result.to_dict() for result in self.search_results]
                    }
                elif "classification" in endpoint:
                    return {
                        "results": [result.to_dict() for result in self.classification_results]
                    }
                elif "event" in endpoint:
                    return {
                        "results": [result.to_dict() for result in self.adverse_events]
                    }
                else:
                    return {"results": []}
            
            service._make_request = mock_make_request
            return service


# Convenience functions for common mock scenarios
def create_successful_openfda_mock() -> OpenFDAService:
    """Create a mock OpenFDA service that returns successful results"""
    return MockServiceFactory.create_mock_openfda_service()


def create_empty_openfda_mock() -> OpenFDAService:
    """Create a mock OpenFDA service that returns empty results"""
    return MockOpenFDAServiceBuilder().with_empty_results().build()


def create_error_openfda_mock(error_type: type = FDAAPIError, message: str = "Test error") -> OpenFDAService:
    """Create a mock OpenFDA service that raises errors"""
    return MockOpenFDAServiceBuilder().with_error(error_type, message).build()


def create_predicate_not_found_mock() -> OpenFDAService:
    """Create a mock OpenFDA service that raises PredicateNotFoundError"""
    return MockOpenFDAServiceBuilder().with_error(PredicateNotFoundError, "No predicates found").build()


# Test data factories
def create_test_fda_search_result(**kwargs) -> FDASearchResult:
    """Create a test FDA search result with default values"""
    defaults = {
        "k_number": "K123456",
        "device_name": "Test Medical Device",
        "intended_use": "For testing medical applications",
        "product_code": "ABC",
        "clearance_date": "2023-01-01",
        "applicant": "Test Medical Inc.",
        "contact": "John Doe",
        "decision_description": "Substantially Equivalent",
        "statement_or_summary": "Test device for medical use",
        "confidence_score": 0.85
    }
    defaults.update(kwargs)
    return FDASearchResult(**defaults)


def create_test_device_classification(**kwargs) -> DeviceClassificationResult:
    """Create a test device classification with default values"""
    defaults = {
        "device_class": "2",
        "product_code": "ABC",
        "device_name": "Test Medical Device",
        "regulation_number": "21 CFR 123.456",
        "medical_specialty_description": "General Hospital",
        "device_class_description": "Class II Medical Device",
        "confidence_score": 0.90
    }
    defaults.update(kwargs)
    return DeviceClassificationResult(**defaults)


def create_test_adverse_event(**kwargs) -> AdverseEventResult:
    """Create a test adverse event with default values"""
    defaults = {
        "report_number": "12345",
        "event_date": "20230115",
        "device_name": "Test Device",
        "manufacturer_name": "Test Manufacturer",
        "event_type": "Malfunction",
        "patient_outcome": "No Adverse Event",
        "device_problem_flag": "Y"
    }
    defaults.update(kwargs)
    return AdverseEventResult(**defaults)