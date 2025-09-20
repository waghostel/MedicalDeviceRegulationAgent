# Provider Isolation System

## Overview

The Provider Isolation System provides a comprehensive solution for testing React components without dependencies on production provider implementations. This system ensures tests run in complete isolation, preventing external dependencies from affecting test reliability and performance.

## Key Features

- **Complete Isolation**: Tests run without any production provider dependencies
- **Provider Composition**: Flexible system for combining multiple isolated providers
- **State Management**: Capture, restore, and reset provider state between tests
- **Cleanup Mechanisms**: Automatic cleanup to prevent memory leaks and test interference
- **Backward Compatibility**: Works with existing `renderWithProviders` patterns
- **Performance Optimized**: Minimal overhead and efficient state management

## Architecture

### Core Components

1. **Isolated Providers**: Self-contained provider implementations
   - `IsolatedSessionProvider`: Authentication state without next-auth dependencies
   - `IsolatedThemeProvider`: Theme management without external theme libraries
   - `IsolatedFormProvider`: Form state management without react-hook-form
   - `IsolatedToastProvider`: Toast notifications without external toast libraries
   - `IsolatedRouterProvider`: Navigation without Next.js router dependencies

2. **Provider Composition System**: Flexible provider combination and configuration
3. **State Management**: Provider state capture, restoration, and cleanup
4. **Integration Layer**: Seamless integration with existing test utilities

## Usage Examples

### Basic Usage

```typescript
import { renderWithIsolatedProviders } from '@/lib/testing/providers/ProviderIsolationSystem';

// Complete isolation - no external dependencies
const { getByTestId } = renderWithIsolatedProviders(
  <MyComponent />,
  {
    providerIsolation: {
      isolationMode: 'complete',
      preset: 'authenticated',
    },
  }
);
```

### Custom Provider Configuration

```typescript
import { IsolatedTestProviders } from '@/lib/testing/providers/IsolatedTestProviders';

render(
  <IsolatedTestProviders
    providers={{
      session: {
        session: mockSession,
        status: 'authenticated',
      },
      theme: {
        defaultTheme: 'dark',
      },
      form: {
        initialValues: { name: 'Test User' },
      },
      toast: true,
    }}
  >
    <MyComponent />
  </IsolatedTestProviders>
);
```

### Using Isolated Hooks

```typescript
import {
  useIsolatedSession,
  useIsolatedTheme,
  useIsolatedForm,
  useIsolatedToast,
  useIsolatedRouter,
} from '@/lib/testing/providers/IsolatedTestProviders';

const TestComponent = () => {
  const { data, status } = useIsolatedSession();
  const { theme, setTheme } = useIsolatedTheme();
  const { toast } = useIsolatedToast();

  return (
    <div>
      <span>Status: {status}</span>
      <span>Theme: {theme}</span>
      <button onClick={() => toast({ title: 'Test' })}>
        Show Toast
      </button>
    </div>
  );
};
```

### Provider Test Scenarios

```typescript
import { providerTestScenarios } from '@/lib/testing/providers/ProviderIsolationSystem';

// Run test with predefined scenario
await providerTestScenarios.authenticatedUser.run(() => {
  const { getByTestId } = renderWithIsolatedProviders(
    <AuthenticatedComponent />,
    {
      providerIsolation: {
        providers: providerTestScenarios.authenticatedUser.config.providers,
      },
    }
  );

  expect(getByTestId('user-name')).toHaveTextContent('Test User');
});
```

## Provider Isolation Patterns

### Complete Isolation (Recommended for Unit Tests)

```typescript
const options = {
  providerIsolation: {
    isolationMode: 'complete',
    providers: {},
    fallbackToProduction: false,
    autoCleanup: true,
    cleanupBetweenTests: true,
  },
};
```

### Partial Isolation (For Integration Tests)

```typescript
const options = {
  providerIsolation: {
    isolationMode: 'partial',
    fallbackToProduction: true,
    autoCleanup: true,
    cleanupBetweenTests: false,
  },
};
```

### Hybrid Isolation (For Component Tests)

```typescript
const options = {
  providerIsolation: {
    isolationMode: 'hybrid',
    providers: {
      session: { session: null, status: 'unauthenticated' },
      toast: true,
    },
    fallbackToProduction: true,
    autoCleanup: true,
    cleanupBetweenTests: true,
  },
};
```

## Available Presets

### Minimal

- No providers configured
- Suitable for simple component tests

### Authenticated

- Session provider with authenticated user
- Toast provider enabled
- Suitable for authenticated user flows

### Unauthenticated

- Session provider with no user
- Toast provider enabled
- Suitable for public/login flows

### Form Testing

- Session provider (authenticated)
- Form provider with empty initial values
- Toast provider enabled
- Suitable for form component tests

### Complete

- All providers configured
- Full application context
- Suitable for complex integration tests

## State Management

### Capturing and Restoring State

```typescript
import { providerStateManager } from '@/lib/testing/providers/ProviderIsolationSystem';

// Capture current state
providerStateManager.pushState();

// Make changes to provider state
// ...

// Restore previous state
providerStateManager.popState();

// Get current state snapshot
const snapshot = providerStateManager.getStateSnapshot();
```

### Cleanup Between Tests

```typescript
import { isolatedProviderManager } from '@/lib/testing/providers/IsolatedTestProviders';

beforeEach(() => {
  isolatedProviderManager.resetAllProviders();
  providerStateManager.reset();
});

afterEach(() => {
  isolatedProviderManager.cleanup();
});
```

