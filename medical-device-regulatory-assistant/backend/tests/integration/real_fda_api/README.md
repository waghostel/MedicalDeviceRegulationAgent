# Real FDA API Integration Tests

This directory contains comprehensive integration tests that make actual calls to the FDA's openFDA API. These tests validate real-world behavior, performance, and error handling with live API data.

## ⚠️ Important Safety Guidelines

**These tests make real API calls and should be used responsibly:**

- Tests respect FDA rate limits (240 requests/minute)
- Include delays between requests to be respectful of the API
- Use FDA_API_KEY environment variable to avoid hitting rate limits
- Run sparingly to avoid exhausting API quotas
- Never run in CI/CD pipelines without careful consideration

## 🚀 Quick Start

### Prerequisites

1. **Environment Setup:**
   ```bash
   cd medical-device-regulatory-assistant/backend
   poetry install
   ```

2. **Optional but Recommended - FDA API Key:**
   ```bash
   export FDA_API_KEY="your_fda_api_key_here"
   ```

3. **Network Connectivity:**
   - Ensure access to `api.fda.gov` on port 443

### Running Tests

**Quick Test (Recommended for first run):**
```bash
poetry run python -m pytest tests/integration/real_fda_api/ -m real_api -k "test_real_predicate_search_with_validation" -v
```

**Using the Test Runner (Recommended):**
```bash
# Quick subset of tests
python tests/integration/real_fda_api/run_real_api_tests.py --quick

# Health monitoring only
python tests/integration/real_fda_api/run_real_api_tests.py --health-only

# All tests (use carefully)
python tests/integration/real_fda_api/run_real_api_tests.py --all --verbose
```

**Direct pytest (Advanced):**
```bash
# Run all real API tests
poetry run python -m pytest tests/integration/real_fda_api/ -m real_api -v

# Run specific test file
poetry run python -m pytest tests/integration/real_fda_api/test_schema_validation.py -m real_api -v

# Run with custom markers
poetry run python -m pytest tests/integration/real_fda_api/ -m "real_api and not slow" -v
```

## 📁 Test Structure

### Test Files

| File | Purpose | Test Count | Runtime |
|------|---------|------------|---------|
| `test_real_fda_integration.py` | Core API functionality and error handling | ~15 tests | 2-5 min |
| `test_schema_validation.py` | Response schema and data integrity validation | ~10 tests | 1-3 min |
| `test_performance_benchmarks.py` | Performance testing and optimization | ~12 tests | 3-8 min |
| `test_api_health_monitoring.py` | Health monitoring and SLA compliance | ~8 tests | 2-6 min |

### Test Categories

#### 1. Integration Tests (`test_real_fda_integration.py`)
- **Purpose:** Validate core API functionality with real data
- **Coverage:**
  - Predicate device searches with real results
  - Device classification lookups
  - Adverse event searches
  - Error handling for all HTTP status codes (401, 403, 404, 429, 500)
  - API configuration validation
  - Health check functionality

#### 2. Schema Validation (`test_schema_validation.py`)
- **Purpose:** Ensure API responses match expected schemas
- **Coverage:**
  - FDA search result schema validation
  - Device classification schema validation
  - Adverse event schema validation
  - Data integrity and consistency checks
  - Cross-reference validation between endpoints
  - Date format consistency

#### 3. Performance Benchmarks (`test_performance_benchmarks.py`)
- **Purpose:** Measure and optimize API performance
- **Coverage:**
  - Response time benchmarking
  - Concurrent request performance
  - Cache performance impact
  - Large result set handling
  - Memory usage monitoring
  - Connection pool efficiency
  - Rate limiting behavior
  - Throughput optimization

#### 4. Health Monitoring (`test_api_health_monitoring.py`)
- **Purpose:** Monitor API health and availability
- **Coverage:**
  - Continuous health monitoring
  - API availability tracking
  - Error rate monitoring
  - Response time monitoring
  - Circuit breaker monitoring
  - SLA compliance testing
  - Service degradation detection

## 🔧 Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FDA_API_KEY` | No | None | FDA API key for higher rate limits |
| `USE_REAL_FDA_API` | No | false | Enable real API calls (auto-set by tests) |
| `TESTING` | No | false | Test environment flag |

### Pytest Markers

| Marker | Description | Usage |
|--------|-------------|-------|
| `real_api` | Tests that make real FDA API calls | Required for all tests in this directory |
| `slow` | Tests that take longer to execute | Optional, for performance tests |
| `integration` | Integration tests | Optional, inherited from parent |

### Test Configuration

Tests are configured to:
- Respect FDA rate limits (240 requests/minute)
- Include appropriate delays between requests
- Handle network timeouts gracefully
- Provide detailed error reporting
- Skip tests if network is unavailable

## 📊 Performance Expectations

### Response Time Targets

| Operation | Target | Acceptable | Timeout |
|-----------|--------|------------|---------|
| Predicate Search | < 5s | < 10s | 15s |
| Classification Lookup | < 3s | < 5s | 10s |
| Health Check | < 2s | < 5s | 10s |
| Adverse Events Search | < 5s | < 10s | 15s |

