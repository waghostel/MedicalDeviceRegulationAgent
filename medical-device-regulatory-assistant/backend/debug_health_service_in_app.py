#!/usr/bin/env python3
"""
Debug script to test the health service in the context of a running FastAPI app
"""

import asyncio
import tempfile
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

async def debug_health_service_in_app():
    """Debug the health service in FastAPI app context"""
    
    # Set up temporary database
    temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_path = temp_db.name
    temp_db.close()
    
    try:
        os.environ["DATABASE_URL"] = f"sqlite:{temp_db_path}"
        
        # Import and initialize the FastAPI app (this will run the lifespan startup)
        from main import app
        
        # Manually trigger the lifespan startup
        from contextlib import asynccontextmanager
        
        # Get the lifespan function
        lifespan_func = app.router.lifespan_context
        
        async with lifespan_func(app):
            logger.info("FastAPI app lifespan started")
            
            # Now test the health service
            from services.health_check import health_service
            
            logger.info("Testing health service in app context...")
            
            try:
                # Test database check specifically
                logger.info("Testing database health check...")
                result = await health_service._check_database()
                logger.info(f"Database health check result: {result}")
                
                # Test full health check
                logger.info("Testing full health check...")
                full_result = await health_service.check_specific(['database'])
                logger.info(f"Full health check result: {full_result}")
                
            except Exception as e:
                logger.error(f"Health service test failed: {e}")
                import traceback
                traceback.print_exc()
    
    finally:
        try:
            os.unlink(temp_db_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(debug_health_service_in_app())