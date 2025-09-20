/**
 * Bundle Size Analysis and Optimization Utilities
 */

import { performanceMonitor } from './optimization';

interface BundleAnalysis {
  totalSize: number;
  gzippedSize?: number;
  chunks: ChunkInfo[];
  recommendations: string[];
  score: number; // 0-100
}

interface ChunkInfo {
  name: string;
  size: number;
  gzippedSize?: number;
  loadTime: number;
  isAsync: boolean;
  dependencies: string[];
}

class BundleAnalyzer {
  private analysis: BundleAnalysis | null = null;
  private thresholds = {
    totalSize: 1000 * 1024, // 1MB
    chunkSize: 250 * 1024, // 250KB
    loadTime: 3000, // 3 seconds
  };

  async analyzeBundlePerformance(): Promise<BundleAnalysis> {
    const resources = this.getResourceTimings();
    const chunks = this.analyzeChunks(resources);
    const totalSize = chunks.reduce((sum, chunk) => sum + chunk.size, 0);

    const analysis: BundleAnalysis = {
      totalSize,
      chunks,
      recommendations: this.generateRecommendations(chunks, totalSize),
      score: this.calculateScore(chunks, totalSize),
    };

    this.analysis = analysis;
    return analysis;
  }

  private getResourceTimings(): PerformanceResourceTiming[] {
    if (!('performance' in window)) return [];

    return performance
      .getEntriesByType('resource')
      .filter(
        (entry): entry is PerformanceResourceTiming =>
          entry.name.includes('.js') || entry.name.includes('.css')
      );
  }

  private analyzeChunks(resources: PerformanceResourceTiming[]): ChunkInfo[] {
    return resources.map((resource) => {
      const isAsync = this.isAsyncChunk(resource.name);
      const dependencies = this.extractDependencies(resource.name);

      return {
        name: this.getChunkName(resource.name),
        size: resource.transferSize || resource.encodedBodySize || 0,
        gzippedSize: resource.transferSize || undefined,
        loadTime: resource.responseEnd - resource.startTime,
        isAsync,
        dependencies,
      };
    });
  }

  private isAsyncChunk(resourceName: string): boolean {
    // Detect async chunks by naming patterns
    return (
      /\d+\.[a-f0-9]+\.js$/.test(resourceName) ||
      resourceName.includes('chunk') ||
      resourceName.includes('lazy')
    );
  }

