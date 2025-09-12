"""
FastAPI integration tests for database dependencies.
"""

import pytest
import tempfile
import os
import asyncio
from fastapi import FastAPI, Depends
from fastapi.testclient import TestClient
import aiosqlite

from database.dependencies import get_db_connection, get_db
from database.connection import init_database, close_database


class TestFastAPIIntegration:
    """Test FastAPI integration with database dependencies."""
    
    def setup_method(self):
        """Setup for each test method."""
        # Ensure clean state
        asyncio.run(self._cleanup())
    
    def teardown_method(self):
        """Teardown for each test method."""
        # Cleanup after each test
        asyncio.run(self._cleanup())
    
    async def _cleanup(self):
        """Helper to cleanup database state."""
        try:
            await close_database()
        except:
            pass
    
    def test_fastapi_function_dependency_success(self):
        """Test FastAPI with function-based database dependency - success case."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            asyncio.run(init_database(f"sqlite:{temp_path}"))
            
            # Create FastAPI app with database route
            app = FastAPI()
            
            @app.get("/test")
            async def test_endpoint(conn: aiosqlite.Connection = Depends(get_db_connection)):
                cursor = await conn.execute("SELECT 1 as result")
                result = await cursor.fetchone()
                await cursor.close()
                return {"result": result[0]}
            
            # Test the endpoint
            with TestClient(app) as client:
                response = client.get("/test")
                assert response.status_code == 200
                assert response.json() == {"result": 1}
            
        finally:
            asyncio.run(close_database())
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_fastapi_class_dependency_success(self):
        """Test FastAPI with class-based database dependency - success case."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            asyncio.run(init_database(f"sqlite:{temp_path}"))
            
            # Create FastAPI app with database route
            app = FastAPI()
            
            @app.get("/test")
            async def test_endpoint(conn: aiosqlite.Connection = Depends(get_db)):
                cursor = await conn.execute("SELECT 2 as result")
                result = await cursor.fetchone()
                await cursor.close()
                return {"result": result[0]}
            
            # Test the endpoint
            with TestClient(app) as client:
                response = client.get("/test")
                assert response.status_code == 200
                assert response.json() == {"result": 2}
            
        finally:
            asyncio.run(close_database())
            if os.path.exists(temp_path):
                os.unlink(temp_path)
    
    def test_fastapi_dependency_failure_without_db(self):
        """Test FastAPI dependency failure when database is not available."""
        # Ensure no database is initialized
        asyncio.run(self._cleanup())
        
        # Create FastAPI app with database route
        app = FastAPI()
        
        @app.get("/test")
        async def test_endpoint(conn: aiosqlite.Connection = Depends(get_db_connection)):
            cursor = await conn.execute("SELECT 1 as result")
            result = await cursor.fetchone()
            await cursor.close()
            return {"result": result[0]}
        
        # Test the endpoint - should fail with 503
        with TestClient(app) as client:
            response = client.get("/test")
            assert response.status_code == 503
            assert "service unavailable" in response.json()["detail"].lower()
    
    def test_fastapi_database_operations(self):
        """Test FastAPI with actual database operations."""
        # Create temporary database
        temp_fd, temp_path = tempfile.mkstemp(suffix='.db')
        os.close(temp_fd)
        
        try:
            # Initialize database
            asyncio.run(init_database(f"sqlite:{temp_path}"))
            
            # Setup test table
            async def setup_table():
                async for conn in get_db_connection():
                    await conn.execute("""
                        CREATE TABLE users (
                            id INTEGER PRIMARY KEY,
                            name TEXT NOT NULL,
                            email TEXT UNIQUE
                        )
                    """)
                    await conn.commit()
                    break
            
            asyncio.run(setup_table())
            
            # Create FastAPI app with CRUD operations
            app = FastAPI()
            
            @app.post("/users")
            async def create_user(
                name: str,
                email: str,
                conn: aiosqlite.Connection = Depends(get_db_connection)
            ):
                cursor = await conn.execute(
                    "INSERT INTO users (name, email) VALUES (?, ?)",
                    (name, email)
                )
                user_id = cursor.lastrowid
                await cursor.close()
                await conn.commit()
                return {"id": user_id, "name": name, "email": email}
            
            @app.get("/users/{user_id}")
            async def get_user(
                user_id: int,
                conn: aiosqlite.Connection = Depends(get_db_connection)
            ):
                cursor = await conn.execute(
                    "SELECT id, name, email FROM users WHERE id = ?",
                    (user_id,)
                )
                result = await cursor.fetchone()
                await cursor.close()
                
                if result:
                    return {"id": result[0], "name": result[1], "email": result[2]}
                else:
                    return {"error": "User not found"}
            
            # Test the CRUD operations
            with TestClient(app) as client:
                # Create user
                response = client.post("/users?name=John&email=john@example.com")
                assert response.status_code == 200
                user_data = response.json()
                assert user_data["name"] == "John"
                assert user_data["email"] == "john@example.com"
                user_id = user_data["id"]
                
                # Get user
                response = client.get(f"/users/{user_id}")
                assert response.status_code == 200
                retrieved_user = response.json()
                assert retrieved_user["name"] == "John"
                assert retrieved_user["email"] == "john@example.com"
                
                # Get non-existent user
                response = client.get("/users/999")
                assert response.status_code == 200
                assert response.json()["error"] == "User not found"
            
        finally:
            asyncio.run(close_database())
            if os.path.exists(temp_path):
                os.unlink(temp_path)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])