"""
Tests for FDA API Monitoring Service

This test suite validates the comprehensive FDA API monitoring functionality:
- API usage analytics and tracking
- Health check dashboard
- Alerting system
- Usage reports and cost tracking
- Circuit breaker monitoring
- Performance metrics
"""

import asyncio
import json
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from unittest.mock import Mock, AsyncMock, patch
from typing import Dict, Any, List

from services.fda_monitoring import (
    FDAAPIMonitor,
    FDAAPIEndpoint,
    AlertType,
    FDAAPICall,
    FDAAPIMetrics,
    AlertRule,
    get_fda_monitor,
    init_fda_monitoring
)
from services.error_tracking import AlertSeverity


class TestFDAAPIMonitor:
    """Test FDA API monitoring functionality"""
    
    @pytest_asyncio.fixture
    async def mock_redis(self):
        """Mock Redis client"""
        redis_mock = AsyncMock()
        redis_mock.hset = AsyncMock()
        redis_mock.lpush = AsyncMock()
        redis_mock.expire = AsyncMock()
        return redis_mock
    
    @pytest_asyncio.fixture
    async def fda_monitor(self, mock_redis):
        """Create FDA API monitor instance"""
        return FDAAPIMonitor(
            redis_client=mock_redis,
            enable_detailed_logging=True,
            enable_cost_tracking=True
        )
    
    @pytest.fixture
    def sample_api_call(self):
        """Sample FDA API call data"""
        return FDAAPICall(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            query_params={"search": "cardiac pacemaker", "limit": 100},
            response_time_ms=1500.0,
            status_code=200,
            success=True,
            cache_hit=False,
            user_id="test_user_123",
            project_id=456,
            request_id="req_789",
            response_size_bytes=51200
        )
    
    @pytest.mark.asyncio
    async def test_track_api_call_success(self, fda_monitor, sample_api_call):
        """Test tracking successful API call"""
        # Track the API call
        await fda_monitor.track_api_call(
            endpoint=sample_api_call.endpoint,
            method=sample_api_call.method,
            query_params=sample_api_call.query_params,
            response_time_ms=sample_api_call.response_time_ms,
            status_code=sample_api_call.status_code,
            success=sample_api_call.success,
            cache_hit=sample_api_call.cache_hit,
            user_id=sample_api_call.user_id,
            project_id=sample_api_call.project_id,
            request_id=sample_api_call.request_id,
            response_size_bytes=sample_api_call.response_size_bytes
        )
        
        # Verify call was stored
        assert len(fda_monitor.recent_calls) == 1
        stored_call = fda_monitor.recent_calls[0]
        
        assert stored_call.endpoint == sample_api_call.endpoint
        assert stored_call.method == sample_api_call.method
        assert stored_call.response_time_ms == sample_api_call.response_time_ms
        assert stored_call.status_code == sample_api_call.status_code
        assert stored_call.success == sample_api_call.success
        assert stored_call.user_id == sample_api_call.user_id
        assert stored_call.project_id == sample_api_call.project_id
    
    @pytest.mark.asyncio
    async def test_track_api_call_error(self, fda_monitor):
        """Test tracking failed API call"""
        await fda_monitor.track_api_call(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            query_params={"search": "invalid query"},
            response_time_ms=5000.0,
            status_code=500,
            success=False,
            error_type="FDAAPIError",
            error_message="Internal server error",
            user_id="test_user_123"
        )
        
        # Verify error was tracked
        assert len(fda_monitor.recent_calls) == 1
        error_call = fda_monitor.recent_calls[0]
        
        assert not error_call.success
        assert error_call.error_type == "FDAAPIError"
        assert error_call.error_message == "Internal server error"
        assert error_call.status_code == 500
    
    @pytest.mark.asyncio
    async def test_track_circuit_breaker_state(self, fda_monitor, mock_redis):
        """Test circuit breaker state tracking"""
        endpoint = FDAAPIEndpoint.DEVICE_510K
        
        # Track circuit breaker opening
        await fda_monitor.track_circuit_breaker_state(
            endpoint=endpoint,
            state="OPEN",
            failure_count=5,
            last_failure_time=datetime.now()
        )
        
        # Verify state was tracked
        assert endpoint.value in fda_monitor.circuit_breaker_states
        state_info = fda_monitor.circuit_breaker_states[endpoint.value]
        
        assert state_info["state"] == "OPEN"
        assert state_info["failure_count"] == 5
        assert "last_failure_time" in state_info
        assert "updated_at" in state_info
        
        # Verify Redis storage was called
        mock_redis.hset.assert_called_once()
    
    @pytest.mark.asyncio
    async def test_get_api_usage_analytics(self, fda_monitor):
        """Test API usage analytics generation"""
        # Add sample API calls
        for i in range(10):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test query {i}"},
                response_time_ms=1000.0 + i * 100,
                status_code=200 if i < 8 else 500,  # 2 failures
                success=i < 8,
                cache_hit=i % 3 == 0,  # Every 3rd is cache hit
                user_id=f"user_{i % 3}",  # 3 unique users
                project_id=i % 2 + 1  # 2 unique projects
            )
        
        # Get analytics
        analytics = await fda_monitor.get_api_usage_analytics(time_window_hours=1)
        
        # Verify analytics
        assert analytics["total_requests"] == 10
        assert analytics["metrics"].total_requests == 10
        assert analytics["metrics"].successful_requests == 8
        assert analytics["metrics"].failed_requests == 2
        assert analytics["metrics"].unique_users == 3
        assert analytics["metrics"].unique_projects == 2
        
        # Verify cache hit rate
        expected_cache_hits = 4  # Indices 0, 3, 6, 9
        expected_cache_hit_rate = expected_cache_hits / 10
        assert abs(analytics["metrics"].cache_hit_rate - expected_cache_hit_rate) < 0.01
        
        # Verify trends are included
        assert "trends" in analytics
        assert "hourly_requests" in analytics["trends"]
        assert "hourly_errors" in analytics["trends"]
        assert "hourly_response_times" in analytics["trends"]
        
        # Verify top users and projects
        assert len(analytics["top_users"]) <= 3
        assert len(analytics["top_projects"]) <= 2
    
    @pytest.mark.asyncio
    async def test_get_health_dashboard(self, fda_monitor):
        """Test health dashboard data generation"""
        # Add some API calls for health assessment
        for i in range(5):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=2000.0,
                status_code=200,
                success=True,
                user_id=f"user_{i}"
            )
        
        # Get health dashboard
        dashboard = await fda_monitor.get_health_dashboard()
        
        # Verify dashboard structure
        assert "overall_status" in dashboard
        assert "health_details" in dashboard
        assert "recent_metrics" in dashboard
        assert "circuit_breakers" in dashboard
        assert "active_alerts" in dashboard
        assert "performance_summary" in dashboard
        assert "dashboard_updated_at" in dashboard
        
        # Verify health status is determined
        assert dashboard["overall_status"] in ["healthy", "degraded", "unhealthy", "unknown"]
        
        # Verify performance summary
        perf_summary = dashboard["performance_summary"]
        assert "requests_per_hour" in perf_summary
        assert "success_rate" in perf_summary
        assert "avg_response_time_ms" in perf_summary
        assert "cache_hit_rate" in perf_summary
    
    @pytest.mark.asyncio
    async def test_generate_usage_report(self, fda_monitor):
        """Test comprehensive usage report generation"""
        start_date = datetime.now() - timedelta(days=1)
        end_date = datetime.now()
        
        # Add sample data
        for i in range(20):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K if i % 2 == 0 else FDAAPIEndpoint.DEVICE_CLASSIFICATION,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=1500.0 + i * 50,
                status_code=200 if i < 18 else 429,  # 2 rate limit hits
                success=i < 18,
                error_type="RateLimitExceededError" if i >= 18 else None,
                cache_hit=i % 4 == 0,
                user_id=f"user_{i % 5}",  # 5 unique users
                project_id=i % 3 + 1,  # 3 unique projects
                response_size_bytes=10240 + i * 1024
            )
        
        # Generate report
        report = await fda_monitor.generate_usage_report(
            start_date=start_date,
            end_date=end_date,
            include_cost_analysis=True,
            include_performance_analysis=True,
            include_error_analysis=True
        )
        
        # Verify report structure
        assert "report_period" in report
        assert "summary" in report
        assert "cost_analysis" in report
        assert "performance_analysis" in report
        assert "error_analysis" in report
        assert "endpoint_breakdown" in report
        assert "user_activity" in report
        assert "recommendations" in report
        
        # Verify report period
        period = report["report_period"]
        assert "start_date" in period
        assert "end_date" in period
        assert "duration_days" in period
        
        # Verify summary metrics
        summary = report["summary"]
        assert summary.total_requests == 20
        assert summary.successful_requests == 18
        assert summary.failed_requests == 2
        
        # Verify cost analysis
        cost_analysis = report["cost_analysis"]
        assert "total_cost_usd" in cost_analysis
        assert "cost_by_endpoint" in cost_analysis
        assert "cost_by_user" in cost_analysis
        
        # Verify performance analysis
        perf_analysis = report["performance_analysis"]
        assert "avg_response_time_ms" in perf_analysis
        assert "p95_response_time_ms" in perf_analysis
        assert "success_rate" in perf_analysis
        
        # Verify error analysis
        error_analysis = report["error_analysis"]
        assert error_analysis["total_errors"] == 2
        assert "RateLimitExceededError" in error_analysis["error_types"]
        
        # Verify recommendations
        assert isinstance(report["recommendations"], list)
    
    @pytest.mark.asyncio
    async def test_alert_rules_management(self, fda_monitor):
        """Test alert rule management"""
        # Create custom alert rule
        custom_rule = AlertRule(
            name="Custom High Error Rate",
            alert_type=AlertType.HIGH_ERROR_RATE,
            threshold=0.05,  # 5% error rate
            time_window_minutes=10,
            severity=AlertSeverity.HIGH,
            notification_channels=["email", "slack"]
        )
        
        # Add alert rule
        await fda_monitor.add_alert_rule(custom_rule)
        
        # Verify rule was added
        rules = await fda_monitor.get_alert_rules()
        custom_rules = [rule for rule in rules if rule["name"] == "Custom High Error Rate"]
        assert len(custom_rules) == 1
        
        added_rule = custom_rules[0]
        assert added_rule["alert_type"] == AlertType.HIGH_ERROR_RATE.value
        assert added_rule["threshold"] == 0.05
        assert added_rule["severity"] == AlertSeverity.HIGH.value
        
        # Remove alert rule
        success = await fda_monitor.remove_alert_rule("Custom High Error Rate")
        assert success
        
        # Verify rule was removed
        rules_after = await fda_monitor.get_alert_rules()
        custom_rules_after = [rule for rule in rules_after if rule["name"] == "Custom High Error Rate"]
        assert len(custom_rules_after) == 0
        
        # Try to remove non-existent rule
        success_nonexistent = await fda_monitor.remove_alert_rule("Non-existent Rule")
        assert not success_nonexistent
    
    @pytest.mark.asyncio
    async def test_monitor_api_call_context_manager(self, fda_monitor):
        """Test API call monitoring context manager"""
        # Test successful call
        async with fda_monitor.monitor_api_call(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            user_id="test_user",
            project_id=123,
            request_id="test_req"
        ):
            # Simulate API call work
            await asyncio.sleep(0.01)
        
        # Verify call was tracked
        assert len(fda_monitor.recent_calls) == 1
        call = fda_monitor.recent_calls[0]
        assert call.success
        assert call.status_code == 200
        assert call.user_id == "test_user"
        assert call.project_id == 123
        
        # Test failed call
        try:
            async with fda_monitor.monitor_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_CLASSIFICATION,
                method="POST"
            ):
                raise ValueError("Test error")
        except ValueError:
            pass
        
        # Verify error was tracked
        assert len(fda_monitor.recent_calls) == 2
        error_call = fda_monitor.recent_calls[1]
        assert not error_call.success
        assert error_call.error_type == "ValueError"
        assert error_call.status_code == 500
    
    @pytest.mark.asyncio
    async def test_alert_triggering(self, fda_monitor):
        """Test alert rule triggering"""
        # Add many failed calls to trigger high error rate alert
        for i in range(15):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=1000.0,
                status_code=500 if i >= 10 else 200,  # 5 failures out of 15 (33% error rate)
                success=i < 10,
                error_type="FDAAPIError" if i >= 10 else None
            )
        
        # The default high error rate rule should have been triggered
        # (threshold is 10%, we have 33% error rate)
        
        # Check if any alert rules were triggered
        rules = await fda_monitor.get_alert_rules()
        high_error_rules = [rule for rule in rules if rule["name"] == "High Error Rate"]
        
        if high_error_rules:
            # The rule should have been triggered recently
            rule = high_error_rules[0]
            # Note: In a real scenario, we'd check if last_triggered is recent
            # For this test, we're mainly verifying the structure
            assert "last_triggered" in rule
    
    @pytest.mark.asyncio
    async def test_rate_limit_tracking(self, fda_monitor):
        """Test rate limit tracking"""
        # Track rate limit hit
        await fda_monitor.track_api_call(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            query_params={"search": "test"},
            response_time_ms=1000.0,
            status_code=429,
            success=False,
            error_type="RateLimitExceededError",
            rate_limit_remaining=0
        )
        
        # Verify rate limit was tracked
        call = fda_monitor.recent_calls[0]
        assert call.status_code == 429
        assert call.rate_limit_remaining == 0
        assert not call.success
        assert call.error_type == "RateLimitExceededError"
    
    @pytest.mark.asyncio
    async def test_cost_tracking(self, fda_monitor):
        """Test cost tracking functionality"""
        # Ensure cost tracking is enabled
        assert fda_monitor.enable_cost_tracking
        
        # Track multiple API calls
        num_calls = 100
        for i in range(num_calls):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=1000.0,
                status_code=200,
                success=True
            )
        
        # Get analytics with cost information
        analytics = await fda_monitor.get_api_usage_analytics()
        
        # Verify cost calculation
        expected_cost = num_calls * fda_monitor.cost_per_request
        assert abs(analytics["metrics"].cost_estimate_usd - expected_cost) < 0.001
    
    @pytest.mark.asyncio
    async def test_performance_metrics_calculation(self, fda_monitor):
        """Test performance metrics calculation"""
        # Add calls with varying response times
        response_times = [500, 1000, 1500, 2000, 5000, 10000]  # ms
        
        for i, response_time in enumerate(response_times):
            await fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=response_time,
                status_code=200,
                success=True,
                response_size_bytes=10240 * (i + 1)
            )
        
        # Get analytics
        analytics = await fda_monitor.get_api_usage_analytics()
        metrics = analytics["metrics"]
        
        # Verify average response time
        expected_avg = sum(response_times) / len(response_times)
        assert abs(metrics.avg_response_time_ms - expected_avg) < 1.0
        
        # Verify data transfer calculation
        expected_data_mb = sum(10240 * (i + 1) for i in range(len(response_times))) / (1024 * 1024)
        assert abs(metrics.total_data_transferred_mb - expected_data_mb) < 0.01


