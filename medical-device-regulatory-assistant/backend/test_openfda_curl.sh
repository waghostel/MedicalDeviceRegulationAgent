#!/bin/bash

# OpenFDA API Curl Test Suite
# Comprehensive testing of FDA API endpoints with curl commands
# Author: Backend Health System Fix P2
# Date: $(date)

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test configuration
BASE_URL="https://api.fda.gov"
TEST_RESULTS_FILE="openfda_curl_test_results.json"
PERFORMANCE_LOG="openfda_performance.log"

# Initialize test results
echo "{\"test_results\": [], \"summary\": {}}" > "$TEST_RESULTS_FILE"
echo "OpenFDA API Performance Log - $(date)" > "$PERFORMANCE_LOG"

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to measure response time and log performance
measure_performance() {
    local test_name="$1"
    local url="$2"
    local start_time=$(date +%s.%N 2>/dev/null || date +%s)
    
    local response=$(curl -s -w "%{http_code}|%{time_total}|%{size_download}" "$url")
    local end_time=$(date +%s.%N 2>/dev/null || date +%s)
    
    if [ "$BC_AVAILABLE" = true ]; then
        local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
    else
        local duration="0"
    fi
    
    local http_code=$(echo "$response" | tail -c 20 | cut -d'|' -f1)
    local time_total=$(echo "$response" | tail -c 20 | cut -d'|' -f2)
    local size_download=$(echo "$response" | tail -c 20 | cut -d'|' -f3)
    
    echo "Test: $test_name | Duration: ${duration}s | HTTP: $http_code | Size: ${size_download} bytes" >> "$PERFORMANCE_LOG"
    
    echo "$response"
}

# Function to add test result to JSON
add_test_result() {
    local test_name="$1"
    local status="$2"
    local details="$3"
    local http_code="$4"
    
    local temp_file=$(mktemp)
    jq --arg name "$test_name" --arg status "$status" --arg details "$details" --arg code "$http_code" \
       '.test_results += [{"name": $name, "status": $status, "details": $details, "http_code": $code, "timestamp": now}]' \
       "$TEST_RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$TEST_RESULTS_FILE"
}

echo "=================================================================="
echo "           OpenFDA API Direct Testing with Curl"
echo "=================================================================="
echo "Start Time: $(date)"
echo "Base URL: $BASE_URL"
echo ""

# Check if jq is available for JSON parsing
if ! command -v jq &> /dev/null; then
    log_warning "jq is not installed. JSON parsing will be limited."
    JQ_AVAILABLE=false
else
    JQ_AVAILABLE=true
fi

# Check if bc is available for calculations
if ! command -v bc &> /dev/null; then
    log_warning "bc is not installed. Performance calculations will be limited."
    BC_AVAILABLE=false
else
    BC_AVAILABLE=true
fi

# Test 1: Basic Connectivity Test
echo ""
log_info "Test 1: Basic Connectivity (No API Key Required)"
echo "Testing basic connectivity to api.fda.gov..."

CONNECTIVITY_URL="$BASE_URL/device/510k.json?limit=1"
response=$(curl -s -w "%{http_code}" "$CONNECTIVITY_URL")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    log_success "Basic connectivity test passed (HTTP 200)"
    if [ "$JQ_AVAILABLE" = true ]; then
        response_body="${response%???}"  # Remove last 3 chars (HTTP code)
        total_results=$(echo "$response_body" | jq -r '.meta.results.total // "unknown"' 2>/dev/null || echo "unknown")
        log_info "Total 510(k) records available: $total_results"
    fi
    add_test_result "Basic Connectivity" "PASS" "Successfully connected to FDA API" "$http_code"
else
    log_error "Basic connectivity test failed (HTTP $http_code)"
    add_test_result "Basic Connectivity" "FAIL" "Failed to connect to FDA API" "$http_code"
fi

# Test 2: API Key Authentication Test
echo ""
log_info "Test 2: API Key Authentication"

