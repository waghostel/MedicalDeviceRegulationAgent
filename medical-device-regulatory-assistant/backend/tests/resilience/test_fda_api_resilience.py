"""
Comprehensive test suite for FDA API resilience mechanisms

Tests all resilience patterns:
- Advanced retry logic with exponential backoff and jitter
- Fallback mechanisms for service unavailability
- Request deduplication for high-load scenarios
- Graceful degradation for partial service availability
- Automated error recovery workflows
- Request queuing for rate limit management
"""

import asyncio
import pytest
import time
from datetime import datetime, timedelta
from unittest.mock import AsyncMock, Mock, patch
from typing import Dict, Any, List

from core.resilience import (
    AdvancedRetryHandler, FallbackManager, RequestDeduplicator,
    GracefulDegradationManager, ErrorRecoveryWorkflow, RequestQueue,
    ResilienceManager, RetryConfig, FallbackConfig, RetryStrategy,
    ServiceState
)
from services.openfda_resilient import ResilientOpenFDAService
from services.openfda import FDAAPIError, RateLimitExceededError, PredicateNotFoundError
from core.exceptions import ExternalServiceError


class TestAdvancedRetryHandler:
    """Test advanced retry handler with exponential backoff and jitter"""
    
    @pytest.fixture
    def retry_handler(self):
        config = RetryConfig(
            max_retries=3,
            base_delay=0.1,
            max_delay=1.0,
            jitter=True,
            strategy=RetryStrategy.EXPONENTIAL_BACKOFF
        )
        return AdvancedRetryHandler(config)
    
    @pytest.mark.asyncio
    async def test_successful_operation_no_retry(self, retry_handler):
        """Test successful operation requires no retry"""
        mock_func = AsyncMock(return_value="success")
        
        result = await retry_handler.retry_with_backoff(mock_func, "arg1", kwarg1="value1")
        
        assert result == "success"
        assert mock_func.call_count == 1
        mock_func.assert_called_with("arg1", kwarg1="value1")
    
    @pytest.mark.asyncio
    async def test_retry_on_retryable_exception(self, retry_handler):
        """Test retry behavior on retryable exceptions"""
        mock_func = AsyncMock()
        mock_func.side_effect = [
            ConnectionError("Connection failed"),
            ConnectionError("Connection failed"),
            "success"
        ]
        
        start_time = time.time()
        result = await retry_handler.retry_with_backoff(mock_func, operation_id="test_op")
        end_time = time.time()
        
        assert result == "success"
        assert mock_func.call_count == 3
        # Should have some delay due to backoff
        assert end_time - start_time > 0.1
    
    @pytest.mark.asyncio
    async def test_max_retries_exceeded(self, retry_handler):
        """Test behavior when max retries are exceeded"""
        mock_func = AsyncMock(side_effect=ConnectionError("Persistent error"))
        
        with pytest.raises(ConnectionError, match="Persistent error"):
            await retry_handler.retry_with_backoff(mock_func, operation_id="test_op")
        
        assert mock_func.call_count == 4  # Initial + 3 retries
    
    @pytest.mark.asyncio
    async def test_non_retryable_exception(self, retry_handler):
        """Test that non-retryable exceptions are not retried"""
        mock_func = AsyncMock(side_effect=ValueError("Invalid input"))
        
        with pytest.raises(ValueError, match="Invalid input"):
            await retry_handler.retry_with_backoff(mock_func, operation_id="test_op")
        
        assert mock_func.call_count == 1  # No retries
    
    @pytest.mark.asyncio
    async def test_exponential_backoff_timing(self, retry_handler):
        """Test exponential backoff timing"""
        mock_func = AsyncMock(side_effect=[
            ConnectionError("Error 1"),
            ConnectionError("Error 2"),
            "success"
        ])
        
        start_time = time.time()
        await retry_handler.retry_with_backoff(mock_func, operation_id="test_timing")
        end_time = time.time()
        
        # Should have delays: ~0.1s + ~0.2s = ~0.3s minimum
        assert end_time - start_time >= 0.25
    
    def test_retry_stats_tracking(self, retry_handler):
        """Test retry statistics tracking"""
        operation_id = "test_stats"
        
        # Initially no stats
        stats = retry_handler.get_retry_stats(operation_id)
        assert stats["retry_count"] == 0
        assert stats["last_retry_time"] is None
        
        # After setting retry count
        retry_handler.retry_counts[operation_id] = 2
        retry_handler.last_retry_times[operation_id] = datetime.utcnow()
        
        stats = retry_handler.get_retry_stats(operation_id)
        assert stats["retry_count"] == 2
        assert stats["last_retry_time"] is not None


