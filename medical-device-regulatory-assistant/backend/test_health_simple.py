#!/usr/bin/env python3
"""Simple health check test"""

import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

async def main():
    from services.health_check import health_service
    
    result = await health_service.check_all()
    print(f'Overall healthy: {result.healthy}')
    print('Individual checks:')
    for name, check in result.checks.items():
        print(f'  {name}: healthy={check.healthy}, status={check.status}')

if __name__ == "__main__":
    asyncio.run(main())