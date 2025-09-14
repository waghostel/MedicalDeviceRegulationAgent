#!/bin/bash

# OpenFDA Medical Device Specific Curl Tests
# Focused testing for medical device regulatory use cases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

BASE_URL="https://api.fda.gov"

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

echo "=================================================================="
echo "     OpenFDA Medical Device Regulatory Testing Suite"
echo "=================================================================="
echo "Testing medical device specific queries and use cases"
echo ""

# Test 1: Common Medical Device Categories
log_info "Test 1: Common Medical Device Categories"

declare -a device_categories=(
    "pacemaker"
    "insulin"
    "glucose"
    "catheter"
    "stent"
    "implant"
    "monitor"
    "pump"
)

for device in "${device_categories[@]}"; do
    log_info "Searching for: $device"
    
    url="$BASE_URL/device/510k.json?search=device_name:$device&limit=3"
    response=$(curl -s -w "%{http_code}" "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
            log_success "$device: Found $count devices (HTTP $http_code)"
        else
            log_success "$device: HTTP $http_code"
        fi
    else
        log_error "$device: HTTP $http_code"
    fi
    
    sleep 0.5  # Rate limiting courtesy
done

# Test 2: Product Code Searches (Common FDA Product Codes)
echo ""
log_info "Test 2: FDA Product Code Searches"

declare -a product_codes=(
    "DQA"  # Pacemaker, permanent
    "FRN"  # Catheter, intravascular
    "LRH"  # Monitor, cardiac
    "MHX"  # System, measurement, glucose
    "DRF"  # Pump, infusion
)

for code in "${product_codes[@]}"; do
    log_info "Testing product code: $code"
    
    url="$BASE_URL/device/classification.json?search=product_code:$code&limit=1"
    response=$(curl -s -w "%{http_code}" "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            device_name=$(echo "${response%???}" | jq -r '.results[0].device_name // "N/A"' 2>/dev/null)
            device_class=$(echo "${response%???}" | jq -r '.results[0].device_class // "N/A"' 2>/dev/null)
            log_success "$code: $device_name (Class $device_class)"
        else
            log_success "$code: HTTP $http_code"
        fi
    else
        log_error "$code: HTTP $http_code"
    fi
    
    sleep 0.5
done

# Test 3: Predicate Device Search Simulation
echo ""
log_info "Test 3: Predicate Device Search Simulation"

log_info "Simulating predicate search for cardiac pacemaker..."

# Search for pacemakers with specific criteria
url="$BASE_URL/device/510k.json?search=device_name:pacemaker+AND+product_code:DQA&limit=10"
response=$(curl -s -w "%{http_code}" "$url")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    if command -v jq &> /dev/null; then
        count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_success "Found $count potential pacemaker predicates"
        
        # Show details of first few results
        for i in {0..2}; do
            k_number=$(echo "${response%???}" | jq -r ".results[$i].k_number // \"N/A\"" 2>/dev/null)
            device_name=$(echo "${response%???}" | jq -r ".results[$i].device_name // \"N/A\"" 2>/dev/null)
            clearance_date=$(echo "${response%???}" | jq -r ".results[$i].clearance_date // \"N/A\"" 2>/dev/null)
            
            if [ "$k_number" != "N/A" ]; then
                log_info "  Predicate $((i+1)): $k_number - $device_name ($clearance_date)"
            fi
        done
    else
        log_success "Predicate search completed (HTTP $http_code)"
    fi
else
    log_error "Predicate search failed (HTTP $http_code)"
fi

# Test 4: Device Classification Lookup
echo ""
log_info "Test 4: Device Classification Lookup"

log_info "Testing device classification queries..."

# Test different device classes
for class in "1" "2" "3"; do
    log_info "Searching Class $class devices..."
    
    url="$BASE_URL/device/classification.json?search=device_class:$class&limit=5"
    response=$(curl -s -w "%{http_code}" "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
            log_success "Class $class: Found $count devices"
        else
            log_success "Class $class: HTTP $http_code"
        fi
    else
        log_error "Class $class: HTTP $http_code"
    fi
    
    sleep 0.5
done

# Test 5: Adverse Event Monitoring
echo ""
log_info "Test 5: Adverse Event Monitoring"

log_info "Testing adverse event queries for medical devices..."

declare -a event_devices=(
    "pacemaker"
    "insulin+pump"
    "catheter"
)

for device in "${event_devices[@]}"; do
    log_info "Checking adverse events for: ${device/+/ }"
    
    url="$BASE_URL/device/event.json?search=device.generic_name:$device&limit=3"
    response=$(curl -s -w "%{http_code}" "$url")
    http_code="${response: -3}"
    
    if [ "$http_code" = "200" ]; then
        if command -v jq &> /dev/null; then
            count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
            log_success "${device/+/ }: Found $count adverse events"
        else
            log_success "${device/+/ }: HTTP $http_code"
        fi
    else
        log_warning "${device/+/ }: HTTP $http_code (may be no events)"
    fi
    
    sleep 0.5
done

# Test 6: Regulatory Pathway Determination
echo ""
log_info "Test 6: Regulatory Pathway Determination"

log_info "Testing queries to determine regulatory pathways..."

# Test for De Novo devices (newer pathway)
log_info "Searching for De Novo classified devices..."
url="$BASE_URL/device/510k.json?search=decision_description:de+novo&limit=5"
response=$(curl -s -w "%{http_code}" "$url")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    if command -v jq &> /dev/null; then
        count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_success "Found $count De Novo devices"
    else
        log_success "De Novo search: HTTP $http_code"
    fi
else
    log_warning "De Novo search: HTTP $http_code"
fi

# Test 7: Recent Device Clearances
echo ""
log_info "Test 7: Recent Device Clearances"

log_info "Testing queries for recent device clearances..."

# Get current year for recent clearances
current_year=$(date +%Y)
last_year=$((current_year - 1))

url="$BASE_URL/device/510k.json?search=clearance_date:[$last_year-01-01+TO+$current_year-12-31]&limit=10"
response=$(curl -s -w "%{http_code}" "$url")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    if command -v jq &> /dev/null; then
        count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_success "Found $count recent clearances ($last_year-$current_year)"
        
        # Show a few recent clearances
        for i in {0..2}; do
            k_number=$(echo "${response%???}" | jq -r ".results[$i].k_number // \"N/A\"" 2>/dev/null)
            device_name=$(echo "${response%???}" | jq -r ".results[$i].device_name // \"N/A\"" 2>/dev/null)
            clearance_date=$(echo "${response%???}" | jq -r ".results[$i].clearance_date // \"N/A\"" 2>/dev/null)
            
            if [ "$k_number" != "N/A" ]; then
                log_info "  Recent: $k_number - $device_name ($clearance_date)"
            fi
        done
    else
        log_success "Recent clearances: HTTP $http_code"
    fi
else
    log_warning "Recent clearances: HTTP $http_code"
fi

# Test 8: Complex Search Queries
echo ""
log_info "Test 8: Complex Search Queries"

log_info "Testing complex boolean search queries..."

# Complex query: Class II cardiac devices
complex_query="device_class:2+AND+medical_specialty_description:cardiovascular"
url="$BASE_URL/device/classification.json?search=$complex_query&limit=5"
response=$(curl -s -w "%{http_code}" "$url")
http_code="${response: -3}"

if [ "$http_code" = "200" ]; then
    if command -v jq &> /dev/null; then
        count=$(echo "${response%???}" | jq -r '.results | length' 2>/dev/null || echo "0")
        log_success "Complex query (Class II Cardiovascular): Found $count devices"
    else
        log_success "Complex query: HTTP $http_code"
    fi
else
    log_warning "Complex query: HTTP $http_code"
fi

echo ""
echo "=================================================================="
log_success "Medical Device Regulatory Testing Complete!"
echo "=================================================================="

echo ""
echo "Summary of Medical Device Tests:"
echo "- Device category searches"
echo "- Product code lookups"
echo "- Predicate device simulation"
echo "- Device classification queries"
echo "- Adverse event monitoring"
echo "- Regulatory pathway determination"
echo "- Recent clearance tracking"
echo "- Complex boolean searches"

echo ""
echo "This test suite validates FDA API functionality for:"
echo "✓ 510(k) predicate searches"
echo "✓ Device classification lookups"
echo "✓ Adverse event monitoring"
echo "✓ Regulatory pathway determination"
echo "✓ Recent device clearance tracking"