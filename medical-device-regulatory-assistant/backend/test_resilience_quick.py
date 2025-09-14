#!/usr/bin/env python3
"""
Quick resilience test to verify Task 13 implementation
"""

import asyncio
import sys
import time
from datetime import datetime
from core.resilience import (
    AdvancedRetryHandler, FallbackManager, RequestDeduplicator,
    GracefulDegradationManager, ErrorRecoveryWorkflow, RequestQueue,
    ResilienceManager, RetryConfig, FallbackConfig, RetryStrategy
)

def get_timestamp():
    """Get current timestamp for logging"""
    return datetime.now().strftime("%H:%M:%S.%f")[:-3]

async def test_basic_resilience():
    """Test basic resilience functionality"""
    print(f"🧪 Testing Task 13: Enhanced Error Handling and Resilience [{get_timestamp()}]")
    print("=" * 60)
    
    results = {
        "passed": [],
        "failed": [],
        "total": 0
    }
    
    # Test 1: Advanced Retry Handler
    print(f"🔄 Testing AdvancedRetryHandler... [{get_timestamp()}]")
    try:
        print(f"   - Creating retry handler... [{get_timestamp()}]")
        retry_handler = AdvancedRetryHandler()
        
        print(f"   - Testing successful operation... [{get_timestamp()}]")
        async def success_func():
            return "success"
        
        print(f"   - Executing retry with backoff... [{get_timestamp()}]")
        result = await retry_handler.retry_with_backoff(success_func)
        assert result == "success"
        
        print(f"   ✅ AdvancedRetryHandler test passed [{get_timestamp()}]")
        results["passed"].append("✅ AdvancedRetryHandler - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ AdvancedRetryHandler test failed: {e} [{get_timestamp()}]")
        results["failed"].append(f"❌ AdvancedRetryHandler - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 2: Fallback Manager
    print("🔄 Testing FallbackManager...")
    try:
        print("   - Creating fallback manager...")
        fallback_manager = FallbackManager()
        
        print("   - Testing primary function execution...")
        async def primary_func():
            return "primary_result"
        
        print("   - Executing with fallback...")
        result = await fallback_manager.execute_with_fallback(
            primary_func, "test_service", "cache_key"
        )
        assert result == "primary_result"
        
        print("   ✅ FallbackManager test passed")
        results["passed"].append("✅ FallbackManager - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ FallbackManager test failed: {e}")
        results["failed"].append(f"❌ FallbackManager - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 3: Request Deduplicator
    print("🔄 Testing RequestDeduplicator...")
    try:
        print("   - Creating request deduplicator...")
        deduplicator = RequestDeduplicator()
        
        print("   - Testing deduplication function...")
        async def test_func():
            return "dedup_result"
        
        print("   - Executing deduplicated request...")
        result = await deduplicator.deduplicate_request(
            test_func, "GET", "/api/test", {"param": "value"}
        )
        assert result == "dedup_result"
        
        print("   ✅ RequestDeduplicator test passed")
        results["passed"].append("✅ RequestDeduplicator - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ RequestDeduplicator test failed: {e}")
        results["failed"].append(f"❌ RequestDeduplicator - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 4: Graceful Degradation Manager
    print("🔄 Testing GracefulDegradationManager...")
    try:
        print("   - Creating degradation manager...")
        degradation_manager = GracefulDegradationManager()
        
        print("   - Registering service capabilities...")
        degradation_manager.register_service_capabilities("test_service", {"search": True})
        
        print("   - Testing degradation execution...")
        async def primary_func():
            return "degradation_result"
        
        print("   - Executing with degradation...")
        result = await degradation_manager.execute_with_degradation(
            "test_service", "search", primary_func
        )
        assert result == "degradation_result"
        
        print("   ✅ GracefulDegradationManager test passed")
        results["passed"].append("✅ GracefulDegradationManager - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ GracefulDegradationManager test failed: {e}")
        results["failed"].append(f"❌ GracefulDegradationManager - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 5: Error Recovery Workflow
    print("🔄 Testing ErrorRecoveryWorkflow...")
    try:
        print("   - Creating error recovery workflow...")
        error_recovery = ErrorRecoveryWorkflow()
        
        print("   - Registering recovery strategy...")
        async def mock_recovery(error, context):
            return True
        
        error_recovery.register_recovery_strategy("TestError", mock_recovery)
        
        print("   - Testing recovery stats...")
        stats = error_recovery.get_recovery_stats()
        assert "total_recovery_attempts" in stats
        
        print("   ✅ ErrorRecoveryWorkflow test passed")
        results["passed"].append("✅ ErrorRecoveryWorkflow - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ ErrorRecoveryWorkflow test failed: {e}")
        results["failed"].append(f"❌ ErrorRecoveryWorkflow - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 6: Request Queue
    print("🔄 Testing RequestQueue...")
    try:
        print("   - Creating request queue...")
        request_queue = RequestQueue(max_concurrent=2, rate_limit_per_minute=10)
        
        print("   - Testing queue function...")
        async def queue_func():
            return "queue_result"
        
        print("   - Enqueuing request...")
        result = await request_queue.enqueue_request(queue_func, "test_request")
        assert result == "queue_result"
        
        print("   - Stopping processing...")
        await request_queue.stop_processing()
        
        print("   ✅ RequestQueue test passed")
        results["passed"].append("✅ RequestQueue - Basic functionality")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ RequestQueue test failed: {e}")
        results["failed"].append(f"❌ RequestQueue - Basic functionality: {e}")
        results["total"] += 1
    
    # Test 7: Resilience Manager Integration (with timeout)
    print(f"🔄 Testing ResilienceManager Integration... [{get_timestamp()}]")
    try:
        print(f"   - Creating resilience manager... [{get_timestamp()}]")
        resilience_manager = ResilienceManager()
        print(f"   - ResilienceManager created successfully [{get_timestamp()}]")
        
        print(f"   - Testing basic manager functionality... [{get_timestamp()}]")
        # Test basic functionality first
        assert hasattr(resilience_manager, 'retry_handler')
        assert hasattr(resilience_manager, 'fallback_manager')
        print(f"   - Basic attributes verified [{get_timestamp()}]")
        
        print(f"   - Testing integrated function... [{get_timestamp()}]")
        async def integrated_func():
            print(f"     - Inside integrated_func [{get_timestamp()}]")
            return "integrated_result"
        
        print(f"   - Executing resilient request (with 10s timeout)... [{get_timestamp()}]")
        
        # Add timeout to prevent hanging
        result = await asyncio.wait_for(
            resilience_manager.execute_resilient_request(
                integrated_func,
                service_name="test_service",
                operation="test_operation",
                use_retry=True,
                use_fallback=True,
                fallback_value="fallback"
            ),
            timeout=10.0
        )
        print(f"   - Resilient request completed [{get_timestamp()}]")
        assert result == "integrated_result"
        
        print(f"   - Testing comprehensive stats... [{get_timestamp()}]")
        stats = await asyncio.wait_for(
            resilience_manager.get_comprehensive_stats(),
            timeout=5.0
        )
        print(f"   - Stats retrieved [{get_timestamp()}]")
        assert "timestamp" in stats
        assert "components" in stats
        
        print(f"   ✅ ResilienceManager test passed [{get_timestamp()}]")
        results["passed"].append("✅ ResilienceManager - Integration functionality")
        results["total"] += 1
    except asyncio.TimeoutError:
        print(f"   ⏰ ResilienceManager test timed out [{get_timestamp()}]")
        results["failed"].append("❌ ResilienceManager - Integration functionality: Timeout after 10 seconds")
        results["total"] += 1
    except Exception as e:
        print(f"   ❌ ResilienceManager test failed: {e} [{get_timestamp()}]")
        results["failed"].append(f"❌ ResilienceManager - Integration functionality: {e}")
        results["total"] += 1
    
    # Print results
    print("\n📊 Test Results Summary:")
    print("=" * 60)
    
    for test in results["passed"]:
        print(test)
    
    if results["failed"]:
        print("\n❌ Failed Tests:")
        for test in results["failed"]:
            print(test)
    
    print(f"\n📈 Overall Results:")
    print(f"   Total Tests: {results['total']}")
    print(f"   Passed: {len(results['passed'])}")
    print(f"   Failed: {len(results['failed'])}")
    print(f"   Success Rate: {len(results['passed'])/results['total']*100:.1f}%")
    
    if len(results['failed']) == 0:
        print("\n🎉 All core resilience functionality tests PASSED!")
        return True
    else:
        print(f"\n⚠️  {len(results['failed'])} tests failed - see details above")
        return False

if __name__ == "__main__":
    try:
        success = asyncio.run(test_basic_resilience())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n⏹️  Test interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Test failed with exception: {e}")
        sys.exit(1)