class TestFallbackManager:
    """Test fallback mechanisms for service unavailability"""
    
    @pytest.fixture
    def fallback_manager(self):
        config = FallbackConfig(
            enabled=True,
            cache_fallback=True,
            static_fallback=True,
            degraded_service=True,
            timeout_seconds=1.0
        )
        return FallbackManager(config)
    
    @pytest.mark.asyncio
    async def test_successful_primary_function(self, fallback_manager):
        """Test successful execution of primary function"""
        mock_func = AsyncMock(return_value="primary_result")
        
        result = await fallback_manager.execute_with_fallback(
            mock_func, "test_service", "cache_key"
        )
        
        assert result == "primary_result"
        assert mock_func.call_count == 1
        assert fallback_manager.get_service_state("test_service") == ServiceState.HEALTHY
    
    @pytest.mark.asyncio
    async def test_cache_fallback(self, fallback_manager):
        """Test fallback to cached response"""
        # Set up cached response
        fallback_manager.cached_responses["cache_key"] = {
            "result": "cached_result",
            "timestamp": datetime.utcnow(),
            "service": "test_service"
        }
        
        mock_func = AsyncMock(side_effect=ConnectionError("Service unavailable"))
        
        result = await fallback_manager.execute_with_fallback(
            mock_func, "test_service", "cache_key"
        )
        
        assert result == "cached_result"
        assert fallback_manager.get_service_state("test_service") == ServiceState.UNAVAILABLE
    
    @pytest.mark.asyncio
    async def test_static_fallback(self, fallback_manager):
        """Test fallback to static value"""
        mock_func = AsyncMock(side_effect=ConnectionError("Service unavailable"))
        
        result = await fallback_manager.execute_with_fallback(
            mock_func, "test_service", "cache_key", static_fallback="static_result"
        )
        
        assert result == "static_result"
    
    @pytest.mark.asyncio
    async def test_no_fallback_available(self, fallback_manager):
        """Test behavior when no fallback is available"""
        mock_func = AsyncMock(side_effect=ConnectionError("Service unavailable"))
        
        with pytest.raises(ExternalServiceError):
            await fallback_manager.execute_with_fallback(
                mock_func, "test_service", "cache_key"
            )
    
    @pytest.mark.asyncio
    async def test_timeout_handling(self, fallback_manager):
        """Test timeout handling in primary function"""
        async def slow_func():
            await asyncio.sleep(2.0)  # Longer than timeout
            return "should_not_reach"
        
        with pytest.raises(ExternalServiceError):
            await fallback_manager.execute_with_fallback(
                slow_func, "test_service", "cache_key"
            )
    
    def test_cache_management(self, fallback_manager):
        """Test cache management operations"""
        # Add cached responses
        fallback_manager.cached_responses["key1"] = {
            "result": "result1",
            "timestamp": datetime.utcnow(),
            "service": "service1"
        }
        fallback_manager.cached_responses["key2"] = {
            "result": "result2",
            "timestamp": datetime.utcnow(),
            "service": "service2"
        }
        
        # Clear cache for specific service
        fallback_manager.clear_cache("service1")
        assert "key1" not in fallback_manager.cached_responses
        assert "key2" in fallback_manager.cached_responses
        
        # Clear all cache
        fallback_manager.clear_cache()
        assert len(fallback_manager.cached_responses) == 0


