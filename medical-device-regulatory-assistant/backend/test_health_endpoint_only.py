#!/usr/bin/env python3
"""
Test just the health endpoint to debug the issue
"""

import asyncio
import aiohttp
import subprocess
import tempfile
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_health_endpoint_only():
    """Test just the health endpoint"""
    
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
        
        async with aiohttp.ClientSession() as session:
            logger.info("Testing /health endpoint...")
            
            async with session.get(f"{base_url}/health") as response:
                logger.info(f"Status: {response.status}")
                data = await response.json()
                
                if response.status == 200:
                    logger.info("✅ Health endpoint returned 200 (all healthy)")
                    logger.info(f"Response keys: {list(data.keys())}")
                    return True
                    
                elif response.status == 503:
                    logger.info("⚠️ Health endpoint returned 503 (some components unhealthy)")
                    
                    # Check if it's the expected error format from our health system
                    if "error" in data and "message" in data:
                        message = data["message"]
                        if isinstance(message, dict) and "health_status" in message:
                            health_status = message["health_status"]
                            logger.info(f"Overall healthy: {health_status.get('healthy', 'N/A')}")
                            
                            # Log individual component status
                            checks = health_status.get("checks", {})
                            for check_name, check_result in checks.items():
                                status = "✅" if check_result.get("healthy") else "❌"
                                logger.info(f"{status} {check_name}: {check_result.get('status', 'unknown')}")
                            
                            logger.info("✅ Health endpoint test passed (valid 503 response)")
                            return True
                        else:
                            logger.error(f"❌ Unexpected message format: {message}")
                            return False
                    else:
                        logger.error(f"❌ Unexpected 503 response format: {data}")
                        return False
                        
                else:
                    logger.error(f"❌ Unexpected status {response.status}")
                    logger.error(f"Response: {json.dumps(data, indent=2)}")
                    return False
    
    except Exception as e:
        logger.error(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
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
    success = asyncio.run(test_health_endpoint_only())
    print(f"Test result: {'PASSED' if success else 'FAILED'}")