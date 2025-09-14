#!/usr/bin/env python3
"""
Debug script to list all available routes in the FastAPI app
"""

import asyncio
import tempfile
import os

async def debug_routes():
    """Debug the available routes in the FastAPI app"""
    
    # Set up temporary database
    temp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    temp_db_path = temp_db.name
    temp_db.close()
    
    try:
        os.environ["DATABASE_URL"] = f"sqlite:{temp_db_path}"
        
        # Import the app
        from main import app
        
        print("Available routes:")
        print("=" * 50)
        
        for route in app.routes:
            if hasattr(route, 'path') and hasattr(route, 'methods'):
                methods = getattr(route, 'methods', set())
                path = getattr(route, 'path', '')
                name = getattr(route, 'name', 'unnamed')
                print(f"{', '.join(methods):10} {path:30} ({name})")
        
        print("=" * 50)
        
        # Also check if there are any health-related routes
        health_routes = [route for route in app.routes if hasattr(route, 'path') and 'health' in route.path.lower()]
        
        print(f"\nHealth-related routes ({len(health_routes)}):")
        for route in health_routes:
            methods = getattr(route, 'methods', set())
            path = getattr(route, 'path', '')
            name = getattr(route, 'name', 'unnamed')
            print(f"{', '.join(methods):10} {path:30} ({name})")
    
    finally:
        try:
            os.unlink(temp_db_path)
        except:
            pass

if __name__ == "__main__":
    asyncio.run(debug_routes())