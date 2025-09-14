#!/bin/bash

# OpenFDA API Performance Testing with Curl
# Focused on response times, throughput, and rate limiting

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://api.fda.gov"
PERFORMANCE_LOG="openfda_performance_detailed.log"

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

# Initialize performance log
echo "OpenFDA API Performance Test - $(date)" > "$PERFORMANCE_LOG"
echo "=======================================" >> "$PERFORMANCE_LOG"

echo "=================================================================="
echo "           OpenFDA API Performance Testing Suite"
echo "=================================================================="
echo "Testing response times, throughput, and rate limiting behavior"
echo ""

# Performance test function
run_performance_test() {
    local test_name="$1"
    local url="$2"
    local iterations="$3"
    
    log_info "Running $test_name ($iterations iterations)..."
    
    local total_time=0
    local successful_requests=0
    local failed_requests=0
    local min_time=999999
    local max_time=0
    
    echo "" >> "$PERFORMANCE_LOG"
    echo "Test: $test_name" >> "$PERFORMANCE_LOG"
    echo "URL: $url" >> "$PERFORMANCE_LOG"
    echo "Iterations: $iterations" >> "$PERFORMANCE_LOG"
    echo "Timestamp,Duration,HTTP_Code,Size_Bytes,Connect_Time,TTFB" >> "$PERFORMANCE_LOG"
    
    for i in $(seq 1 $iterations); do
        local start_time=$(date +%s.%N)
        
        # Detailed curl timing
        local response=$(curl -s -w "%{http_code}|%{time_total}|%{size_download}|%{time_connect}|%{time_starttransfer}" "$url")
        
        local end_time=$(date +%s.%N)
        local duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        
        # Parse curl output
        local http_code=$(echo "$response" | tail -c 50 | cut -d'|' -f1)
        local time_total=$(echo "$response" | tail -c 50 | cut -d'|' -f2)
        local size_download=$(echo "$response" | tail -c 50 | cut -d'|' -f3)
        local time_connect=$(echo "$response" | tail -c 50 | cut -d'|' -f4)
        local time_ttfb=$(echo "$response" | tail -c 50 | cut -d'|' -f5)
        
        # Log detailed metrics
        echo "$(date -Iseconds),$duration,$http_code,$size_download,$time_connect,$time_ttfb" >> "$PERFORMANCE_LOG"
        
        if [ "$http_code" = "200" ]; then
            successful_requests=$((successful_requests + 1))
            
            if command -v bc &> /dev/null; then
                total_time=$(echo "$total_time + $time_total" | bc -l)
                
                # Track min/max times
                if (( $(echo "$time_total < $min_time" | bc -l) )); then
                    min_time=$time_total
                fi
                if (( $(echo "$time_total > $max_time" | bc -l) )); then
                    max_time=$time_total
                fi
            fi
        else
            failed_requests=$((failed_requests + 1))
            log_warning "Request $i failed: HTTP $http_code"
        fi
        
        # Rate limiting courtesy
        sleep 0.2
    done
    
    # Calculate statistics
    if [ $successful_requests -gt 0 ] && command -v bc &> /dev/null; then
        local avg_time=$(echo "scale=3; $total_time / $successful_requests" | bc -l)
        local success_rate=$(echo "scale=1; $successful_requests * 100 / $iterations" | bc -l)
        
        log_success "$test_name Results:"
        echo "  Successful: $successful_requests/$iterations (${success_rate}%)"
        echo "  Average time: ${avg_time}s"
        echo "  Min time: ${min_time}s"
        echo "  Max time: ${max_time}s"
        
        # Performance rating
        if (( $(echo "$avg_time < 2.0" | bc -l) )); then
            echo "  Performance: EXCELLENT"
        elif (( $(echo "$avg_time < 5.0" | bc -l) )); then
            echo "  Performance: GOOD"
        elif (( $(echo "$avg_time < 10.0" | bc -l) )); then
            echo "  Performance: ACCEPTABLE"
        else
            echo "  Performance: SLOW"
        fi
        
        # Log summary to file
        echo "" >> "$PERFORMANCE_LOG"
        echo "Summary: Success=$successful_requests/$iterations, Avg=${avg_time}s, Min=${min_time}s, Max=${max_time}s" >> "$PERFORMANCE_LOG"
    else
        log_error "$test_name: No successful requests or bc not available"
    fi
    
    echo ""
}

# Test 1: Basic Response Time Test
run_performance_test "Basic Response Time" "$BASE_URL/device/510k.json?limit=1" 10

# Test 2: Small Dataset Performance
run_performance_test "Small Dataset (5 records)" "$BASE_URL/device/510k.json?limit=5" 10

# Test 3: Medium Dataset Performance
run_performance_test "Medium Dataset (25 records)" "$BASE_URL/device/510k.json?limit=25" 5

# Test 4: Large Dataset Performance
run_performance_test "Large Dataset (100 records)" "$BASE_URL/device/510k.json?limit=100" 3

# Test 5: Search Query Performance
run_performance_test "Search Query Performance" "$BASE_URL/device/510k.json?search=device_name:pacemaker&limit=10" 5

# Test 6: Complex Query Performance
run_performance_test "Complex Query Performance" "$BASE_URL/device/510k.json?search=device_name:pacemaker+AND+clearance_date:[2020-01-01+TO+2024-12-31]&limit=10" 3

