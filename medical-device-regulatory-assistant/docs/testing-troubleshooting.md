# Testing Troubleshooting Guide

## Overview

This guide provides solutions to common testing issues encountered in the Medical Device Regulatory Assistant frontend application. It covers unit tests, integration tests, E2E tests, and performance testing problems.

## Quick Diagnosis Checklist

When tests fail, check these common issues first:

1. **Dependencies**: Are all packages installed and up to date?
2. **Environment**: Is the test environment properly configured?
3. **Mock Data**: Are mock data generators working correctly?
4. **Async Operations**: Are async operations properly awaited?
5. **Test Isolation**: Are tests interfering with each other?

## Unit Testing Issues (Jest + React Testing Library)

### Issue: Tests Fail with "Cannot read property of undefined"

**Symptoms**:
```
TypeError: Cannot read property 'name' of undefined
```

**Common Causes**:
- Missing mock data
- Incorrect prop passing
- Async data not loaded

**Solutions**:

```typescript
// ❌ Bad: Missing mock data
test('renders project name', () => {
  render(<ProjectCard />); // No project prop
  expect(screen.getByText('Project Name')).toBeInTheDocument();
});

// ✅ Good: Provide mock data
test('renders project name', () => {
  const mockProject = generateMockProject({ name: 'Test Project' });
  render(<ProjectCard project={mockProject} />);
  expect(screen.getByText('Test Project')).toBeInTheDocument();
});
```

**Debug Steps**:
1. Check component prop requirements
2. Verify mock data structure matches expected props
3. Add console.log to inspect received props
4. Use React Developer Tools to inspect component state

### Issue: Async Tests Timing Out

**Symptoms**:
```
Timeout - Async callback was not invoked within the 5000 ms timeout
```

**Common Causes**:
- Missing `await` keywords
- Incorrect use of `waitFor`
- Mock API not responding

**Solutions**:

```typescript
// ❌ Bad: Not waiting for async operations
test('loads project data', () => {
  render(<ProjectList />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.getByText('Project 1')).toBeInTheDocument(); // Fails immediately
});

// ✅ Good: Wait for async operations
test('loads project data', async () => {
  render(<ProjectList />);
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  
  await waitFor(() => {
    expect(screen.getByText('Project 1')).toBeInTheDocument();
  });
});
```

**Debug Steps**:
1. Increase timeout for debugging: `waitFor(() => {}, { timeout: 10000 })`
2. Check network tab for API calls
3. Verify MSW handlers are set up correctly
4. Add debug logs to track async flow

### Issue: Mock Functions Not Being Called

**Symptoms**:
```
Expected mock function to have been called, but it was not called.
```

**Common Causes**:
- Event handlers not properly bound
- Incorrect element selection
- Missing user interactions

**Solutions**:

```typescript
// ❌ Bad: Wrong element or event
test('calls onSelect when clicked', () => {
  const onSelect = jest.fn();
  render(<ProjectCard project={mockProject} onSelect={onSelect} />);
  
  fireEvent.click(screen.getByText('Project Name')); // Wrong element
  expect(onSelect).toHaveBeenCalled();
});

// ✅ Good: Correct element and interaction
test('calls onSelect when clicked', async () => {
  const onSelect = jest.fn();
  const user = userEvent.setup();
  render(<ProjectCard project={mockProject} onSelect={onSelect} />);
  
  await user.click(screen.getByRole('button', { name: /select project/i }));
  expect(onSelect).toHaveBeenCalledWith(mockProject);
});
```

**Debug Steps**:
1. Use `screen.debug()` to see rendered HTML
2. Check element roles and accessibility attributes
3. Verify event handlers are properly attached
4. Use React Developer Tools to inspect component props

### Issue: Tests Pass Individually but Fail in Suite

**Symptoms**:
- Individual tests pass when run alone
- Tests fail when run as part of a suite
- Intermittent failures

**Common Causes**:
- Shared state between tests
- Mock pollution
- Async operations not cleaned up

**Solutions**:

```typescript
// ❌ Bad: Shared state pollution
let mockUser = generateMockUser();

describe('UserProfile', () => {
  test('displays user name', () => {
    mockUser.name = 'John Doe';
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  test('displays user email', () => {
    // mockUser still has modified state from previous test
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText(mockUser.email)).toBeInTheDocument();
  });
});

// ✅ Good: Isolated test data
describe('UserProfile', () => {
  test('displays user name', () => {
    const mockUser = generateMockUser({ name: 'John Doe' });
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });
  
  test('displays user email', () => {
    const mockUser = generateMockUser({ email: 'john@example.com' });
    render(<UserProfile user={mockUser} />);
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });
});
```

**Debug Steps**:
1. Add `beforeEach` and `afterEach` cleanup
2. Use `jest.clearAllMocks()` between tests
3. Check for global state modifications
4. Run tests with `--runInBand` to avoid parallelization issues

## Integration Testing Issues (MSW)

### Issue: MSW Handlers Not Working

**Symptoms**:
```
Network request failed or returned unexpected data
```

