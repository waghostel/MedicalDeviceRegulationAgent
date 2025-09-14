"""
Unit tests for OpenFDA service instantiation patterns and mocking

This module tests that OpenFDA service instances are created properly
and that mocking works correctly without returning async generators.
"""

import pytest
import asyncio
from typing import Dict, Any
from unittest.mock import AsyncMock, Mock, patch

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.openfda import (
    OpenFDAService,
    FDASearchResult,
    DeviceClassificationResult,
    AdverseEventResult,
    FDAAPIError,
    PredicateNotFoundError,
    create_openfda_service
)
from tests.fixtures.mock_services import (
    MockServiceFactory,
    MockOpenFDAServiceBuilder,
    create_successful_openfda_mock,
    create_empty_openfda_mock,
    create_error_openfda_mock,
    create_test_fda_search_result
)


class TestOpenFDAServiceInstantiation:
    """Test OpenFDA service instantiation patterns"""
    
    def test_direct_service_instantiation(self):
        """Test direct OpenFDA service instantiation returns proper object"""
        service = OpenFDAService(api_key="test_key")
        
        # Should be a proper service instance, not an async generator
        assert isinstance(service, OpenFDAService)
        assert not hasattr(service, '__aiter__')  # Not an async generator
        assert not hasattr(service, '__anext__')  # Not an async generator
        
        # Should have all expected methods
        assert hasattr(service, 'search_predicates')
        assert callable(service.search_predicates)
        assert hasattr(service, 'get_device_details')
        assert callable(service.get_device_details)
        assert hasattr(service, 'lookup_device_classification')
        assert callable(service.lookup_device_classification)
        assert hasattr(service, 'search_adverse_events')
        assert callable(service.search_adverse_events)
        assert hasattr(service, 'health_check')
        assert callable(service.health_check)
    
    @pytest.mark.asyncio
    async def test_factory_service_instantiation(self):
        """Test factory function returns proper service object"""
        with patch('redis.asyncio.from_url') as mock_redis_factory:
            mock_redis = AsyncMock()
            mock_redis.ping.return_value = True
            mock_redis_factory.return_value = mock_redis
            
            service = await create_openfda_service(
                api_key="test_key",
                redis_url="redis://localhost:6379"
            )
            
            # Should be a proper service instance, not an async generator
            assert isinstance(service, OpenFDAService)
            assert not hasattr(service, '__aiter__')  # Not an async generator
            assert not hasattr(service, '__anext__')  # Not an async generator
            
            # Should have proper configuration
            assert service.api_key == "test_key"
            assert service.redis_client == mock_redis
    
    def test_mock_service_factory_instantiation(self):
        """Test mock service factory returns proper service objects"""
        service = MockServiceFactory.create_mock_openfda_service()
        
        # Should be a proper service instance, not an async generator
        assert isinstance(service, OpenFDAService)
        assert not hasattr(service, '__aiter__')  # Not an async generator
        assert not hasattr(service, '__anext__')  # Not an async generator
        
        # Should have all expected methods
        assert hasattr(service, 'search_predicates')
        assert callable(service.search_predicates)
    
    def test_mock_service_builder_instantiation(self):
        """Test mock service builder returns proper service objects"""
        service = (MockOpenFDAServiceBuilder()
                  .with_empty_results()
                  .build())
        
        # Should be a proper service instance, not an async generator
        assert isinstance(service, OpenFDAService)
        assert not hasattr(service, '__aiter__')  # Not an async generator
        assert not hasattr(service, '__anext__')  # Not an async generator
    
    def test_convenience_mock_functions(self):
        """Test convenience mock functions return proper service objects"""
        # Test successful mock
        service1 = create_successful_openfda_mock()
        assert isinstance(service1, OpenFDAService)
        assert not hasattr(service1, '__aiter__')
        
        # Test empty mock
        service2 = create_empty_openfda_mock()
        assert isinstance(service2, OpenFDAService)
        assert not hasattr(service2, '__aiter__')
        
        # Test error mock
        service3 = create_error_openfda_mock()
        assert isinstance(service3, OpenFDAService)
        assert not hasattr(service3, '__aiter__')


