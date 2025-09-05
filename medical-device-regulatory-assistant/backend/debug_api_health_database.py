#!/usr/bin/env python3
"""
Debug script to see the exact error from the API health database endpoint
"""

import asyncio
import aiohttp
import subprocess
import tempfile
import os
import json

async def debug_api_health_database():
    """Debug the API health database endpoint"""
    
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
            print("Testing /api/health/database endpoint...")
            async with session.get(f"{base_url}/api/health/database") as response:
                print(f"Status: {response.status}")
                print(f"Headers: {dict(response.headers)}")
                
                if response.content_type == 'application/json':
                    data = await response.json()
                    print(f"JSON Response: {json.dumps(data, indent=2)}")
                else:
                    text = await response.text()
                    print(f"Text Response: {text}")
    
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
    asyncio.run(debug_api_health_database())