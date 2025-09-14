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
