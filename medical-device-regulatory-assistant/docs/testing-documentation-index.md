# Testing Documentation Index

## Overview

This document serves as the central index for all testing-related documentation in the Medical Device Regulatory Assistant project. It provides quick access to testing strategies, procedures, troubleshooting guides, and maintenance schedules.

## Documentation Structure

### 📋 Core Testing Documents

#### 1. [Testing Strategy and Best Practices](./testing-strategy.md)
**Purpose**: Comprehensive guide to the testing approach and methodologies
**Contents**:
- Testing philosophy and principles
- Multi-layered testing strategy (Unit, Integration, E2E, Accessibility, Performance)
- Mock data strategy and management
- Migration strategy from mock to real data
- Quality gates and coverage requirements
- Best practices and coding standards

**When to Use**:
- Setting up new test suites
- Onboarding new team members
- Reviewing testing approach
- Planning test coverage improvements

#### 2. [Testing Troubleshooting Guide](./testing-troubleshooting.md)
**Purpose**: Solutions to common testing issues and debugging procedures
**Contents**:
- Unit testing issues (Jest + React Testing Library)
- Integration testing issues (MSW)
- End-to-end testing issues (Playwright)
- Performance testing issues
- Environment-specific problems
- Debugging tools and commands

**When to Use**:
- Tests are failing unexpectedly
- Debugging test execution issues
- Resolving CI/CD pipeline problems
- Performance or flakiness issues

#### 3. [Testing Maintenance Schedule](./testing-maintenance.md)
**Purpose**: Maintenance procedures and schedules for testing infrastructure
**Contents**:
- Daily, weekly, monthly, and quarterly maintenance tasks
- Mock data maintenance procedures
- Test database maintenance
- CI/CD pipeline optimization
- Performance monitoring
- Emergency response procedures

**When to Use**:
- Regular maintenance activities
- Planning maintenance schedules
- Responding to test infrastructure issues
- Performance optimization

### 🔧 Configuration Files

#### Testing Framework Configurations

| File | Purpose | Framework |
|------|---------|-----------|
| `jest.config.js` | Unit and integration test configuration | Jest |
| `jest.setup.js` | Global test setup and utilities | Jest |
| `playwright.config.ts` | End-to-end test configuration | Playwright |
| `lighthouserc.js` | Performance testing configuration | Lighthouse CI |
| `.bundlesizerc.json` | Bundle size monitoring | bundlesize |

#### CI/CD Pipeline Configurations

| File | Purpose | Platform |
|------|---------|----------|
| `.github/workflows/ci.yml` | Main CI/CD pipeline | GitHub Actions |
| `.github/workflows/comprehensive-testing.yml` | Enhanced testing pipeline | GitHub Actions |
| `.github/workflows/visual-regression.yml` | Visual regression testing | GitHub Actions |
| `.github/workflows/security.yml` | Security testing | GitHub Actions |

### 🧪 Test Utilities and Helpers

#### Core Test Utilities

| Location | Purpose | Usage |
|----------|---------|-------|
| `src/lib/testing/` | Test utilities and helpers | Import in test files |
| `src/lib/mock-data.ts` | Mock data generators | Generate test data |
| `src/lib/testing/mock-handlers.ts` | MSW API mock handlers | Integration tests |
| `src/lib/testing/test-database.ts` | Test database utilities | Database tests |

#### Test Setup Files

| File | Purpose | Scope |
|------|---------|-------|
| `jest.setup.js` | Global Jest configuration | All Jest tests |
| `src/lib/testing/integration-setup.js` | Integration test setup | Integration tests |
| `src/lib/testing/global-setup.js` | Global test environment setup | Test suite |
| `src/lib/testing/global-teardown.js` | Global test cleanup | Test suite |

### 📊 Test Categories and Organization

#### Unit Tests
**Location**: `src/**/*.unit.{test,spec}.{js,jsx,ts,tsx}`
**Purpose**: Test individual components and functions in isolation
**Coverage Target**: 90% for components, 95% for hooks

**Test Structure**:
```
src/
├── components/
│   ├── projects/
│   │   ├── ProjectCard.unit.test.tsx
│   │   ├── ProjectList.unit.test.tsx
│   │   └── NewProjectDialog.unit.test.tsx
│   ├── dashboard/
│   │   ├── ClassificationWidget.unit.test.tsx
│   │   └── PredicateWidget.unit.test.tsx
│   └── agent/
│       ├── CopilotSidebar.unit.test.tsx
│       └── CitationPanel.unit.test.tsx
├── hooks/
│   ├── use-projects.unit.test.ts
│   ├── use-classification.unit.test.ts
│   └── use-predicates.unit.test.ts
└── lib/
    ├── utils.unit.test.ts
    └── api-client.unit.test.ts
```

#### Integration Tests
**Location**: `src/**/*.integration.{test,spec}.{js,jsx,ts,tsx}`
**Purpose**: Test component interactions and data flow with mocked APIs
**Coverage Target**: All critical user workflows

**Test Structure**:
```
src/
├── __tests__/
│   └── integration/
│       ├── auth.integration.test.tsx
│       ├── project-management.integration.test.tsx
│       ├── regulatory-analysis.integration.test.tsx
│       ├── websocket-integration.test.tsx
│       └── error-handling.test.tsx
```

#### End-to-End Tests
**Location**: `e2e/**/*.spec.ts`
**Purpose**: Test complete user workflows across the entire application
**Coverage Target**: All primary user journeys

**Test Structure**:
```
e2e/
├── user-onboarding.spec.ts
├── dashboard-navigation.spec.ts
├── agent-workflow.spec.ts
├── critical-user-journeys.spec.ts
├── error-handling.spec.ts
├── visual/
│   ├── dashboard-visual.spec.ts
│   └── forms-visual.spec.ts
└── utils/
    └── visual-testing.ts
```

