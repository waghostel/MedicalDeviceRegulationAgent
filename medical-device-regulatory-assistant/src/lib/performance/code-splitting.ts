/**
 * Code Splitting and Lazy Loading Utilities
 *
 * This module provides utilities for implementing code splitting
 * and lazy loading to improve frontend performance.
 */

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';
import { performanceMonitor } from './optimization';

import React, { Suspense, ComponentType, LazyExoticComponent } from 'react';

// Loading component for Suspense fallbacks
export const LoadingSpinner = ({
  message = 'Loading...',
}: {
  message?: string;
}) => {
  return React.createElement(
    'div',
    { className: 'flex items-center justify-center p-8' },
    React.createElement('div', {
      className: 'animate-spin rounded-full h-8 w-8 border-b-2 border-primary',
    }),
    React.createElement(
      'span',
      { className: 'ml-3 text-sm text-muted-foreground' },
      message
    )
  );
};

// Enhanced lazy loading with performance monitoring
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  componentName: string
): LazyExoticComponent<T> {
  return React.lazy(async () => {
    const startTime = performance.now();

    try {
      const module = await importFn();
      const loadTime = performance.now() - startTime;

      performanceMonitor.recordMetric('component_lazy_load', loadTime, {
        component: componentName,
        status: 'success',
      });

      return module;
    } catch (error) {
      const loadTime = performance.now() - startTime;

      performanceMonitor.recordMetric('component_lazy_load', loadTime, {
        component: componentName,
        status: 'error',
      });

      throw error;
    }
  });
}

// Lazy loaded components for the Medical Device Regulatory Assistant

// Project Management Components
export const LazyProjectHub = createLazyComponent(
  () => import('../../components/projects/ProjectHub'),
  'ProjectHub'
);

export const LazyProjectCard = createLazyComponent(
  () => import('../../components/projects/ProjectCard'),
  'ProjectCard'
);

export const LazyNewProjectDialog = createLazyComponent(
  () => import('../../components/projects/NewProjectDialog'),
  'NewProjectDialog'
);

// Dashboard Components
export const LazyRegulatoryDashboard = createLazyComponent(
  () => import('../../components/dashboard/RegulatoryDashboard'),
  'RegulatoryDashboard'
);

export const LazyClassificationWidget = createLazyComponent(
  () => import('../../components/dashboard/ClassificationWidget'),
  'ClassificationWidget'
);

export const LazyPredicateWidget = createLazyComponent(
  () => import('../../components/dashboard/PredicateWidget'),
  'PredicateWidget'
);

export const LazyProgressWidget = createLazyComponent(
  () => import('../../components/dashboard/ProgressWidget'),
  'ProgressWidget'
);

// Agent Workflow Components
export const LazyAgentWorkflowPage = createLazyComponent(
  () => import('../../components/agent/AgentWorkflowPage'),
  'AgentWorkflowPage'
);

export const LazySlashCommandCard = createLazyComponent(
  () => import('../../components/agent/SlashCommandCard'),
  'SlashCommandCard'
);

// Markdown Editor Components
export const LazyMarkdownEditor = createLazyComponent(
  () => import('../../components/editor/MarkdownEditor'),
  'MarkdownEditor'
);

export const LazyDocumentManager = createLazyComponent(
  () => import('../../components/editor/DocumentManager'),
  'DocumentManager'
);

// Citation Components
export const LazyCitationPanel = createLazyComponent(
  () => import('../../components/citations/CitationPanel'),
  'CitationPanel'
);

export const LazySourceCitation = createLazyComponent(
  () => import('../../components/citations/SourceCitation'),
  'SourceCitation'
);

// Audit Components
export const LazyAuditLogPage = createLazyComponent(
  () => import('../../components/audit/AuditLogPage'),
  'AuditLogPage'
);

export const LazyComplianceDashboard = createLazyComponent(
  () => import('../../components/audit/ComplianceDashboard'),
  'ComplianceDashboard'
);

// Quick Actions Components
export const LazyQuickActionsToolbar = createLazyComponent(
  () => import('../../components/actions/QuickActionsToolbar'),
  'QuickActionsToolbar'
);

export const LazyFileExplorer = createLazyComponent(
  () => import('../../components/files/FileExplorer'),
  'FileExplorer'
);

