#!/usr/bin/env python3
"""
Test startup seeding integration
"""

import asyncio
import logging
import os
import sys
from pathlib import Path

# Add the backend directory to the Python path
sys.path.insert(0, str(Path(__file__).parent))

from database.connection import init_database, close_database
from database.integrated_seeder import auto_seed_on_startup, get_seeder_config

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


async def test_startup_seeding():
    """Test the startup seeding process"""
    print("Testing Startup Seeding Integration")
    print("="*50)
    
    try:
        # Initialize database
        await init_database()
        print("✅ Database initialized")
        
        # Test with auto-seeding enabled
        os.environ["AUTO_SEED_ON_STARTUP"] = "true"
        os.environ["ENVIRONMENT"] = "development"
        
        print("\nTesting auto-seeding (enabled)...")
        seeding_results = await auto_seed_on_startup()
        
        if seeding_results:
            if seeding_results["success"]:
                print("✅ Auto-seeding completed successfully")
                print(f"   Environment: {seeding_results['environment']}")
                
                if seeding_results.get("warnings"):
                    print("   Warnings:")
                    for warning in seeding_results["warnings"]:
                        print(f"     - {warning}")
            else:
                print("❌ Auto-seeding failed:")
                for error in seeding_results["errors"]:
                    print(f"     - {error}")
                return False
        else:
            print("❌ Expected seeding results but got None")
            return False
        
        # Test with auto-seeding disabled
        os.environ["AUTO_SEED_ON_STARTUP"] = "false"
        
        print("\nTesting auto-seeding (disabled)...")
        seeding_results = await auto_seed_on_startup()
        
        if seeding_results is None:
            print("✅ Auto-seeding correctly skipped when disabled")
        else:
            print("❌ Expected None when auto-seeding disabled")
            return False
        
        # Test configuration
        config = get_seeder_config()
        print(f"\n✅ Seeder configuration loaded:")
        print(f"   Environment: {config.environment.value}")
        print(f"   Auto-seed: {config.auto_seed_on_startup}")
        print(f"   Clear before seed: {config.clear_before_seed}")
        print(f"   Validate: {config.validate_before_seed}")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed with error: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    finally:
        # Clean up
        try:
            await close_database()
            print("\n✅ Database connection closed")
        except Exception as e:
            print(f"Warning: Error closing database: {e}")


async def main():
    """Main test function"""
    success = await test_startup_seeding()
    
    if success:
        print("\n🎉 Startup seeding integration test passed!")
        sys.exit(0)
    else:
        print("\n💥 Startup seeding integration test failed!")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())