### Success Rate Targets

| Metric | Target | Acceptable | Alert Threshold |
|--------|--------|------------|-----------------|
| API Availability | > 95% | > 90% | < 80% |
| Success Rate | > 90% | > 80% | < 70% |
| Error Rate | < 5% | < 10% | > 20% |

## 🐛 Troubleshooting

### Common Issues

#### 1. Rate Limiting (429 Errors)
```
RateLimitExceededError: Rate limit exceeded after 3 attempts
```
**Solutions:**
- Set `FDA_API_KEY` environment variable
- Reduce test frequency
- Wait before retrying tests

#### 2. Network Connectivity
```
NetworkError: Connection to api.fda.gov failed
```
**Solutions:**
- Check internet connection
- Verify firewall settings
- Test manual connection: `curl https://api.fda.gov/device/510k.json?limit=1`

#### 3. Authentication Issues
```
FDAAPIError: Authentication failed - check FDA_API_KEY
```
**Solutions:**
- Verify FDA_API_KEY is correct
- Check API key hasn't expired
- Test key manually with curl

#### 4. Timeout Errors
```
asyncio.TimeoutError: Request timed out after 30 seconds
```
**Solutions:**
- Check network stability
- Increase timeout values in test configuration
- Run tests during off-peak hours

### Debug Mode

Enable debug logging:
```bash
export LOG_LEVEL=DEBUG
poetry run python -m pytest tests/integration/real_fda_api/ -m real_api -v -s
```

### Test Isolation

Run individual test methods:
```bash
# Single test method
poetry run python -m pytest tests/integration/real_fda_api/test_real_fda_integration.py::TestRealFDAAPIIntegration::test_real_predicate_search_with_validation -v

# Single test class
poetry run python -m pytest tests/integration/real_fda_api/test_schema_validation.py::TestFDAAPISchemaValidation -v
```

## 📈 Monitoring and Reporting

### Test Reports

Tests generate detailed reports including:
- Response time statistics
- Error rate analysis
- Schema validation results
- Performance benchmarks
- Health monitoring summaries

### Metrics Collection

Key metrics collected:
- API response times (mean, median, p95, p99)
- Success/failure rates
- Error type distribution
- Circuit breaker state changes
- Memory usage patterns
- Network connection efficiency

### Alerting Thresholds

Tests will alert on:
- Response times > 15 seconds
- Error rates > 20%
- Availability < 70%
- Circuit breaker opening
- Memory leaks > 100MB increase

## 🔄 CI/CD Integration

### GitHub Actions Example

```yaml
name: Real FDA API Tests
on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday at 6 AM
  workflow_dispatch:

jobs:
  real-api-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      - name: Install Poetry
        run: pip install poetry
      - name: Install Dependencies
        run: |
          cd medical-device-regulatory-assistant/backend
          poetry install
      - name: Run Quick Real API Tests
        env:
          FDA_API_KEY: ${{ secrets.FDA_API_KEY }}
        run: |
          cd medical-device-regulatory-assistant/backend
          python tests/integration/real_fda_api/run_real_api_tests.py --quick
```

### Best Practices for CI/CD

1. **Frequency:** Run weekly or on-demand, not on every commit
2. **Scope:** Use `--quick` option for regular runs
3. **Secrets:** Store FDA_API_KEY as encrypted secret
4. **Timeouts:** Set appropriate job timeouts (30-60 minutes)
5. **Failure Handling:** Don't fail builds on API unavailability
6. **Notifications:** Alert on consistent failures, not single failures

## 🤝 Contributing

### Adding New Tests

1. **Follow Naming Convention:**
   - File: `test_[category]_[description].py`
   - Class: `Test[Category][Description]`
   - Method: `test_[specific_functionality]`

2. **Use Proper Markers:**
   ```python
   pytestmark = pytest.mark.real_api
   
   @pytest.mark.asyncio
   async def test_new_functionality(self, real_openfda_service):
       # Test implementation
   ```

3. **Include Documentation:**
   - Docstring explaining test purpose
   - Expected behavior description
   - Performance expectations

4. **Handle Errors Gracefully:**
   ```python
   try:
       result = await service.operation()
       # Validate result
   except RateLimitExceededError:
       # Expected, handle gracefully
       pass
   except FDAAPIError as e:
       # Log and potentially skip
       pytest.skip(f"API error: {e}")
   ```

### Code Review Checklist

- [ ] Test includes proper error handling
- [ ] Respects rate limits with delays
- [ ] Includes performance assertions
- [ ] Has clear documentation
- [ ] Uses appropriate fixtures
- [ ] Validates response schemas
- [ ] Handles network failures gracefully

## 📚 References

- [FDA openFDA API Documentation](https://open.fda.gov/apis/)
- [FDA 510(k) Database](https://open.fda.gov/apis/device/510k/)
- [FDA Device Classification Database](https://open.fda.gov/apis/device/classification/)
- [FDA Rate Limiting Guidelines](https://open.fda.gov/apis/authentication/)

## 📄 License

These tests are part of the Medical Device Regulatory Assistant project and follow the same license terms.