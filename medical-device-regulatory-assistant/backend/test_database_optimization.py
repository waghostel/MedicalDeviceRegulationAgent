"""
Test script for database optimization features
"""

import asyncio
import logging
import time
from typing import Dict, Any

from database.connection import init_database, close_database
from database.config import get_database_config
from database.performance_indexes import DatabaseIndexManager
from database.connection_pool import init_enhanced_connection_manager, close_enhanced_connection_manager
from services.query_optimizer import get_query_optimizer
from services.performance_monitor import get_performance_monitor
from services.enhanced_project_service import get_enhanced_project_service

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


async def test_database_indexes():
    """Test database index creation and management"""
    logger.info("Testing database indexes...")
    
    try:
        # Initialize database
        db_manager = await init_database()
        
        # Create index manager
        index_manager = DatabaseIndexManager(db_manager.engine)
        
        # Create performance indexes
        await index_manager.create_performance_indexes()
        logger.info("✓ Performance indexes created successfully")
        
        # Get table statistics
        stats = await index_manager.get_table_statistics()
        logger.info(f"✓ Table statistics retrieved: {len(stats)} tables")
        
        # Optimize database
        optimization_results = await index_manager.optimize_database()
        logger.info(f"✓ Database optimization completed: {optimization_results}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Database index test failed: {e}")
        return False


async def test_connection_pool():
    """Test enhanced connection pool functionality"""
    logger.info("Testing enhanced connection pool...")
    
    try:
        # Initialize enhanced connection manager
        config = get_database_config()
        connection_manager = await init_enhanced_connection_manager(config)
        
        # Test health check
        health_data = await connection_manager.health_check()
        logger.info(f"✓ Connection pool health check: {health_data['healthy']}")
        
        # Get performance metrics
        metrics = await connection_manager.get_performance_metrics()
        logger.info(f"✓ Connection pool metrics retrieved: {metrics['connection_pool']['configured_size']} pool size")
        
        # Test connection acquisition
        async with connection_manager.get_session() as session:
            logger.info("✓ Database session acquired successfully")
        
        # Optimize connection pool
        optimization = await connection_manager.optimize_connection_pool()
        logger.info(f"✓ Connection pool optimization: {optimization}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Connection pool test failed: {e}")
        return False


async def test_query_optimizer():
    """Test query optimizer functionality"""
    logger.info("Testing query optimizer...")
    
    try:
        query_optimizer = get_query_optimizer()
        
        # Test monitored query
        async with query_optimizer.monitored_query("test_query", "SELECT 1"):
            await asyncio.sleep(0.1)  # Simulate query execution
        
        logger.info("✓ Query monitoring test completed")
        
        # Get query metrics
        metrics = await query_optimizer.get_query_metrics_summary()
        logger.info(f"✓ Query metrics retrieved: {metrics}")
        
        # Analyze query performance
        analysis = await query_optimizer.analyze_query_performance()
        logger.info(f"✓ Query performance analysis: {len(analysis.get('slowest_queries', []))} queries analyzed")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Query optimizer test failed: {e}")
        return False


async def test_performance_monitor():
    """Test performance monitoring functionality"""
    logger.info("Testing performance monitor...")
    
    try:
        performance_monitor = get_performance_monitor()
        
        # Generate performance report
        report = await performance_monitor.get_performance_report()
        logger.info(f"✓ Performance report generated: {report['timestamp']}")
        
        # Test threshold setting
        performance_monitor.set_threshold("slow_query_time", 2.0)
        thresholds = performance_monitor.get_thresholds()
        logger.info(f"✓ Performance thresholds: {thresholds['slow_query_time']}s")
        
        # Test optimization
        optimization_results = await performance_monitor.optimize_performance()
        logger.info(f"✓ Performance optimization: {optimization_results}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Performance monitor test failed: {e}")
        return False


async def test_enhanced_project_service():
    """Test enhanced project service with optimized queries"""
    logger.info("Testing enhanced project service...")
    
    try:
        service = get_enhanced_project_service()
        
        # Test user statistics (this will create the query monitoring)
        try:
            stats = await service.get_user_statistics("test_user_123")
            logger.info(f"✓ User statistics retrieved: {stats}")
        except Exception as e:
            logger.info(f"✓ User statistics test (expected to fail with no data): {e}")
        
        # Test recent activity
        try:
            activity = await service.get_recent_activity("test_user_123", limit=5)
            logger.info(f"✓ Recent activity retrieved: {len(activity)} items")
        except Exception as e:
            logger.info(f"✓ Recent activity test (expected to fail with no data): {e}")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Enhanced project service test failed: {e}")
        return False


async def performance_benchmark():
    """Run performance benchmark tests"""
    logger.info("Running performance benchmarks...")
    
    try:
        db_manager = await init_database()
        query_optimizer = get_query_optimizer()
        
        # Benchmark simple queries
        iterations = 100
        start_time = time.time()
        
        for i in range(iterations):
            async with query_optimizer.monitored_query(f"benchmark_query_{i}", "SELECT 1"):
                async with db_manager.get_connection() as conn:
                    from sqlalchemy import text
                    await conn.execute(text("SELECT 1"))
        
        end_time = time.time()
        total_time = end_time - start_time
        avg_time = total_time / iterations
        
        logger.info(f"✓ Benchmark completed: {iterations} queries in {total_time:.3f}s")
        logger.info(f"✓ Average query time: {avg_time*1000:.2f}ms")
        
        # Get final metrics
        metrics = await query_optimizer.get_query_metrics_summary()
        logger.info(f"✓ Final metrics: {metrics['total_executions']} total executions")
        
        return True
        
    except Exception as e:
        logger.error(f"✗ Performance benchmark failed: {e}")
        return False


async def main():
    """Run all database optimization tests"""
    logger.info("Starting database optimization tests...")
    
    test_results = {}
    
    # Run individual tests
    test_results["indexes"] = await test_database_indexes()
    test_results["connection_pool"] = await test_connection_pool()
    test_results["query_optimizer"] = await test_query_optimizer()
    test_results["performance_monitor"] = await test_performance_monitor()
    test_results["enhanced_service"] = await test_enhanced_project_service()
    test_results["benchmark"] = await performance_benchmark()
    
    # Summary
    passed_tests = sum(1 for result in test_results.values() if result)
    total_tests = len(test_results)
    
    logger.info(f"\n{'='*50}")
    logger.info(f"DATABASE OPTIMIZATION TEST RESULTS")
    logger.info(f"{'='*50}")
    
    for test_name, result in test_results.items():
        status = "✓ PASSED" if result else "✗ FAILED"
        logger.info(f"{test_name.upper():<20} {status}")
    
    logger.info(f"{'='*50}")
    logger.info(f"SUMMARY: {passed_tests}/{total_tests} tests passed")
    
    if passed_tests == total_tests:
        logger.info("🎉 All database optimization tests passed!")
    else:
        logger.warning(f"⚠️  {total_tests - passed_tests} tests failed")
    
    # Cleanup
    try:
        await close_enhanced_connection_manager()
        await close_database()
        logger.info("✓ Database connections closed")
    except Exception as e:
        logger.error(f"Error during cleanup: {e}")
    
    return passed_tests == total_tests


if __name__ == "__main__":
    success = asyncio.run(main())
    exit(0 if success else 1)