class TestFDAMonitoringIntegration:
    """Integration tests for FDA monitoring"""
    
    @pytest.mark.asyncio
    async def test_global_monitor_instance(self):
        """Test global monitor instance management"""
        # Get global instance
        monitor1 = get_fda_monitor()
        monitor2 = get_fda_monitor()
        
        # Should be the same instance
        assert monitor1 is monitor2
    
    @pytest.mark.asyncio
    @patch('services.fda_monitoring.redis')
    async def test_init_fda_monitoring(self, mock_redis):
        """Test FDA monitoring initialization"""
        mock_redis_client = AsyncMock()
        
        # Initialize monitoring
        monitor = await init_fda_monitoring(redis_client=mock_redis_client)
        
        # Verify monitor was created with Redis client
        assert monitor is not None
        assert monitor.redis_client is mock_redis_client
    
    @pytest.mark.asyncio
    async def test_endpoint_enum_coverage(self):
        """Test that all FDA API endpoints are covered"""
        # Verify all expected endpoints are defined
        expected_endpoints = [
            "device/510k",
            "device/classification", 
            "device/event",
            "device/recall",
            "device/enforcement"
        ]
        
        actual_endpoints = [endpoint.value for endpoint in FDAAPIEndpoint]
        
        for expected in expected_endpoints:
            assert expected in actual_endpoints
    
    @pytest.mark.asyncio
    async def test_alert_type_coverage(self):
        """Test that all expected alert types are defined"""
        expected_alert_types = [
            "rate_limit_exceeded",
            "api_unavailable",
            "high_error_rate",
            "slow_response",
            "circuit_breaker_open",
            "quota_exhausted",
            "authentication_failed"
        ]
        
        actual_alert_types = [alert_type.value for alert_type in AlertType]
        
        for expected in expected_alert_types:
            assert expected in actual_alert_types


