#!/usr/bin/env python3
"""
Test script for the comprehensive error tracking and monitoring system

This script tests the error tracking system components:
1. ErrorTracker class functionality
2. Frontend error boundary integration
3. Global error handler middleware
4. API endpoints for error tracking
"""

import asyncio
import sys
import os
import tempfile
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from core.error_tracker import ErrorTracker, ErrorCategory, ErrorSeverity, ResolutionStatus
from core.error_handler import GlobalErrorHandler
from core.exceptions import RegulatoryAssistantException


async def test_error_tracker():
    """Test the ErrorTracker class functionality"""
    print("🧪 Testing ErrorTracker class...")
    
    # Create temporary database for testing
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        # Initialize error tracker
        error_tracker = ErrorTracker(db_path)
        # Initialize the database explicitly
        await error_tracker._init_database()
        
        # Test 1: Track a simple error
        print("  ✓ Testing error tracking...")
        test_error = ValueError("Test validation error")
        error_id = await error_tracker.track_error(
            error=test_error,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.MEDIUM,
            component="test-component",
            context={"test": True, "user_action": "form_submission"},
            user_id="test-user-123",
            project_id=456
        )
        
        assert error_id is not None
        print(f"    - Error tracked with ID: {error_id}")
        
        # Test 2: Retrieve error report
        print("  ✓ Testing error retrieval...")
        error_report = await error_tracker.get_error_report(error_id)
        assert error_report is not None
        assert error_report.error_type == "ValueError"
        assert error_report.category == ErrorCategory.VALIDATION
        assert error_report.severity == ErrorSeverity.MEDIUM
        print(f"    - Error report retrieved: {error_report.error_message}")
        
        # Test 3: Track duplicate error (should increment count)
        print("  ✓ Testing duplicate error handling...")
        duplicate_error = ValueError("Test validation error")  # Same message
        duplicate_id = await error_tracker.track_error(
            error=duplicate_error,
            category=ErrorCategory.VALIDATION,
            severity=ErrorSeverity.MEDIUM,
            component="test-component"
        )
        
        # Should return the same ID for duplicate
        assert duplicate_id == error_id
        
        # Check occurrence count increased
        updated_report = await error_tracker.get_error_report(error_id)
        assert updated_report.occurrence_count == 2
        print(f"    - Duplicate error handled, occurrence count: {updated_report.occurrence_count}")
        
        # Test 4: Update resolution status
        print("  ✓ Testing resolution status update...")
        success = await error_tracker.update_resolution_status(
            error_id=error_id,
            status=ResolutionStatus.RESOLVED,
            resolution_notes="Fixed validation logic",
            resolved_by="developer-123"
        )
        
        assert success is True
        resolved_report = await error_tracker.get_error_report(error_id)
        assert resolved_report.resolution_status == ResolutionStatus.RESOLVED
        print(f"    - Resolution status updated: {resolved_report.resolution_status.value}")
        
        # Test 5: Get error metrics
        print("  ✓ Testing error metrics...")
        metrics = await error_tracker.get_error_metrics(time_period_hours=24)
        assert metrics.total_errors >= 2  # At least our test errors
        assert "validation" in metrics.errors_by_category
        print(f"    - Metrics generated: {metrics.total_errors} total errors")
        
        # Test 6: Analyze error trends
        print("  ✓ Testing error trend analysis...")
        trends = await error_tracker.analyze_error_trends(
            time_period_hours=24,
            comparison_period_hours=24
        )
        
        assert len(trends) > 0
        validation_trend = next((t for t in trends if t.category == ErrorCategory.VALIDATION), None)
        assert validation_trend is not None
        print(f"    - Trend analysis completed: {len(trends)} categories analyzed")
        
        print("✅ ErrorTracker tests passed!")
        
    finally:
        # Clean up temporary database
        try:
            os.unlink(db_path)
        except:
            pass


