#!/usr/bin/env python3
"""
Test script to verify backend startup without import errors
"""

import asyncio
import sys
from contextlib import asynccontextmanager

async def test_startup():
    """Test the backend startup process"""
    try:
        print("🧪 Testing backend startup...")
        
        # Test imports
        print("📦 Testing imports...")
        from services.openfda import create_openfda_service
        from main import app
        print("✅ All imports successful")
        
        # Test FDA service creation
        print("🔗 Testing FDA service creation...")
        fda_service = await create_openfda_service()
        print("✅ FDA service created successfully")
        
        # Test service cleanup
        print("🧹 Testing service cleanup...")
        await fda_service.close()
        print("✅ Service cleanup successful")
        
        print("🎉 Backend startup test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Backend startup test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = asyncio.run(test_startup())
    sys.exit(0 if success else 1)