#### Accessibility Tests
**Location**: `src/**/*.accessibility.{test,spec}.{js,jsx,ts,tsx}`
**Purpose**: Ensure WCAG 2.1 AA compliance
**Coverage Target**: 100% of interactive components

#### Performance Tests
**Location**: `src/**/*.performance.{test,spec}.{js,jsx,ts,tsx}`
**Purpose**: Monitor component and application performance
**Coverage Target**: All critical performance paths

### 🎯 Quick Reference Guides

#### Running Tests

```bash
# Unit tests
pnpm test:unit                    # Run all unit tests
pnpm test:unit --watch           # Run in watch mode
pnpm test:unit --coverage       # Run with coverage

# Integration tests
pnpm test:integration            # Run all integration tests
pnpm test:integration --watch   # Run in watch mode

# End-to-end tests
pnpm test:e2e                   # Run all E2E tests
pnpm test:e2e:ui                # Run with UI mode
pnpm test:e2e:visual            # Run visual regression tests

# Accessibility tests
pnpm test:accessibility         # Run accessibility tests

# Performance tests
pnpm test:performance           # Run performance tests
pnpm lighthouse                 # Run Lighthouse audit

# All tests
pnpm test:all                   # Run complete test suite
```

#### Debugging Tests

```bash
# Jest debugging
pnpm test --testNamePattern="ProjectCard" --verbose
node --inspect-brk node_modules/.bin/jest --runInBand

# Playwright debugging
pnpm exec playwright test --debug
pnpm exec playwright test --headed
pnpm exec playwright codegen localhost:3000

# Performance debugging
pnpm lighthouse:collect
pnpm bundlesize
```

#### Common Test Patterns

```typescript
// Unit test pattern
describe('ComponentName', () => {
  const mockData = generateMockData();
  
  it('should render correctly', () => {
    render(<ComponentName data={mockData} />);
    expect(screen.getByText('Expected Text')).toBeInTheDocument();
  });
  
  it('should handle user interactions', async () => {
    const user = userEvent.setup();
    const onAction = jest.fn();
    
    render(<ComponentName onAction={onAction} />);
    await user.click(screen.getByRole('button'));
    
    expect(onAction).toHaveBeenCalled();
  });
});

// Integration test pattern
describe('Feature Integration', () => {
  beforeEach(() => {
    server.use(
      rest.get('/api/endpoint', (req, res, ctx) => {
        return res(ctx.json(mockResponse));
      })
    );
  });
  
  it('should handle complete workflow', async () => {
    render(<FeatureComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Loaded Data')).toBeInTheDocument();
    });
  });
});

// E2E test pattern
test('complete user journey', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="action-button"]');
  await page.waitForSelector('[data-testid="result"]');
  
  await expect(page.locator('[data-testid="result"]')).toContainText('Success');
});
```

### 📈 Metrics and Reporting

#### Coverage Reports
- **Location**: `coverage/lcov-report/index.html`
- **Access**: Open in browser after running `pnpm test:coverage`
- **CI Integration**: Automatically uploaded to Codecov

#### Performance Reports
- **Lighthouse**: `.lighthouseci/` directory
- **Bundle Size**: Console output and CI artifacts
- **Core Web Vitals**: Lighthouse CI dashboard

#### Test Execution Reports
- **Jest**: Console output and coverage reports
- **Playwright**: `playwright-report/index.html`
- **CI/CD**: GitHub Actions summary and artifacts

### 🚨 Emergency Procedures

#### Test Suite Failure
1. **Immediate Response**: Check [troubleshooting guide](./testing-troubleshooting.md)
2. **Investigation**: Follow debugging procedures
3. **Resolution**: Apply fixes and verify
4. **Documentation**: Update guides if needed

#### Performance Regression
1. **Detection**: Lighthouse CI alerts or user reports
2. **Analysis**: Use performance debugging tools
3. **Resolution**: Implement optimizations
4. **Verification**: Confirm improvements with metrics

#### Security Issues
1. **Assessment**: Evaluate vulnerability severity
2. **Response**: Update dependencies and configurations
3. **Verification**: Run security audits
4. **Documentation**: Update security procedures

### 📚 Additional Resources

#### External Documentation
- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW Documentation](https://mswjs.io/docs/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)

#### Team Resources
- Testing best practices workshops
- Code review guidelines
- Testing standards documentation
- Performance optimization guides

### 🔄 Maintenance Schedule

#### Daily (Automated)
- CI/CD pipeline monitoring
- Test execution metrics
- Coverage tracking
- Performance monitoring

#### Weekly (30-45 minutes)
- Mock data updates
- Test suite health review
- Documentation updates
- Dependency checks

#### Monthly (2-3 hours)
- Comprehensive test audit
- Performance analysis
- Security review
- Tool updates

#### Quarterly (1-2 days)
- Strategy review
- Major updates
- Training updates
- Infrastructure improvements

---

## Getting Started

### For New Team Members
1. Read [Testing Strategy](./testing-strategy.md) for overview
2. Set up local testing environment
3. Run test suite to verify setup
4. Review [troubleshooting guide](./testing-troubleshooting.md) for common issues

### For Feature Development
1. Write tests before implementation (TDD)
2. Follow testing patterns and best practices
3. Ensure coverage targets are met
4. Run relevant test suites before committing

### For Maintenance Tasks
1. Follow [maintenance schedule](./testing-maintenance.md)
2. Use provided scripts and tools
3. Document any issues or improvements
4. Update documentation as needed

This documentation index provides a comprehensive guide to the testing infrastructure and should be the starting point for all testing-related activities in the project.