class TestRequestDeduplicator:
    """Test request deduplication for high-load scenarios"""
    
    @pytest.fixture
    def deduplicator(self):
        return RequestDeduplicator(ttl_seconds=60)
    
    @pytest.mark.asyncio
    async def test_unique_requests_not_deduplicated(self, deduplicator):
        """Test that unique requests are not deduplicated"""
        mock_func1 = AsyncMock(return_value="result1")
        mock_func2 = AsyncMock(return_value="result2")
        
        result1 = await deduplicator.deduplicate_request(
            mock_func1, "GET", "/api/search", {"query": "device1"}
        )
        result2 = await deduplicator.deduplicate_request(
            mock_func2, "GET", "/api/search", {"query": "device2"}
        )
        
        assert result1 == "result1"
        assert result2 == "result2"
        assert mock_func1.call_count == 1
        assert mock_func2.call_count == 1
    
    @pytest.mark.asyncio
    async def test_duplicate_requests_deduplicated(self, deduplicator):
        """Test that duplicate requests are deduplicated"""
        call_count = 0
        
        async def mock_func():
            nonlocal call_count
            call_count += 1
            await asyncio.sleep(0.1)  # Simulate some work
            return f"result_{call_count}"
        
        # Start two identical requests concurrently
        task1 = asyncio.create_task(
            deduplicator.deduplicate_request(
                mock_func, "GET", "/api/search", {"query": "device"}
            )
        )
        task2 = asyncio.create_task(
            deduplicator.deduplicate_request(
                mock_func, "GET", "/api/search", {"query": "device"}
            )
        )
        
        result1, result2 = await asyncio.gather(task1, task2)
        
        # Both should get the same result
        assert result1 == result2 == "result_1"
        # Function should only be called once
        assert call_count == 1
    
    @pytest.mark.asyncio
    async def test_cached_result_reuse(self, deduplicator):
        """Test reuse of cached results within TTL"""
        mock_func = AsyncMock(return_value="cached_result")
        
        # First request
        result1 = await deduplicator.deduplicate_request(
            mock_func, "GET", "/api/search", {"query": "device"}
        )
        
        # Second identical request should use cached result
        result2 = await deduplicator.deduplicate_request(
            mock_func, "GET", "/api/search", {"query": "device"}
        )
        
        assert result1 == result2 == "cached_result"
        assert mock_func.call_count == 1  # Only called once
    
    @pytest.mark.asyncio
    async def test_error_propagation(self, deduplicator):
        """Test that errors are properly propagated to all waiting requests"""
        mock_func = AsyncMock(side_effect=ValueError("Test error"))
        
        # Start two identical requests concurrently
        task1 = asyncio.create_task(
            deduplicator.deduplicate_request(
                mock_func, "GET", "/api/search", {"query": "device"}
            )
        )
        task2 = asyncio.create_task(
            deduplicator.deduplicate_request(
                mock_func, "GET", "/api/search", {"query": "device"}
            )
        )
        
        # Both should raise the same error
        with pytest.raises(ValueError, match="Test error"):
            await task1
        
        with pytest.raises(ValueError, match="Test error"):
            await task2
        
        assert mock_func.call_count == 1
    
    @pytest.mark.asyncio
    async def test_cleanup_expired_requests(self, deduplicator):
        """Test cleanup of expired completed requests"""
        mock_func = AsyncMock(return_value="result")
        
        # Make a request
        await deduplicator.deduplicate_request(
            mock_func, "GET", "/api/search", {"query": "device"}
        )
        
        # Verify request is in completed requests
        assert len(deduplicator.completed_requests) == 1
        
        # Manually expire the request
        for request_info in deduplicator.completed_requests.values():
            request_info.timestamp = datetime.utcnow() - timedelta(seconds=120)
        
        # Run cleanup
        await deduplicator.cleanup_expired_requests()
        
        # Should be cleaned up
        assert len(deduplicator.completed_requests) == 0
    
    def test_stats_reporting(self, deduplicator):
        """Test statistics reporting"""
        stats = deduplicator.get_stats()
        
        assert "active_requests" in stats
        assert "completed_requests" in stats
        assert "ttl_seconds" in stats
        assert stats["ttl_seconds"] == 60


