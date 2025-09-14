# CI/CD Integration Guide

Generated: 2025-09-13 21:52:28

## GitHub Actions Configuration

### Basic Test Workflow
```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
      
      - name: Install Poetry
        uses: snok/install-poetry@v1
      
      - name: Install dependencies
        run: poetry install
      
      - name: Run tests
        run: poetry run python -m pytest tests/ -v
        env:
          TESTING: true
          DATABASE_URL: sqlite+aiosqlite:///:memory:
          JWT_SECRET: test-secret-key
          FDA_API_KEY: test-api-key
```

### Environment Variables for Testing
```yaml
env:
  TESTING: true
  DATABASE_URL: sqlite+aiosqlite:///:memory:
  JWT_SECRET: ${{ secrets.JWT_SECRET }}
  FDA_API_KEY: ${{ secrets.FDA_API_KEY }}
  LOG_LEVEL: INFO
```

### Test Coverage Reporting
```yaml
- name: Run tests with coverage
  run: |
    poetry run python -m pytest tests/ --cov=backend --cov-report=xml
    
- name: Upload coverage to Codecov
  uses: codecov/codecov-action@v3
  with:
    file: ./coverage.xml
```

## Local Development Setup

### Environment Configuration
```bash
# .env.testing
TESTING=true
DATABASE_URL=sqlite+aiosqlite:///:memory:
JWT_SECRET=local-development-secret
FDA_API_KEY=your-test-api-key
LOG_LEVEL=DEBUG
```

### Pre-commit Hooks
```yaml
# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: poetry run python -m pytest tests/
        language: system
        pass_filenames: false
        always_run: true
```

## Quality Gates

### Test Coverage Requirements
- Minimum 80% code coverage
- 100% coverage for critical regulatory logic
- No decrease in coverage for new code

### Performance Requirements
- Full test suite must complete in < 60 seconds
- No test should take longer than 10 seconds
- Memory usage must not exceed 500MB

### Security Requirements
- All tests must pass security linting
- No hardcoded secrets in test code
- Proper cleanup of sensitive test data

## Monitoring and Alerts

### Test Failure Notifications
```yaml
- name: Notify on test failure
  if: failure()
  uses: 8398a7/action-slack@v3
  with:
    status: failure
    text: Test suite failed on ${{ github.ref }}
```

### Performance Monitoring
```yaml
- name: Performance regression check
  run: |
    poetry run python -m pytest tests/performance/ --benchmark-only
    # Fail if performance degrades by more than 20%
```