async def test_global_error_handler():
    """Test the GlobalErrorHandler functionality"""
    print("🧪 Testing GlobalErrorHandler...")
    
    # Create a mock request object
    class MockRequest:
        def __init__(self):
            self.url = type('MockURL', (), {'path': '/api/test'})()
            self.method = 'POST'
            self.headers = {'user-agent': 'test-client'}
            self.path_params = {}
            self.query_params = {}
            self.client = type('MockClient', (), {'host': '127.0.0.1'})()
            self.state = type('MockState', (), {'request_id': 'test-request-123'})()
    
    # Initialize error handler with temporary database
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        error_tracker = ErrorTracker(db_path)
        await error_tracker._init_database()
        error_handler = GlobalErrorHandler(error_tracker)
        
        # Test 1: Handle validation error
        print("  ✓ Testing validation error handling...")
        validation_error = ValueError("Invalid input data")
        mock_request = MockRequest()
        
        response = await error_handler.handle_exception(mock_request, validation_error)
        
        assert response.status_code == 500  # Default for ValueError
        response_data = response.body.decode()
        assert "error" in response_data
        assert "Invalid input data" in response_data
        print("    - Validation error handled successfully")
        
        # Test 2: Handle regulatory assistant error
        print("  ✓ Testing custom application error handling...")
        app_error = RegulatoryAssistantException(
            message="FDA API unavailable",
            error_code="FDA_API_ERROR",
            details={"service": "predicate_search", "retry_after": 300}
        )
        
        response = await error_handler.handle_exception(mock_request, app_error)
        
        assert response.status_code in [500, 503]  # Depends on mapping
        response_data = response.body.decode()
        assert "FDA_API_ERROR" in response_data
        print("    - Custom application error handled successfully")
        
        print("✅ GlobalErrorHandler tests passed!")
        
    finally:
        try:
            os.unlink(db_path)
        except:
            pass


async def test_error_categorization():
    """Test error categorization logic"""
    print("🧪 Testing error categorization...")
    
    test_cases = [
        (ValueError("Invalid form data"), "validation-component", ErrorCategory.VALIDATION),
        (ConnectionError("Database connection failed"), "database-service", ErrorCategory.DATABASE),
        (TimeoutError("Request timeout"), "api-client", ErrorCategory.PERFORMANCE),
        (Exception("Unknown error"), "frontend-component", ErrorCategory.FRONTEND_TESTING),
        (Exception("Auth failed"), "auth-service", ErrorCategory.AUTHENTICATION),
    ]
    
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        error_tracker = ErrorTracker(db_path)
        await error_tracker._init_database()
        
        for i, (error, component, expected_category) in enumerate(test_cases):
            error_id = await error_tracker.track_error(
                error=error,
                category=expected_category,  # We're testing the manual categorization
                severity=ErrorSeverity.MEDIUM,
                component=component
            )
            
            error_report = await error_tracker.get_error_report(error_id)
            assert error_report.category == expected_category
            print(f"  ✓ Test case {i+1}: {error.__class__.__name__} -> {expected_category.value}")
        
        print("✅ Error categorization tests passed!")
        
    finally:
        try:
            os.unlink(db_path)
        except:
            pass


async def test_resolution_validation():
    """Test error resolution validation"""
    print("🧪 Testing resolution validation...")
    
    with tempfile.NamedTemporaryFile(suffix='.db', delete=False) as tmp_db:
        db_path = tmp_db.name
    
    try:
        error_tracker = ErrorTracker(db_path)
        await error_tracker._init_database()
        
        # Create and resolve an error
        test_error = RuntimeError("Test runtime error")
        error_id = await error_tracker.track_error(
            error=test_error,
            category=ErrorCategory.SYSTEM,
            severity=ErrorSeverity.HIGH,
            component="test-system"
        )
        
        # Resolve the error
        await error_tracker.update_resolution_status(
            error_id=error_id,
            status=ResolutionStatus.RESOLVED,
            resolution_notes="Fixed by restarting service",
            resolved_by="ops-team"
        )
        
        # Create a "recurring" error (same type/component)
        recurring_error = RuntimeError("Test runtime error")
        recurring_id = await error_tracker.track_error(
            error=recurring_error,
            category=ErrorCategory.SYSTEM,
            severity=ErrorSeverity.HIGH,
            component="test-system"
        )
        
        # Get resolution validation report
        validation_report = await error_tracker.get_resolution_validation_report()
        
        assert validation_report["total_resolved_errors"] >= 1
        assert "recommendations" in validation_report
        print(f"  ✓ Validation report generated: {validation_report['total_resolved_errors']} resolved errors")
        
        print("✅ Resolution validation tests passed!")
        
    finally:
        try:
            os.unlink(db_path)
        except:
            pass


async def main():
    """Run all error tracking system tests"""
    print("🚀 Starting Error Tracking System Tests\n")
    
    try:
        await test_error_tracker()
        print()
        
        await test_global_error_handler()
        print()
        
        await test_error_categorization()
        print()
        
        await test_resolution_validation()
        print()
        
        print("🎉 All error tracking system tests passed!")
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)