  private getChunkName(resourceName: string): string {
    const parts = resourceName.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.[a-f0-9]+\./, '.').replace(/\?.*$/, '');
  }

  private extractDependencies(resourceName: string): string[] {
    // This would typically be done at build time with webpack-bundle-analyzer
    // For runtime analysis, we make educated guesses based on chunk names
    const dependencies: string[] = [];

    if (resourceName.includes('vendor')) {
      dependencies.push('react', 'react-dom', 'third-party-libraries');
    }

    if (resourceName.includes('copilot')) {
      dependencies.push('@copilotkit/react-core', '@copilotkit/react-ui');
    }

    if (resourceName.includes('chart')) {
      dependencies.push('recharts', 'chart-libraries');
    }

    return dependencies;
  }

  private generateRecommendations(
    chunks: ChunkInfo[],
    totalSize: number
  ): string[] {
    const recommendations: string[] = [];

    // Total bundle size check
    if (totalSize > this.thresholds.totalSize) {
      recommendations.push(
        `Total bundle size (${Math.round(totalSize / 1024)}KB) exceeds recommended limit. Consider code splitting.`
      );
    }

    // Large chunk analysis
    const largeChunks = chunks.filter(
      (chunk) => chunk.size > this.thresholds.chunkSize
    );
    if (largeChunks.length > 0) {
      recommendations.push(
        `${largeChunks.length} chunks are larger than ${Math.round(this.thresholds.chunkSize / 1024)}KB. Consider splitting: ${largeChunks.map((c) => c.name).join(', ')}`
      );
    }

    // Slow loading chunks
    const slowChunks = chunks.filter(
      (chunk) => chunk.loadTime > this.thresholds.loadTime
    );
    if (slowChunks.length > 0) {
      recommendations.push(
        `${slowChunks.length} chunks are loading slowly (>${this.thresholds.loadTime}ms). Consider optimization or CDN.`
      );
    }

    // Async chunk recommendations
    const syncChunks = chunks.filter(
      (chunk) => !chunk.isAsync && chunk.size > 100 * 1024
    );
    if (syncChunks.length > 3) {
      recommendations.push(
        'Consider making some large components async to improve initial load time.'
      );
    }

    // Duplicate dependencies
    const allDependencies = chunks.flatMap((chunk) => chunk.dependencies);
    const duplicates = this.findDuplicates(allDependencies);
    if (duplicates.length > 0) {
      recommendations.push(
        `Potential duplicate dependencies detected: ${duplicates.join(', ')}. Consider vendor chunk optimization.`
      );
    }

    return recommendations;
  }

  private findDuplicates(arr: string[]): string[] {
    const counts = arr.reduce(
      (acc, item) => {
        acc[item] = (acc[item] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return Object.keys(counts).filter((key) => counts[key] > 1);
  }

  private calculateScore(chunks: ChunkInfo[], totalSize: number): number {
    let score = 100;

    // Deduct points for large total size
    if (totalSize > this.thresholds.totalSize) {
      score -= Math.min(
        30,
        (totalSize - this.thresholds.totalSize) /
          (this.thresholds.totalSize * 0.1)
      );
    }

    // Deduct points for large chunks
    const largeChunks = chunks.filter(
      (chunk) => chunk.size > this.thresholds.chunkSize
    );
    score -= largeChunks.length * 10;

    // Deduct points for slow loading
    const slowChunks = chunks.filter(
      (chunk) => chunk.loadTime > this.thresholds.loadTime
    );
    score -= slowChunks.length * 15;

    // Bonus points for good async usage
    const asyncChunks = chunks.filter((chunk) => chunk.isAsync);
    if (asyncChunks.length > chunks.length * 0.3) {
      score += 10;
    }

    return Math.max(0, Math.round(score));
  }

  getAnalysis(): BundleAnalysis | null {
    return this.analysis;
  }

  // Performance monitoring integration
  startMonitoring(): void {
    // Monitor chunk loading performance
    if ('PerformanceObserver' in window) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('.js') || entry.name.includes('.css')) {
            performanceMonitor.recordMetric('chunk_load_time', entry.duration, {
              chunk_name: this.getChunkName(entry.name),
              size: (entry as any).transferSize || 0,
              type: entry.name.includes('.js') ? 'javascript' : 'css',
            });
          }
        }
      });

      try {
        observer.observe({ entryTypes: ['resource'] });
      } catch (e) {
        console.warn('Resource timing observer not supported');
      }
    }

    // Monitor memory usage for bundle impact
    setInterval(() => {
      if ('memory' in performance) {
        const memory = (performance as any).memory;
        performanceMonitor.recordMetric(
          'memory_usage_mb',
          memory.usedJSHeapSize / 1024 / 1024,
          {
            context: 'bundle_monitoring',
          }
        );
      }
    }, 30000); // Every 30 seconds
  }
}

// Global bundle analyzer instance
export const bundleAnalyzer = new BundleAnalyzer();

// React hook for bundle analysis
export function useBundleAnalysis() {
  const [analysis, setAnalysis] = useState<BundleAnalysis | null>(null);
  const [loading, setLoading] = useState(false);

  const analyzeBundle = useCallback(async () => {
    setLoading(true);
    try {
      const result = await bundleAnalyzer.analyzeBundlePerformance();
      setAnalysis(result);
    } catch (error) {
      console.error('Bundle analysis failed:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Analyze bundle on component mount
    analyzeBundle();

    // Start monitoring
    bundleAnalyzer.startMonitoring();
  }, [analyzeBundle]);

  return {
    analysis,
    loading,
    refresh: analyzeBundle,
  };
}

// Webpack bundle analyzer integration (for development)
export function generateBundleReport(): void {
  if (process.env.NODE_ENV === 'development') {
    const analysis = bundleAnalyzer.getAnalysis();
    if (analysis) {
      console.group('📦 Bundle Analysis Report');
      console.log('Total Size:', Math.round(analysis.totalSize / 1024), 'KB');
      console.log('Score:', analysis.score, '/100');
      console.log('Chunks:', analysis.chunks.length);

      if (analysis.recommendations.length > 0) {
        console.group('🔧 Recommendations');
        analysis.recommendations.forEach((rec) => console.log('•', rec));
        console.groupEnd();
      }

      console.table(
        analysis.chunks.map((chunk) => ({
          name: chunk.name,
          size: Math.round(chunk.size / 1024) + 'KB',
          loadTime: Math.round(chunk.loadTime) + 'ms',
          async: chunk.isAsync ? '✓' : '✗',
          dependencies: chunk.dependencies.length,
        }))
      );

      console.groupEnd();
    }
  }
}

// Initialize bundle monitoring in development
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // Delay to allow initial page load
  setTimeout(() => {
    bundleAnalyzer.analyzeBundlePerformance().then(() => {
      generateBundleReport();
    });
  }, 3000);
}

import { useState, useCallback, useEffect } from 'react';