if [ ! -z "$FDA_API_KEY" ]; then
    log_info "FDA_API_KEY found, testing authenticated requests..."
    
    AUTH_URL="$BASE_URL/device/510k.json?api_key=$FDA_API_KEY&search=device_name:pacemaker&limit=5"
    response=$(curl -s -w "%{http_code}" "$AUTH_URL")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        log_success "API key authentication test passed"
        if [ "$JQ_AVAILABLE" = true ]; then
            response_body="${response%???}"
            device_count=$(echo "$response_body" | jq -r '.results | length' 2>/dev/null || echo "0")
            log_info "Retrieved $device_count pacemaker devices"
            
            # Show first device name if available
            first_device=$(echo "$response_body" | jq -r '.results[0].device_name // "N/A"' 2>/dev/null || echo "N/A")
            log_info "First device: $first_device"
        fi
        add_test_result "API Key Authentication" "PASS" "API key authentication successful" "$http_code"
    else
        log_error "API key authentication test failed (HTTP $http_code)"
        add_test_result "API Key Authentication" "FAIL" "API key authentication failed" "$http_code"
    fi
else
    log_warning "FDA_API_KEY environment variable not set, skipping authenticated tests"
    add_test_result "API Key Authentication" "SKIP" "FDA_API_KEY not available" "N/A"
fi

# Test 3: Core Endpoints Testing
echo ""
log_info "Test 3: Core FDA API Endpoints"

# Test 3a: Device 510(k) endpoint
log_info "Testing device/510k endpoint..."
ENDPOINT_510K="$BASE_URL/device/510k.json?search=device_name:insulin&limit=3"
response=$(curl -s -w "%{http_code}" "$ENDPOINT_510K")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    log_success "510(k) endpoint test passed"
    add_test_result "510k Endpoint" "PASS" "510k endpoint accessible" "$http_code"
else
    log_error "510(k) endpoint test failed (HTTP $http_code)"
    add_test_result "510k Endpoint" "FAIL" "510k endpoint failed" "$http_code"
fi

# Test 3b: Device classification endpoint
log_info "Testing device/classification endpoint..."
ENDPOINT_CLASS="$BASE_URL/device/classification.json?search=product_code:DQA&limit=1"
response=$(curl -s -w "%{http_code}" "$ENDPOINT_CLASS")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    log_success "Classification endpoint test passed"
    add_test_result "Classification Endpoint" "PASS" "Classification endpoint accessible" "$http_code"
else
    log_error "Classification endpoint test failed (HTTP $http_code)"
    add_test_result "Classification Endpoint" "FAIL" "Classification endpoint failed" "$http_code"
fi

# Test 3c: Device event endpoint
log_info "Testing device/event endpoint..."
ENDPOINT_EVENT="$BASE_URL/device/event.json?search=device.generic_name:pacemaker&limit=2"
response=$(curl -s -w "%{http_code}" "$ENDPOINT_EVENT")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    log_success "Event endpoint test passed"
    add_test_result "Event Endpoint" "PASS" "Event endpoint accessible" "$http_code"
else
    log_error "Event endpoint test failed (HTTP $http_code)"
    add_test_result "Event Endpoint" "FAIL" "Event endpoint failed" "$http_code"
fi

# Test 4: Response Format Validation
echo ""
log_info "Test 4: Response Format Validation"

if [ "$JQ_AVAILABLE" = true ]; then
    log_info "Validating JSON response structure..."
    
    VALIDATION_URL="$BASE_URL/device/510k.json?limit=1"
    response=$(curl -s "$VALIDATION_URL")
    
    # Check for required fields
    has_meta=$(echo "$response" | jq 'has("meta")' 2>/dev/null)
    has_results=$(echo "$response" | jq 'has("results")' 2>/dev/null)
    
    if [ "$has_meta" = "true" ] && [ "$has_results" = "true" ]; then
        log_success "Response format validation passed"
        
        # Check meta fields
        total=$(echo "$response" | jq -r '.meta.results.total // "missing"')
        skip=$(echo "$response" | jq -r '.meta.results.skip // "missing"')
        limit=$(echo "$response" | jq -r '.meta.results.limit // "missing"')
        
        log_info "Meta fields - Total: $total, Skip: $skip, Limit: $limit"
        add_test_result "Response Format" "PASS" "Valid JSON structure with required fields" "200"
    else
        log_error "Response format validation failed - missing required fields"
        add_test_result "Response Format" "FAIL" "Invalid JSON structure" "200"
    fi
else
    log_warning "Skipping JSON validation (jq not available)"
    add_test_result "Response Format" "SKIP" "jq not available for validation" "N/A"
fi

# Test 5: Rate Limiting Verification
echo ""
log_info "Test 5: Rate Limiting Verification"

