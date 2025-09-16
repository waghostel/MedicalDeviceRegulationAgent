#!/usr/bin/env python3
"""
Export important project data to JSON for sharing between computers
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path

from database.connection import get_database_manager
from models.project import Project
from models.user import User

async def export_projects():
    """Export projects and users to JSON file"""
    db_manager = get_database_manager()
    
    async with db_manager.get_session() as session:
        # Export users
        users = await session.execute("SELECT * FROM users")
        users_data = [dict(row) for row in users.fetchall()]
        
        # Export projects
        projects = await session.execute("SELECT * FROM projects")
        projects_data = [dict(row) for row in projects.fetchall()]
        
        # Create export data
        export_data = {
            "export_date": datetime.now().isoformat(),
            "users": users_data,
            "projects": projects_data
        }
        
        # Save to file
        export_file = Path("data_export.json")
        with open(export_file, 'w') as f:
            json.dump(export_data, f, indent=2, default=str)
        
        print(f"Data exported to {export_file}")

if __name__ == "__main__":
    asyncio.run(export_projects())