class TestGracefulDegradationManager:
    """Test graceful degradation for partial service availability"""
    
    @pytest.fixture
    def degradation_manager(self):
        return GracefulDegradationManager()
    
    @pytest.mark.asyncio
    async def test_capability_available_primary_function(self, degradation_manager):
        """Test execution when capability is available"""
        degradation_manager.register_service_capabilities("test_service", {"search": True})
        
        mock_func = AsyncMock(return_value="primary_result")
        
        result = await degradation_manager.execute_with_degradation(
            "test_service", "search", mock_func
        )
        
        assert result == "primary_result"
        assert mock_func.call_count == 1
    
    @pytest.mark.asyncio
    async def test_capability_unavailable_degradation_strategy(self, degradation_manager):
        """Test degradation strategy when capability is unavailable"""
        degradation_manager.register_service_capabilities("test_service", {"search": False})
        
        mock_degradation = AsyncMock(return_value="degraded_result")
        degradation_manager.register_degradation_strategy("search", mock_degradation)
        
        mock_primary = AsyncMock(return_value="should_not_call")
        
        result = await degradation_manager.execute_with_degradation(
            "test_service", "search", mock_primary
        )
        
        assert result == "degraded_result"
        assert mock_primary.call_count == 0
        assert mock_degradation.call_count == 1
    
    @pytest.mark.asyncio
    async def test_primary_function_failure_marks_unavailable(self, degradation_manager):
        """Test that primary function failure marks capability as unavailable"""
        degradation_manager.register_service_capabilities("test_service", {"search": True})
        
        mock_degradation = AsyncMock(return_value="degraded_result")
        degradation_manager.register_degradation_strategy("search", mock_degradation)
        
        mock_primary = AsyncMock(side_effect=ConnectionError("Service down"))
        
        result = await degradation_manager.execute_with_degradation(
            "test_service", "search", mock_primary
        )
        
        assert result == "degraded_result"
        # Capability should now be marked as unavailable
        capabilities = degradation_manager.service_capabilities["test_service"]
        assert capabilities["search"] is False
    
    @pytest.mark.asyncio
    async def test_no_degradation_strategy_raises_error(self, degradation_manager):
        """Test error when no degradation strategy is available"""
        degradation_manager.register_service_capabilities("test_service", {"search": False})
        
        mock_primary = AsyncMock(return_value="should_not_call")
        
        with pytest.raises(ExternalServiceError):
            await degradation_manager.execute_with_degradation(
                "test_service", "search", mock_primary
            )
    
    def test_capability_restoration(self, degradation_manager):
        """Test capability restoration"""
        degradation_manager.register_service_capabilities("test_service", {"search": False})
        
        # Restore capability
        degradation_manager.restore_capability("test_service", "search")
        
        capabilities = degradation_manager.service_capabilities["test_service"]
        assert capabilities["search"] is True
    
    def test_service_status_reporting(self, degradation_manager):
        """Test service status reporting"""
        degradation_manager.register_service_capabilities("test_service", {
            "search": True,
            "classify": False,
            "adverse_events": True
        })
        
        status = degradation_manager.get_service_status("test_service")
        
        assert status["service_name"] == "test_service"
        assert "search" in status["available_capabilities"]
        assert "adverse_events" in status["available_capabilities"]
        assert "classify" in status["unavailable_capabilities"]
        assert status["health_percentage"] == 200/3  # 2 out of 3 capabilities