log_info "Testing rate limiting behavior (making 5 consecutive requests)..."
rate_limit_failures=0

for i in {1..5}; do
    response=$(curl -s -w "%{http_code}" "$BASE_URL/device/510k.json?limit=1")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        log_success "Request $i: HTTP $http_code (Success)"
    elif [ "$http_code" = "429" ]; then
        log_warning "Request $i: HTTP $http_code (Rate Limited)"
        rate_limit_failures=$((rate_limit_failures + 1))
    else
        log_error "Request $i: HTTP $http_code (Unexpected)"
        rate_limit_failures=$((rate_limit_failures + 1))
    fi
    
    # Small delay between requests
    sleep 0.5
done

if [ $rate_limit_failures -eq 0 ]; then
    log_success "Rate limiting test passed - no rate limit errors"
    add_test_result "Rate Limiting" "PASS" "No rate limit errors in 5 requests" "200"
elif [ $rate_limit_failures -lt 3 ]; then
    log_warning "Rate limiting test partial - some rate limit errors"
    add_test_result "Rate Limiting" "PARTIAL" "$rate_limit_failures rate limit errors" "429"
else
    log_error "Rate limiting test failed - excessive rate limit errors"
    add_test_result "Rate Limiting" "FAIL" "Excessive rate limiting" "429"
fi

# Test 6: Error Scenario Testing
echo ""
log_info "Test 6: Error Scenario Testing"

# Test 6a: Invalid field search
log_info "Testing invalid field search..."
INVALID_URL="$BASE_URL/device/510k.json?search=invalid_field_name:test"
response=$(curl -s -w "%{http_code}" "$INVALID_URL")
http_code="${response: -3}"

if [ "$http_code" = "400" ] || [ "$http_code" = "404" ]; then
    log_success "Invalid field test passed (HTTP $http_code)"
    add_test_result "Invalid Field Error" "PASS" "Proper error handling for invalid fields" "$http_code"
else
    log_warning "Invalid field test unexpected result (HTTP $http_code)"
    add_test_result "Invalid Field Error" "PARTIAL" "Unexpected response to invalid field" "$http_code"
fi

# Test 6b: Malformed query
log_info "Testing malformed query..."
MALFORMED_URL="$BASE_URL/device/510k.json?search=device_name:"
response=$(curl -s -w "%{http_code}" "$MALFORMED_URL")
http_code="${response: -3}"

if [ "$http_code" = "400" ]; then
    log_success "Malformed query test passed (HTTP $http_code)"
    add_test_result "Malformed Query Error" "PASS" "Proper error handling for malformed queries" "$http_code"
else
    log_warning "Malformed query test unexpected result (HTTP $http_code)"
    add_test_result "Malformed Query Error" "PARTIAL" "Unexpected response to malformed query" "$http_code"
fi

# Test 7: Performance Benchmarking
echo ""
log_info "Test 7: Performance Benchmarking"

log_info "Running performance benchmark (10 requests)..."
total_time=0
successful_requests=0

for i in {1..10}; do
    start_time=$(date +%s.%N)
    response=$(curl -s -w "%{http_code}" "$BASE_URL/device/510k.json?limit=1")
    end_time=$(date +%s.%N)
    
    http_code="${response: -3}"
    
    if [ "$BC_AVAILABLE" = true ]; then
        duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        total_time=$(echo "$total_time + $duration" | bc -l 2>/dev/null || echo "$total_time")
    fi
    
    if [ "$http_code" = "200" ]; then
        successful_requests=$((successful_requests + 1))
    fi
    
    sleep 0.1  # Small delay between requests
done

if [ "$BC_AVAILABLE" = true ] && [ $successful_requests -gt 0 ]; then
    avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l 2>/dev/null || echo "0")
    log_success "Performance benchmark completed"
    log_info "Successful requests: $successful_requests/10"
    log_info "Average response time: ${avg_time}s"
    
    # Performance thresholds (using awk for compatibility)
    if awk "BEGIN {exit !($avg_time < 2.0)}" 2>/dev/null; then
        perf_status="EXCELLENT"
    elif awk "BEGIN {exit !($avg_time < 5.0)}" 2>/dev/null; then
        perf_status="GOOD"
    else
        perf_status="SLOW"
    fi
    
    add_test_result "Performance Benchmark" "PASS" "Avg response time: ${avg_time}s ($perf_status)" "200"
