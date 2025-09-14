# OpenFDA API Curl Testing Suite

## Overview

This comprehensive curl testing suite provides direct validation of OpenFDA API endpoints without requiring Python dependencies or complex setup. It's designed for network troubleshooting, API validation, authentication verification, and performance benchmarking.

## Test Scripts

### 1. Main Test Suite (`test_openfda_curl.sh`)

**Purpose**: Comprehensive testing of all OpenFDA API functionality

**Features**:
- Basic connectivity testing
- API key authentication validation
- Core endpoint testing (510k, classification, events)
- Response format validation
- Rate limiting verification
- Error scenario testing
- Performance benchmarking
- Data quality validation

**Usage**:
```bash
# Run full test suite
bash test_openfda_curl.sh

# Run with API key for enhanced testing
FDA_API_KEY=your_api_key bash test_openfda_curl.sh

# View results
cat openfda_curl_test_results.json | jq '.summary'
```

### 2. Medical Device Specific Tests (`test_openfda_medical_devices.sh`)

**Purpose**: Focused testing for medical device regulatory use cases

**Features**:
- Common medical device category searches
- FDA product code lookups
- Predicate device search simulation
- Device classification queries
- Adverse event monitoring
- Regulatory pathway determination
- Recent clearance tracking
- Complex boolean searches

**Usage**:
```bash
bash test_openfda_medical_devices.sh
```

### 3. Performance Testing (`test_openfda_performance.sh`)

**Purpose**: Detailed performance analysis and benchmarking

**Features**:
- Response time measurement
- Throughput testing
- Rate limiting analysis
- Concurrent request simulation
- Endpoint performance comparison
- Performance threshold validation

**Usage**:
```bash
bash test_openfda_performance.sh
```

### 4. Troubleshooting Script (`openfda_troubleshoot.sh`)

**Purpose**: Quick diagnostic tool for production support

**Features**:
- Basic connectivity check
- DNS resolution validation
- SSL certificate verification
- Response time testing
- Rate limiting status
- API key validation

**Usage**:
```bash
bash openfda_troubleshoot.sh
```

## Test Configuration

### Configuration File (`openfda_test_config.json`)

Contains structured configuration for:
- Test endpoints and queries
- Error test cases
- Performance thresholds
- Data validation rules

## Generated Output Files

### 1. Test Results (`openfda_curl_test_results.json`)

Structured JSON containing:
- Individual test results with timestamps
- HTTP status codes and response details
- Test summary with pass/fail counts
- Success rate calculations

### 2. Performance Log (`openfda_performance.log`)

Detailed performance metrics:
- Response times for each test
- HTTP status codes
- Data transfer sizes
- Performance ratings

### 3. Rate Limiting Log (`rate_limit_test.log`)

Rate limiting analysis:
- Request timestamps
- HTTP response codes
- Rate limit hit patterns

## Test Categories

### 1. Connectivity Tests
- Basic network connectivity
- DNS resolution
- SSL certificate validation
- API endpoint availability

### 2. Authentication Tests
- Public API access (no key)
- API key authentication
- Rate limit improvements with keys
- Authentication error handling

### 3. Endpoint Tests
- Device 510(k) database
- Device classification database
- Device adverse events
- Device enforcement reports
- Device recalls

### 4. Data Quality Tests
- JSON response structure validation
- Required field presence
- Data completeness checks
- Response format consistency

### 5. Performance Tests
- Response time measurement
- Throughput analysis
- Rate limiting behavior
- Concurrent request handling

### 6. Error Handling Tests
- Invalid field searches
- Malformed queries
- Empty searches
- Excessive limits

## Medical Device Use Cases

### Predicate Search Simulation
```bash
# Search for pacemaker predicates
curl -s "https://api.fda.gov/device/510k.json?search=device_name:pacemaker+AND+product_code:DQA&limit=10"
```

### Device Classification Lookup
```bash
# Get device classification by product code
curl -s "https://api.fda.gov/device/classification.json?search=product_code:DQA&limit=1"
```

### Recent Clearances
```bash
# Find recent device clearances
curl -s "https://api.fda.gov/device/510k.json?search=clearance_date:[2023-01-01+TO+2024-12-31]&limit=10"
```

### Adverse Event Monitoring
```bash
# Check adverse events for specific devices
curl -s "https://api.fda.gov/device/event.json?search=device.generic_name:pacemaker&limit=5"
```

## Performance Thresholds

### Response Time Categories
- **Excellent**: < 2.0 seconds
- **Good**: 2.0 - 5.0 seconds
- **Acceptable**: 5.0 - 10.0 seconds
- **Slow**: > 10.0 seconds

### Rate Limiting
- **Public API**: 240 requests per minute
- **With API Key**: 240 requests per minute (but higher burst capacity)

## Common Product Codes for Testing

| Code | Device Type | Class |
|------|-------------|-------|
| DQA | Pacemaker, permanent | 2 |
| FRN | Catheter, intravascular | 2 |
| LRH | Monitor, cardiac | 2 |
| MHX | System, measurement, glucose | 2 |
| DRF | Pump, infusion | 2 |

## Error Codes and Troubleshooting

### HTTP 200 - Success
- Normal operation
- Data returned successfully

### HTTP 404 - Not Found
- Invalid search field
- No results for query
- Endpoint not available

### HTTP 429 - Rate Limited
- Too many requests
- Wait before retrying
- Consider using API key

### HTTP 500 - Server Error
- Malformed query syntax
- Internal server issue
- Retry with corrected query

## Integration with Backend Services

### Environment Variables
```bash
export FDA_API_KEY="your_api_key_here"
export OPENFDA_BASE_URL="https://api.fda.gov"
```

### Python Integration
```python
# Use curl test results in Python
import json
with open('openfda_curl_test_results.json') as f:
    results = json.load(f)
    success_rate = results['summary']['passed'] / results['summary']['total']
```

### Monitoring Integration
```bash
# Check API health in monitoring scripts
if bash openfda_troubleshoot.sh > /dev/null 2>&1; then
    echo "FDA API healthy"
else
    echo "FDA API issues detected"
fi
```

## Best Practices

### 1. Rate Limiting Courtesy
- Add delays between requests (0.5s recommended)
- Monitor for 429 responses
- Use API key for higher limits

### 2. Error Handling
- Always check HTTP status codes
- Parse error messages from response body
- Implement retry logic with exponential backoff

### 3. Performance Optimization
- Use appropriate limit parameters
- Cache frequently accessed data
- Monitor response times

### 4. Security
- Never log API keys in plain text
- Use environment variables for sensitive data
- Validate all input parameters

## Maintenance and Updates

### Regular Testing
- Run full test suite weekly
- Monitor performance trends
- Update test cases for new endpoints

### API Changes
- Monitor FDA API documentation for changes
- Update test queries for deprecated fields
- Validate new endpoint functionality

### Performance Monitoring
- Track response time trends
- Monitor rate limiting patterns
- Analyze error rates

This curl testing suite provides comprehensive validation of OpenFDA API functionality and serves as a foundation for robust medical device regulatory applications.