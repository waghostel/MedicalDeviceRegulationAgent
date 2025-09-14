# FDA API Maintenance Guide

## Daily Maintenance Tasks

### Health Check Monitoring
```bash
# Check FDA API health
poetry run python -c "
import asyncio
from services.openfda import create_production_openfda_service

async def daily_health_check():
    service = await create_production_openfda_service()
    health = await service.health_check()
    print(f'Status: {health[\"status\"]}')
    print(f'Response Time: {health.get(\"response_time_seconds\", \"N/A\")}s')
    print(f'Circuit Breaker: {health[\"circuit_breaker_state\"]}')
    await service.close()

asyncio.run(daily_health_check())
"
```

### Cache Performance Review
```bash
# Check Redis cache statistics
redis-cli info stats | grep keyspace
redis-cli info memory | grep used_memory_human
```

## Weekly Maintenance Tasks

### API Key Validation
- Verify API key is not approaching expiration
- Check rate limit usage patterns
- Review error logs for authentication issues

### Performance Analysis
```bash
# Analyze response time trends
grep "FDA API request" backend.log | tail -1000 | awk '{print $NF}' | sort -n
```

### Cache Optimization
```bash
# Clear stale cache entries if needed
redis-cli EVAL "return redis.call('del', unpack(redis.call('keys', ARGV[1])))" 0 "openfda:*"
```

## Monthly Maintenance Tasks

### Security Review
- Rotate API keys if required
- Review access logs for anomalies
- Update SSL certificates if needed

### Performance Optimization
- Analyze cache hit rates
- Review and adjust cache TTL settings
- Optimize query patterns based on usage

### Backup and Recovery
- Backup Redis cache configuration
- Test disaster recovery procedures
- Validate monitoring alerts

## Emergency Procedures

### API Outage Response
1. Check FDA API status: https://open.fda.gov/
2. Enable circuit breaker if needed
3. Switch to cached responses only
4. Notify users of degraded service

### Performance Degradation
1. Check Redis cache health
2. Review rate limiting status
3. Analyze error logs
4. Scale resources if needed

## Monitoring Alerts

### Critical Alerts
- FDA API response time > 30 seconds
- Error rate > 5%
- Circuit breaker OPEN state
- Redis cache unavailable

### Warning Alerts  
- Response time > 10 seconds
- Error rate > 1%
- Cache hit rate < 70%
- Rate limit approaching (>90% usage)