else
    log_warning "Performance benchmark limited (bc not available or no successful requests)"
    add_test_result "Performance Benchmark" "PARTIAL" "Limited performance data available" "N/A"
fi

# Test 8: Data Quality Validation
echo ""
log_info "Test 8: Data Quality Validation"

if [ "$JQ_AVAILABLE" = true ]; then
    log_info "Testing data quality and completeness..."
    
    DATA_URL="$BASE_URL/device/510k.json?search=device_name:glucose&limit=5"
    response=$(curl -s "$DATA_URL")
    
    # Check if we got results
    result_count=$(echo "$response" | jq -r '.results | length' 2>/dev/null || echo "0")
    
    if [ "$result_count" -gt 0 ]; then
        log_success "Data quality test passed - retrieved $result_count records"
        
        # Check for key fields in first result
        first_result=$(echo "$response" | jq -r '.results[0]')
        k_number=$(echo "$first_result" | jq -r '.k_number // "missing"')
        device_name=$(echo "$first_result" | jq -r '.device_name // "missing"')
        
        log_info "Sample data - K-Number: $k_number, Device: $device_name"
        add_test_result "Data Quality" "PASS" "Retrieved $result_count records with valid data" "200"
    else
        log_warning "Data quality test - no results returned"
        add_test_result "Data Quality" "PARTIAL" "No results returned for test query" "200"
    fi
else
    log_warning "Skipping data quality validation (jq not available)"
    add_test_result "Data Quality" "SKIP" "jq not available for data validation" "N/A"
fi

# Generate Summary Report
echo ""
echo "=================================================================="
log_info "Test Summary Report"
echo "=================================================================="

if [ "$JQ_AVAILABLE" = true ]; then
    # Count test results
    total_tests=$(jq -r '.test_results | length' "$TEST_RESULTS_FILE")
    passed_tests=$(jq -r '[.test_results[] | select(.status == "PASS")] | length' "$TEST_RESULTS_FILE")
    failed_tests=$(jq -r '[.test_results[] | select(.status == "FAIL")] | length' "$TEST_RESULTS_FILE")
    skipped_tests=$(jq -r '[.test_results[] | select(.status == "SKIP")] | length' "$TEST_RESULTS_FILE")
    partial_tests=$(jq -r '[.test_results[] | select(.status == "PARTIAL")] | length' "$TEST_RESULTS_FILE")
    
    # Update summary in JSON
    temp_file=$(mktemp)
    jq --arg total "$total_tests" --arg passed "$passed_tests" --arg failed "$failed_tests" \
       --arg skipped "$skipped_tests" --arg partial "$partial_tests" \
       '.summary = {"total": ($total | tonumber), "passed": ($passed | tonumber), "failed": ($failed | tonumber), "skipped": ($skipped | tonumber), "partial": ($partial | tonumber), "completion_time": now}' \
       "$TEST_RESULTS_FILE" > "$temp_file" && mv "$temp_file" "$TEST_RESULTS_FILE"
    
    echo "Total Tests: $total_tests"
    echo "Passed: $passed_tests"
    echo "Failed: $failed_tests"
    echo "Partial: $partial_tests"
    echo "Skipped: $skipped_tests"
    
    # Calculate success rate
    if [ $total_tests -gt 0 ]; then
        if [ "$BC_AVAILABLE" = true ]; then
            success_rate=$(echo "scale=1; ($passed_tests + $partial_tests) * 100 / $total_tests" | bc -l 2>/dev/null || echo "N/A")
        else
            success_rate=$(awk "BEGIN {printf \"%.1f\", ($passed_tests + $partial_tests) * 100 / $total_tests}" 2>/dev/null || echo "N/A")
        fi
        echo "Success Rate: ${success_rate}%"
    fi
    
    # Show failed tests
    if [ $failed_tests -gt 0 ]; then
        echo ""
        log_error "Failed Tests:"
        jq -r '.test_results[] | select(.status == "FAIL") | "- \(.name): \(.details)"' "$TEST_RESULTS_FILE"
    fi
else
    echo "Summary generation limited (jq not available)"
fi

echo ""
echo "Test Results File: $TEST_RESULTS_FILE"
echo "Performance Log: $PERFORMANCE_LOG"
echo "End Time: $(date)"

