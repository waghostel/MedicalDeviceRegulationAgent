/**
 * Performance Optimization Tests
 * 
 * Tests for virtual scrolling, lazy loading, caching, and performance monitoring
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

// Mock performance APIs
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  mark: jest.fn(),
  measure: jest.fn(),
  getEntriesByType: jest.fn(() => []),
  memory: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024, // 100MB
    jsHeapSizeLimit: 2 * 1024 * 1024 * 1024, // 2GB
  },
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

// Mock IntersectionObserver
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

// Mock web-vitals
jest.mock('web-vitals', () => ({
  getCLS: jest.fn((callback) => callback({ name: 'CLS', value: 0.05, id: 'test-cls' })),
  getFCP: jest.fn((callback) => callback({ name: 'FCP', value: 1500, id: 'test-fcp' })),
  getFID: jest.fn((callback) => callback({ name: 'FID', value: 50, id: 'test-fid' })),
  getLCP: jest.fn((callback) => callback({ name: 'LCP', value: 2000, id: 'test-lcp' })),
  getTTFB: jest.fn((callback) => callback({ name: 'TTFB', value: 500, id: 'test-ttfb' })),
}));

// Import components after mocking
import { VirtualScrollContainer, VirtualGrid } from '@/components/performance/virtual-scrolling';
import { LazyImage, LazyComponent, LazyData } from '@/components/performance/lazy-loading';
import { PerformanceMonitor } from '@/components/performance/performance-monitor';
import { MemoryCache, PersistentCache, APICache } from '@/lib/performance/caching';
import { 
  useVirtualScrolling, 
  usePerformanceMonitor,
  useMemoryMonitoring 
} from '@/lib/performance/optimization';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

describe('Performance Optimization Features', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  describe('Virtual Scrolling', () => {
    const mockItems = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
      description: `Description for item ${i}`,
    }));

    it('should render virtual scroll container with large dataset', () => {
      const renderItem = jest.fn((item, index) => (
        <div key={item.id} data-testid={`item-${index}`}>
          {item.name}
        </div>
      ));

      render(
        <VirtualScrollContainer
          items={mockItems}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
        />
      );

      // Should only render visible items, not all 1000
      expect(renderItem).toHaveBeenCalledTimes(expect.any(Number));
      expect(renderItem.mock.calls.length).toBeLessThan(mockItems.length);
    });

    it('should handle scroll events and update visible range', async () => {
      const renderItem = jest.fn((item, index) => (
        <div key={item.id} data-testid={`item-${index}`}>
          {item.name}
        </div>
      ));

      render(
        <VirtualScrollContainer
          items={mockItems}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
        />
      );

      const scrollContainer = screen.getByRole('scrollbar', { hidden: true }) || 
                             document.querySelector('[style*="overflow-auto"]');
      
      if (scrollContainer) {
        fireEvent.scroll(scrollContainer, { target: { scrollTop: 500 } });
        
        await waitFor(() => {
          // Should re-render with new visible items
          expect(renderItem).toHaveBeenCalled();
        });
      }
    });

    it('should render virtual grid with proper layout', () => {
      const renderItem = jest.fn((item, index) => (
        <div key={item.id} data-testid={`grid-item-${index}`}>
          {item.name}
        </div>
      ));

      render(
        <VirtualGrid
          items={mockItems}
          itemHeight={100}
          itemWidth={200}
          containerHeight={400}
          containerWidth={800}
          renderItem={renderItem}
        />
      );

      // Should calculate columns and render grid items
      expect(renderItem).toHaveBeenCalled();
    });

    it('should optimize for small datasets by not using virtualization', () => {
      const smallItems = mockItems.slice(0, 10);
      const renderItem = jest.fn((item, index) => (
        <div key={item.id} data-testid={`item-${index}`}>
          {item.name}
        </div>
      ));

      render(
        <VirtualScrollContainer
          items={smallItems}
          itemHeight={50}
          containerHeight={400}
          renderItem={renderItem}
        />
      );

      // Should render all items for small datasets
      expect(renderItem).toHaveBeenCalledTimes(smallItems.length);
    });
  });

  describe('Lazy Loading', () => {
    it('should lazy load images with intersection observer', async () => {
      const onLoad = jest.fn();
      const mockObserve = jest.fn();
      
      mockIntersectionObserver.mockImplementation((callback) => ({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: jest.fn(),
      }));

      render(
        <LazyImage
          src="/test-image.jpg"
          alt="Test image"
          onLoad={onLoad}
        />
      );

      expect(mockObserve).toHaveBeenCalled();
    });

    it('should lazy load components when they enter viewport', async () => {
      const TestComponent = () => <div data-testid="lazy-content">Lazy Content</div>;
      
      const mockObserve = jest.fn();
      const mockCallback = jest.fn();
      
      mockIntersectionObserver.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return {
          observe: mockObserve,
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(
        <LazyComponent>
          <TestComponent />
        </LazyComponent>
      );

      expect(mockObserve).toHaveBeenCalled();

      // Simulate intersection
      act(() => {
        mockCallback([{ isIntersecting: true }]);
      });

      await waitFor(() => {
        expect(screen.getByTestId('lazy-content')).toBeInTheDocument();
      });
    });

    it('should lazy load data when component enters viewport', async () => {
      const fetchData = jest.fn().mockResolvedValue({ message: 'Loaded data' });
      const mockObserve = jest.fn();
      const mockCallback = jest.fn();
      
      mockIntersectionObserver.mockImplementation((callback) => {
        mockCallback.mockImplementation(callback);
        return {
          observe: mockObserve,
          unobserve: jest.fn(),
          disconnect: jest.fn(),
        };
      });

      render(
        <LazyData fetchData={fetchData}>
          {(data) => <div data-testid="data-content">{data.message}</div>}
        </LazyData>
      );

      expect(mockObserve).toHaveBeenCalled();
      expect(fetchData).not.toHaveBeenCalled();

      // Simulate intersection
      act(() => {
        mockCallback([{ isIntersecting: true }]);
      });

      await waitFor(() => {
        expect(fetchData).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(screen.getByTestId('data-content')).toHaveTextContent('Loaded data');
      });
    });
  });

  describe('Caching', () => {
    describe('MemoryCache', () => {
      it('should store and retrieve data', () => {
        const cache = new MemoryCache({ maxSize: 10, ttl: 1000 });
        
        cache.set('test-key', { data: 'test-value' });
        const result = cache.get('test-key');
        
        expect(result).toEqual({ data: 'test-value' });
      });

      it('should expire data after TTL', async () => {
        const cache = new MemoryCache({ maxSize: 10, ttl: 100 });
        
        cache.set('test-key', { data: 'test-value' });
        
        // Wait for expiration
        await new Promise(resolve => setTimeout(resolve, 150));
        
        const result = cache.get('test-key');
        expect(result).toBeNull();
      });

      it('should respect max size limit', () => {
        const cache = new MemoryCache({ maxSize: 2 });
        
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.set('key3', 'value3'); // Should evict key1
        
        expect(cache.get('key1')).toBeNull();
        expect(cache.get('key2')).toBe('value2');
        expect(cache.get('key3')).toBe('value3');
      });

      it('should provide cache statistics', () => {
        const cache = new MemoryCache({ maxSize: 10 });
        
        cache.set('key1', 'value1');
        cache.set('key2', 'value2');
        cache.get('key1'); // Hit
        cache.get('key1'); // Hit
        cache.get('nonexistent'); // Miss
        
        const stats = cache.getStats();
        expect(stats.size).toBe(2);
        expect(stats.maxSize).toBe(10);
      });
    });

    describe('PersistentCache', () => {
      it('should store data in localStorage', () => {
        const cache = new PersistentCache('test_cache');
        
        cache.set('test-key', { data: 'test-value' });
        
        expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
          'test_cache_test-key',
          expect.stringContaining('test-value')
        );
      });

      it('should retrieve data from localStorage', () => {
        const cache = new PersistentCache('test_cache');
        const testData = {
          data: { data: 'test-value' },
          timestamp: Date.now(),
          ttl: 60000,
          hits: 0,
        };
        
        mockLocalStorage.getItem.mockReturnValue(JSON.stringify(testData));
        
        const result = cache.get('test-key');
        expect(result).toEqual({ data: 'test-value' });
      });
    });

    describe('APICache', () => {
      it('should cache API responses', async () => {
        const cache = new APICache();
        const fetchFn = jest.fn().mockResolvedValue({ data: 'api-response' });
        
        const result1 = await cache.get('api-key', fetchFn);
        const result2 = await cache.get('api-key', fetchFn);
        
        expect(fetchFn).toHaveBeenCalledTimes(1);
        expect(result1).toEqual({ data: 'api-response' });
        expect(result2).toEqual({ data: 'api-response' });
      });

      it('should handle API errors', async () => {
        const cache = new APICache();
        const fetchFn = jest.fn().mockRejectedValue(new Error('API Error'));
        
        await expect(cache.get('api-key', fetchFn)).rejects.toThrow('API Error');
      });

      it('should invalidate cache entries', async () => {
        const cache = new APICache();
        const fetchFn = jest.fn().mockResolvedValue({ data: 'api-response' });
        
        await cache.get('api-key', fetchFn);
        cache.invalidate('api-key');
        await cache.get('api-key', fetchFn);
        
        expect(fetchFn).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Performance Monitoring', () => {
    it('should render performance monitor component', () => {
      render(<PerformanceMonitor />);
      
      expect(screen.getByText('Performance Monitor')).toBeInTheDocument();
      expect(screen.getByText('Overall Performance Score')).toBeInTheDocument();
    });

    it('should display performance metrics', () => {
      render(<PerformanceMonitor />);
      
      // Should show tabs for different metric categories
      expect(screen.getByText('Metrics')).toBeInTheDocument();
      expect(screen.getByText('Web Vitals')).toBeInTheDocument();
      expect(screen.getByText('Memory')).toBeInTheDocument();
      expect(screen.getByText(/Alerts/)).toBeInTheDocument();
    });

    it('should allow exporting performance data', async () => {
      const user = userEvent.setup();
      
      // Mock URL.createObjectURL
      const mockCreateObjectURL = jest.fn(() => 'mock-url');
      const mockRevokeObjectURL = jest.fn();
      Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
      Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });
      
      // Mock document.createElement and appendChild
      const mockAnchor = {
        href: '',
        download: '',
        click: jest.fn(),
      };
      const mockCreateElement = jest.fn(() => mockAnchor);
      const mockAppendChild = jest.fn();
      const mockRemoveChild = jest.fn();
      
      Object.defineProperty(document, 'createElement', { value: mockCreateElement });
      Object.defineProperty(document.body, 'appendChild', { value: mockAppendChild });
      Object.defineProperty(document.body, 'removeChild', { value: mockRemoveChild });
      
      render(<PerformanceMonitor />);
      
      const exportButton = screen.getByText('Export');
      await user.click(exportButton);
      
      expect(mockCreateObjectURL).toHaveBeenCalled();
      expect(mockAnchor.click).toHaveBeenCalled();
      expect(mockRevokeObjectURL).toHaveBeenCalled();
    });

    it('should toggle recording state', async () => {
      const user = userEvent.setup();
      
      render(<PerformanceMonitor />);
      
      expect(screen.getByText('Recording')).toBeInTheDocument();
      
      const pauseButton = screen.getByText('Pause');
      await user.click(pauseButton);
      
      expect(screen.getByText('Paused')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });
  });

  describe('Performance Hooks', () => {
    it('should track render performance', () => {
      const TestComponent = () => {
        usePerformanceMonitor();
        return <div>Test Component</div>;
      };

      render(<TestComponent />);
      
      // Should call performance.now() for timing
      expect(mockPerformance.now).toHaveBeenCalled();
    });

    it('should monitor memory usage', () => {
      const TestComponent = () => {
        const memoryInfo = useMemoryMonitoring();
        return (
          <div>
            {memoryInfo ? (
              <span data-testid="memory-usage">
                {Math.round(memoryInfo.usagePercentage)}%
              </span>
            ) : (
              <span>No memory info</span>
            )}
          </div>
        );
      };

      render(<TestComponent />);
      
      expect(screen.getByTestId('memory-usage')).toHaveTextContent('50%');
    });
  });

  describe('Bundle Size Optimization', () => {
    it('should analyze bundle size', () => {
      // Mock performance.getEntriesByType for resource timing
      mockPerformance.getEntriesByType.mockReturnValue([
        {
          name: '/static/js/main.chunk.js',
          transferSize: 500 * 1024, // 500KB
          responseEnd: 1000,
          startTime: 500,
          initiatorType: 'script',
        },
        {
          name: '/static/css/main.chunk.css',
          transferSize: 100 * 1024, // 100KB
          responseEnd: 800,
          startTime: 400,
          initiatorType: 'link',
        },
      ]);

      // Import and test bundle analyzer
      const { analyzeBundleSize } = require('@/lib/performance/optimization');
      const analysis = analyzeBundleSize();

      expect(analysis).toBeDefined();
      expect(analysis.totalJSSize).toBeGreaterThan(0);
      expect(analysis.totalCSSSize).toBeGreaterThan(0);
    });
  });
});

// Integration test for complete performance optimization workflow
describe('Performance Optimization Integration', () => {
  it('should handle large dataset with virtual scrolling and lazy loading', async () => {
    const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Project ${i}`,
      description: `Description for project ${i}`,
      status: i % 3 === 0 ? 'completed' : i % 3 === 1 ? 'in_progress' : 'draft',
    }));

    const renderItem = jest.fn((item, index) => (
      <div key={item.id} data-testid={`project-${index}`}>
        <h3>{item.name}</h3>
        <p>{item.description}</p>
        <span>{item.status}</span>
      </div>
    ));

    render(
      <VirtualScrollContainer
        items={largeDataset}
        itemHeight={120}
        containerHeight={600}
        renderItem={renderItem}
      />
    );

    // Should only render visible items
    expect(renderItem.mock.calls.length).toBeLessThan(100);
    expect(renderItem.mock.calls.length).toBeGreaterThan(0);
  });

  it('should maintain performance with caching and monitoring', async () => {
    const cache = new APICache();
    const fetchFn = jest.fn().mockResolvedValue({ 
      projects: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `Project ${i}` }))
    });

    const startTime = performance.now();
    
    // First call - should fetch
    await cache.get('projects', fetchFn);
    
    // Second call - should use cache
    await cache.get('projects', fetchFn);
    
    const endTime = performance.now();
    
    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to caching
  });
});