#!/usr/bin/env python3
"""
Fix critical database and authentication issues identified in task 14.

Issues to fix:
1. DatabaseConfig object parsing - AttributeError: 'startswith' 
2. Missing authentication functions: validate_jwt_token, hash_password, verify_password
3. User object missing 'sub' attribute for JWT validation
4. SQL execution issues with raw strings
"""

import os
import sys
from pathlib import Path

def fix_database_config():
    """Fix DatabaseConfig object parsing issues"""
    config_file = Path("database/config.py")
    
    if not config_file.exists():
        print(f"❌ {config_file} not found")
        return False
    
    content = config_file.read_text()
    
    # Fix the model_post_init method to handle None values properly
    old_post_init = '''    def model_post_init(self, __context) -> None:
        """Post-initialization processing"""
        if self.database_url.startswith("sqlite"):
            # Extract database path from URL for SQLite
            if ":///" in self.database_url:
                path_part = self.database_url.split("///")[1]
                self.database_path = Path(path_part)'''
    
    new_post_init = '''    def model_post_init(self, __context) -> None:
        """Post-initialization processing"""
        if self.database_url and isinstance(self.database_url, str) and self.database_url.startswith("sqlite"):
            # Extract database path from URL for SQLite
            if ":///" in self.database_url:
                path_part = self.database_url.split("///")[1]
                self.database_path = Path(path_part)'''
    
    if old_post_init in content:
        content = content.replace(old_post_init, new_post_init)
        config_file.write_text(content)
        print("✅ Fixed DatabaseConfig.model_post_init method")
        return True
    else:
        print("⚠️  DatabaseConfig.model_post_init method already fixed or not found")
        return True

def fix_user_model():
    """Add 'sub' property to User model for JWT compatibility"""
    user_file = Path("models/user.py")
    
    if not user_file.exists():
        print(f"❌ {user_file} not found")
        return False
    
    content = user_file.read_text()
    
    # Add sub property after the existing fields
    if "def __repr__(self) -> str:" in content and "@property" not in content:
        # Add the sub property before __repr__
        old_repr = '''    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"'''
        
        new_content = '''    @property
    def sub(self) -> str:
        """Return user ID as string for JWT compatibility (sub claim)"""
        return str(self.id)
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email='{self.email}', name='{self.name}')>"'''
        
        content = content.replace(old_repr, new_content)
        user_file.write_text(content)
        print("✅ Added 'sub' property to User model")
        return True
    else:
        print("⚠️  User model 'sub' property already exists or __repr__ not found")
        return True

def fix_auth_service():
    """Add missing authentication functions to auth service"""
    auth_file = Path("services/auth.py")
    
    if not auth_file.exists():
        print(f"❌ {auth_file} not found")
        return False
    
    content = auth_file.read_text()
    
    # Add missing imports
    if "import bcrypt" not in content:
        # Add bcrypt import after existing imports
        import_section = "from pydantic import BaseModel"
        if import_section in content:
            content = content.replace(import_section, f"{import_section}\nimport bcrypt")
    
    # Add missing functions before the AuthService class
    missing_functions = '''

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def verify_password(password: str, hashed_password: str) -> bool:
    """Verify a password against its hash."""
    return bcrypt.checkpw(password.encode('utf-8'), hashed_password.encode('utf-8'))


def validate_jwt_token(token: str, secret_key: str = None) -> Dict[str, Any]:
    """Validate JWT token and return payload."""
    if secret_key is None:
        secret_key = os.getenv("NEXTAUTH_SECRET", "your-secret-key")
    
    try:
        payload = jwt.decode(token, secret_key, algorithms=["HS256"])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except (jwt.DecodeError, jwt.InvalidSignatureError, jwt.InvalidTokenError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

'''
    
    # Check if functions already exist
    if "def hash_password(" not in content:
        # Insert before class AuthService
        class_def = "class AuthService:"
        if class_def in content:
            content = content.replace(class_def, f"{missing_functions}\n{class_def}")
            auth_file.write_text(content)
            print("✅ Added missing authentication functions")
        else:
            print("❌ Could not find AuthService class to insert functions")
            return False
    else:
        print("⚠️  Authentication functions already exist")
    
    return True

