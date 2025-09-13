"""
FDA API Health Monitoring Tests

This module contains tests for continuous health monitoring of the FDA API.
It validates API availability, response times, error rates, and overall service health.
"""

import asyncio
import time
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import statistics
import json

from services.openfda import (
    OpenFDAService,
    create_production_openfda_service,
    FDAAPIError,
    RateLimitExceededError,
    PredicateNotFoundError
)


pytestmark = pytest.mark.real_api


class HealthMonitor:
    """Utility class for monitoring API health over time"""
    
    def __init__(self):
        self.health_checks = []
        self.error_log = []
        self.performance_log = []
    
    def record_health_check(self, status: str, response_time: float, metadata: Dict[str, Any] = None):
        """Record a health check result"""
        self.health_checks.append({
            "timestamp": datetime.now().isoformat(),
            "status": status,
            "response_time_seconds": response_time,
            "metadata": metadata or {}
        })
    
    def record_error(self, error_type: str, error_message: str, metadata: Dict[str, Any] = None):
        """Record an error occurrence"""
        self.error_log.append({
            "timestamp": datetime.now().isoformat(),
            "error_type": error_type,
            "error_message": error_message,
            "metadata": metadata or {}
        })
    
    def record_performance(self, operation: str, duration: float, success: bool, metadata: Dict[str, Any] = None):
        """Record a performance measurement"""
        self.performance_log.append({
            "timestamp": datetime.now().isoformat(),
            "operation": operation,
            "duration_seconds": duration,
            "success": success,
            "metadata": metadata or {}
        })
    
    def get_health_summary(self) -> Dict[str, Any]:
        """Get overall health summary"""
        if not self.health_checks:
            return {"status": "no_data", "checks_performed": 0}
        
        # Calculate health metrics
        total_checks = len(self.health_checks)
        healthy_checks = sum(1 for check in self.health_checks if check["status"] == "healthy")
        health_percentage = (healthy_checks / total_checks) * 100
        
        # Calculate response time statistics
        response_times = [check["response_time_seconds"] for check in self.health_checks]
        
        return {
            "overall_status": "healthy" if health_percentage >= 80 else "degraded" if health_percentage >= 50 else "unhealthy",
            "health_percentage": health_percentage,
            "total_checks": total_checks,
            "healthy_checks": healthy_checks,
            "error_count": len(self.error_log),
            "avg_response_time": statistics.mean(response_times),
            "max_response_time": max(response_times),
            "min_response_time": min(response_times),
            "last_check_time": self.health_checks[-1]["timestamp"],
            "last_check_status": self.health_checks[-1]["status"]
        }
    
    def get_error_analysis(self) -> Dict[str, Any]:
        """Analyze error patterns"""
        if not self.error_log:
            return {"total_errors": 0}
        
        # Group errors by type
        error_types = {}
        for error in self.error_log:
            error_type = error["error_type"]
            if error_type not in error_types:
                error_types[error_type] = 0
            error_types[error_type] += 1
        
        return {
            "total_errors": len(self.error_log),
            "error_types": error_types,
            "recent_errors": self.error_log[-5:] if len(self.error_log) > 5 else self.error_log
        }