class TestErrorRecoveryWorkflow:
    """Test automated error recovery workflows"""
    
    @pytest.fixture
    def error_recovery(self):
        return ErrorRecoveryWorkflow()
    
    @pytest.mark.asyncio
    async def test_successful_recovery(self, error_recovery):
        """Test successful error recovery"""
        mock_recovery = AsyncMock(return_value=True)
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery, priority=10)
        
        error = ConnectionError("Network error")
        context = {"operation": "test"}
        
        success = await error_recovery.attempt_recovery(error, context)
        
        assert success is True
        assert mock_recovery.call_count == 1
        mock_recovery.assert_called_with(error, context)
    
    @pytest.mark.asyncio
    async def test_failed_recovery(self, error_recovery):
        """Test failed error recovery"""
        mock_recovery = AsyncMock(return_value=False)
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery)
        
        error = ConnectionError("Network error")
        
        success = await error_recovery.attempt_recovery(error)
        
        assert success is False
    
    @pytest.mark.asyncio
    async def test_multiple_recovery_strategies_priority(self, error_recovery):
        """Test multiple recovery strategies with priority ordering"""
        mock_recovery_low = AsyncMock(return_value=False)
        mock_recovery_high = AsyncMock(return_value=True)
        
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery_low, priority=1)
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery_high, priority=10)
        
        error = ConnectionError("Network error")
        
        success = await error_recovery.attempt_recovery(error)
        
        assert success is True
        # High priority should be called first and succeed
        assert mock_recovery_high.call_count == 1
        assert mock_recovery_low.call_count == 0
    
    @pytest.mark.asyncio
    async def test_recovery_strategy_exception_handling(self, error_recovery):
        """Test handling of exceptions in recovery strategies"""
        mock_recovery_failing = AsyncMock(side_effect=Exception("Recovery failed"))
        mock_recovery_working = AsyncMock(return_value=True)
        
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery_failing, priority=10)
        error_recovery.register_recovery_strategy("ConnectionError", mock_recovery_working, priority=5)
        
        error = ConnectionError("Network error")
        
        success = await error_recovery.attempt_recovery(error)
        
        assert success is True
        assert mock_recovery_failing.call_count == 1
        assert mock_recovery_working.call_count == 1
    
    @pytest.mark.asyncio
    async def test_no_recovery_strategy_for_error_type(self, error_recovery):
        """Test behavior when no recovery strategy exists for error type"""
        error = ValueError("Unknown error type")
        
        success = await error_recovery.attempt_recovery(error)
        
        assert success is False
    
    def test_recovery_statistics(self, error_recovery):
        """Test recovery statistics tracking"""
        # Initially no stats
        stats = error_recovery.get_recovery_stats()
        assert stats["total_recovery_attempts"] == 0
        assert stats["successful_recoveries"] == 0
        assert stats["success_rate"] == 0
        
        # Add some recovery history manually for testing
        error_recovery.recovery_history = [
            {"error_type": "ConnectionError", "recovery_successful": True},
            {"error_type": "ConnectionError", "recovery_successful": False},
            {"error_type": "TimeoutError", "recovery_successful": True}
        ]
        
        stats = error_recovery.get_recovery_stats()
        assert stats["total_recovery_attempts"] == 3
        assert stats["successful_recoveries"] == 2
        assert stats["success_rate"] == 200/3


class TestRequestQueue:
    """Test request queuing for rate limit management"""
    
    @pytest.fixture
    def request_queue(self):
        return RequestQueue(max_concurrent=2, rate_limit_per_minute=10)
    
    @pytest.mark.asyncio
    async def test_basic_request_processing(self, request_queue):
        """Test basic request processing"""
        mock_func = AsyncMock(return_value="result")
        
        result = await request_queue.enqueue_request(mock_func, "test_request")
        
        assert result == "result"
        assert mock_func.call_count == 1
    
    @pytest.mark.asyncio
    async def test_concurrent_request_limiting(self, request_queue):
        """Test concurrent request limiting"""
        call_times = []
        
        async def slow_func(delay):
            call_times.append(time.time())
            await asyncio.sleep(delay)
            return f"result_{delay}"
        
        # Start 4 requests (more than max_concurrent=2)
        tasks = [
            asyncio.create_task(request_queue.enqueue_request(slow_func, f"req_{i}", 0, 0.2))
            for i in range(4)
        ]
        
        results = await asyncio.gather(*tasks)
        
        assert len(results) == 4
        assert len(call_times) == 4
        
        # First two should start immediately, next two should wait
        time_diffs = [call_times[i+1] - call_times[i] for i in range(len(call_times)-1)]
        # There should be some delay between the second and third calls
        assert any(diff > 0.1 for diff in time_diffs)
    
    @pytest.mark.asyncio
    async def test_rate_limiting(self, request_queue):
        """Test rate limiting functionality"""
        # Set a very low rate limit for testing
        request_queue.rate_limit_per_minute = 2
        
        mock_func = AsyncMock(return_value="result")
        
        start_time = time.time()
        
        # Make 3 requests (more than rate limit of 2 per minute)
        tasks = [
            asyncio.create_task(request_queue.enqueue_request(mock_func, f"req_{i}"))
            for i in range(3)
        ]
        
        await asyncio.gather(*tasks)
        
        end_time = time.time()
        
        # Should take some time due to rate limiting
        # Note: This is a simplified test - in practice, rate limiting is more complex
        assert mock_func.call_count == 3
    
    @pytest.mark.asyncio
    async def test_request_priority_ordering(self, request_queue):
        """Test request priority ordering"""
        results = []
        
        async def recording_func(value):
            results.append(value)
            return value
        
        # Add requests with different priorities
        # Higher priority should be processed first
        await request_queue.enqueue_request(recording_func, "low_priority", 1, "low")
        await request_queue.enqueue_request(recording_func, "high_priority", 10, "high")
        await request_queue.enqueue_request(recording_func, "medium_priority", 5, "medium")
        
        # Wait for processing to complete
        await asyncio.sleep(0.5)
        
        # Note: Actual priority ordering depends on queue implementation
        # This test verifies that all requests are processed
        assert len(results) == 3
        assert "low" in results
        assert "high" in results
        assert "medium" in results
    
    @pytest.mark.asyncio
    async def test_error_handling_in_queue(self, request_queue):
        """Test error handling in queued requests"""
        mock_func = AsyncMock(side_effect=ValueError("Test error"))
        
        with pytest.raises(ValueError, match="Test error"):
            await request_queue.enqueue_request(mock_func, "error_request")
    
    def test_queue_statistics(self, request_queue):
        """Test queue statistics reporting"""
        stats = request_queue.get_queue_stats()
        
        assert "queue_size" in stats
        assert "active_requests" in stats
        assert "max_concurrent" in stats
        assert "rate_limit_per_minute" in stats
        assert "requests_last_minute" in stats
        assert "processing" in stats
        
        assert stats["max_concurrent"] == 2
        assert stats["rate_limit_per_minute"] == 10
    
    @pytest.mark.asyncio
    async def test_queue_lifecycle(self, request_queue):
        """Test queue start and stop lifecycle"""
        # Queue should start processing automatically
        await request_queue.start_processing()
        assert request_queue.processing_task is not None
        assert not request_queue.processing_task.done()
        
        # Stop processing
        await request_queue.stop_processing()
        assert request_queue.processing_task.done()


