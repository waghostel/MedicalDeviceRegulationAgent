#!/usr/bin/env python3
"""
Task 12 Validation Script: Production Monitoring and Alerting System

This script validates the implementation of Task 12 by testing:
- FDA API monitoring service functionality
- Health dashboard integration
- Alerting system capabilities
- Usage analytics and reporting
- Circuit breaker monitoring
"""

import asyncio
import sys
import traceback
from datetime import datetime, timedelta
from typing import Dict, Any

# Import the services we implemented
from services.fda_monitoring import (
    FDAAPIMonitor,
    FDAAPIEndpoint,
    AlertType,
    FDAAPICall,
    get_fda_monitor,
    init_fda_monitoring
)
from services.fda_health_dashboard import (
    FDAHealthDashboard,
    HealthStatus,
    ComponentStatus,
    get_fda_health_dashboard,
    init_fda_health_dashboard
)
from services.fda_alerting import (
    FDAAlertingService,
    NotificationChannel,
    AlertStatus,
    get_fda_alerting_service,
    init_fda_alerting_service
)
from services.error_tracking import AlertSeverity


class Task12Validator:
    """Validator for Task 12 implementation"""
    
    def __init__(self):
        self.test_results = []
        self.fda_monitor = None
        self.health_dashboard = None
        self.alerting_service = None
    
    async def run_validation(self) -> Dict[str, Any]:
        """Run comprehensive validation of Task 12 implementation"""
        print("🔍 Starting Task 12 Validation: Production Monitoring and Alerting System")
        print("=" * 80)
        
        try:
            # Initialize services
            await self._initialize_services()
            
            # Run validation tests
            await self._test_fda_api_monitoring()
            await self._test_health_dashboard()
            await self._test_alerting_system()
            await self._test_integration()
            
            # Generate summary
            return self._generate_summary()
            
        except Exception as e:
            print(f"❌ Validation failed with error: {e}")
            traceback.print_exc()
            return {"status": "failed", "error": str(e)}
    
    async def _initialize_services(self):
        """Initialize monitoring services"""
        print("\n📋 Initializing Services...")
        
        try:
            # Initialize FDA monitoring
            self.fda_monitor = FDAAPIMonitor(
                redis_client=None,  # Use without Redis for testing
                enable_detailed_logging=True,
                enable_cost_tracking=True
            )
            self._log_success("FDA API Monitor initialized")
            
            # Initialize health dashboard
            self.health_dashboard = FDAHealthDashboard(
                openfda_service=None,  # Use without OpenFDA service for testing
                check_interval_seconds=60,
                enable_background_checks=False  # Disable for testing
            )
            self._log_success("FDA Health Dashboard initialized")
            
            # Initialize alerting service
            self.alerting_service = FDAAlertingService(
                enable_notifications=False,  # Disable for testing
                max_alerts_per_hour=100
            )
            self._log_success("FDA Alerting Service initialized")
            
        except Exception as e:
            self._log_error(f"Service initialization failed: {e}")
            raise
    
    async def _test_fda_api_monitoring(self):
        """Test FDA API monitoring functionality"""
        print("\n🔍 Testing FDA API Monitoring...")
        
        try:
            # Test API call tracking
            await self.fda_monitor.track_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                method="GET",
                query_params={"search": "cardiac pacemaker", "limit": 100},
                response_time_ms=1500.0,
                status_code=200,
                success=True,
                cache_hit=False,
                user_id="test_user_123",
                project_id=456,
                response_size_bytes=51200
            )
            self._log_success("API call tracking works")
            
            # Test circuit breaker state tracking
            await self.fda_monitor.track_circuit_breaker_state(
                endpoint=FDAAPIEndpoint.DEVICE_510K,
                state="CLOSED",
                failure_count=0
            )
            self._log_success("Circuit breaker state tracking works")
            
            # Test usage analytics
            analytics = await self.fda_monitor.get_api_usage_analytics(time_window_hours=1)
            assert analytics["total_requests"] == 1
            assert analytics["metrics"].total_requests == 1
            self._log_success("Usage analytics generation works")
            
            # Test usage report generation
            start_date = datetime.now() - timedelta(hours=1)
            end_date = datetime.now()
            report = await self.fda_monitor.generate_usage_report(
                start_date=start_date,
                end_date=end_date
            )
            assert "summary" in report
            assert "cost_analysis" in report
            self._log_success("Usage report generation works")
            
            # Test alert rule management
            from services.fda_monitoring import AlertRule
            test_rule = AlertRule(
                name="Test High Error Rate",
                alert_type=AlertType.HIGH_ERROR_RATE,
                threshold=0.1,
                time_window_minutes=5,
                severity=AlertSeverity.HIGH,
                notification_channels=["email"]
            )
            
            await self.fda_monitor.add_alert_rule(test_rule)
            rules = await self.fda_monitor.get_alert_rules()
            assert len(rules) > 0
            self._log_success("Alert rule management works")
            
        except Exception as e:
            self._log_error(f"FDA API monitoring test failed: {e}")
            raise
    
    async def _test_health_dashboard(self):
        """Test health dashboard functionality"""
        print("\n🏥 Testing Health Dashboard...")
        
        try:
            # Test health check execution
            health_result = await self.health_dashboard.run_health_check()
            assert "components" in health_result
            self._log_success("Health check execution works")
            
            # Test comprehensive health status
            health_status = await self.health_dashboard.get_comprehensive_health_status()
            assert "system_health" in health_status
            assert "component_status" in health_status
            self._log_success("Comprehensive health status works")
            
            # Test status page generation
            status_page = await self.health_dashboard.get_fda_api_status_page()
            assert "fda_api_status" in status_page
            assert "performance_summary" in status_page
            self._log_success("Status page generation works")
            
            # Test health history
            history = await self.health_dashboard.get_health_history(hours=1)
            assert "component" in history
            assert "statistics" in history
            self._log_success("Health history tracking works")
            
        except Exception as e:
            self._log_error(f"Health dashboard test failed: {e}")
            raise
    
    async def _test_alerting_system(self):
        """Test alerting system functionality"""
        print("\n🚨 Testing Alerting System...")
        
        try:
            # Test alert triggering
            from services.fda_monitoring import AlertRule
            test_rule = AlertRule(
                name="Test Alert",
                alert_type=AlertType.RATE_LIMIT_EXCEEDED,
                threshold=1,
                time_window_minutes=1,
                severity=AlertSeverity.CRITICAL,
                notification_channels=["email"]
            )
            
            trigger_data = {
                "endpoint": "device/510k",
                "status_code": 429,
                "response_time_ms": 1000
            }
            
            alert_id = await self.alerting_service.trigger_alert(
                rule=test_rule,
                trigger_data=trigger_data,
                user_id="test_user"
            )
            assert alert_id is not None
            self._log_success("Alert triggering works")
            
            # Test alert acknowledgment
            success = await self.alerting_service.acknowledge_alert(
                alert_id=alert_id,
                acknowledged_by="test_admin",
                notes="Test acknowledgment"
            )
            assert success
            self._log_success("Alert acknowledgment works")
            
            # Test alert resolution
            success = await self.alerting_service.resolve_alert(
                alert_id=alert_id,
                resolved_by="test_admin",
                resolution_notes="Test resolution"
            )
            assert success
            self._log_success("Alert resolution works")
            
            # Test alert statistics
            stats = await self.alerting_service.get_alert_statistics(hours=1)
            assert "total_alerts" in stats
            assert stats["total_alerts"] >= 1
            self._log_success("Alert statistics generation works")
            
            # Test notification channel configuration
            await self.alerting_service.configure_notification_channel(
                channel=NotificationChannel.EMAIL,
                config={
                    "smtp_server": "test.smtp.com",
                    "from_email": "test@example.com"
                },
                enabled=True
            )
            self._log_success("Notification channel configuration works")
            
        except Exception as e:
            self._log_error(f"Alerting system test failed: {e}")
            raise
    
    async def _test_integration(self):
        """Test integration between components"""
        print("\n🔗 Testing Component Integration...")
        
        try:
            # Test monitoring context manager
            async with self.fda_monitor.monitor_api_call(
                endpoint=FDAAPIEndpoint.DEVICE_CLASSIFICATION,
                method="GET",
                user_id="test_user",
                project_id=123
            ):
                # Simulate API call work
                await asyncio.sleep(0.01)
            
            # Verify call was tracked
            assert len(self.fda_monitor.recent_calls) >= 1
            self._log_success("Monitoring context manager integration works")
            
            # Test global service instances
            global_monitor = get_fda_monitor()
            global_dashboard = get_fda_health_dashboard()
            global_alerting = get_fda_alerting_service()
            
            assert global_monitor is not None
            assert global_dashboard is not None
            assert global_alerting is not None
            self._log_success("Global service instances work")
            
            # Test enum coverage
            endpoints = [endpoint.value for endpoint in FDAAPIEndpoint]
            alert_types = [alert_type.value for alert_type in AlertType]
            
            assert "device/510k" in endpoints
            assert "device/classification" in endpoints
            assert "high_error_rate" in alert_types
            assert "rate_limit_exceeded" in alert_types
            self._log_success("Enum definitions are complete")
            
        except Exception as e:
            self._log_error(f"Integration test failed: {e}")
            raise
    
    def _log_success(self, message: str):
        """Log successful test"""
        print(f"  ✅ {message}")
        self.test_results.append({"status": "success", "message": message})
    
    def _log_error(self, message: str):
        """Log failed test"""
        print(f"  ❌ {message}")
        self.test_results.append({"status": "error", "message": message})
    
    def _generate_summary(self) -> Dict[str, Any]:
        """Generate validation summary"""
        successful_tests = len([r for r in self.test_results if r["status"] == "success"])
        failed_tests = len([r for r in self.test_results if r["status"] == "error"])
        total_tests = len(self.test_results)
        
        success_rate = (successful_tests / total_tests) * 100 if total_tests > 0 else 0
        
        summary = {
            "status": "passed" if failed_tests == 0 else "failed",
            "total_tests": total_tests,
            "successful_tests": successful_tests,
            "failed_tests": failed_tests,
            "success_rate": success_rate,
            "test_results": self.test_results,
            "validation_completed_at": datetime.now().isoformat()
        }
        
        print("\n" + "=" * 80)
        print("📊 VALIDATION SUMMARY")
        print("=" * 80)
        print(f"Status: {'✅ PASSED' if summary['status'] == 'passed' else '❌ FAILED'}")
        print(f"Total Tests: {total_tests}")
        print(f"Successful: {successful_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {success_rate:.1f}%")
        
        if failed_tests == 0:
            print("\n🎉 All Task 12 components are working correctly!")
            print("✅ FDA API monitoring system is operational")
            print("✅ Health dashboard is functional")
            print("✅ Alerting system is ready for production")
            print("✅ Integration between components is working")
        else:
            print(f"\n⚠️  {failed_tests} test(s) failed. Please review the errors above.")
        
        return summary


async def main():
    """Main validation function"""
    validator = Task12Validator()
    
    try:
        result = await validator.run_validation()
        
        # Exit with appropriate code
        if result["status"] == "passed":
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Validation interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Validation failed: {e}")
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())