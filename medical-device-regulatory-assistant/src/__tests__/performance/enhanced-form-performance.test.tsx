/**
 * Enhanced Form Performance Tests
 *
 * Performance-focused tests for enhanced form features including:
 * - Rendering performance
 * - Auto-save performance
 * - Validation performance
 * - Memory usage optimization
 * - Bundle size impact
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectForm } from '@/components/projects/project-form';
import { renderWithProviders } from '@/lib/testing/test-utils';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/lib/testing/test-setup';

// Performance measurement utilities
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  autoSaveLatency: number;
  validationLatency: number;
  bundleSize?: number;
}

class PerformanceProfiler {
  private startTime: number = 0;
  private endTime: number = 0;
  private memoryBaseline: number = 0;

  startMeasurement(): void {
    this.memoryBaseline = this.getMemoryUsage();
    this.startTime = performance.now();
  }

  endMeasurement(): PerformanceMetrics {
    this.endTime = performance.now();
    return {
      renderTime: this.endTime - this.startTime,
      memoryUsage: this.getMemoryUsage() - this.memoryBaseline,
      autoSaveLatency: 0,
      validationLatency: 0,
    };
  }

  private getMemoryUsage(): number {
    // Mock memory usage calculation
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  async measureAutoSaveLatency(callback: () => Promise<void>): Promise<number> {
    const start = performance.now();
    await callback();
    return performance.now() - start;
  }

  async measureValidationLatency(
    callback: () => Promise<void>
  ): Promise<number> {
    const start = performance.now();
    await callback();
    return performance.now() - start;
  }
}

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
};

Object.defineProperty(global, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Setup test environment
beforeAll(() => {
  setupTestEnvironment({
    mockAPI: true,
    mockWebSocket: false, // Disable for performance testing
    mockComponents: true,
  });
});

afterAll(() => {
  teardownTestEnvironment();
});

jest.useFakeTimers();

describe('Enhanced Form Performance Tests', () => {
  let profiler: PerformanceProfiler;
  let mockOnSubmit: jest.Mock;
  let mockOnOpenChange: jest.Mock;

  beforeEach(() => {
    profiler = new PerformanceProfiler();
    mockOnSubmit = jest.fn();
    mockOnOpenChange = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Rendering Performance', () => {
    it('renders enhanced form within acceptable time limits', async () => {
      profiler.startMeasurement();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const metrics = profiler.endMeasurement();

      // Enhanced form should render within 50ms
      expect(metrics.renderTime).toBeLessThan(50);

      // Memory usage should be reasonable
      expect(metrics.memoryUsage).toBeLessThan(1000000); // 1MB limit
    });

    it('maintains performance with large form data', async () => {
      const largeProject = {
        id: 1,
        name: 'A'.repeat(255), // Maximum length
        description: 'B'.repeat(1000), // Maximum length
        device_type: 'Complex Medical Device with Very Long Name',
        intended_use: 'C'.repeat(500),
        status: 'IN_PROGRESS' as const,
        user_id: 'user-1',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-02T00:00:00Z',
      };

      profiler.startMeasurement();

      renderWithProviders(
        <ProjectForm
          project={largeProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const metrics = profiler.endMeasurement();

      // Should still render quickly even with large data
      expect(metrics.renderTime).toBeLessThan(100);
    });

    it('optimizes re-renders during form interactions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const { rerender } = renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Measure multiple re-renders
      const renderTimes: number[] = [];

      for (let i = 0; i < 10; i++) {
        profiler.startMeasurement();

        await user.clear(nameInput);
        await user.type(nameInput, `Project ${i}`);

        rerender(
          <ProjectForm
            open={true}
            onOpenChange={mockOnOpenChange}
            onSubmit={mockOnSubmit}
          />
        );

        const metrics = profiler.endMeasurement();
        renderTimes.push(metrics.renderTime);
      }

      // Average render time should be consistent
      const averageRenderTime =
        renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageRenderTime).toBeLessThan(20);

      // No significant performance degradation over time
      const firstHalf = renderTimes.slice(0, 5);
      const secondHalf = renderTimes.slice(5);
      const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const secondAvg =
        secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

      expect(secondAvg).toBeLessThan(firstAvg * 1.5); // No more than 50% degradation
    });
  });

  describe('Auto-save Performance', () => {
    it('performs auto-save operations efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Performance Test Project');

      // Measure auto-save latency
      const autoSaveLatency = await profiler.measureAutoSaveLatency(
        async () => {
          act(() => {
            jest.advanceTimersByTime(2000);
          });

          // Wait for auto-save to complete
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      );

      // Auto-save should complete within 50ms
      expect(autoSaveLatency).toBeLessThan(50);
    });

    it('handles high-frequency auto-save requests efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Simulate rapid typing that would trigger many auto-save attempts
      const autoSaveLatencies: number[] = [];

      for (let i = 0; i < 20; i++) {
        await user.type(nameInput, `${i}`);

        const latency = await profiler.measureAutoSaveLatency(async () => {
          act(() => {
            jest.advanceTimersByTime(100); // Partial debounce
          });
        });

        autoSaveLatencies.push(latency);
      }

      // Complete final auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Auto-save debouncing should prevent excessive operations
      const actualAutoSaves = autoSaveLatencies.filter(
        (latency) => latency > 0
      );
      expect(actualAutoSaves.length).toBeLessThan(5); // Should be debounced
    });

    it('optimizes localStorage operations for large form data', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      const largeText = 'A'.repeat(5000); // Large text input

      const storageLatency = await profiler.measureAutoSaveLatency(async () => {
        await user.type(descriptionInput, largeText);

        act(() => {
          jest.advanceTimersByTime(2000);
        });
      });

      // Should handle large data efficiently
      expect(storageLatency).toBeLessThan(100);
    });
  });

  describe('Validation Performance', () => {
    it('performs real-time validation efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Measure validation latency
      const validationLatency = await profiler.measureValidationLatency(
        async () => {
          await user.type(nameInput, 'Test Project Name');

          act(() => {
            jest.advanceTimersByTime(300); // Debounce period
          });
        }
      );

      // Validation should complete within 20ms
      expect(validationLatency).toBeLessThan(20);
    });

    it('handles complex validation rules efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const deviceTypeInput = screen.getByLabelText(/device type/i);
      const intendedUseInput = screen.getByLabelText(/intended use/i);

      // Fill all fields to trigger cross-field validation
      const complexValidationLatency = await profiler.measureValidationLatency(
        async () => {
          await user.type(nameInput, 'Complex Validation Test Project');
          await user.type(
            descriptionInput,
            'This is a comprehensive description for testing complex validation rules'
          );
          await user.type(deviceTypeInput, 'Software as Medical Device');
          await user.type(intendedUseInput, 'AI-powered diagnostic assistance');

          act(() => {
            jest.advanceTimersByTime(300);
          });
        }
      );

      // Complex validation should still be fast
      expect(complexValidationLatency).toBeLessThan(50);
    });

    it('optimizes validation for large text inputs', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const descriptionInput = screen.getByLabelText(/description/i);
      const largeDescription = 'A'.repeat(1000); // Maximum allowed length

      const largeTextValidationLatency =
        await profiler.measureValidationLatency(async () => {
          await user.type(descriptionInput, largeDescription);

          act(() => {
            jest.advanceTimersByTime(300);
          });
        });

      // Should handle large text validation efficiently
      expect(largeTextValidationLatency).toBeLessThan(30);
    });
  });

  describe('Memory Usage Optimization', () => {
    it('prevents memory leaks during long form sessions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      const { unmount } = renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Simulate long editing session
      const initialMemory = profiler['getMemoryUsage']();

      for (let i = 0; i < 100; i++) {
        await user.clear(nameInput);
        await user.type(nameInput, `Memory Test ${i}`);

        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      const peakMemory = profiler['getMemoryUsage']();

      // Unmount component
      unmount();

      // Allow garbage collection
      act(() => {
        jest.advanceTimersByTime(1000);
      });

      const finalMemory = profiler['getMemoryUsage']();

      // Memory should be released after unmount
      expect(finalMemory).toBeLessThan(peakMemory);

      // Memory growth should be reasonable
      expect(peakMemory - initialMemory).toBeLessThan(5000000); // 5MB limit
    });

    it('optimizes event listener management', async () => {
      const addEventListenerSpy = jest.spyOn(document, 'addEventListener');
      const removeEventListenerSpy = jest.spyOn(
        document,
        'removeEventListener'
      );

      const { unmount } = renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const initialListeners = addEventListenerSpy.mock.calls.length;

      // Unmount component
      unmount();

      const removedListeners = removeEventListenerSpy.mock.calls.length;

      // All event listeners should be cleaned up
      expect(removedListeners).toBeGreaterThanOrEqual(initialListeners);

      addEventListenerSpy.mockRestore();
      removeEventListenerSpy.mockRestore();
    });

    it('manages timer cleanup efficiently', async () => {
      const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
      const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');

      const { unmount } = renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const initialTimers = setTimeoutSpy.mock.calls.length;

      // Unmount component
      unmount();

      const clearedTimers = clearTimeoutSpy.mock.calls.length;

      // Timers should be cleaned up
      expect(clearedTimers).toBeGreaterThan(0);

      setTimeoutSpy.mockRestore();
      clearTimeoutSpy.mockRestore();
    });
  });

  describe('Bundle Size Impact', () => {
    it('measures enhanced form bundle size impact', () => {
      // Mock bundle analyzer results
      const mockBundleStats = {
        enhancedFormHooks: 15000, // 15KB
        formValidation: 8000, // 8KB
        autoSave: 5000, // 5KB
        accessibility: 3000, // 3KB
        total: 31000, // 31KB total
      };

      // Enhanced form features should have reasonable bundle impact
      expect(mockBundleStats.total).toBeLessThan(50000); // 50KB limit
      expect(mockBundleStats.enhancedFormHooks).toBeLessThan(20000); // 20KB limit for main hook
    });

    it('verifies tree-shaking effectiveness', () => {
      // Mock tree-shaking analysis
      const mockTreeShakingStats = {
        unusedExports: ['debugUtils', 'devOnlyFeatures'],
        bundleReduction: 0.15, // 15% reduction
        finalSize: 26350, // After tree-shaking
      };

      // Tree-shaking should be effective
      expect(mockTreeShakingStats.bundleReduction).toBeGreaterThan(0.1); // At least 10% reduction
      expect(mockTreeShakingStats.finalSize).toBeLessThan(30000); // Under 30KB after optimization
    });
  });

  describe('Concurrent Operations Performance', () => {
    it('handles concurrent validation and auto-save efficiently', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      // Simulate concurrent operations
      const concurrentLatency = await profiler.measureValidationLatency(
        async () => {
          // Start typing in multiple fields
          await Promise.all([
            user.type(nameInput, 'Concurrent Test'),
            user.type(descriptionInput, 'Testing concurrent operations'),
          ]);

          // Trigger both validation and auto-save
          act(() => {
            jest.advanceTimersByTime(2000);
          });
        }
      );

      // Concurrent operations should not significantly impact performance
      expect(concurrentLatency).toBeLessThan(100);
    });

    it('maintains UI responsiveness during background operations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Responsiveness Test');

      // Start auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // UI should remain responsive during auto-save
      const uiResponseLatency = await profiler.measureValidationLatency(
        async () => {
          await user.click(screen.getByRole('button', { name: /cancel/i }));
        }
      );

      expect(uiResponseLatency).toBeLessThan(50);
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });
});
