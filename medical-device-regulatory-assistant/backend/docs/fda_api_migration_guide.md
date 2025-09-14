# FDA API Migration Guide

## Overview
Guide for migrating from mock FDA API to real FDA API integration.

## Migration Steps

### 1. Environment Configuration
```bash
# Before (Mock API)
export USE_REAL_FDA_API=false

# After (Real API)
export USE_REAL_FDA_API=true
export FDA_API_KEY=your-fda-api-key
export REDIS_URL=redis://localhost:6379
```

### 2. Service Configuration Update
```python
# Before: Mock service
service = create_mock_openfda_service()

# After: Real service
service = await create_production_openfda_service()
```

### 3. Testing Migration
```bash
# Test real API connectivity
poetry run python -c "
import asyncio
from services.openfda import create_production_openfda_service

async def test_migration():
    service = await create_production_openfda_service()
    health = await service.health_check()
    print(f'Status: {health[\"status\"]}')
    await service.close()

asyncio.run(test_migration())
"
```

### 4. Gradual Rollout
1. **Development**: Test with real API
2. **Staging**: Validate performance and reliability
3. **Production**: Deploy with monitoring

### 5. Rollback Plan
```bash
# Emergency rollback to mock
export USE_REAL_FDA_API=false
# Restart services
```

## Validation Checklist
- [ ] API key configured and valid
- [ ] Redis cache operational
- [ ] Rate limiting working correctly
- [ ] Error handling functional
- [ ] Performance meets targets
- [ ] Monitoring alerts configured