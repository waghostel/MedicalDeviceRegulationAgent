"""
Example usage of FastAPI database dependencies.

This file demonstrates how to use the new database dependencies
in FastAPI routes and services.
"""

from fastapi import FastAPI, Depends, HTTPException
import aiosqlite
from typing import List, Dict, Any

from database.dependencies import get_db_connection, get_db, DatabaseDependency
from database.connection import init_database


# Example FastAPI application
app = FastAPI(title="Database Dependency Example")


# Example 1: Using function-based dependency
@app.get("/users")
async def list_users(conn: aiosqlite.Connection = Depends(get_db_connection)) -> List[Dict[str, Any]]:
    """
    List all users using function-based database dependency.
    
    This is the recommended approach for most use cases.
    """
    cursor = await conn.execute("SELECT id, name, email FROM users")
    rows = await cursor.fetchall()
    await cursor.close()
    
    return [
        {"id": row[0], "name": row[1], "email": row[2]}
        for row in rows
    ]


# Example 2: Using class-based dependency
@app.get("/users/{user_id}")
async def get_user(user_id: int, conn: aiosqlite.Connection = Depends(get_db)) -> Dict[str, Any]:
    """
    Get a specific user using class-based database dependency.
    
    This approach provides better error handling and logging.
    """
    cursor = await conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
    row = await cursor.fetchone()
    await cursor.close()
    
    if not row:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {"id": row[0], "name": row[1], "email": row[2]}


# Example 3: Using dependency in a service class
class UserService:
    """Example service class that uses database dependencies."""
    
    def __init__(self, conn: aiosqlite.Connection = Depends(get_db_connection)):
        self.conn = conn
    
    async def create_user(self, name: str, email: str) -> Dict[str, Any]:
        """Create a new user."""
        cursor = await self.conn.execute(
            "INSERT INTO users (name, email) VALUES (?, ?)",
            (name, email)
        )
        user_id = cursor.lastrowid
        await cursor.close()
        await self.conn.commit()
        
        return {"id": user_id, "name": name, "email": email}
    
    async def update_user(self, user_id: int, name: str = None, email: str = None) -> Dict[str, Any]:
        """Update an existing user."""
        updates = []
        params = []
        
        if name:
            updates.append("name = ?")
            params.append(name)
        
        if email:
            updates.append("email = ?")
            params.append(email)
        
        if not updates:
            raise HTTPException(status_code=400, detail="No updates provided")
        
        params.append(user_id)
        query = f"UPDATE users SET {', '.join(updates)} WHERE id = ?"
        
        cursor = await self.conn.execute(query, params)
        await cursor.close()
        await self.conn.commit()
        
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Return updated user
        cursor = await self.conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        await cursor.close()
        
        return {"id": row[0], "name": row[1], "email": row[2]}


@app.post("/users")
async def create_user(
    name: str,
    email: str,
    user_service: UserService = Depends(UserService)
) -> Dict[str, Any]:
    """Create a user using the service class."""
    return await user_service.create_user(name, email)


@app.put("/users/{user_id}")
async def update_user(
    user_id: int,
    name: str = None,
    email: str = None,
    user_service: UserService = Depends(UserService)
) -> Dict[str, Any]:
    """Update a user using the service class."""
    return await user_service.update_user(user_id, name, email)


# Example 4: Health check endpoint using dependency health check
@app.get("/health/database")
async def database_health_check() -> Dict[str, Any]:
    """
    Check database health using the dependency health check method.
    """
    dependency = DatabaseDependency()
    is_healthy = await dependency.health_check()
    
    return {
        "healthy": is_healthy,
        "service": "database",
        "status": "connected" if is_healthy else "disconnected"
    }


# Example 5: Error handling with database operations
@app.get("/users/{user_id}/safe")
async def get_user_safe(user_id: int, conn: aiosqlite.Connection = Depends(get_db_connection)) -> Dict[str, Any]:
    """
    Example of safe database operations with proper error handling.
    """
    try:
        cursor = await conn.execute("SELECT id, name, email FROM users WHERE id = ?", (user_id,))
        row = await cursor.fetchone()
        await cursor.close()
        
        if not row:
            return {"error": "User not found", "user_id": user_id}
        
        return {
            "success": True,
            "user": {"id": row[0], "name": row[1], "email": row[2]}
        }
        
    except Exception as e:
        # Log the error (in real app, use proper logging)
        print(f"Database error: {e}")
        
        return {
            "error": "Database operation failed",
            "details": str(e),
            "user_id": user_id
        }


# Example startup function
async def setup_database():
    """
    Example of how to set up the database for this application.
    
    This would typically be called in the FastAPI lifespan event.
    """
    # Initialize database (this would be done in main.py lifespan)
    await init_database("sqlite:./example.db")
    
    # Create tables
    async for conn in get_db_connection():
        await conn.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await conn.commit()
        break


if __name__ == "__main__":
    import uvicorn
    import asyncio
    
    # Setup database
    asyncio.run(setup_database())
    
    # Run the application
    uvicorn.run(app, host="0.0.0.0", port=8000)