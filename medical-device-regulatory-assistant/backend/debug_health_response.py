#!/usr/bin/env python3
"""
Debug script to see exactly what the /health endpoint is returning
"""

import asyncio
import aiohttp
import subprocess
import time
import tempfile
import os
import json

async def debug_health_response():
    """Debug the health endpoint response"""
    
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
            print("Testing /health endpoint...")
            async with session.get(f"{base_url}/health") as response:
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
    asyncio.run(debug_health_response())