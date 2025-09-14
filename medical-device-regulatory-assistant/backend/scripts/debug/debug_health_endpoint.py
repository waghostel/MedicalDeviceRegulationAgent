#!/usr/bin/env python3
"""
Debug script to test the health endpoint directly by calling the function
"""

import asyncio
import tempfile
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def debug_health_endpoint():
    """Debug the health endpoint by calling it directly"""
    
    # Set up temporary database
    temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_path = temp_db.name
    temp_db.close()
    
    try:
        os.environ["DATABASE_URL"] = f"sqlite:{temp_db_path}"
        
        # Initialize database
        from database.connection import init_database, close_database
        await init_database(f"sqlite:{temp_db_path}")
        
        # Import the health check function from main.py
        from main import health_check
        
        logger.info("Calling health_check() function directly...")
        
        try:
            result = await health_check()
            logger.info(f"Health check result type: {type(result)}")
            logger.info(f"Health check result: {result}")
            
            if hasattr(result, 'model_dump'):
                logger.info(f"Model dump: {result.model_dump()}")
            elif hasattr(result, '__dict__'):
                logger.info(f"Dict: {result.__dict__}")
            
        except Exception as e:
            logger.error(f"Health check function failed: {e}")
            import traceback
            traceback.print_exc()
        
        # Clean up
        await close_database()
    
    finally:
        try:
            os.unlink(temp_db_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(debug_health_endpoint())