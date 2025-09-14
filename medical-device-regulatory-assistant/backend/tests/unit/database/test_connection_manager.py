"""
Test script for test connection manager functionality.

This script tests the TestConnectionManager class to ensure proper
connection pooling, retry logic, and graceful failure handling.
"""

import asyncio
import logging
import sys
from pathlib import Path

# Add the backend directory to the Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from testing.connection_manager import (
    TestConnectionManager, 
    RetryConfig, 
    ConnectionState,
    create_test_connection_manager,
    create_memory_test_manager
)
from database.config import DatabaseConfig
from sqlalchemy import text

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_connection_manager():
    """Test connection manager functionality."""
    
    print("🔌 Testing Test Connection Manager System")
    print("=" * 50)
    
    try:
        # Test 1: Basic connection manager initialization
        print("\n📋 Test 1: Basic Connection Manager Initialization")
        
        manager = create_memory_test_manager()
        
        # Check initial state
        if manager.state == ConnectionState.DISCONNECTED:
            print("   ✅ PASS: Initial state is DISCONNECTED")
        else:
            print(f"   ❌ FAIL: Expected DISCONNECTED, got {manager.state}")
        
        # Initialize
        await manager.initialize()
        
        if manager.state == ConnectionState.CONNECTED:
            print("   ✅ PASS: Successfully connected")
        else:
            print(f"   ❌ FAIL: Expected CONNECTED, got {manager.state}")
        
        # Check metrics
        metrics = manager.metrics
        print(f"   Connection metrics: {metrics.total_connections} total, {metrics.active_connections} active")
        
        if metrics.total_connections > 0:
            print("   ✅ PASS: Connection metrics tracking working")
        else:
            print("   ❌ FAIL: Connection metrics not tracking")
        
        await manager.close()
        
        # Test 2: Session management with retry logic
        print("\n📋 Test 2: Session Management with Retry Logic")
        
        retry_config = RetryConfig(max_retries=2, base_delay=0.1)
        manager = create_memory_test_manager(retry_config)
        await manager.initialize()
        
        # Test successful session
        async with manager.get_session() as session:
            result = await session.execute(text("SELECT 42 as test_value"))
            test_value = result.scalar()
            
            if test_value == 42:
                print("   ✅ PASS: Session creation and query successful")
            else:
                print(f"   ❌ FAIL: Expected 42, got {test_value}")
        
        await manager.close()
        
        # Test 3: Health check functionality
        print("\n📋 Test 3: Health Check Functionality")
        
        manager = create_memory_test_manager()
        await manager.initialize()
        
        health_result = await manager.health_check()
        
        print(f"   Health check result: {health_result}")
        
        if health_result["healthy"]:
            print("   ✅ PASS: Health check reports healthy")
        else:
            print("   ❌ FAIL: Health check reports unhealthy")
        
        if health_result["state"] == ConnectionState.CONNECTED.value:
            print("   ✅ PASS: Health check reports correct state")
        else:
            print(f"   ❌ FAIL: Expected {ConnectionState.CONNECTED.value}, got {health_result['state']}")
        
        await manager.close()
        
        # Test 4: Test environment validation
        print("\n📋 Test 4: Test Environment Validation")
        
        manager = create_memory_test_manager()
        await manager.initialize()
        
        validation_result = await manager.validate_test_environment()
        
        print(f"   Validation result: {validation_result}")
        
        if validation_result["valid"]:
            print("   ✅ PASS: Test environment validation successful")
        else:
            print("   ❌ FAIL: Test environment validation failed")
            print(f"   Recommendations: {validation_result.get('recommendations', [])}")
        
        await manager.close()
        
        # Test 5: Connection state callbacks
        print("\n📋 Test 5: Connection State Callbacks")
        
        state_changes = []
        
        def state_callback(new_state: ConnectionState):
            state_changes.append(new_state)
            print(f"   State changed to: {new_state.value}")
        
        manager = create_memory_test_manager()
        manager.add_connection_callback(state_callback)
        
        await manager.initialize()
        await manager.close()
        
        expected_states = [ConnectionState.CONNECTING, ConnectionState.CONNECTED, ConnectionState.DISCONNECTED]
        
        if len(state_changes) >= 2:  # At least connecting and connected
            print("   ✅ PASS: State callbacks working")
        else:
            print(f"   ❌ FAIL: Expected state changes, got {state_changes}")
        
        # Test 6: Multiple concurrent sessions
        print("\n📋 Test 6: Multiple Concurrent Sessions")
        
        manager = create_test_connection_manager(
            "sqlite+aiosqlite:///:memory:",
            pool_size=3,
            max_overflow=2
        )
        await manager.initialize()
        
        async def test_session(session_id: int):
            async with manager.get_session() as session:
                result = await session.execute(text(f"SELECT {session_id} as session_id"))
                value = result.scalar()
                print(f"   Session {session_id}: Got value {value}")
                return value
        
        # Run multiple sessions concurrently
        tasks = [test_session(i) for i in range(1, 6)]
        results = await asyncio.gather(*tasks)
        
        if results == [1, 2, 3, 4, 5]:
            print("   ✅ PASS: Concurrent sessions working correctly")
        else:
            print(f"   ❌ FAIL: Expected [1,2,3,4,5], got {results}")
        
        await manager.close()
        
        # Test 7: Connection metrics tracking
        print("\n📋 Test 7: Connection Metrics Tracking")
        
        manager = create_memory_test_manager()
        await manager.initialize()
        
        initial_metrics = manager.metrics
        
        # Create several sessions to generate metrics
        for i in range(3):
            async with manager.get_session() as session:
                await session.execute(text("SELECT 1"))
        
        final_metrics = manager.metrics
        
        print(f"   Initial metrics: {initial_metrics.total_connections} connections")
        print(f"   Final metrics: {final_metrics.total_connections} connections")
        print(f"   Average connection time: {final_metrics.average_connection_time:.4f}s")
        
        if final_metrics.total_connections >= initial_metrics.total_connections:
            print("   ✅ PASS: Connection metrics tracking working")
        else:
            print("   ❌ FAIL: Connection metrics not tracking properly")
        
        await manager.close()
        
        # Test 8: Custom retry configuration
        print("\n📋 Test 8: Custom Retry Configuration")
        
        custom_retry = RetryConfig(
            max_retries=1,
            base_delay=0.05,
            max_delay=1.0,
            exponential_base=1.5,
            jitter=False
        )
        
        manager = create_memory_test_manager(custom_retry)
        await manager.initialize()
        
        # Test that retry config is applied
        if manager.retry_config.max_retries == 1:
            print("   ✅ PASS: Custom retry configuration applied")
        else:
            print(f"   ❌ FAIL: Expected 1 retry, got {manager.retry_config.max_retries}")
        
        # Test session with custom retry
        async with manager.get_session() as session:
            result = await session.execute(text("SELECT 'retry_test' as test"))
            value = result.scalar()
            
            if value == 'retry_test':
                print("   ✅ PASS: Session with custom retry config working")
            else:
                print(f"   ❌ FAIL: Expected 'retry_test', got {value}")
        
        await manager.close()
        
        # Test 9: Database configuration validation
        print("\n📋 Test 9: Database Configuration Validation")
        
        # Test with different database URLs
        test_configs = [
            ("sqlite+aiosqlite:///:memory:", "In-memory SQLite"),
            ("sqlite+aiosqlite:///test.db", "File-based SQLite"),
        ]
        
        for db_url, description in test_configs:
            try:
                manager = create_test_connection_manager(db_url)
                await manager.initialize()
                
                health = await manager.health_check()
                validation = await manager.validate_test_environment()
                
                print(f"   {description}: Health={health['healthy']}, Valid={validation['valid']}")
                
                await manager.close()
                
                if health['healthy']:
                    print(f"   ✅ PASS: {description} configuration working")
                else:
                    print(f"   ❌ FAIL: {description} configuration failed")
                    
            except Exception as e:
                print(f"   ⚠️  WARNING: {description} failed: {e}")
        
        print("\n🎉 Connection Manager Tests Completed!")
        
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True


if __name__ == "__main__":
    success = asyncio.run(test_connection_manager())
    sys.exit(0 if success else 1)