// Higher-order component for lazy loading with error boundaries
interface LazyWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
  componentName?: string;
}

const DefaultErrorFallback = ({
  error,
  retry,
}: {
  error: Error;
  retry: () => void;
}) => {
  return React.createElement(
    'div',
    {
      className:
        'flex flex-col items-center justify-center p-8 border border-destructive/20 rounded-lg',
    },
    React.createElement(
      'div',
      { className: 'text-destructive mb-4' },
      React.createElement(
        'svg',
        {
          className: 'w-12 h-12',
          fill: 'none',
          stroke: 'currentColor',
          viewBox: '0 0 24 24',
        },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 18.5c-.77.833.192 2.5 1.732 2.5z',
        })
      )
    ),
    React.createElement(
      'h3',
      { className: 'text-lg font-semibold mb-2' },
      'Failed to load component'
    ),
    React.createElement(
      'p',
      { className: 'text-sm text-muted-foreground mb-4 text-center' },
      error.message || 'An error occurred while loading this component.'
    ),
    React.createElement(
      'button',
      {
        onClick: retry,
        className:
          'px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors',
      },
      'Try Again'
    )
  );
};

export const LazyWrapper: React.FC<LazyWrapperProps> = ({
  children,
  fallback: Fallback = LoadingSpinner,
  errorFallback: ErrorFallback = DefaultErrorFallback,
  componentName = 'Unknown',
}) => {
  const [error, setError] = React.useState<Error | null>(null);
  const [retryKey, setRetryKey] = React.useState(0);

  const retry = React.useCallback(() => {
    setError(null);
    setRetryKey((prev) => prev + 1);
  }, []);

  if (error) {
    return React.createElement(ErrorFallback, { error, retry });
  }

  return React.createElement(
    Suspense,
    { fallback: React.createElement(Fallback) },
    React.createElement(
      React.ErrorBoundary as any,
      {
        key: retryKey,
        onError: (error: Error) => {
          setError(error);
          performanceMonitor.recordMetric('component_error', 1, {
            component: componentName,
            error: error.message,
          });
        },
      },
      children
    )
  );
};

// Route-based code splitting utilities
export interface RouteConfig {
  path: string;
  component: LazyExoticComponent<any>;
  preload?: boolean;
  title?: string;
}

// Preload components for better UX
export function preloadComponent(importFn: () => Promise<any>): void {
  // Only preload if the user is on a fast connection
  const connection = (navigator as any).connection;
  if (
    connection &&
    (connection.effectiveType === '4g' || connection.effectiveType === '3g')
  ) {
    // Preload after a short delay to not interfere with initial page load
    setTimeout(() => {
      importFn().catch(() => {
        // Ignore preload errors
      });
    }, 2000);
  }
}

// Route configurations with lazy loading
export const routeConfigs: RouteConfig[] = [
  {
    path: '/projects',
    component: LazyProjectHub,
    preload: true,
    title: 'Projects',
  },
  {
    path: '/projects/:id/dashboard',
    component: LazyRegulatoryDashboard,
    preload: true,
    title: 'Regulatory Dashboard',
  },
  {
    path: '/projects/:id/agent',
    component: LazyAgentWorkflowPage,
    preload: false,
    title: 'Agent Workflow',
  },
  {
    path: '/projects/:id/editor',
    component: LazyMarkdownEditor,
    preload: false,
    title: 'Document Editor',
  },
  {
    path: '/projects/:id/audit',
    component: LazyAuditLogPage,
    preload: false,
    title: 'Audit Trail',
  },
  {
    path: '/compliance',
    component: LazyComplianceDashboard,
    preload: false,
    title: 'Compliance Dashboard',
  },
];

// Preload critical routes
export function preloadCriticalRoutes(): void {
  routeConfigs
    .filter((config) => config.preload)
    .forEach((config) => {
      preloadComponent(
        () =>
          config.component._payload._result || config.component._payload._value
      );
    });
}