**Common Causes**:
- MSW server not started
- Handler URL mismatch
- Request method mismatch

**Solutions**:

```typescript
// ❌ Bad: URL mismatch
server.use(
  rest.get('/api/project', (req, res, ctx) => { // Wrong URL
    return res(ctx.json(mockProjects));
  })
);

// API call goes to '/api/projects' (plural)

// ✅ Good: Matching URLs
server.use(
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json(mockProjects));
  })
);
```

**Debug Steps**:
1. Check MSW server setup in test files
2. Verify handler URLs match API calls exactly
3. Add logging to MSW handlers
4. Check browser network tab during tests

### Issue: Mock API Responses Not Realistic

**Symptoms**:
- Tests pass but real API integration fails
- Data structure mismatches

**Solutions**:

```typescript
// ❌ Bad: Unrealistic mock response
server.use(
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json([{ name: 'Project' }])); // Missing required fields
  })
);

// ✅ Good: Realistic mock response matching API schema
server.use(
  rest.get('/api/projects', (req, res, ctx) => {
    return res(ctx.json([
      generateMockProject(), // Uses complete data structure
      generateMockProject(),
    ]));
  })
);
```

**Debug Steps**:
1. Compare mock responses with real API documentation
2. Use TypeScript interfaces to ensure type safety
3. Test with real API in development environment
4. Validate mock data against backend schemas

### Issue: Race Conditions in Async Tests

**Symptoms**:
- Intermittent test failures
- Tests sometimes pass, sometimes fail
- Timing-dependent behavior

**Solutions**:

```typescript
// ❌ Bad: Race condition with multiple async operations
test('handles concurrent API calls', async () => {
  render(<Dashboard />);
  
  // Multiple async operations without proper coordination
  fireEvent.click(screen.getByText('Load Projects'));
  fireEvent.click(screen.getByText('Load Classifications'));
  
  // May fail if operations complete in different order
  expect(screen.getByText('Projects loaded')).toBeInTheDocument();
  expect(screen.getByText('Classifications loaded')).toBeInTheDocument();
});

// ✅ Good: Proper async coordination
test('handles concurrent API calls', async () => {
  render(<Dashboard />);
  
  fireEvent.click(screen.getByText('Load Projects'));
  fireEvent.click(screen.getByText('Load Classifications'));
  
  await waitFor(() => {
    expect(screen.getByText('Projects loaded')).toBeInTheDocument();
  });
  
  await waitFor(() => {
    expect(screen.getByText('Classifications loaded')).toBeInTheDocument();
  });
});
```

## End-to-End Testing Issues (Playwright)

### Issue: Flaky E2E Tests

**Symptoms**:
- Tests pass locally but fail in CI
- Intermittent failures
- Timing-related issues

**Common Causes**:
- Network latency differences
- Animation timing
- Element loading delays

**Solutions**:

```typescript
// ❌ Bad: Hard-coded waits
test('user can create project', async ({ page }) => {
  await page.goto('/projects');
  await page.click('[data-testid="new-project"]');
  await page.wait(2000); // Unreliable fixed wait
  await page.fill('[data-testid="project-name"]', 'Test Project');
});

// ✅ Good: Wait for specific conditions
test('user can create project', async ({ page }) => {
  await page.goto('/projects');
  await page.click('[data-testid="new-project"]');
  
  // Wait for dialog to be visible
  await page.waitForSelector('[data-testid="project-dialog"]', { 
    state: 'visible' 
  });
  
  await page.fill('[data-testid="project-name"]', 'Test Project');
});
```

**Debug Steps**:
1. Run tests with `--headed` to see browser behavior
2. Add screenshots at failure points
3. Use `page.waitForLoadState('networkidle')` for complex pages
4. Increase timeouts for debugging

### Issue: Element Not Found Errors

**Symptoms**:
```
Error: Element not found: [data-testid="submit-button"]
```

**Common Causes**:
- Element not rendered yet
- Incorrect selector
- Element hidden or disabled

**Solutions**:

```typescript
// ❌ Bad: Immediate element access
test('submits form', async ({ page }) => {
  await page.goto('/form');
  await page.click('[data-testid="submit-button"]'); // May not exist yet
});

// ✅ Good: Wait for element to be available
test('submits form', async ({ page }) => {
  await page.goto('/form');
  
  // Wait for form to load and button to be enabled
  await page.waitForSelector('[data-testid="submit-button"]:not([disabled])');
  await page.click('[data-testid="submit-button"]');
});
```

**Debug Steps**:
1. Use `page.screenshot()` to see current page state
2. Check element selector with browser dev tools
3. Verify element is not hidden by CSS
4. Use `page.locator().isVisible()` to check visibility

### Issue: Authentication Issues in E2E Tests

**Symptoms**:
- Tests fail at login step
- Session not persisting
- Redirect loops

**Solutions**:

```typescript
// ❌ Bad: Manual login in every test
test('user can view dashboard', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  
  // Test actual functionality
});

// ✅ Good: Use authentication state
test.use({ storageState: 'auth.json' });

test('user can view dashboard', async ({ page }) => {
  await page.goto('/dashboard'); // Already authenticated
  
  // Test actual functionality
});
```