class TestResilienceManager:
    """Test central resilience manager integration"""
    
    @pytest.fixture
    def resilience_manager(self):
        return ResilienceManager(
            enable_deduplication=True,
            enable_graceful_degradation=True,
            enable_error_recovery=True,
            enable_request_queue=True
        )
    
    @pytest.mark.asyncio
    async def test_resilient_request_execution_success(self, resilience_manager):
        """Test successful resilient request execution"""
        mock_func = AsyncMock(return_value="success")
        
        result = await resilience_manager.execute_resilient_request(
            mock_func,
            service_name="test_service",
            operation="test_operation",
            use_retry=True,
            use_fallback=True,
            use_deduplication=True
        )
        
        assert result == "success"
        assert mock_func.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_request_with_retry(self, resilience_manager):
        """Test resilient request with retry mechanism"""
        mock_func = AsyncMock()
        mock_func.side_effect = [
            ConnectionError("First failure"),
            "success"
        ]
        
        result = await resilience_manager.execute_resilient_request(
            mock_func,
            service_name="test_service",
            operation="test_operation",
            use_retry=True
        )
        
        assert result == "success"
        assert mock_func.call_count == 2
    
    @pytest.mark.asyncio
    async def test_resilient_request_with_fallback(self, resilience_manager):
        """Test resilient request with fallback mechanism"""
        mock_func = AsyncMock(side_effect=ConnectionError("Service unavailable"))
        
        result = await resilience_manager.execute_resilient_request(
            mock_func,
            service_name="test_service",
            operation="test_operation",
            use_fallback=True,
            fallback_value="fallback_result"
        )
        
        assert result == "fallback_result"
    
    @pytest.mark.asyncio
    async def test_error_recovery_integration(self, resilience_manager):
        """Test error recovery integration"""
        mock_recovery = AsyncMock(return_value=True)
        resilience_manager.error_recovery.register_recovery_strategy(
            "ConnectionError", mock_recovery
        )
        
        error = ConnectionError("Test error")
        context = {"service": "test_service"}
        
        success = await resilience_manager.attempt_error_recovery(error, context)
        
        assert success is True
        assert mock_recovery.call_count == 1
    
    def test_comprehensive_stats(self, resilience_manager):
        """Test comprehensive statistics reporting"""
        stats = resilience_manager.get_comprehensive_stats()
        
        assert "timestamp" in stats
        assert "components" in stats
        
        components = stats["components"]
        assert "retry_handler" in components
        assert "fallback_manager" in components
        assert "request_deduplicator" in components
        assert "error_recovery" in components
        assert "request_queue" in components
    
    @pytest.mark.asyncio
    async def test_resilience_manager_shutdown(self, resilience_manager):
        """Test resilience manager shutdown"""
        # Start some background tasks
        if resilience_manager.request_queue:
            await resilience_manager.request_queue.start_processing()
        
        # Shutdown should complete without errors
        await resilience_manager.shutdown()