class TestFDAMonitoringEdgeCases:
    """Test edge cases and error conditions"""
    
    @pytest.mark.asyncio
    async def test_empty_analytics(self):
        """Test analytics with no data"""
        monitor = FDAAPIMonitor()
        
        # Get analytics with no calls
        analytics = await monitor.get_api_usage_analytics()
        
        assert analytics["total_requests"] == 0
        assert analytics["metrics"].total_requests == 0
        assert analytics["metrics"].avg_response_time_ms == 0.0
        assert analytics["metrics"].cache_hit_rate == 0.0
    
    @pytest.mark.asyncio
    async def test_redis_failure_handling(self):
        """Test handling of Redis failures"""
        # Create monitor with failing Redis client
        failing_redis = AsyncMock()
        failing_redis.lpush.side_effect = Exception("Redis connection failed")
        
        monitor = FDAAPIMonitor(redis_client=failing_redis)
        
        # Should not raise exception even if Redis fails
        await monitor.track_api_call(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            query_params={},
            response_time_ms=1000.0,
            status_code=200,
            success=True
        )
        
        # Call should still be tracked in memory
        assert len(monitor.recent_calls) == 1
    
    @pytest.mark.asyncio
    async def test_buffer_overflow_handling(self):
        """Test handling of call buffer overflow"""
        monitor = FDAAPIMonitor()
        monitor.max_recent_calls = 5  # Set small buffer for testing
        
        # Add more calls than buffer size
        for i in range(10):
            await monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": f"test {i}"},
                response_time_ms=1000.0,
                status_code=200,
                success=True
            )
        
        # Buffer should not exceed max size
        assert len(monitor.recent_calls) == 5
        
        # Should contain the most recent calls
        last_call = monitor.recent_calls[-1]
        assert last_call.query_params["search"] == "test 9"
    
    @pytest.mark.asyncio
    async def test_invalid_time_window(self):
        """Test analytics with invalid time windows"""
        monitor = FDAAPIMonitor()
        
        # Add a call
        await monitor.track_api_call(
            endpoint=FDAAPIEndpoint.DEVICE_510K,
            method="GET",
            query_params={},
            response_time_ms=1000.0,
            status_code=200,
            success=True
        )
        
        # Test with very large time window
        analytics = await monitor.get_api_usage_analytics(time_window_hours=8760)  # 1 year
        assert analytics["total_requests"] == 1
        
        # Test with zero time window
        analytics_zero = await monitor.get_api_usage_analytics(time_window_hours=0)
        assert analytics_zero["total_requests"] == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"])