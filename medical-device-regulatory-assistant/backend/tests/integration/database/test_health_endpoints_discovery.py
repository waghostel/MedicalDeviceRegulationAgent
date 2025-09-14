#!/usr/bin/env python3
"""
Quick test to discover which health endpoints are actually working
"""

import asyncio
import aiohttp
import subprocess
import time
import tempfile
import os
import signal
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_endpoints():
    """Test both sets of health endpoints to see which ones work"""
    
    # Set up temporary database
    temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_path = temp_db.name
    temp_db.close()
    
    os.environ["DATABASE_URL"] = f"sqlite:{temp_db_path}"
    os.environ["HOST"] = "127.0.0.1"
    os.environ["PORT"] = "8000"
    
    # Start server
    server_process = subprocess.Popen(
        ["poetry", "run", "python", "main.py"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True
    )
    
    try:
        # Wait for server to start
        await asyncio.sleep(3)
        
        base_url = "http://localhost:8000"
        
        # Test endpoints
        endpoints_to_test = [
            "/",
            "/health",
            "/health/database",
            "/api/health/",
            "/api/health/database",
            "/api/health/ready",
            "/api/health/live"
        ]
        
        async with aiohttp.ClientSession() as session:
            for endpoint in endpoints_to_test:
                try:
                    logger.info(f"Testing {endpoint}...")
                    async with session.get(f"{base_url}{endpoint}") as response:
                        logger.info(f"  Status: {response.status}")
                        if response.status < 400:
                            data = await response.json()
                            logger.info(f"  Response keys: {list(data.keys()) if isinstance(data, dict) else 'Not a dict'}")
                        else:
                            text = await response.text()
                            logger.info(f"  Error: {text[:100]}...")
                except Exception as e:
                    logger.error(f"  Error: {e}")
    
    finally:
        # Clean up
        server_process.terminate()
        try:
            server_process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            server_process.kill()
        
        try:
            os.unlink(temp_db_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(test_endpoints())