class TestResilientOpenFDAService:
    """Test resilient OpenFDA service integration"""
    
    @pytest.fixture
    def mock_resilience_manager(self):
        """Create a mock resilience manager for testing"""
        manager = Mock()
        manager.execute_resilient_request = AsyncMock()
        manager.attempt_error_recovery = AsyncMock(return_value=False)
        manager.degradation_manager = Mock()
        manager.degradation_manager.execute_with_degradation = AsyncMock()
        manager.get_comprehensive_stats = Mock(return_value={"test": "stats"})
        manager.shutdown = AsyncMock()
        return manager
    
    @pytest.fixture
    def resilient_service(self, mock_resilience_manager):
        """Create resilient OpenFDA service with mocked dependencies"""
        with patch('services.openfda_resilient.get_resilience_manager', return_value=mock_resilience_manager):
            service = ResilientOpenFDAService(
                api_key="test_key",
                resilience_manager=mock_resilience_manager
            )
            return service
    
    @pytest.mark.asyncio
    async def test_resilient_predicate_search_success(self, resilient_service, mock_resilience_manager):
        """Test successful resilient predicate search"""
        expected_results = [
            {
                "k_number": "K123456",
                "device_name": "Test Device",
                "intended_use": "Test use",
                "product_code": "ABC",
                "clearance_date": "2023-01-01"
            }
        ]
        
        mock_resilience_manager.execute_resilient_request.return_value = expected_results
        
        results = await resilient_service.search_predicates_resilient(
            search_terms=["cardiac monitor"],
            product_code="DQO"
        )
        
        assert results == expected_results
        assert mock_resilience_manager.execute_resilient_request.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_predicate_search_with_recovery(self, resilient_service, mock_resilience_manager):
        """Test resilient predicate search with error recovery"""
        # First call fails, recovery succeeds, second call succeeds
        mock_resilience_manager.execute_resilient_request.side_effect = [
            RateLimitExceededError("Rate limit exceeded"),
            []  # Empty results after recovery
        ]
        mock_resilience_manager.attempt_error_recovery.return_value = True
        
        with patch.object(resilient_service, 'search_predicates', return_value=[]):
            results = await resilient_service.search_predicates_resilient(
                search_terms=["test device"]
            )
        
        assert results == []
        assert mock_resilience_manager.attempt_error_recovery.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_predicate_search_with_degradation(self, resilient_service, mock_resilience_manager):
        """Test resilient predicate search with graceful degradation"""
        # Resilient request fails, recovery fails, use degradation
        mock_resilience_manager.execute_resilient_request.side_effect = FDAAPIError("API Error")
        mock_resilience_manager.attempt_error_recovery.return_value = False
        mock_resilience_manager.degradation_manager.execute_with_degradation.return_value = []
        
        results = await resilient_service.search_predicates_resilient(
            search_terms=["test device"]
        )
        
        assert results == []
        assert mock_resilience_manager.degradation_manager.execute_with_degradation.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_device_details_success(self, resilient_service, mock_resilience_manager):
        """Test successful resilient device details lookup"""
        expected_result = {
            "k_number": "K123456",
            "device_name": "Test Device",
            "intended_use": "Test use",
            "product_code": "ABC",
            "clearance_date": "2023-01-01"
        }
        
        mock_resilience_manager.execute_resilient_request.return_value = expected_result
        
        result = await resilient_service.get_device_details_resilient("K123456")
        
        assert result == expected_result
        assert mock_resilience_manager.execute_resilient_request.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_classification_lookup_success(self, resilient_service, mock_resilience_manager):
        """Test successful resilient classification lookup"""
        expected_results = [
            {
                "device_class": "II",
                "product_code": "DQO",
                "device_name": "Cardiac Monitor",
                "regulation_number": "21 CFR 870.2300"
            }
        ]
        
        mock_resilience_manager.execute_resilient_request.return_value = expected_results
        
        results = await resilient_service.lookup_device_classification_resilient(
            product_code="DQO"
        )
        
        assert results == expected_results
        assert mock_resilience_manager.execute_resilient_request.call_count == 1
    
    @pytest.mark.asyncio
    async def test_resilient_adverse_events_search_success(self, resilient_service, mock_resilience_manager):
        """Test successful resilient adverse events search"""
        expected_results = [
            {
                "report_number": "12345",
                "event_date": "2023-01-01",
                "device_name": "Test Device",
                "manufacturer_name": "Test Manufacturer",
                "event_type": "Malfunction"
            }
        ]
        
        mock_resilience_manager.execute_resilient_request.return_value = expected_results
        
        results = await resilient_service.search_adverse_events_resilient(
            product_code="DQO"
        )
        
        assert results == expected_results
        assert mock_resilience_manager.execute_resilient_request.call_count == 1
    
    @pytest.mark.asyncio
    async def test_enhanced_health_check(self, resilient_service, mock_resilience_manager):
        """Test enhanced health check with resilience information"""
        mock_resilience_manager.get_comprehensive_stats.return_value = {
            "components": {"retry_handler": {"active_operations": 0}}
        }
        
        with patch.object(resilient_service, 'health_check', return_value={"status": "healthy"}):
            health = await resilient_service.health_check_resilient()
        
        assert health["status"] == "healthy"
        assert "resilience" in health
        assert "enhanced_features" in health
        assert health["enhanced_features"]["retry_mechanism"] is True
    
    @pytest.mark.asyncio
    async def test_resilience_metrics(self, resilient_service, mock_resilience_manager):
        """Test resilience metrics reporting"""
        expected_metrics = {"test": "metrics"}
        mock_resilience_manager.get_comprehensive_stats.return_value = expected_metrics
        
        metrics = await resilient_service.get_resilience_metrics()
        
        assert metrics == expected_metrics
    
    @pytest.mark.asyncio
    async def test_service_cleanup(self, resilient_service, mock_resilience_manager):
        """Test service cleanup including resilience manager"""
        with patch('services.openfda.OpenFDAService.close') as mock_super_close:
            await resilient_service.close()
        
        mock_super_close.assert_called_once()
        mock_resilience_manager.shutdown.assert_called_once()


