#!/usr/bin/env python3
"""
Debug script for health check service issues
"""

import asyncio
import sys
import traceback
from pathlib import Path

# Add current directory to path
sys.path.insert(0, str(Path(__file__).parent))

async def test_individual_checks():
    """Test each health check component individually"""
    print("=== Testing Individual Health Check Components ===\n")
    
    try:
        from services.health_check import health_service
        
        # Test database check
        print("1. Testing Database Health Check...")
        try:
            db_result = await health_service._check_database()
            print(f"   Database Result: {db_result}")
        except Exception as e:
            print(f"   Database Error: {e}")
            traceback.print_exc()
        
        print()
        
        # Test Redis check
        print("2. Testing Redis Health Check...")
        try:
            redis_result = await health_service._check_redis()
            print(f"   Redis Result: {redis_result}")
        except Exception as e:
            print(f"   Redis Error: {e}")
            traceback.print_exc()
        
        print()
        
        # Test FDA API check
        print("3. Testing FDA API Health Check...")
        try:
            fda_result = await health_service._check_fda_api()
            print(f"   FDA API Result: {fda_result}")
        except Exception as e:
            print(f"   FDA API Error: {e}")
            traceback.print_exc()
        
        print()
        
        # Test disk space check
        print("4. Testing Disk Space Health Check...")
        try:
            disk_result = await health_service._check_disk_space()
            print(f"   Disk Space Result: {disk_result}")
        except Exception as e:
            print(f"   Disk Space Error: {e}")
            traceback.print_exc()
        
        print()
        
        # Test memory check
        print("5. Testing Memory Health Check...")
        try:
            memory_result = await health_service._check_memory()
            print(f"   Memory Result: {memory_result}")
        except Exception as e:
            print(f"   Memory Error: {e}")
            traceback.print_exc()
        
        print()
        
        # Test full health check
        print("6. Testing Full Health Check...")
        try:
            full_result = await health_service.check_all()
            print(f"   Full Health Check Result: {full_result.model_dump()}")
        except Exception as e:
            print(f"   Full Health Check Error: {e}")
            traceback.print_exc()
            
    except Exception as e:
        print(f"Failed to import health service: {e}")
        traceback.print_exc()

async def test_database_connection():
    """Test database connection directly"""
    print("\n=== Testing Database Connection Directly ===\n")
    
    try:
        from database.connection import get_database_manager
        
        print("Getting database manager...")
        db_manager = get_database_manager()
        print(f"Database manager: {db_manager}")
        
        print("Testing database health check...")
        health_result = await db_manager.health_check()
        print(f"Database health result: {health_result}")
        
    except Exception as e:
        print(f"Database connection test error: {e}")
        traceback.print_exc()

async def test_redis_connection():
    """Test Redis connection directly"""
    print("\n=== Testing Redis Connection Directly ===\n")
    
    try:
        from services.cache import get_redis_client
        
        print("Getting Redis client...")
        redis_client = await get_redis_client()
        print(f"Redis client: {redis_client}")
        
        if redis_client:
            print("Testing Redis ping...")
            await redis_client.ping()
            print("Redis ping successful")
        else:
            print("Redis client is None - not configured")
            
    except Exception as e:
        print(f"Redis connection test error: {e}")
        traceback.print_exc()

async def main():
    """Main test function"""
    print("Health Check Debug Script")
    print("=" * 50)
    
    await test_individual_checks()
    await test_database_connection()
    await test_redis_connection()
    
    print("\n=== Debug Complete ===")

if __name__ == "__main__":
    asyncio.run(main())