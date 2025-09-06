# Frontend Testing Strategy and Best Practices

## Overview

This document outlines the comprehensive testing strategy for the Medical Device Regulatory Assistant frontend application. The testing approach follows a multi-layered strategy ensuring quality, reliability, and maintainability of the codebase.

## Testing Philosophy

### Core Principles

1. **Test-Driven Development (TDD)**: Write tests before implementation
2. **Pyramid Testing**: More unit tests, fewer integration tests, minimal E2E tests
3. **Mock Data First**: Test with mock data before connecting to real backend
4. **Accessibility First**: Every component must pass accessibility tests
5. **Performance Aware**: Monitor and test performance metrics continuously

### Quality Gates

- **Unit Test Coverage**: Minimum 85% overall, 90% for components, 95% for hooks
- **Integration Test Coverage**: All critical user workflows covered
- **E2E Test Coverage**: All primary user journeys tested
- **Accessibility**: 100% WCAG 2.1 AA compliance
- **Performance**: Core Web Vitals within acceptable thresholds

## Testing Layers

### 1. Unit Testing (Jest + React Testing Library)

**Purpose**: Test individual components and functions in isolation

**Configuration**: `jest.config.js`
- Test Environment: jsdom
- Setup: `jest.setup.js`
- Coverage Thresholds: 85% global, 90% components, 95% hooks

**Best Practices**:

```typescript
// Example: Component unit test
import { render, screen, fireEvent } from '@testing-library/react';
import { ProjectCard } from '@/components/projects/ProjectCard';
import { generateMockProject } from '@/lib/mock-data';

describe('ProjectCard', () => {
  const mockProject = generateMockProject();
  
  it('should render project information correctly', () => {
    render(<ProjectCard project={mockProject} onSelect={jest.fn()} />);
    
    expect(screen.getByText(mockProject.name)).toBeInTheDocument();
    expect(screen.getByText(mockProject.description)).toBeInTheDocument();
  });
  
  it('should handle user interactions', () => {
    const onSelect = jest.fn();
    render(<ProjectCard project={mockProject} onSelect={onSelect} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith(mockProject);
  });
});
```

**Test Categories**:
- **Rendering Tests**: Verify component renders with different props
- **Interaction Tests**: Test user interactions and event handlers
- **State Management Tests**: Test internal state changes
- **Error Handling Tests**: Test error boundaries and error states
- **Accessibility Tests**: Automated accessibility testing with jest-axe

### 2. Integration Testing (Jest + MSW)

**Purpose**: Test component interactions and data flow with mocked APIs

**Configuration**: Mock Service Worker (MSW) for API mocking
- Setup: `src/lib/testing/integration-setup.js`
- Mock Handlers: `src/lib/testing/mock-handlers.js`

**Best Practices**:

```typescript
// Example: Integration test with API mocking
import { render, screen, waitFor } from '@testing-library/react';
import { rest } from 'msw';
import { server } from '@/lib/testing/mock-server';
import { ProjectList } from '@/components/projects/ProjectList';

describe('ProjectList Integration', () => {
  it('should fetch and display projects', async () => {
    server.use(
      rest.get('/api/projects', (req, res, ctx) => {
        return res(ctx.json([generateMockProject(), generateMockProject()]));
      })
    );
    
    render(<ProjectList />);
    
    await waitFor(() => {
      expect(screen.getAllByTestId('project-card')).toHaveLength(2);
    });
  });
});
```

**Test Scenarios**:
- **API Integration**: Test complete data flow from API to UI
- **State Management**: Test React Context and state updates
- **Error Handling**: Test network failures and API errors
- **Optimistic Updates**: Test UI updates before API confirmation

### 3. End-to-End Testing (Playwright)

**Purpose**: Test complete user workflows across the entire application

**Configuration**: `playwright.config.ts`
- Multiple browsers: Chrome, Firefox, Safari, Edge
- Multiple viewports: Desktop, tablet, mobile
- Visual regression testing enabled

**Best Practices**:

