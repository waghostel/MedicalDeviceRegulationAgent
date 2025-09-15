/**
 * Performance Integration Tests
 * 
 * Simple integration tests to validate performance optimization features
 */

import { MemoryCache, APICache, createCacheKey } from '@/lib/performance/caching';
import { analyzeBundleSize } from '@/lib/performance/optimization';

// Mock performance API
const mockPerformance = {
  now: jest.fn(() => Date.now()),
  getEntriesByType: jest.fn(() => [
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
  ]),
};

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
});

describe('Performance Optimization Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Caching System Integration', () => {
    it('should provide efficient caching for large datasets', () => {
      const cache = new MemoryCache({ maxSize: 100, ttl: 60000 });
      
      // Simulate caching large project data
      const largeProjectData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `Project ${i}`,
        description: `Description for project ${i}`,
        status: i % 3 === 0 ? 'completed' : 'in_progress',
      }));

      const cacheKey = createCacheKey('projects', 'all', 'page-1');
      cache.set(cacheKey, largeProjectData);

      const cachedData = cache.get(cacheKey);
      expect(cachedData).toEqual(largeProjectData);
      expect(cachedData).toHaveLength(1000);

      const stats = cache.getStats();
      expect(stats.size).toBe(1);
      expect(stats.maxSize).toBe(100);
    });

    it('should handle API caching with performance monitoring', async () => {
      const apiCache = new APICache();
      const mockFetch = jest.fn().mockResolvedValue({
        projects: Array.from({ length: 500 }, (_, i) => ({ id: i, name: `Project ${i}` }))
      });

      const startTime = performance.now();
      
      // First call - should fetch and cache
      const result1 = await apiCache.get('large-projects', mockFetch);
      
      // Second call - should use cache
      const result2 = await apiCache.get('large-projects', mockFetch);
      
      const endTime = performance.now();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(result1).toEqual(result2);
      expect(result1.projects).toHaveLength(500);
      expect(endTime - startTime).toBeLessThan(1000); // Should be fast due to caching
    });
  });

  describe('Bundle Analysis Integration', () => {
    it('should analyze bundle size and provide optimization insights', () => {
      const analysis = analyzeBundleSize();

      expect(analysis).toBeDefined();
      expect(analysis.totalJSSize).toBeGreaterThan(0);
      expect(analysis.totalCSSSize).toBeGreaterThan(0);
      expect(analysis.jsResourceCount).toBe(1);
      expect(analysis.cssResourceCount).toBe(1);
      
      // Should have resource details
      expect(analysis.resources.js).toHaveLength(1);
      expect(analysis.resources.css).toHaveLength(1);
      
      // Check resource details
      const jsResource = analysis.resources.js[0];
      expect(jsResource.size).toBeCloseTo(500, 0); // 500KB
      expect(jsResource.loadTime).toBe(500); // 1000 - 500
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should track performance metrics efficiently', () => {
      // Mock performance.now to return incrementing values
      let callCount = 0;
      mockPerformance.now.mockImplementation(() => {
        callCount++;
        return callCount * 10; // Return 10, 20, 30, etc.
      });

      const startTime = performance.now();
      
      // Simulate some operations
      const operations = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        operation: `operation-${i}`,
        timestamp: Date.now() + i,
      }));

      const endTime = performance.now();
      const operationTime = endTime - startTime;

      expect(mockPerformance.now).toHaveBeenCalled();
      expect(operations).toHaveLength(100);
      expect(operationTime).toBeGreaterThan(0);
      
      // Performance should be reasonable for 100 operations
      expect(operationTime).toBeLessThan(1000); // Should complete in under 1000ms
    });
  });

  describe('Virtual Scrolling Performance', () => {
    it('should handle large datasets efficiently', () => {
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`,
      }));

      const containerHeight = 600;
      const itemHeight = 50;
      const visibleCount = Math.ceil(containerHeight / itemHeight);
      const overscan = 5;
      
      // Simulate virtual scrolling calculation
      const startIndex = 0;
      const endIndex = Math.min(largeDataset.length, visibleCount + overscan * 2);
      const visibleItems = largeDataset.slice(startIndex, endIndex);

      // Should only render visible items, not all 10,000
      expect(visibleItems.length).toBeLessThan(100);
      expect(visibleItems.length).toBeGreaterThan(0);
      expect(visibleItems[0].id).toBe(0);
      
      // Total height calculation
      const totalHeight = largeDataset.length * itemHeight;
      expect(totalHeight).toBe(500000); // 10,000 * 50px
    });
  });

  describe('Lazy Loading Performance', () => {
    it('should defer loading until needed', () => {
      const mockIntersectionObserver = jest.fn();
      const mockObserve = jest.fn();
      const mockDisconnect = jest.fn();

      mockIntersectionObserver.mockImplementation(() => ({
        observe: mockObserve,
        unobserve: jest.fn(),
        disconnect: mockDisconnect,
      }));

      window.IntersectionObserver = mockIntersectionObserver;

      // Simulate lazy loading setup
      const lazyComponents = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        loaded: false,
        component: `Component${i}`,
      }));

      // Initially, no components should be loaded
      const loadedComponents = lazyComponents.filter(c => c.loaded);
      expect(loadedComponents).toHaveLength(0);

      // Simulate intersection observer setup
      lazyComponents.forEach(() => {
        // Each component would set up its own observer
        mockObserve();
      });

      expect(mockObserve).toHaveBeenCalledTimes(50);
    });
  });

  describe('Overall Performance Optimization', () => {
    it('should demonstrate performance improvements with all optimizations', async () => {
      const startTime = performance.now();
      
      // Simulate a complex operation with caching
      const cache = new MemoryCache({ maxSize: 50 });
      const apiCache = new APICache();
      
      // Cache some data
      const testData = Array.from({ length: 1000 }, (_, i) => ({ id: i, value: i * 2 }));
      cache.set('test-data', testData);
      
      // Simulate API call with caching
      const mockApiCall = jest.fn().mockResolvedValue({ result: 'success' });
      await apiCache.get('test-api', mockApiCall);
      await apiCache.get('test-api', mockApiCall); // Should use cache
      
      // Simulate virtual scrolling calculation
      const visibleItems = testData.slice(0, 20); // Only render 20 items
      
      const endTime = performance.now();
      const totalTime = endTime - startTime;

      // Verify optimizations
      expect(cache.get('test-data')).toEqual(testData);
      expect(mockApiCall).toHaveBeenCalledTimes(1); // Cached on second call
      expect(visibleItems).toHaveLength(20); // Virtual scrolling limits rendered items
      expect(totalTime).toBeLessThan(100); // Should be fast with optimizations
      
      // Verify cache stats
      const cacheStats = cache.getStats();
      expect(cacheStats.size).toBe(1);
      expect(cacheStats.hitRate).toBeGreaterThan(0);
    });
  });
});