class TestFDAAPIHealthMonitoring:
    """Test continuous health monitoring of FDA API"""
    
    @pytest_asyncio.fixture(scope="class")
    async def health_monitoring_service(self):
        """Create service for health monitoring"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_continuous_health_monitoring(self, health_monitoring_service):
        """Test continuous health monitoring over time"""
        monitor = HealthMonitor()
        monitoring_duration = 30  # seconds
        check_interval = 5  # seconds
        
        start_time = time.time()
        
        while time.time() - start_time < monitoring_duration:
            # Perform health check
            check_start = time.time()
            
            try:
                health_status = await health_monitoring_service.health_check()
                response_time = time.time() - check_start
                
                monitor.record_health_check(
                    status=health_status.get("status", "unknown"),
                    response_time=response_time,
                    metadata={
                        "circuit_breaker_state": health_status.get("circuit_breaker_state"),
                        "api_key_configured": health_status.get("api_key_configured")
                    }
                )
                
            except Exception as e:
                response_time = time.time() - check_start
                monitor.record_health_check(
                    status="error",
                    response_time=response_time
                )
                monitor.record_error(
                    error_type=type(e).__name__,
                    error_message=str(e)
                )
            
            # Wait before next check
            await asyncio.sleep(check_interval)
        
        # Analyze monitoring results
        health_summary = monitor.get_health_summary()
        error_analysis = monitor.get_error_analysis()
        
        print(f"Health monitoring summary: {json.dumps(health_summary, indent=2)}")
        print(f"Error analysis: {json.dumps(error_analysis, indent=2)}")
        
        # Health assertions
        assert health_summary["total_checks"] >= 3, "Should perform multiple health checks"
        assert health_summary["health_percentage"] >= 50, f"Health percentage should be at least 50%, got {health_summary['health_percentage']:.1f}%"
        assert health_summary["avg_response_time"] < 30.0, f"Average response time should be under 30s, got {health_summary['avg_response_time']:.2f}s"
    
    @pytest.mark.asyncio
    async def test_api_availability_monitoring(self, health_monitoring_service):
        """Test API availability monitoring"""
        monitor = HealthMonitor()
        availability_checks = 10
        
        for i in range(availability_checks):
            check_start = time.time()
            
            try:
                # Simple availability check using basic search
                results = await health_monitoring_service.search_predicates(
                    search_terms=["device"],
                    limit=1
                )
                
                response_time = time.time() - check_start
                monitor.record_performance(
                    operation="availability_check",
                    duration=response_time,
                    success=True,
                    metadata={"result_count": len(results)}
                )
                
            except RateLimitExceededError as e:
                response_time = time.time() - check_start
                monitor.record_performance(
                    operation="availability_check",
                    duration=response_time,
                    success=False,
                    metadata={"error_type": "rate_limited"}
                )
                monitor.record_error("RateLimitExceededError", str(e))
                
            except FDAAPIError as e:
                response_time = time.time() - check_start
                monitor.record_performance(
                    operation="availability_check",
                    duration=response_time,
                    success=False,
                    metadata={"error_type": "api_error", "status_code": e.status_code}
                )
                monitor.record_error("FDAAPIError", str(e))
                
            except Exception as e:
                response_time = time.time() - check_start
                monitor.record_performance(
                    operation="availability_check",
                    duration=response_time,
                    success=False,
                    metadata={"error_type": "unexpected_error"}
                )
                monitor.record_error("UnexpectedError", str(e))
            
            # Small delay between checks
            await asyncio.sleep(1)
        
        # Calculate availability metrics
        successful_checks = sum(1 for perf in monitor.performance_log if perf["success"])
        availability_percentage = (successful_checks / availability_checks) * 100
        
        print(f"API Availability: {availability_percentage:.1f}% ({successful_checks}/{availability_checks})")
        
        # Availability assertions
        assert availability_percentage >= 70, f"API availability should be at least 70%, got {availability_percentage:.1f}%"
        
        if successful_checks > 0:
            successful_times = [perf["duration_seconds"] for perf in monitor.performance_log if perf["success"]]
            avg_response_time = statistics.mean(successful_times)
            assert avg_response_time < 15.0, f"Average response time for successful requests should be under 15s, got {avg_response_time:.2f}s"
    
    @pytest.mark.asyncio
    async def test_error_rate_monitoring(self, health_monitoring_service):
        """Test error rate monitoring"""
        monitor = HealthMonitor()
        test_operations = [
            {"operation": "valid_search", "params": {"search_terms": ["pacemaker"], "limit": 3}},
            {"operation": "empty_search", "params": {"search_terms": ["nonexistent_xyz"], "limit": 1}},
            {"operation": "classification_lookup", "params": {"product_code": "DQO"}},
            {"operation": "invalid_classification", "params": {"product_code": "XXX"}},
        ]
        
        for operation_config in test_operations:
            operation_name = operation_config["operation"]
            
            try:
                start_time = time.time()
                
                if "search_terms" in operation_config["params"]:
                    results = await health_monitoring_service.search_predicates(**operation_config["params"])
                else:
                    results = await health_monitoring_service.lookup_device_classification(**operation_config["params"])
                
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=True,
                    metadata={"result_count": len(results)}
                )
                
            except PredicateNotFoundError as e:
                duration = time.time() - start_time
                # This is expected for some operations
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=True,  # Not finding results is still a successful API call
                    metadata={"expected_no_results": True}
                )
                
            except (FDAAPIError, RateLimitExceededError) as e:
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=False
                )
                monitor.record_error(type(e).__name__, str(e), {"operation": operation_name})
                
            except Exception as e:
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=False
                )
                monitor.record_error("UnexpectedError", str(e), {"operation": operation_name})
        
        # Analyze error rates
        total_operations = len(monitor.performance_log)
        successful_operations = sum(1 for perf in monitor.performance_log if perf["success"])
        error_rate = ((total_operations - successful_operations) / total_operations) * 100 if total_operations > 0 else 0
        
        error_analysis = monitor.get_error_analysis()
        
        print(f"Error rate monitoring: {error_rate:.1f}% error rate ({total_operations - successful_operations}/{total_operations})")
        print(f"Error breakdown: {error_analysis['error_types']}")
        
        # Error rate assertions
        assert error_rate <= 50, f"Error rate should be 50% or less, got {error_rate:.1f}%"
        assert total_operations > 0, "Should perform at least one operation"
    
    @pytest.mark.asyncio
    async def test_response_time_monitoring(self, health_monitoring_service):
        """Test response time monitoring and alerting"""
        monitor = HealthMonitor()
        response_time_threshold = 10.0  # seconds
        slow_response_count = 0
        
        # Test different types of operations
        operations = [
            ("predicate_search", lambda: health_monitoring_service.search_predicates(["pacemaker"], limit=5)),
            ("classification_lookup", lambda: health_monitoring_service.lookup_device_classification(product_code="DQO")),
            ("health_check", lambda: health_monitoring_service.health_check()),
        ]
        
        for operation_name, operation_func in operations:
            start_time = time.time()
            
            try:
                result = await operation_func()
                duration = time.time() - start_time
                
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=True
                )
                
                if duration > response_time_threshold:
                    slow_response_count += 1
                    print(f"SLOW RESPONSE ALERT: {operation_name} took {duration:.2f}s (threshold: {response_time_threshold}s)")
                
            except Exception as e:
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=operation_name,
                    duration=duration,
                    success=False
                )
                monitor.record_error(type(e).__name__, str(e), {"operation": operation_name})
        
        # Analyze response times
        if monitor.performance_log:
            response_times = [perf["duration_seconds"] for perf in monitor.performance_log]
            avg_response_time = statistics.mean(response_times)
            max_response_time = max(response_times)
            
            print(f"Response time analysis:")
            print(f"  Average: {avg_response_time:.2f}s")
            print(f"  Maximum: {max_response_time:.2f}s")
            print(f"  Slow responses: {slow_response_count}/{len(operations)}")
            
            # Response time assertions
            assert avg_response_time < 15.0, f"Average response time should be under 15s, got {avg_response_time:.2f}s"
            assert max_response_time < 30.0, f"Maximum response time should be under 30s, got {max_response_time:.2f}s"
            assert slow_response_count <= len(operations) // 2, f"Too many slow responses: {slow_response_count}/{len(operations)}"
    
    @pytest.mark.asyncio
    async def test_circuit_breaker_monitoring(self, health_monitoring_service):
        """Test circuit breaker state monitoring"""
        monitor = HealthMonitor()
        
        # Monitor circuit breaker state over multiple operations
        for i in range(5):
            try:
                # Perform operation
                await health_monitoring_service.search_predicates(
                    search_terms=[f"test_{i}"],
                    limit=1
                )
                
                # Check circuit breaker state
                health_status = await health_monitoring_service.health_check()
                circuit_breaker_state = health_status.get("circuit_breaker_state", "unknown")
                
                monitor.record_health_check(
                    status="healthy",
                    response_time=0,  # Not measuring response time here
                    metadata={"circuit_breaker_state": circuit_breaker_state}
                )
                
            except Exception as e:
                # Check circuit breaker state even after errors
                try:
                    health_status = await health_monitoring_service.health_check()
                    circuit_breaker_state = health_status.get("circuit_breaker_state", "unknown")
                    
                    monitor.record_health_check(
                        status="error",
                        response_time=0,
                        metadata={"circuit_breaker_state": circuit_breaker_state}
                    )
                    
                except Exception:
                    # If health check also fails, record unknown state
                    monitor.record_health_check(
                        status="error",
                        response_time=0,
                        metadata={"circuit_breaker_state": "unknown"}
                    )
                
                monitor.record_error(type(e).__name__, str(e))
            
            # Small delay between operations
            await asyncio.sleep(1)
        
        # Analyze circuit breaker behavior
        circuit_breaker_states = []
        for check in monitor.health_checks:
            state = check["metadata"].get("circuit_breaker_state")
            if state:
                circuit_breaker_states.append(state)
        
        print(f"Circuit breaker states observed: {set(circuit_breaker_states)}")
        
        # Circuit breaker assertions
        assert len(circuit_breaker_states) > 0, "Should observe circuit breaker states"
        
        # Circuit breaker should start in CLOSED state for healthy service
        if circuit_breaker_states:
            # Most states should be CLOSED for a healthy service
            closed_states = sum(1 for state in circuit_breaker_states if state == "CLOSED")
            closed_percentage = (closed_states / len(circuit_breaker_states)) * 100
            
            print(f"Circuit breaker CLOSED percentage: {closed_percentage:.1f}%")
            # Allow for some flexibility as circuit breaker may open due to errors
            assert closed_percentage >= 50, f"Circuit breaker should be CLOSED at least 50% of the time, got {closed_percentage:.1f}%"


class TestFDAAPIServiceLevelMonitoring:
    """Test service level monitoring and SLA compliance"""
    
    @pytest_asyncio.fixture(scope="class")
    async def sla_monitoring_service(self):
        """Create service for SLA monitoring"""
        service = await create_production_openfda_service()
        yield service
        await service.close()
    
    @pytest.mark.asyncio
    async def test_sla_compliance_monitoring(self, sla_monitoring_service):
        """Test SLA compliance monitoring"""
        # Define SLA targets
        sla_targets = {
            "availability_percentage": 95.0,  # 95% availability
            "avg_response_time_seconds": 5.0,  # Average response time under 5s
            "p95_response_time_seconds": 10.0,  # 95th percentile under 10s
            "error_rate_percentage": 5.0  # Error rate under 5%
        }
        
        monitor = HealthMonitor()
        test_operations = 10
        
        # Perform multiple operations to measure SLA compliance
        for i in range(test_operations):
            start_time = time.time()
            
            try:
                results = await sla_monitoring_service.search_predicates(
                    search_terms=["device"],
                    limit=3
                )
                
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=f"sla_test_{i}",
                    duration=duration,
                    success=True,
                    metadata={"result_count": len(results)}
                )
                
            except Exception as e:
                duration = time.time() - start_time
                monitor.record_performance(
                    operation=f"sla_test_{i}",
                    duration=duration,
                    success=False
                )
                monitor.record_error(type(e).__name__, str(e))
            
            # Small delay between operations
            await asyncio.sleep(0.5)
        
        # Calculate SLA metrics
        total_operations = len(monitor.performance_log)
        successful_operations = sum(1 for perf in monitor.performance_log if perf["success"])
        
        # Availability
        availability = (successful_operations / total_operations) * 100 if total_operations > 0 else 0
        
        # Response times (only for successful operations)
        successful_response_times = [
            perf["duration_seconds"] for perf in monitor.performance_log if perf["success"]
        ]
        
        if successful_response_times:
            avg_response_time = statistics.mean(successful_response_times)
            p95_response_time = statistics.quantiles(successful_response_times, n=20)[18] if len(successful_response_times) >= 20 else max(successful_response_times)
        else:
            avg_response_time = float('inf')
            p95_response_time = float('inf')
        
        # Error rate
        error_rate = ((total_operations - successful_operations) / total_operations) * 100 if total_operations > 0 else 0
        
        # SLA compliance report
        sla_compliance = {
            "availability_percentage": availability,
            "avg_response_time_seconds": avg_response_time,
            "p95_response_time_seconds": p95_response_time,
            "error_rate_percentage": error_rate,
            "total_operations": total_operations,
            "successful_operations": successful_operations
        }
        
        print("SLA Compliance Report:")
        for metric, value in sla_compliance.items():
            if metric in sla_targets:
                target = sla_targets[metric]
                status = "✓ PASS" if value <= target else "✗ FAIL"
                print(f"  {metric}: {value:.2f} (target: {target:.2f}) {status}")
            else:
                print(f"  {metric}: {value}")
        
        # SLA assertions (relaxed for real API testing)
        assert availability >= 70, f"Availability should be at least 70%, got {availability:.1f}%"
        
        if successful_response_times:
            assert avg_response_time < 15.0, f"Average response time should be under 15s, got {avg_response_time:.2f}s"
            assert p95_response_time < 30.0, f"95th percentile response time should be under 30s, got {p95_response_time:.2f}s"
        
        assert error_rate <= 30, f"Error rate should be 30% or less, got {error_rate:.1f}%"
    
    @pytest.mark.asyncio
    async def test_degraded_service_detection(self, sla_monitoring_service):
        """Test detection of degraded service conditions"""
        monitor = HealthMonitor()
        degradation_indicators = {
            "high_response_times": 0,
            "frequent_errors": 0,
            "rate_limiting": 0,
            "timeouts": 0
        }
        
        # Perform operations to detect degradation
        for i in range(8):
            start_time = time.time()
            
            try:
                results = await sla_monitoring_service.search_predicates(
                    search_terms=[f"degradation_test_{i}"],
                    limit=5
                )
                
                duration = time.time() - start_time
                
                # Check for high response times
                if duration > 10.0:
                    degradation_indicators["high_response_times"] += 1
                
                monitor.record_performance(
                    operation=f"degradation_test_{i}",
                    duration=duration,
                    success=True
                )
                
            except RateLimitExceededError as e:
                duration = time.time() - start_time
                degradation_indicators["rate_limiting"] += 1
                monitor.record_error("RateLimitExceededError", str(e))
                monitor.record_performance(f"degradation_test_{i}", duration, False)
                
            except asyncio.TimeoutError as e:
                duration = time.time() - start_time
                degradation_indicators["timeouts"] += 1
                monitor.record_error("TimeoutError", str(e))
                monitor.record_performance(f"degradation_test_{i}", duration, False)
                
            except FDAAPIError as e:
                duration = time.time() - start_time
                degradation_indicators["frequent_errors"] += 1
                monitor.record_error("FDAAPIError", str(e))
                monitor.record_performance(f"degradation_test_{i}", duration, False)
                
            except Exception as e:
                duration = time.time() - start_time
                degradation_indicators["frequent_errors"] += 1
                monitor.record_error("UnexpectedError", str(e))
                monitor.record_performance(f"degradation_test_{i}", duration, False)
            
            # Small delay between tests
            await asyncio.sleep(1)
        
        # Analyze degradation indicators
        total_tests = 8
        degradation_score = sum(degradation_indicators.values())
        
        print("Service Degradation Analysis:")
        for indicator, count in degradation_indicators.items():
            percentage = (count / total_tests) * 100
            print(f"  {indicator}: {count}/{total_tests} ({percentage:.1f}%)")
        
        print(f"Overall degradation score: {degradation_score}/{total_tests * 4}")
        
        # Degradation detection assertions
        # Service is considered degraded if more than 50% of operations show issues
        degradation_percentage = (degradation_score / (total_tests * 4)) * 100
        
        if degradation_percentage > 50:
            print(f"WARNING: Service appears degraded ({degradation_percentage:.1f}% degradation)")
        else:
            print(f"Service appears healthy ({degradation_percentage:.1f}% degradation)")
        
        # Allow for some degradation in real API testing
        assert degradation_percentage <= 75, f"Service degradation should not exceed 75%, got {degradation_percentage:.1f}%"


# Utility functions for health monitoring
def create_health_alert(alert_type: str, message: str, severity: str = "warning") -> Dict[str, Any]:
    """Create a health alert"""
    return {
        "timestamp": datetime.now().isoformat(),
        "alert_type": alert_type,
        "message": message,
        "severity": severity
    }


def calculate_uptime_percentage(health_checks: List[Dict[str, Any]]) -> float:
    """Calculate uptime percentage from health checks"""
    if not health_checks:
        return 0.0
    
    healthy_checks = sum(1 for check in health_checks if check["status"] == "healthy")
    return (healthy_checks / len(health_checks)) * 100


def detect_service_anomalies(performance_log: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """Detect anomalies in service performance"""
    anomalies = []
    
    if len(performance_log) < 3:
        return anomalies
    
    # Calculate baseline metrics
    response_times = [perf["duration_seconds"] for perf in performance_log if perf["success"]]
    
    if response_times:
        avg_response_time = statistics.mean(response_times)
        std_dev = statistics.stdev(response_times) if len(response_times) > 1 else 0
        
        # Detect response time anomalies (more than 2 standard deviations from mean)
        threshold = avg_response_time + (2 * std_dev)
        
        for perf in performance_log:
            if perf["success"] and perf["duration_seconds"] > threshold:
                anomalies.append({
                    "type": "high_response_time",
                    "operation": perf["operation"],
                    "duration": perf["duration_seconds"],
                    "threshold": threshold,
                    "timestamp": perf["timestamp"]
                })
    
    return anomalies