```typescript
// Example: E2E test
import { test, expect } from '@playwright/test';

test('complete project creation workflow', async ({ page }) => {
  await page.goto('/');
  
  // Login flow
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  
  // Create new project
  await page.click('[data-testid="new-project-button"]');
  await page.fill('[data-testid="project-name"]', 'Test Device');
  await page.fill('[data-testid="project-description"]', 'Test Description');
  await page.click('[data-testid="create-project"]');
  
  // Verify project created
  await expect(page.locator('[data-testid="project-card"]')).toContainText('Test Device');
});
```

**Test Categories**:
- **User Journeys**: Complete workflows from start to finish
- **Cross-Browser**: Ensure compatibility across browsers
- **Responsive Design**: Test on different screen sizes
- **Visual Regression**: Screenshot comparison testing
- **Performance**: Core Web Vitals measurement

### 4. Accessibility Testing (jest-axe + Manual)

**Purpose**: Ensure WCAG 2.1 AA compliance for all users

**Automated Testing**:
```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<MyComponent />);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

**Manual Testing Checklist**:
- [ ] Keyboard navigation works for all interactive elements
- [ ] Screen reader compatibility verified
- [ ] Color contrast meets WCAG standards
- [ ] Focus management is logical and visible
- [ ] ARIA labels are descriptive and accurate

### 5. Performance Testing (Lighthouse CI + Custom)

**Purpose**: Monitor and maintain application performance

**Lighthouse CI Configuration**: `lighthouserc.js`
- Core Web Vitals monitoring
- Performance budgets enforcement
- Accessibility scoring

**Custom Performance Tests**:
```typescript
// Example: Component performance test
import { render } from '@testing-library/react';
import { performance } from 'perf_hooks';

test('component renders within performance budget', () => {
  const start = performance.now();
  render(<LargeDataTable data={generateLargeDataset()} />);
  const end = performance.now();
  
  expect(end - start).toBeLessThan(100); // 100ms budget
});
```

## Mock Data Strategy

### Mock Data Generators

**Location**: `src/lib/mock-data.ts`

**Principles**:
- Realistic data that matches production schemas
- Configurable with overrides for specific test scenarios
- Database-compatible for migration testing

**Example**:
```typescript
export function generateMockProject(overrides?: Partial<Project>): Project {
  return {
    id: faker.string.uuid(),
    name: faker.commerce.productName(),
    description: faker.lorem.paragraph(),
    deviceType: faker.helpers.arrayElement(['Class I', 'Class II', 'Class III']),
    status: 'draft',
    createdAt: faker.date.recent().toISOString(),
    updatedAt: faker.date.recent().toISOString(),
    ...overrides,
  };
}
```

### Test Scenarios

**Scenario-Based Testing**:
- **New User Onboarding**: Empty state, first project creation
- **Existing User Workflow**: Projects with data, ongoing classifications
- **Error Scenarios**: Network failures, validation errors
- **Edge Cases**: Large datasets, unusual data formats

## Migration Strategy

### Phase 1: Mock Data Testing
- Test all components with current mock data
- Establish baseline test coverage
- Document mock data usage patterns

### Phase 2: Database Integration
- Create test database with seeded mock data
- Update tests to work with real database connections
- Maintain backward compatibility with mock data

### Phase 3: Real API Integration
- Replace mock API calls with real backend integration
- Update tests to handle real API responses
- Remove unused mock data generators

### Migration Checklist

For each component migration:
- [ ] Component tests pass with mock data
- [ ] Integration tests work with test database
- [ ] API integration tests pass
- [ ] Performance benchmarks maintained
- [ ] Accessibility tests still pass
- [ ] Documentation updated

## Continuous Integration

### GitHub Actions Workflow

**Triggers**:
- Push to main/develop branches
- Pull request creation/updates
- Scheduled nightly runs

**Pipeline Stages**:

1. **Code Quality**
   - TypeScript compilation
   - ESLint linting
   - Prettier formatting check

2. **Unit Testing**
   - Jest unit tests with coverage
   - Coverage threshold enforcement
   - Coverage reporting to Codecov

3. **Integration Testing**
   - MSW-mocked API tests
   - Database integration tests
   - State management tests

4. **E2E Testing**
   - Playwright cross-browser tests
   - Visual regression tests
   - Performance tests

5. **Security & Performance**
   - Dependency vulnerability scanning
   - Bundle size analysis
   - Lighthouse CI performance audit

### Quality Gates

**Merge Requirements**:
- All tests pass
- Coverage thresholds met
- No accessibility violations
- Performance budgets maintained
- Security scans pass

## Test Data Management

### Test Database

**Setup**: SQLite in-memory for fast, isolated tests
**Seeding**: Automated seeding with mock data generators
**Cleanup**: Automatic cleanup after each test suite

**Example Setup**:
```typescript
// src/lib/testing/test-database.ts
export async function setupTestDatabase(): Promise<Database> {
  const db = new Database(':memory:');
  await runMigrations(db);
  await seedTestData(db);
  return db;
}