def fix_database_connection():
    """Fix database connection SQL execution issues"""
    conn_file = Path("database/connection.py")
    
    if not conn_file.exists():
        print(f"❌ {conn_file} not found")
        return False
    
    content = conn_file.read_text()
    
    # Add text import for SQL execution
    if "from sqlalchemy import text" not in content:
        # Find the sqlalchemy imports and add text
        if "from sqlalchemy.ext.asyncio import" in content:
            content = content.replace(
                "from sqlalchemy.ext.asyncio import",
                "from sqlalchemy import text\nfrom sqlalchemy.ext.asyncio import"
            )
        elif "from sqlalchemy import" in content:
            # Find first sqlalchemy import and add text
            lines = content.split('\n')
            for i, line in enumerate(lines):
                if line.startswith("from sqlalchemy import") and "text" not in line:
                    if "," in line:
                        # Add text to existing import
                        lines[i] = line.replace("import ", "import text, ")
                    else:
                        # Add separate import
                        lines.insert(i + 1, "from sqlalchemy import text")
                    break
            content = '\n'.join(lines)
    
    # Fix raw SQL execution in health_check method
    old_health_check = '''        try:
            async with self.engine.begin() as conn:
                await conn.execute("SELECT 1")'''
    
    new_health_check = '''        try:
            async with self.engine.begin() as conn:
                await conn.execute(text("SELECT 1"))'''
    
    if old_health_check in content:
        content = content.replace(old_health_check, new_health_check)
        print("✅ Fixed SQL execution in health_check method")
    
    # Fix other raw SQL executions
    content = content.replace('await conn.execute("SELECT 1")', 'await conn.execute(text("SELECT 1"))')
    content = content.replace('await conn.execute("PRAGMA foreign_keys")', 'await conn.execute(text("PRAGMA foreign_keys"))')
    content = content.replace('await conn.execute("PRAGMA journal_mode")', 'await conn.execute(text("PRAGMA journal_mode"))')
    
    conn_file.write_text(content)
    print("✅ Fixed database connection SQL execution issues")
    return True

def add_bcrypt_dependency():
    """Add bcrypt to pyproject.toml dependencies"""
    pyproject_file = Path("pyproject.toml")
    
    if not pyproject_file.exists():
        print(f"❌ {pyproject_file} not found")
        return False
    
    content = pyproject_file.read_text()
    
    # Check if bcrypt is already in dependencies
    if "bcrypt" not in content:
        # Find the dependencies section and add bcrypt
        lines = content.split('\n')
        in_dependencies = False
        for i, line in enumerate(lines):
            if line.strip() == "[tool.poetry.dependencies]":
                in_dependencies = True
            elif in_dependencies and line.strip().startswith("["):
                # End of dependencies section, insert bcrypt before this
                lines.insert(i, 'bcrypt = "^4.0.1"')
                break
            elif in_dependencies and line.strip() and not line.startswith("#"):
                # We're in dependencies, add after python line if it exists
                if line.startswith("python"):
                    lines.insert(i + 1, 'bcrypt = "^4.0.1"')
                    break
        
        pyproject_file.write_text('\n'.join(lines))
        print("✅ Added bcrypt dependency to pyproject.toml")
        return True
    else:
        print("⚠️  bcrypt dependency already exists")
        return True

def main():
    """Main function to run all fixes"""
    print("🔧 Fixing critical database and authentication issues...")
    
    # Change to backend directory
    backend_dir = Path(__file__).parent
    os.chdir(backend_dir)
    
    success = True
    
    # Run all fixes
    fixes = [
        ("Database Config", fix_database_config),
        ("User Model", fix_user_model),
        ("Auth Service", fix_auth_service),
        ("Database Connection", fix_database_connection),
        ("BCrypt Dependency", add_bcrypt_dependency),
    ]
    
    for name, fix_func in fixes:
        print(f"\n📝 Fixing {name}...")
        try:
            if not fix_func():
                success = False
                print(f"❌ Failed to fix {name}")
        except Exception as e:
            print(f"❌ Error fixing {name}: {e}")
            success = False
    
    if success:
        print("\n✅ All fixes applied successfully!")
        print("\n📋 Next steps:")
        print("1. Run: poetry install  # to install bcrypt dependency")
        print("2. Run: poetry run python -m pytest tests/test_auth_service.py -v")
        print("3. Run: poetry run python -m pytest tests/test_database_connection.py -v")
    else:
        print("\n❌ Some fixes failed. Please check the errors above.")
        sys.exit(1)

if __name__ == "__main__":
    main()