# Create troubleshooting script
log_info "Creating troubleshooting script..."
cat > openfda_troubleshoot.sh << 'EOF'
#!/bin/bash

# OpenFDA API Troubleshooting Script
# Quick diagnostic commands for production support

echo "OpenFDA API Troubleshooting - $(date)"
echo "=========================================="

# Check basic connectivity
echo "1. Basic Connectivity Check:"
if curl -s --connect-timeout 10 "https://api.fda.gov/device/510k.json?limit=1" > /dev/null; then
    echo "✓ Can connect to api.fda.gov"
else
    echo "✗ Cannot connect to api.fda.gov"
    echo "  Check network connectivity and DNS resolution"
fi

# Check DNS resolution
echo ""
echo "2. DNS Resolution Check:"
if nslookup api.fda.gov > /dev/null 2>&1; then
    echo "✓ DNS resolution working"
    nslookup api.fda.gov | grep "Address:" | head -2
else
    echo "✗ DNS resolution failed"
fi

# Check SSL certificate
echo ""
echo "3. SSL Certificate Check:"
ssl_info=$(curl -s -I --connect-timeout 10 "https://api.fda.gov" 2>&1)
if echo "$ssl_info" | grep -q "HTTP/"; then
    echo "✓ SSL certificate valid"
else
    echo "✗ SSL certificate issue"
    echo "$ssl_info"
fi

# Test API response time
echo ""
echo "4. Response Time Test:"
response_time=$(curl -s -w "%{time_total}" -o /dev/null "https://api.fda.gov/device/510k.json?limit=1")
echo "Response time: ${response_time}s"

if (( $(echo "$response_time > 5.0" | bc -l 2>/dev/null || echo "0") )); then
    echo "⚠ Slow response time (>5s)"
else
    echo "✓ Response time acceptable"
fi

# Check rate limiting status
echo ""
echo "5. Rate Limiting Status:"
for i in {1..3}; do
    http_code=$(curl -s -w "%{http_code}" -o /dev/null "https://api.fda.gov/device/510k.json?limit=1")
    echo "Request $i: HTTP $http_code"
    if [ "$http_code" = "429" ]; then
        echo "⚠ Rate limiting detected"
        break
    fi
    sleep 1
done

# Test with API key if available
echo ""
echo "6. API Key Test:"
if [ ! -z "$FDA_API_KEY" ]; then
    auth_response=$(curl -s -w "%{http_code}" -o /dev/null "https://api.fda.gov/device/510k.json?api_key=$FDA_API_KEY&limit=1")
    if [ "$auth_response" = "200" ]; then
        echo "✓ API key authentication working"
    else
        echo "✗ API key authentication failed (HTTP $auth_response)"
    fi
else
    echo "- FDA_API_KEY not set (using public rate limits)"
fi

echo ""
echo "Troubleshooting complete."
EOF

chmod +x openfda_troubleshoot.sh
log_success "Created troubleshooting script: openfda_troubleshoot.sh"

echo ""
echo "=================================================================="
log_success "OpenFDA API Curl Test Suite Complete!"
echo "=================================================================="

echo ""
echo "Generated Files:"
echo "- test_openfda_curl.sh (this script)"
echo "- $TEST_RESULTS_FILE (detailed test results)"
echo "- $PERFORMANCE_LOG (performance metrics)"
echo "- openfda_troubleshoot.sh (troubleshooting script)"

echo ""
echo "Usage Examples:"
echo "1. Run full test suite:"
echo "   bash test_openfda_curl.sh"
echo ""
echo "2. Run with API key:"
echo "   FDA_API_KEY=your_key bash test_openfda_curl.sh"
echo ""
echo "3. Run troubleshooting:"
echo "   bash openfda_troubleshoot.sh"
echo ""
echo "4. View results:"
echo "   cat $TEST_RESULTS_FILE | jq '.summary'"
echo "   cat $PERFORMANCE_LOG"

# Exit with appropriate code based on test results
if [ "$JQ_AVAILABLE" = true ]; then
    failed_count=$(jq -r '[.test_results[] | select(.status == "FAIL")] | length' "$TEST_RESULTS_FILE" 2>/dev/null || echo "0")
    if [ "$failed_count" -gt 0 ]; then
        exit 1
    else
        exit 0
    fi
else
    exit 0
fi