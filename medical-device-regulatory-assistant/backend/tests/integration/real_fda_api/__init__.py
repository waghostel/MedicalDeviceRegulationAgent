"""
Real FDA API Integration Tests

This package contains comprehensive integration tests that make actual calls
to the FDA's openFDA API. These tests validate:

- Real API response schemas and data integrity
- Rate limiting behavior (240 requests/minute)
- Error handling for all HTTP status codes
- Performance benchmarking and optimization
- API health monitoring and availability

Tests in this package should be run with the --real-api marker and require:
- Valid FDA_API_KEY environment variable (optional but recommended)
- Network connectivity to api.fda.gov
- Careful rate limit management to avoid hitting FDA limits

Usage:
    pytest tests/integration/real_fda_api/ -v --real-api
"""