**Setup Authentication State**:
```typescript
// auth.setup.ts
import { test as setup } from '@playwright/test';

setup('authenticate', async ({ page }) => {
  await page.goto('/login');
  await page.fill('[data-testid="email"]', 'test@example.com');
  await page.fill('[data-testid="password"]', 'password');
  await page.click('[data-testid="login-button"]');
  await page.waitForURL('/dashboard');
  
  await page.context().storageState({ path: 'auth.json' });
});
```

## Performance Testing Issues

### Issue: Lighthouse CI Failures

**Symptoms**:
- Performance scores below thresholds
- Accessibility violations
- Best practices failures

**Common Causes**:
- Large bundle sizes
- Unoptimized images
- Missing accessibility attributes

**Solutions**:

```javascript
// lighthouserc.js - Adjust thresholds during development
module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/'],
      startServerCommand: 'pnpm start',
    },
    assert: {
      assertions: {
        'categories:performance': ['warn', { minScore: 0.8 }], // Lowered for development
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'categories:seo': ['warn', { minScore: 0.8 }],
      },
    },
  },
};
```

**Debug Steps**:
1. Run Lighthouse locally to identify issues
2. Check bundle analyzer for large dependencies
3. Optimize images and assets
4. Review accessibility violations in detail

### Issue: Memory Leaks in Tests

**Symptoms**:
- Tests slow down over time
- Out of memory errors
- Increasing memory usage

**Solutions**:

```typescript
// ❌ Bad: Not cleaning up event listeners
test('component with event listeners', () => {
  const component = render(<ComponentWithListeners />);
  // Test logic
  // No cleanup
});

// ✅ Good: Proper cleanup
test('component with event listeners', () => {
  const { unmount } = render(<ComponentWithListeners />);
  
  // Test logic
  
  // Cleanup
  unmount();
});

// Global cleanup in jest.setup.js
afterEach(() => {
  cleanup(); // React Testing Library cleanup
  jest.clearAllMocks();
  jest.clearAllTimers();
});
```

## Environment-Specific Issues

### Issue: Tests Pass Locally but Fail in CI

**Common Causes**:
- Environment variable differences
- Dependency version mismatches
- Timezone differences
- Resource constraints

**Solutions**:

```yaml
# .github/workflows/ci.yml - Ensure consistent environment
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20.x' # Pin specific version
    cache: 'pnpm'

- name: Set timezone
  run: |
    sudo timedatectl set-timezone UTC

- name: Install dependencies with frozen lockfile
  run: pnpm install --frozen-lockfile
```

### Issue: Database Connection Issues in Tests

**Symptoms**:
- Database connection timeouts
- Transaction conflicts
- Data persistence issues

**Solutions**:

```typescript
// src/lib/testing/test-database.ts
export async function setupTestDatabase(): Promise<Database> {
  const dbPath = `:memory:`; // Use in-memory for tests
  const db = new Database(dbPath);
  
  // Enable WAL mode for better concurrency
  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA synchronous = NORMAL');
  
  await runMigrations(db);
  return db;
}

// Proper cleanup
afterEach(async () => {
  if (testDb) {
    await testDb.close();
    testDb = null;
  }
});
```

## Debugging Tools and Commands

### Jest Debugging

```bash
# Run specific test with verbose output
pnpm test --testNamePattern="ProjectCard" --verbose

# Run with coverage and open report
pnpm test:coverage && open coverage/lcov-report/index.html

# Debug with Node.js debugger
node --inspect-brk node_modules/.bin/jest --runInBand --testNamePattern="ProjectCard"

# Run tests in watch mode with coverage
pnpm test:watch --coverage --watchAll=false
```

### Playwright Debugging

```bash
# Run with UI mode for interactive debugging
pnpm test:e2e:ui

# Run specific test with headed browser
pnpm exec playwright test user-onboarding.spec.ts --headed

# Debug mode with step-by-step execution
pnpm exec playwright test --debug

# Generate test code from browser interactions
pnpm exec playwright codegen localhost:3000
```

### Performance Debugging

```bash
# Run Lighthouse locally
pnpm lighthouse:collect

# Analyze bundle size
pnpm bundlesize

# Profile React components
# Add ?react_perf to URL in development
```

## Prevention Strategies

### Code Review Checklist

- [ ] Tests are included for new features
- [ ] Mock data is realistic and complete
- [ ] Async operations are properly awaited
- [ ] Tests are isolated and don't share state
- [ ] Accessibility tests are included
- [ ] Performance impact is considered

### Automated Checks

```json
// package.json - Pre-commit hooks
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "jest --findRelatedTests --passWithNoTests"
    ]
  }
}
```

### Monitoring and Alerts

- Set up alerts for test failure rates
- Monitor test execution times
- Track coverage trends
- Alert on performance regressions

This troubleshooting guide should help developers quickly identify and resolve common testing issues, maintaining the quality and reliability of the test suite.