# Test 7: Rate Limiting Behavior Test
echo ""
log_info "Test 7: Rate Limiting Behavior Analysis"

log_info "Testing rate limiting with rapid requests..."
rate_limit_log="rate_limit_test.log"
echo "Timestamp,Request_Number,HTTP_Code,Response_Time" > "$rate_limit_log"

consecutive_requests=20
rate_limit_hits=0

for i in $(seq 1 $consecutive_requests); do
    start_time=$(date +%s.%N)
    response=$(curl -s -w "%{http_code}|%{time_total}" "$BASE_URL/device/510k.json?limit=1")
    end_time=$(date +%s.%N)
    
    http_code=$(echo "$response" | tail -c 20 | cut -d'|' -f1)
    response_time=$(echo "$response" | tail -c 20 | cut -d'|' -f2)
    
    echo "$(date -Iseconds),$i,$http_code,$response_time" >> "$rate_limit_log"
    
    if [ "$http_code" = "429" ]; then
        rate_limit_hits=$((rate_limit_hits + 1))
        log_warning "Rate limit hit on request $i"
    elif [ "$http_code" = "200" ]; then
        echo -n "."
    else
        log_warning "Unexpected response on request $i: HTTP $http_code"
    fi
    
    # No delay - testing rate limits
done

echo ""
log_info "Rate limiting analysis:"
echo "  Total requests: $consecutive_requests"
echo "  Rate limit hits: $rate_limit_hits"
echo "  Rate limit percentage: $(echo "scale=1; $rate_limit_hits * 100 / $consecutive_requests" | bc -l 2>/dev/null || echo "N/A")%"

if [ $rate_limit_hits -eq 0 ]; then
    log_success "No rate limiting detected in $consecutive_requests requests"
elif [ $rate_limit_hits -lt 5 ]; then
    log_warning "Minimal rate limiting detected"
else
    log_error "Significant rate limiting detected"
fi

# Test 8: API Key Performance Comparison
echo ""
log_info "Test 8: API Key Performance Comparison"

if [ ! -z "$FDA_API_KEY" ]; then
    log_info "Testing performance with API key..."
    
    # Test without API key
    run_performance_test "Without API Key" "$BASE_URL/device/510k.json?limit=10" 5
    
    # Test with API key
    run_performance_test "With API Key" "$BASE_URL/device/510k.json?api_key=$FDA_API_KEY&limit=10" 5
    
    log_info "API key comparison complete - check performance log for details"
else
    log_warning "FDA_API_KEY not set - skipping API key performance comparison"
fi

# Test 9: Concurrent Request Simulation
echo ""
log_info "Test 9: Concurrent Request Simulation"

log_info "Simulating concurrent requests (background processes)..."

concurrent_log="concurrent_test.log"
echo "Process_ID,Start_Time,End_Time,Duration,HTTP_Code" > "$concurrent_log"

# Launch 5 concurrent requests
for i in {1..5}; do
    (
        start_time=$(date +%s.%N)
        response=$(curl -s -w "%{http_code}" "$BASE_URL/device/510k.json?limit=5")
        end_time=$(date +%s.%N)
        duration=$(echo "$end_time - $start_time" | bc -l 2>/dev/null || echo "0")
        http_code="${response: -3}"
        
        echo "$i,$start_time,$end_time,$duration,$http_code" >> "$concurrent_log"
    ) &
done

# Wait for all background processes
wait

log_success "Concurrent request test completed - results in $concurrent_log"

# Test 10: Endpoint Comparison
echo ""
log_info "Test 10: Endpoint Performance Comparison"

declare -a endpoints=(
    "device/510k.json?limit=5"
    "device/classification.json?limit=5"
    "device/event.json?limit=5"
)

for endpoint in "${endpoints[@]}"; do
    endpoint_name=$(echo "$endpoint" | cut -d'/' -f2 | cut -d'.' -f1)
    run_performance_test "Endpoint: $endpoint_name" "$BASE_URL/$endpoint" 3
done

# Generate Performance Summary Report
echo ""
echo "=================================================================="
log_info "Performance Test Summary Report"
echo "=================================================================="

echo "Generated Performance Files:"
echo "- $PERFORMANCE_LOG (detailed performance metrics)"
echo "- $rate_limit_log (rate limiting analysis)"
echo "- $concurrent_log (concurrent request results)"

echo ""
echo "Performance Analysis Commands:"
echo "1. View detailed performance log:"
echo "   cat $PERFORMANCE_LOG"
echo ""
echo "2. Analyze response times:"
echo "   grep 'Summary:' $PERFORMANCE_LOG"
echo ""
echo "3. Check rate limiting patterns:"
echo "   cat $rate_limit_log | grep '429'"
echo ""
echo "4. View concurrent test results:"
echo "   cat $concurrent_log"

echo ""
echo "Performance Thresholds:"
echo "- Excellent: < 2.0s average response time"
echo "- Good: 2.0s - 5.0s average response time"
echo "- Acceptable: 5.0s - 10.0s average response time"
echo "- Slow: > 10.0s average response time"

echo ""
log_success "Performance testing complete!"

# Cleanup function
cleanup_temp_files() {
    log_info "Cleaning up temporary files..."
    # Keep the important log files, remove any temp files if created
}

trap cleanup_temp_files EXIT