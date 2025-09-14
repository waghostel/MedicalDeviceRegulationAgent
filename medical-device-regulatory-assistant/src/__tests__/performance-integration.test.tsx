/**
 * Frontend Performance Monitoring Integration Test
 *
 * This test demonstrates how to integrate performance monitoring into React component tests.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  FrontendTestPerformanceMonitor,
  getPerformanceMonitor,
  monitorTestPerformance,
} from '../lib/testing/performance-monitor';

// Mock components for testing
const SimpleComponent: React.FC<{ data?: string[] }> = ({ data = [] }) => {
  return (
    <div data-testid="simple-component">
      <h1>Simple Component</h1>
      <ul>
        {data.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
    </div>
  );
};

const ComplexComponent: React.FC = () => {
  const [count, setCount] = React.useState(0);
  const [items, setItems] = React.useState<string[]>([]);

  const addItem = () => {
    setItems((prev) => [...prev, `Item ${prev.length + 1}`]);
    setCount((prev) => prev + 1);
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
    setCount((prev) => prev - 1);
  };

  return (
    <div data-testid="complex-component">
      <h1>Complex Component</h1>
      <p>Count: {count}</p>
      <button onClick={addItem} data-testid="add-button">
        Add Item
      </button>
      <ul>
        {items.map((item, index) => (
          <li key={index}>
            {item}
            <button
              onClick={() => removeItem(index)}
              data-testid={`remove-${index}`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

const MemoryIntensiveComponent: React.FC = () => {
  const [data, setData] = React.useState<string[]>([]);

  React.useEffect(() => {
    // Simulate loading large dataset
    const largeData = Array.from({ length: 1000 }, (_, i) => `Data item ${i}`);
    setData(largeData);
  }, []);

  return (
    <div data-testid="memory-intensive-component">
      <h1>Memory Intensive Component</h1>
      <p>Loaded {data.length} items</p>
      <div>
        {data.slice(0, 10).map((item, index) => (
          <div key={index}>{item}</div>
        ))}
        {data.length > 10 && <div>... and {data.length - 10} more items</div>}
      </div>
    </div>
  );
};

describe('Performance Monitoring Integration', () => {
  let performanceMonitor: FrontendTestPerformanceMonitor;

  beforeEach(() => {
    performanceMonitor = new FrontendTestPerformanceMonitor({
      maxExecutionTime: 1000, // 1 second
      maxRenderTime: 100, // 100ms
      maxMemoryUsage: 20, // 20MB
      maxComponentCount: 200,
      maxRerenderCount: 5,
    });
  });

  afterEach(() => {
    performanceMonitor.clearHistory();
  });

  test('should monitor simple component render performance', async () => {
    await monitorTestPerformance(
      'simple-component-render',
      async (monitorId) => {
        performanceMonitor.startRenderMonitoring(monitorId);

        const renderResult = render(
          <SimpleComponent data={['Item 1', 'Item 2', 'Item 3']} />
        );

        performanceMonitor.stopRenderMonitoring(monitorId, renderResult);

        expect(screen.getByTestId('simple-component')).toBeInTheDocument();
        expect(screen.getByText('Item 1')).toBeInTheDocument();
      }
    );

    const summary = performanceMonitor.getPerformanceSummary();
    expect(summary.totalTests).toBe(1);
    expect(summary.testsWithWarnings.length).toBe(0);
  });

  test('should monitor complex component with re-renders', async () => {
    const user = userEvent.setup();

    await performanceMonitor.monitorTest(
      'complex-component-interactions',
      async (monitorId) => {
        performanceMonitor.startRenderMonitoring(monitorId);

        const renderResult = render(<ComplexComponent />);

        performanceMonitor.stopRenderMonitoring(monitorId, renderResult);

        // Simulate user interactions that cause re-renders
        const addButton = screen.getByTestId('add-button');

        // Add items (each click causes a re-render)
        for (let i = 0; i < 3; i++) {
          await user.click(addButton);
          performanceMonitor.recordRerender(monitorId);

          await waitFor(() => {
            expect(screen.getByText(`Count: ${i + 1}`)).toBeInTheDocument();
          });
        }

        // Remove an item
        const removeButton = screen.getByTestId('remove-0');
        await user.click(removeButton);
        performanceMonitor.recordRerender(monitorId);

        await waitFor(() => {
          expect(screen.getByText('Count: 2')).toBeInTheDocument();
        });
      }
    );

    const summary = performanceMonitor.getPerformanceSummary();
    expect(summary.totalTests).toBe(1);

    const testMetrics = performanceMonitor.performanceHistory[0];
    expect(testMetrics.rerenderCount).toBe(4); // 3 adds + 1 remove
  });

  test('should detect memory-intensive component', async () => {
    await performanceMonitor.monitorTest(
      'memory-intensive-component',
      async (monitorId) => {
        performanceMonitor.startRenderMonitoring(monitorId);

        const renderResult = render(<MemoryIntensiveComponent />);

        performanceMonitor.stopRenderMonitoring(monitorId, renderResult);

        await waitFor(() => {
          expect(screen.getByText('Loaded 1000 items')).toBeInTheDocument();
        });
      }
    );

    const summary = performanceMonitor.getPerformanceSummary();
    expect(summary.totalTests).toBe(1);

    // Check if memory usage was tracked
    const testMetrics = performanceMonitor.performanceHistory[0];
    expect(testMetrics.memoryUsage).toBeGreaterThanOrEqual(0);
  });

  test('should detect performance regressions', async () => {
    // Run the same test multiple times with increasing complexity
    for (let i = 1; i <= 5; i++) {
      const data = Array.from(
        { length: i * 100 },
        (_, index) => `Item ${index}`
      );

      await performanceMonitor.monitorTest(
        'regression-test',
        async (monitorId) => {
          performanceMonitor.startRenderMonitoring(monitorId);

          const renderResult = render(<SimpleComponent data={data} />);

          performanceMonitor.stopRenderMonitoring(monitorId, renderResult);

          expect(screen.getByTestId('simple-component')).toBeInTheDocument();
        }
      );
    }

    // Check for performance regression
    const regressionInfo = performanceMonitor.checkPerformanceRegression(
      'regression-test',
      2
    );

    expect(regressionInfo).toHaveProperty('hasRegression');
    expect(regressionInfo).toHaveProperty('regressionPercentage');
    expect(regressionInfo).toHaveProperty('details');
  });

  test('should detect memory leaks', async () => {
    // Simulate memory leak by keeping references to rendered components
    const leakedComponents: any[] = [];

    for (let i = 0; i < 3; i++) {
      await performanceMonitor.monitorTest(
        'memory-leak-test',
        async (monitorId) => {
          const data = Array.from(
            { length: 500 },
            (_, index) => `Leak item ${index}`
          );

          performanceMonitor.startRenderMonitoring(monitorId);

          const renderResult = render(<SimpleComponent data={data} />);

          performanceMonitor.stopRenderMonitoring(monitorId, renderResult);

          // Keep reference to simulate memory leak
          leakedComponents.push({ data, renderResult });

          expect(screen.getByTestId('simple-component')).toBeInTheDocument();
        }
      );
    }

    // Check for memory leaks
    const leakInfo = performanceMonitor.detectMemoryLeaks('memory-leak-test');

    expect(leakInfo).toHaveProperty('hasLeak');
    expect(leakInfo).toHaveProperty('leakSize');
    expect(leakInfo).toHaveProperty('details');
  });

  test('should generate performance warnings for slow tests', async () => {
    // Create monitor with very low thresholds to trigger warnings
    const strictMonitor = new FrontendTestPerformanceMonitor({
      maxExecutionTime: 50, // 50ms - very strict
      maxRenderTime: 10, // 10ms - very strict
      maxMemoryUsage: 1, // 1MB - very strict
      maxComponentCount: 10, // 10 components - very strict
      maxRerenderCount: 1, // 1 re-render - very strict
    });

    await strictMonitor.monitorTest(
      'slow-test-with-warnings',
      async (monitorId) => {
        // Simulate slow work
        await new Promise((resolve) => setTimeout(resolve, 100));

        strictMonitor.startRenderMonitoring(monitorId);

        const largeData = Array.from({ length: 100 }, (_, i) => `Item ${i}`);
        const renderResult = render(<SimpleComponent data={largeData} />);

        strictMonitor.stopRenderMonitoring(monitorId, renderResult);

        // Simulate multiple re-renders
        for (let i = 0; i < 3; i++) {
          strictMonitor.recordRerender(monitorId);
        }
      }
    );

    const summary = strictMonitor.getPerformanceSummary();
    expect(summary.testsWithWarnings.length).toBeGreaterThan(0);

    const testWithWarnings = summary.testsWithWarnings[0];
    expect(testWithWarnings.warnings.length).toBeGreaterThan(0);
  });

  test('should export performance metrics', async () => {
    // Run a few tests
    await performanceMonitor.monitorTest('export-test-1', async (monitorId) => {
      const renderResult = render(<SimpleComponent />);
      performanceMonitor.stopRenderMonitoring(monitorId, renderResult);
    });

    await performanceMonitor.monitorTest('export-test-2', async (monitorId) => {
      const renderResult = render(<ComplexComponent />);
      performanceMonitor.stopRenderMonitoring(monitorId, renderResult);
    });

    // Export metrics
    const metricsJson = performanceMonitor.exportMetrics();
    const metrics = JSON.parse(metricsJson);

    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('thresholds');
    expect(metrics).toHaveProperty('summary');
    expect(metrics).toHaveProperty('detailedMetrics');
    expect(metrics.detailedMetrics).toHaveLength(2);
  });

  test('should work with global performance monitor', async () => {
    const globalMonitor = getPerformanceMonitor();

    await monitorTestPerformance('global-monitor-test', async (monitorId) => {
      const renderResult = render(<SimpleComponent data={['Global test']} />);
      expect(screen.getByText('Global test')).toBeInTheDocument();
    });

    const summary = globalMonitor.getPerformanceSummary();
    expect(summary.totalTests).toBeGreaterThanOrEqual(1);
  });
});

describe('Performance Test Utilities', () => {
  test('should create performance test wrapper', async () => {
    const performanceMonitor = new FrontendTestPerformanceMonitor();

    const testFunction = async (monitorId: string) => {
      const renderResult = render(<SimpleComponent />);
      expect(screen.getByTestId('simple-component')).toBeInTheDocument();
    };

    await performanceMonitor.monitorTest('wrapper-test', testFunction);

    const summary = performanceMonitor.getPerformanceSummary();
    expect(summary.totalTests).toBe(1);
  });

  test('should handle component render monitoring', async () => {
    const performanceMonitor = new FrontendTestPerformanceMonitor();
    const monitorId = performanceMonitor.startMonitoring(
      'render-monitoring-test'
    );

    const { result, renderTime } =
      await performanceMonitor.monitorComponentRender(monitorId, () =>
        render(<SimpleComponent data={['Test item']} />)
      );

    expect(result).toBeDefined();
    expect(renderTime).toBeGreaterThan(0);
    expect(screen.getByText('Test item')).toBeInTheDocument();

    const metrics = performanceMonitor.stopMonitoring(monitorId);
    expect(metrics.componentCount).toBeGreaterThan(0);
  });
});

// Example of integrating with existing component tests
describe('Existing Component Tests with Performance Monitoring', () => {
  test('Dashboard component performance', async () => {
    const monitor = getPerformanceMonitor();

    await monitor.monitorTest('dashboard-component', async (monitorId) => {
      // Mock dashboard component test
      const renderResult = render(
        <div data-testid="dashboard">
          <h1>Dashboard</h1>
          <div>Widget 1</div>
          <div>Widget 2</div>
          <div>Widget 3</div>
        </div>
      );

      expect(screen.getByTestId('dashboard')).toBeInTheDocument();
      expect(screen.getByText('Dashboard')).toBeInTheDocument();
    });
  });

  test('Form component performance', async () => {
    const monitor = getPerformanceMonitor();

    await monitor.monitorTest('form-component', async (monitorId) => {
      const user = userEvent.setup();

      // Mock form component
      const renderResult = render(
        <form data-testid="test-form">
          <input data-testid="name-input" placeholder="Name" />
          <input data-testid="email-input" placeholder="Email" />
          <button type="submit">Submit</button>
        </form>
      );

      // Simulate user interactions
      await user.type(screen.getByTestId('name-input'), 'John Doe');
      await user.type(screen.getByTestId('email-input'), 'john@example.com');

      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });
});