export async function cleanupTestDatabase(db: Database): Promise<void> {
  await db.close();
}
```

### Mock Service Management

**MSW Handlers**: Centralized API mocking
**Scenario Configuration**: Different mock responses for different test scenarios
**State Management**: Stateful mocks for complex workflows

## Performance Monitoring

### Metrics Tracked

**Core Web Vitals**:
- Largest Contentful Paint (LCP) < 2.5s
- First Input Delay (FID) < 100ms
- Cumulative Layout Shift (CLS) < 0.1

**Custom Metrics**:
- Component render times
- Bundle size changes
- Memory usage patterns
- API response times

### Performance Budgets

**Bundle Size Limits**:
- Main bundle: < 250KB gzipped
- Individual chunks: < 100KB gzipped
- Total JavaScript: < 500KB gzipped

**Runtime Performance**:
- Initial page load: < 3s
- Route transitions: < 500ms
- Component interactions: < 100ms

## Troubleshooting Guide

### Common Issues

**Test Failures**:
1. Check mock data consistency
2. Verify API mock handlers
3. Review component prop requirements
4. Check async operation timing

**Performance Issues**:
1. Profile component render times
2. Check for memory leaks
3. Analyze bundle size increases
4. Review network request patterns

**Accessibility Failures**:
1. Run axe-core analysis
2. Test keyboard navigation
3. Verify ARIA labels
4. Check color contrast ratios

### Debug Tools

**Jest Debugging**:
```bash
# Run specific test with debugging
pnpm test --testNamePattern="ProjectCard" --verbose

# Run with coverage details
pnpm test:coverage --collectCoverageFrom="src/components/projects/**"
```

**Playwright Debugging**:
```bash
# Run with UI mode for debugging
pnpm test:e2e:ui

# Run with headed browser
pnpm exec playwright test --headed

# Debug specific test
pnpm exec playwright test --debug user-onboarding.spec.ts
```

## Best Practices Summary

### Do's
- ✅ Write tests before implementation (TDD)
- ✅ Use realistic mock data
- ✅ Test user interactions, not implementation details
- ✅ Include accessibility tests for all components
- ✅ Monitor performance continuously
- ✅ Keep tests isolated and independent
- ✅ Use descriptive test names and organize by feature

### Don'ts
- ❌ Test implementation details
- ❌ Create brittle tests that break with UI changes
- ❌ Skip accessibility testing
- ❌ Ignore performance regressions
- ❌ Use production data in tests
- ❌ Create interdependent tests
- ❌ Mock everything (test real integrations when possible)

## Maintenance Schedule

### Daily
- Monitor CI/CD pipeline health
- Review test failure reports
- Check performance metrics

### Weekly
- Update test data scenarios
- Review coverage reports
- Update mock API responses to match backend changes

### Monthly
- Audit test suite performance
- Update testing dependencies
- Review and update testing documentation
- Analyze test flakiness patterns

### Quarterly
- Comprehensive testing strategy review
- Update testing tools and frameworks
- Performance benchmark review
- Accessibility audit and updates

This testing strategy ensures comprehensive coverage while maintaining development velocity and code quality throughout the application lifecycle.