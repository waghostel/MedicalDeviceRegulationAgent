# Mock Data Testing Framework Report
Generated: 2025-09-09T16:15:51.107454+00:00

## Test Summary
- Total Tests: 8
- Passed: 3
- Failed: 5
- Skipped: 0
- Success Rate: 37.50%

## Test Details

### test_project_fixture_generation - ❌ FAILED
Duration: 0.00s

**Errors:**

- 

### test_user_fixture_generation - ✅ PASSED
Duration: 0.00s

### test_database_seeding - ❌ FAILED
Duration: 0.00s

**Errors:**

- 1 validation error for DatabaseConfig
echo
  Extra inputs are not permitted [type=extra_forbidden, input_value=False, input_type=bool]
    For further information visit https://errors.pydantic.dev/2.11/v/extra_forbidden

### test_scenario_fixtures - ✅ PASSED
Duration: 0.02s

### test_edge_case_fixtures - ✅ PASSED
Duration: 0.00s

### test_data_validation - ❌ FAILED
Duration: 0.01s

**Errors:**

- 'email'

### test_isolation_and_cleanup - ❌ FAILED
Duration: 0.00s

**Errors:**

- 1 validation error for DatabaseConfig
echo
  Extra inputs are not permitted [type=extra_forbidden, input_value=False, input_type=bool]
    For further information visit https://errors.pydantic.dev/2.11/v/extra_forbidden

### test_performance_with_large_datasets - ❌ FAILED
Duration: 0.06s

**Errors:**

- 1 validation error for DatabaseConfig
echo
  Extra inputs are not permitted [type=extra_forbidden, input_value=False, input_type=bool]
    For further information visit https://errors.pydantic.dev/2.11/v/extra_forbidden

## Recommendations

- Low success rate detected. Review failed tests and fix underlying issues.
- Some tests failed. Check error logs and ensure all dependencies are properly configured.