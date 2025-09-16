#!/usr/bin/env python3
"""
Import project data from JSON export file
"""

import asyncio
import json
from pathlib import Path

from database.connection import get_database_manager

async def import_projects(json_file: str = "data_export.json"):
    """Import projects and users from JSON file"""
    export_file = Path(json_file)
    
    if not export_file.exists():
        print(f"Export file {export_file} not found")
        return
    
    with open(export_file, 'r') as f:
        data = json.load(f)
    
    db_manager = get_database_manager()
    
    async with db_manager.get_session() as session:
        # Import users first (due to foreign key constraints)
        for user_data in data.get("users", []):
            # Insert user if not exists
            await session.execute(
                "INSERT OR IGNORE INTO users (id, email, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
                (user_data["id"], user_data["email"], user_data["name"], 
                 user_data["created_at"], user_data["updated_at"])
            )
        
        # Import projects
        for project_data in data.get("projects", []):
            # Insert project if not exists
            await session.execute(
                "INSERT OR IGNORE INTO projects (id, name, description, device_type, intended_use, user_id, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                (project_data["id"], project_data["name"], project_data["description"],
                 project_data["device_type"], project_data["intended_use"], 
                 project_data["user_id"], project_data["status"],
                 project_data["created_at"], project_data["updated_at"])
            )
        
        await session.commit()
        print(f"Data imported successfully from {export_file}")

if __name__ == "__main__":
    import sys
    json_file = sys.argv[1] if len(sys.argv) > 1 else "data_export.json"
    asyncio.run(import_projects(json_file))