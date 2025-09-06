import React from 'react';
import { render } from '@testing-library/react';
import {
  measureRenderPerformance,
  performanceTest,
  PERFORMANCE_THRESHOLDS,
  PerformanceRegression,
} from '@/lib/testing/performance-utils';
import { ClassificationWidget } from '../classification-widget';
import { PredicateWidget } from '../predicate-widget';
import { ProgressWidget } from '../progress-widget';

// Mock data for performance tests
const mockClassificationData = {
  deviceClass: 'Class II',
  productCode: 'LRH',
  regulatoryPathway: '510(k)',
  confidence: 0.95,
  reasoning: 'High confidence classification based on intended use',
  cfr_sections: ['21 CFR 880.5400'],
  sources: [
    {
      url: 'https://www.fda.gov/medical-devices/classify-your-medical-device/class-ii-medical-devices',
      title: 'Class II Medical Devices',
      effectiveDate: '2023-01-01',
      documentType: 'FDA_GUIDANCE' as const,
    },
  ],
  status: 'completed' as const,
};

const mockPredicateData = Array.from({ length: 10 }, (_, i) => ({
  kNumber: `K12345${i}`,
  deviceName: `Test Device ${i}`,
  intendedUse: `Test indication for device ${i}`,
  productCode: 'LRH',
  clearanceDate: '2023-01-01',
  confidenceScore: 0.8 + i * 0.02,
  comparisonData: {
    similarities: [],
    differences: [],
    riskAssessment: 'low' as const,
    testingRecommendations: [],
  },
  sources: [],
  isSelected: i < 3,
  status: 'completed' as const,
}));

const mockProgressData = {
  projectName: 'Test Project',
  overallProgress: 75,
  phases: [
    { name: 'Classification', progress: 100, status: 'completed' as const },
    { name: 'Predicate Search', progress: 80, status: 'in-progress' as const },
    { name: 'Comparison Analysis', progress: 50, status: 'pending' as const },
    { name: 'Documentation', progress: 0, status: 'pending' as const },
  ],
  lastUpdated: '2023-12-01T10:00:00Z',
};

