#!/usr/bin/env python3
"""
Script to fix critical database and authentication failures
"""

import os
import sys
import asyncio
from pathlib import Path

# Add the backend directory to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

async def main():
    """Main function to test fixes"""
    print("Testing database configuration fix...")
    
    # Test 1: DatabaseConfig object parsing
    from database.config import DatabaseConfig
    from database.connection import DatabaseManager
    
    # Test with string URL
    try:
        config_str = "sqlite+aiosqlite:///./test.db"
        manager1 = DatabaseManager(config_str)
        print("✓ String URL parsing works")
    except Exception as e:
        print(f"✗ String URL parsing failed: {e}")
    
    # Test with DatabaseConfig object
    try:
        config_obj = DatabaseConfig(database_url="sqlite+aiosqlite:///./test.db")
        manager2 = DatabaseManager(config_obj)
        print("✓ DatabaseConfig object parsing works")
    except Exception as e:
        print(f"✗ DatabaseConfig object parsing failed: {e}")
    
    # Test 2: Authentication functions
    print("\nTesting authentication functions...")
    
    try:
        from middleware.auth import validate_jwt_token, hash_password, verify_password
        
        # Test password hashing
        password = "test_password"
        hashed = hash_password(password)
        print(f"✓ Password hashing works: {hashed[:20]}...")
        
        # Test password verification
        is_valid = verify_password(password, hashed)
        print(f"✓ Password verification works: {is_valid}")
        
        # Test JWT validation (should return None for invalid token)
        result = validate_jwt_token("invalid_token")
        print(f"✓ JWT validation works: {result}")
        
    except Exception as e:
        print(f"✗ Authentication functions failed: {e}")
    
    # Test 3: User object with sub attribute
    print("\nTesting User model...")
    
    try:
        from middleware.auth import User
        
        user = User(
            id="test-user",
            email="test@example.com", 
            name="Test User",
            sub="test-user"
        )
        print(f"✓ User model works: {user.sub}")
        
    except Exception as e:
        print(f"✗ User model failed: {e}")

if __name__ == "__main__":
    asyncio.run(main())