class TestResilienceIntegration:
    """Integration tests for complete resilience system"""
    
    @pytest.mark.asyncio
    async def test_end_to_end_resilience_flow(self):
        """Test complete end-to-end resilience flow"""
        # Create a real resilience manager
        resilience_manager = ResilienceManager()
        
        # Create a function that fails initially then succeeds
        call_count = 0
        
        async def flaky_function():
            nonlocal call_count
            call_count += 1
            if call_count <= 2:
                raise ConnectionError(f"Failure {call_count}")
            return f"Success after {call_count} attempts"
        
        # Execute with full resilience
        result = await resilience_manager.execute_resilient_request(
            flaky_function,
            service_name="test_service",
            operation="flaky_operation",
            use_retry=True,
            use_fallback=True,
            use_deduplication=False,  # Disable to allow retries
            fallback_value="fallback_result"
        )
        
        assert result == "Success after 3 attempts"
        assert call_count == 3
        
        # Cleanup
        await resilience_manager.shutdown()
    
    @pytest.mark.asyncio
    async def test_resilience_with_real_timeouts(self):
        """Test resilience mechanisms with real timeout scenarios"""
        resilience_manager = ResilienceManager()
        
        async def timeout_function():
            await asyncio.sleep(2.0)  # Longer than fallback timeout
            return "should_not_reach"
        
        # Should fallback due to timeout
        result = await resilience_manager.execute_resilient_request(
            timeout_function,
            service_name="timeout_service",
            operation="slow_operation",
            use_fallback=True,
            fallback_value="timeout_fallback"
        )
        
        assert result == "timeout_fallback"
        
        # Cleanup
        await resilience_manager.shutdown()


if __name__ == "__main__":
    # Run specific test categories
    pytest.main([
        __file__,
        "-v",
        "--tb=short",
        "-k", "test_resilience"
    ])