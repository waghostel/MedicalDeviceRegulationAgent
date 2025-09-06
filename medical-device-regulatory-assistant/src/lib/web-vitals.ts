import { getCLS, getFCP, getFID, getLCP, getTTFB, Metric } from 'web-vitals';

export interface WebVitalsMetrics {
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  fid: number | null;
  ttfb: number | null;
}

export interface WebVitalsThresholds {
  fcp: { good: number; needsImprovement: number };
  lcp: { good: number; needsImprovement: number };
  cls: { good: number; needsImprovement: number };
  fid: { good: number; needsImprovement: number };
  ttfb: { good: number; needsImprovement: number };
}

// Google's Core Web Vitals thresholds
export const WEB_VITALS_THRESHOLDS: WebVitalsThresholds = {
  fcp: { good: 1800, needsImprovement: 3000 },
  lcp: { good: 2500, needsImprovement: 4000 },
  cls: { good: 0.1, needsImprovement: 0.25 },
  fid: { good: 100, needsImprovement: 300 },
  ttfb: { good: 800, needsImprovement: 1800 },
};

export type WebVitalScore = 'good' | 'needs-improvement' | 'poor';

export function getWebVitalScore(
  metricName: keyof WebVitalsThresholds,
  value: number
): WebVitalScore {
  const thresholds = WEB_VITALS_THRESHOLDS[metricName];
  
  if (value <= thresholds.good) {
    return 'good';
  } else if (value <= thresholds.needsImprovement) {
    return 'needs-improvement';
  } else {
    return 'poor';
  }
}

export class WebVitalsCollector {
  private metrics: WebVitalsMetrics = {
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  };

  private callbacks: Array<(metrics: WebVitalsMetrics) => void> = [];

  constructor() {
    this.initializeCollection();
  }

  private initializeCollection(): void {
    getCLS(this.handleMetric('cls'));
    getFCP(this.handleMetric('fcp'));
    getFID(this.handleMetric('fid'));
    getLCP(this.handleMetric('lcp'));
    getTTFB(this.handleMetric('ttfb'));
  }

  private handleMetric(name: keyof WebVitalsMetrics) {
    return (metric: Metric) => {
      this.metrics[name] = metric.value;
      this.notifyCallbacks();
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`Web Vital - ${name.toUpperCase()}:`, {
          value: metric.value,
          score: getWebVitalScore(name, metric.value),
          id: metric.id,
          delta: metric.delta,
        });
      }
      
      // Send to analytics in production
      if (process.env.NODE_ENV === 'production') {
        this.sendToAnalytics(name, metric);
      }
    };
  }

  private notifyCallbacks(): void {
    this.callbacks.forEach(callback => callback({ ...this.metrics }));
  }

  private sendToAnalytics(name: string, metric: Metric): void {
    // Send to your analytics service
    // This could be Google Analytics, custom endpoint, etc.
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', name, {
        event_category: 'Web Vitals',
        event_label: metric.id,
        value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
        non_interaction: true,
      });
    }
  }

  public onMetricsUpdate(callback: (metrics: WebVitalsMetrics) => void): void {
    this.callbacks.push(callback);
  }

  public getMetrics(): WebVitalsMetrics {
    return { ...this.metrics };
  }

  public getScores(): Record<keyof WebVitalsMetrics, WebVitalScore | null> {
    return {
      fcp: this.metrics.fcp ? getWebVitalScore('fcp', this.metrics.fcp) : null,
      lcp: this.metrics.lcp ? getWebVitalScore('lcp', this.metrics.lcp) : null,
      cls: this.metrics.cls ? getWebVitalScore('cls', this.metrics.cls) : null,
      fid: this.metrics.fid ? getWebVitalScore('fid', this.metrics.fid) : null,
      ttfb: this.metrics.ttfb ? getWebVitalScore('ttfb', this.metrics.ttfb) : null,
    };
  }

  public generateReport(): {
    metrics: WebVitalsMetrics;
    scores: Record<keyof WebVitalsMetrics, WebVitalScore | null>;
    overallScore: WebVitalScore;
    recommendations: string[];
  } {
    const metrics = this.getMetrics();
    const scores = this.getScores();
    const recommendations: string[] = [];

    // Generate recommendations based on scores
    if (scores.lcp === 'poor' || scores.lcp === 'needs-improvement') {
      recommendations.push('Optimize Largest Contentful Paint by reducing server response times and optimizing images');
    }
    
    if (scores.fcp === 'poor' || scores.fcp === 'needs-improvement') {
      recommendations.push('Improve First Contentful Paint by eliminating render-blocking resources');
    }
    
    if (scores.cls === 'poor' || scores.cls === 'needs-improvement') {
      recommendations.push('Reduce Cumulative Layout Shift by setting dimensions for images and ads');
    }
    
    if (scores.fid === 'poor' || scores.fid === 'needs-improvement') {
      recommendations.push('Improve First Input Delay by reducing JavaScript execution time');
    }
    
    if (scores.ttfb === 'poor' || scores.ttfb === 'needs-improvement') {
      recommendations.push('Optimize Time to First Byte by improving server performance');
    }

    // Calculate overall score
    const scoreValues = Object.values(scores).filter(score => score !== null);
    const goodScores = scoreValues.filter(score => score === 'good').length;
    const totalScores = scoreValues.length;
    
    let overallScore: WebVitalScore;
    if (goodScores / totalScores >= 0.8) {
      overallScore = 'good';
    } else if (goodScores / totalScores >= 0.5) {
      overallScore = 'needs-improvement';
    } else {
      overallScore = 'poor';
    }

    return {
      metrics,
      scores,
      overallScore,
      recommendations,
    };
  }
}

// Global Web Vitals collector instance
let webVitalsCollector: WebVitalsCollector | null = null;

export function getWebVitalsCollector(): WebVitalsCollector {
  if (!webVitalsCollector && typeof window !== 'undefined') {
    webVitalsCollector = new WebVitalsCollector();
  }
  return webVitalsCollector!;
}

// Hook for React components
export function useWebVitals(): {
  metrics: WebVitalsMetrics;
  scores: Record<keyof WebVitalsMetrics, WebVitalScore | null>;
  isLoading: boolean;
} {
  const [metrics, setMetrics] = useState<WebVitalsMetrics>({
    fcp: null,
    lcp: null,
    cls: null,
    fid: null,
    ttfb: null,
  });
  
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const collector = getWebVitalsCollector();
    
    collector.onMetricsUpdate((newMetrics) => {
      setMetrics(newMetrics);
      setIsLoading(false);
    });

    // Set initial metrics if already available
    const initialMetrics = collector.getMetrics();
    setMetrics(initialMetrics);
    
    // Check if any metrics are already collected
    const hasMetrics = Object.values(initialMetrics).some(value => value !== null);
    if (hasMetrics) {
      setIsLoading(false);
    }
  }, []);

  const scores = useMemo(() => {
    return {
      fcp: metrics.fcp ? getWebVitalScore('fcp', metrics.fcp) : null,
      lcp: metrics.lcp ? getWebVitalScore('lcp', metrics.lcp) : null,
      cls: metrics.cls ? getWebVitalScore('cls', metrics.cls) : null,
      fid: metrics.fid ? getWebVitalScore('fid', metrics.fid) : null,
      ttfb: metrics.ttfb ? getWebVitalScore('ttfb', metrics.ttfb) : null,
    };
  }, [metrics]);

  return { metrics, scores, isLoading };
}

// Add missing imports
import { useState, useEffect, useMemo } from 'react';

// Extend Window interface for gtag
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}