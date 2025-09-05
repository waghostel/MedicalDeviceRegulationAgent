#!/usr/bin/env python3
"""
Debug script to test the health check system directly
"""

import asyncio
import tempfile
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def test_health_check_directly():
    """Test the health check system directly without FastAPI"""
    
    # Set up temporary database
    temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_path = temp_db.name
    temp_db.close()
    
    try:
        # Initialize database
        from database.connection import init_database, close_database
        
        logger.info(f"Initializing database: {temp_db_path}")
        await init_database(f"sqlite:{temp_db_path}")
        
        # Test health check service
        from services.health_check import HealthCheckService
        
        logger.info("Testing health check service...")
        health_service = HealthCheckService()
        
        # Test database check specifically
        logger.info("Testing database health check...")
        result = await health_service._check_database()
        logger.info(f"Database health check result: {result}")
        
        # Test full health check
        logger.info("Testing full health check...")
        full_result = await health_service.check_all(['database'])
        logger.info(f"Full health check result: {full_result}")
        
        # Clean up
        await close_database()
        
    except Exception as e:
        logger.error(f"Test failed: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        try:
            os.unlink(temp_db_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_health_check_directly())