// Bundle splitting recommendations
export const bundleSplitRecommendations = {
  // Vendor libraries that change infrequently
  vendor: [
    'react',
    'react-dom',
    'react-router-dom',
    '@radix-ui/react-dialog',
    '@radix-ui/react-dropdown-menu',
    'lucide-react',
    'class-variance-authority',
    'clsx',
    'tailwind-merge',
  ],

  // CopilotKit and AI-related libraries
  ai: ['@copilotkit/react-core', '@copilotkit/react-ui', 'openai', 'langchain'],

  // Chart and visualization libraries
  charts: ['recharts', 'd3', 'chart.js'],

  // PDF and document processing
  documents: ['react-pdf', 'pdf-lib', 'mammoth'],

  // Development and debugging tools
  dev: ['@storybook/react', 'react-devtools'],
};

// Dynamic import with retry logic
export async function dynamicImportWithRetry<T>(
  importFn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < retries; i++) {
    try {
      return await importFn();
    } catch (error) {
      if (i === retries - 1) {
        throw error;
      }

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw new Error('All retry attempts failed');
}

// Component registry for dynamic loading
const componentRegistry = new Map<string, () => Promise<any>>();

export function registerComponent(
  name: string,
  importFn: () => Promise<any>
): void {
  componentRegistry.set(name, importFn);
}

export async function loadComponent(name: string): Promise<any> {
  const importFn = componentRegistry.get(name);
  if (!importFn) {
    throw new Error(`Component '${name}' not found in registry`);
  }

  return dynamicImportWithRetry(importFn);
}

// Initialize component registry
export function initializeComponentRegistry(): void {
  // Register all lazy components
  registerComponent(
    'ProjectHub',
    () => import('../../components/projects/ProjectHub')
  );
  registerComponent(
    'RegulatoryDashboard',
    () => import('../../components/dashboard/RegulatoryDashboard')
  );
  registerComponent(
    'AgentWorkflowPage',
    () => import('../../components/agent/AgentWorkflowPage')
  );
  registerComponent(
    'MarkdownEditor',
    () => import('../../components/editor/MarkdownEditor')
  );
  registerComponent(
    'AuditLogPage',
    () => import('../../components/audit/AuditLogPage')
  );
  registerComponent(
    'ComplianceDashboard',
    () => import('../../components/audit/ComplianceDashboard')
  );

  // Preload critical components
  preloadCriticalRoutes();
}

// Performance monitoring for code splitting
export function trackCodeSplittingMetrics(): void {
  // Monitor chunk loading performance
  if ('PerformanceObserver' in window) {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name.includes('chunk') || entry.name.includes('.js')) {
          performanceMonitor.recordMetric('chunk_load_time', entry.duration, {
            chunk_name: entry.name,
            size: (entry as any).transferSize || 0,
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
}

// Bundle size optimization utilities
export function optimizeBundleSize() {
  // Analyze current bundle and provide recommendations
  const analysis = analyzeBundleSize();
  if (!analysis) return null;

  const recommendations: string[] = [];

  if (analysis.totalJSSize > 1000) {
    // 1MB
    recommendations.push(
      'Consider code splitting for large JavaScript bundles'
    );
  }

  if (analysis.jsResourceCount > 10) {
    recommendations.push(
      'Too many JavaScript files - consider bundling optimization'
    );
  }

  if (analysis.totalCSSSize > 200) {
    // 200KB
    recommendations.push(
      'CSS bundle is large - consider purging unused styles'
    );
  }

  return {
    ...analysis,
    recommendations,
  };
}

// Tree shaking utilities
export function analyzeUnusedCode() {
  // This would typically be done at build time, but we can provide runtime insights
  const unusedFeatures: string[] = [];

  // Check for unused features based on user interactions
  if (!localStorage.getItem('used_export_feature')) {
    unusedFeatures.push('Project export functionality appears unused');
  }

  if (!localStorage.getItem('used_advanced_search')) {
    unusedFeatures.push('Advanced search features appear unused');
  }

  return unusedFeatures;
}

// Initialize code splitting monitoring
if (typeof window !== 'undefined') {
  trackCodeSplittingMetrics();

  // Track feature usage for tree shaking insights
  window.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('[data-feature="export"]')) {
      localStorage.setItem('used_export_feature', 'true');
    }
    if (target.closest('[data-feature="advanced-search"]')) {
      localStorage.setItem('used_advanced_search', 'true');
    }
  });
}