describe('Dashboard Widget Performance Tests', () => {
  let performanceRegression: PerformanceRegression;

  beforeEach(() => {
    performanceRegression = new PerformanceRegression();
  });

  describe('ClassificationWidget Performance', () => {
    it(
      'should render within performance threshold',
      performanceTest(
        'ClassificationWidget',
        <ClassificationWidget data={mockClassificationData} />,
        PERFORMANCE_THRESHOLDS.DASHBOARD_WIDGET
      )
    );

    it('should handle empty state efficiently', () => {
      const benchmark = measureRenderPerformance(
        <ClassificationWidget data={null} />,
        'ClassificationWidget-Empty',
        PERFORMANCE_THRESHOLDS.SIMPLE_COMPONENT
      );

      expect(benchmark.passed).toBe(true);
      expect(benchmark.metrics.renderTime).toBeLessThan(20); // Should be very fast for empty state
    });

    it('should not regress in performance', () => {
      // Set baseline
      const baselineBenchmark = measureRenderPerformance(
        <ClassificationWidget data={mockClassificationData} />,
        'ClassificationWidget',
        PERFORMANCE_THRESHOLDS.DASHBOARD_WIDGET
      );

      performanceRegression.setBaseline(
        'ClassificationWidget',
        baselineBenchmark.metrics
      );

      // Test current performance
      const currentBenchmark = measureRenderPerformance(
        <ClassificationWidget data={mockClassificationData} />,
        'ClassificationWidget',
        PERFORMANCE_THRESHOLDS.DASHBOARD_WIDGET
      );

      const regressionCheck = performanceRegression.checkRegression(
        'ClassificationWidget',
        currentBenchmark.metrics
      );

      expect(regressionCheck.hasRegression).toBe(false);
    });
  });

  describe('PredicateWidget Performance', () => {
    it(
      'should render with multiple predicates within threshold',
      performanceTest(
        'PredicateWidget',
        <PredicateWidget predicates={mockPredicateData} />,
        PERFORMANCE_THRESHOLDS.DASHBOARD_WIDGET
      )
    );

    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 100 }, (_, i) => ({
        ...mockPredicateData[0],
        kNumber: `K${i.toString().padStart(6, '0')}`,
        deviceName: `Large Dataset Device ${i}`,
      }));

      const benchmark = measureRenderPerformance(
        <PredicateWidget predicates={largeDataset} />,
        'PredicateWidget-Large',
        {
          maxRenderTime: 200, // Allow more time for large datasets
          maxMemoryUsage: 20,
          maxComponentCount: 1000,
        }
      );

      expect(benchmark.passed).toBe(true);
    });

    it('should virtualize large lists for performance', () => {
      const veryLargeDataset = Array.from({ length: 1000 }, (_, i) => ({
        ...mockPredicateData[0],
        kNumber: `K${i.toString().padStart(6, '0')}`,
      }));

      const { container } = render(
        <PredicateWidget predicates={veryLargeDataset} />
      );

      // Should not render all 1000 items in DOM (virtualization)
      const renderedItems = container.querySelectorAll(
        '[data-testid="predicate-item"]'
      );
      expect(renderedItems.length).toBeLessThan(50); // Should virtualize
    });
  });

  describe('ProgressWidget Performance', () => {
    it(
      'should render progress animations smoothly',
      performanceTest(
        'ProgressWidget',
        <ProgressWidget data={mockProgressData} />,
        PERFORMANCE_THRESHOLDS.DASHBOARD_WIDGET
      )
    );

    it('should handle progress updates efficiently', () => {
      const { rerender } = render(<ProgressWidget data={mockProgressData} />);

      const startTime = performance.now();

      // Simulate multiple progress updates
      for (let i = 0; i < 10; i++) {
        const updatedData = {
          ...mockProgressData,
          overallProgress: 75 + i,
          phases: mockProgressData.phases.map((phase) => ({
            ...phase,
            progress: Math.min(100, phase.progress + i),
          })),
        };

        rerender(<ProgressWidget data={updatedData} />);
      }

      const endTime = performance.now();
      const totalUpdateTime = endTime - startTime;

      // Should handle 10 updates in less than 100ms
      expect(totalUpdateTime).toBeLessThan(100);
    });
  });

  describe('Memory Leak Detection', () => {
    it('should not leak memory on mount/unmount cycles', () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Mount and unmount components multiple times
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(
          <div>
            <ClassificationWidget data={mockClassificationData} />
            <PredicateWidget predicates={mockPredicateData} />
            <ProgressWidget data={mockProgressData} />
          </div>
        );
        unmount();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = (finalMemory - initialMemory) / 1024 / 1024; // MB

      // Should not increase memory by more than 10MB
      expect(memoryIncrease).toBeLessThan(10);
    });
  });

  describe('Concurrent Rendering Performance', () => {
    it('should handle concurrent updates efficiently', async () => {
      const { rerender } = render(
        <div>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      const startTime = performance.now();

      // Simulate concurrent updates
      const updates = Array.from(
        { length: 20 },
        (_, i) =>
          new Promise<void>((resolve) => {
            setTimeout(() => {
              rerender(
                <div>
                  <ClassificationWidget
                    data={{
                      ...mockClassificationData,
                      confidence: 0.9 + i * 0.001,
                    }}
                  />
                  <PredicateWidget
                    predicates={mockPredicateData.slice(0, i + 1)}
                  />
                  <ProgressWidget
                    data={{
                      ...mockProgressData,
                      overallProgress: Math.min(100, 70 + i),
                    }}
                  />
                </div>
              );
              resolve();
            }, i * 10);
          })
      );

      await Promise.all(updates);

      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Should complete all updates in reasonable time
      expect(totalTime).toBeLessThan(1000); // 1 second
    });
  });
});