## Creating Custom Test Scenarios

```typescript
import { createProviderTestScenario } from '@/lib/testing/providers/ProviderIsolationSystem';

const customScenario = createProviderTestScenario('custom-scenario', {
  providers: {
    session: { session: customSession, status: 'authenticated' },
    theme: { forcedTheme: 'dark' },
  },
  setup: () => {
    // Custom setup logic
  },
  teardown: () => {
    // Custom cleanup logic
  },
  assertions: (state) => {
    // Custom state assertions
    expect(state.session?.status).toBe('authenticated');
  },
});

// Use the scenario
await customScenario.run(() => {
  // Your test logic here
});
```

## Best Practices

### 1. Use Complete Isolation for Unit Tests

- Ensures tests are truly isolated
- Prevents external dependencies from affecting results
- Fastest test execution

### 2. Use Appropriate Presets

- `minimal`: Simple component tests
- `authenticated`: User-specific functionality
- `formTesting`: Form components
- `complete`: Complex integration scenarios

### 3. Clean Up Between Tests

- Always reset provider state between tests
- Use `autoCleanup: true` for automatic cleanup
- Manually call cleanup functions when needed

### 4. Leverage State Management

- Capture state before making changes
- Restore state when needed
- Use state snapshots for debugging

### 5. Create Reusable Scenarios

- Define common test scenarios once
- Reuse across multiple test files
- Include setup, teardown, and assertions

## Error Handling

### Provider Hook Errors

```typescript
// This will throw a helpful error
const InvalidComponent = () => {
  useIsolatedSession(); // Error: must be used within provider
  return <div>Invalid</div>;
};
```

### Error Boundaries

```typescript
const { getByTestId } = renderWithIsolatedProviders(
  <ComponentThatThrows />,
  {
    errorBoundary: true,
    onError: (error, errorInfo) => {
      console.log('Test error caught:', error.message);
    },
  }
);

expect(getByTestId('error-boundary')).toBeInTheDocument();
```

## Performance Considerations

### Memory Management

- Providers automatically clean up on unmount
- State manager prevents memory leaks
- Use `autoCleanup: true` for automatic cleanup

### Efficient Updates

- Providers use React's built-in optimization
- State changes are batched automatically
- Minimal re-renders with proper memoization

### Test Performance

- Isolated providers are faster than production providers
- No external API calls or side effects
- Predictable test execution times

## Migration Guide

### From Production Providers

```typescript
// Before (using production providers)
import { SessionProvider } from 'next-auth/react';

render(
  <SessionProvider session={mockSession}>
    <MyComponent />
  </SessionProvider>
);

// After (using isolated providers)
import { IsolatedSessionProvider } from '@/lib/testing/providers/IsolatedTestProviders';

render(
  <IsolatedSessionProvider session={mockSession}>
    <MyComponent />
  </IsolatedSessionProvider>
);
```

### From renderWithProviders

```typescript
// Before
const { getByTestId } = renderWithProviders(<MyComponent />, {
  session: mockSession,
});

// After (backward compatible)
const { getByTestId } = renderWithIsolatedProviders(<MyComponent />, {
  session: mockSession, // Still works!
});

// Or (new approach)
const { getByTestId } = renderWithIsolatedProviders(<MyComponent />, {
  providerIsolation: {
    preset: 'authenticated',
  },
});
```

## Troubleshooting

### Common Issues

1. **Hook used outside provider**
   - Ensure component is wrapped with appropriate isolated provider
   - Check provider composition order

2. **State not persisting between renders**
   - Use state management functions to capture/restore state
   - Ensure cleanup is not running too early

3. **Tests interfering with each other**
   - Enable `cleanupBetweenTests: true`
   - Reset provider state in `beforeEach`

4. **Performance issues**
   - Use minimal presets when possible
   - Avoid unnecessary provider nesting
   - Enable auto-cleanup

### Debug Mode

```typescript
const { getByTestId } = renderWithIsolatedProviders(<MyComponent />, {
  providerIsolation: {
    debugMode: true,
    logProviderState: true,
  },
});
```

This will log provider state changes and help identify issues.

## API Reference

### Core Functions

- `renderWithIsolatedProviders(ui, options)`: Enhanced render function with provider isolation
- `createProviderTestScenario(name, config)`: Create reusable test scenarios
- `isolatedProviderManager.cleanup()`: Clean up all providers
- `providerStateManager.reset()`: Reset provider state

### Provider Components

- `IsolatedTestProviders`: Composite provider wrapper
- `IsolatedSessionProvider`: Authentication provider
- `IsolatedThemeProvider`: Theme management provider
- `IsolatedFormProvider`: Form state provider
- `IsolatedToastProvider`: Toast notification provider
- `IsolatedRouterProvider`: Navigation provider

### Hooks

- `useIsolatedSession()`: Access session state
- `useIsolatedTheme()`: Access theme state
- `useIsolatedForm()`: Access form state
- `useIsolatedToast()`: Access toast functionality
- `useIsolatedRouter()`: Access router functionality

### Presets

- `isolatedProviderPresets.minimal`: No providers
- `isolatedProviderPresets.authenticated`: Authenticated user
- `isolatedProviderPresets.unauthenticated`: No user
- `isolatedProviderPresets.formTesting`: Form testing setup
- `isolatedProviderPresets.complete`: All providers

This provider isolation system ensures your tests are reliable, fast, and completely independent of external dependencies while maintaining full compatibility with existing test patterns.