class TestOpenFDAServiceMocking:
    """Test OpenFDA service mocking functionality"""
    
    @pytest.mark.asyncio
    async def test_mock_service_search_predicates(self):
        """Test mock service search_predicates method works correctly"""
        service = create_successful_openfda_mock()
        
        results = await service.search_predicates(
            search_terms=["test device"],
            limit=10
        )
        
        assert isinstance(results, list)
        assert len(results) > 0
        assert all(isinstance(result, FDASearchResult) for result in results)
        assert results[0].k_number == "K123456"
    
    @pytest.mark.asyncio
    async def test_mock_service_get_device_details(self):
        """Test mock service get_device_details method works correctly"""
        service = create_successful_openfda_mock()
        
        result = await service.get_device_details("K123456")
        
        assert result is not None
        assert isinstance(result, FDASearchResult)
        assert result.k_number == "K123456"
    
    @pytest.mark.asyncio
    async def test_mock_service_lookup_classification(self):
        """Test mock service lookup_device_classification method works correctly"""
        service = create_successful_openfda_mock()
        
        results = await service.lookup_device_classification(product_code="ABC")
        
        assert isinstance(results, list)
        assert len(results) > 0
        assert all(isinstance(result, DeviceClassificationResult) for result in results)
        assert results[0].product_code == "ABC"
    
    @pytest.mark.asyncio
    async def test_mock_service_search_adverse_events(self):
        """Test mock service search_adverse_events method works correctly"""
        service = create_successful_openfda_mock()
        
        results = await service.search_adverse_events(
            product_code="ABC",
            limit=10
        )
        
        assert isinstance(results, list)
        assert len(results) > 0
        assert all(isinstance(result, AdverseEventResult) for result in results)
        assert results[0].report_number == "12345"
    
    @pytest.mark.asyncio
    async def test_mock_service_health_check(self):
        """Test mock service health_check method works correctly"""
        service = create_successful_openfda_mock()
        
        result = await service.health_check()
        
        assert isinstance(result, dict)
        assert "status" in result
        assert "response_time_seconds" in result
        assert "circuit_breaker_state" in result
        assert "timestamp" in result
    
    @pytest.mark.asyncio
    async def test_mock_service_empty_results(self):
        """Test mock service with empty results"""
        service = create_empty_openfda_mock()
        
        results = await service.search_predicates(["nonexistent"])
        
        assert isinstance(results, list)
        assert len(results) == 0
    
    @pytest.mark.asyncio
    async def test_mock_service_error_handling(self):
        """Test mock service error handling"""
        service = create_error_openfda_mock(FDAAPIError, "Test API error")
        
        with pytest.raises(FDAAPIError, match="Test API error"):
            await service.search_predicates(["test"])
    
    @pytest.mark.asyncio
    async def test_mock_service_predicate_not_found(self):
        """Test mock service PredicateNotFoundError handling"""
        service = create_error_openfda_mock(PredicateNotFoundError, "No predicates found")
        
        # Should return empty list, not raise exception
        results = await service.search_predicates(["nonexistent"])
        assert results == []


class TestServiceMethodAvailability:
    """Test that all expected service methods are available and callable"""
    
    def test_service_has_all_expected_methods(self):
        """Test that service instance has all expected methods"""
        service = OpenFDAService(api_key="test_key")
        
        expected_methods = [
            'search_predicates',
            'get_device_details',
            'lookup_device_classification',
            'search_adverse_events',
            'health_check',
            'get_product_code_info',
            'close'
        ]
        
        for method_name in expected_methods:
            assert hasattr(service, method_name), f"Service missing method: {method_name}"
            assert callable(getattr(service, method_name)), f"Method {method_name} is not callable"
    
    def test_mock_service_has_all_expected_methods(self):
        """Test that mock service instance has all expected methods"""
        service = create_successful_openfda_mock()
        
        expected_methods = [
            'search_predicates',
            'get_device_details',
            'lookup_device_classification',
            'search_adverse_events',
            'health_check',
            'get_product_code_info',
            'close'
        ]
        
        for method_name in expected_methods:
            assert hasattr(service, method_name), f"Mock service missing method: {method_name}"
            assert callable(getattr(service, method_name)), f"Mock method {method_name} is not callable"
    
    @pytest.mark.asyncio
    async def test_all_methods_are_async(self):
        """Test that all service methods are properly async"""
        service = create_successful_openfda_mock()
        
        async_methods = [
            'search_predicates',
            'get_device_details',
            'lookup_device_classification',
            'search_adverse_events',
            'health_check',
            'get_product_code_info',
            'close'
        ]
        
        for method_name in async_methods:
            method = getattr(service, method_name)
            
            # Call method with minimal parameters
            if method_name == 'search_predicates':
                result = method(["test"])
            elif method_name == 'get_device_details':
                result = method("K123456")
            elif method_name == 'lookup_device_classification':
                result = method(product_code="ABC")
            elif method_name == 'search_adverse_events':
                result = method(product_code="ABC")
            elif method_name == 'get_product_code_info':
                result = method("ABC")
            else:
                result = method()
            
            # Should return a coroutine
            assert asyncio.iscoroutine(result), f"Method {method_name} did not return a coroutine"
            
            # Await the result to clean up
            try:
                await result
            except Exception:
                pass  # Expected for some methods with mock data


class TestServiceConfiguration:
    """Test service configuration and dependency injection"""
    
    def test_service_configuration_without_dependencies(self):
        """Test service configuration without external dependencies"""
        service = OpenFDAService(api_key="test_key")
        
        assert service.api_key == "test_key"
        assert service.redis_client is None
        assert service.cache_ttl == 3600  # Default
        assert service.max_retries == 3   # Default
        assert service.timeout == 30      # Default
    
    def test_service_configuration_with_dependencies(self):
        """Test service configuration with external dependencies"""
        mock_redis = AsyncMock()
        
        service = OpenFDAService(
            api_key="test_key",
            redis_client=mock_redis,
            cache_ttl=1800,
            max_retries=2,
            timeout=20
        )
        
        assert service.api_key == "test_key"
        assert service.redis_client == mock_redis
        assert service.cache_ttl == 1800
        assert service.max_retries == 2
        assert service.timeout == 20
    
    @pytest.mark.asyncio
    async def test_service_cleanup(self):
        """Test service cleanup and resource management"""
        mock_redis = AsyncMock()
        service = OpenFDAService(redis_client=mock_redis)
        
        await service.close()
        mock_redis.close.assert_called_once()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])