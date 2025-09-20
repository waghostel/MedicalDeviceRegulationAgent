/**
 * CI Monitoring Configuration
 * Requirements: 8.1, 8.2, 8.3
 */

module.exports = {
  // Performance thresholds
  performance: {
    // Test execution time thresholds (in milliseconds)
    testExecution: {
      warning: 25000, // 25 seconds
      critical: 30000, // 30 seconds
    },

    // Build time thresholds
    buildTime: {
      warning: 120000, // 2 minutes
      critical: 180000, // 3 minutes
    },

    // Bundle size thresholds (in bytes)
    bundleSize: {
      warning: 1024 * 1024, // 1MB
      critical: 2 * 1024 * 1024, // 2MB
    },

    // Lighthouse performance score thresholds
    lighthouse: {
      performance: {
        warning: 80,
        critical: 70,
      },
      accessibility: {
        warning: 90,
        critical: 80,
      },
      bestPractices: {
        warning: 90,
        critical: 80,
      },
      seo: {
        warning: 90,
        critical: 80,
      },
    },

    // Core Web Vitals thresholds
    webVitals: {
      lcp: {
        good: 2500, // 2.5s
        warning: 4000, // 4s
      },
      fid: {
        good: 100, // 100ms
        warning: 300, // 300ms
      },
      cls: {
        good: 0.1,
        warning: 0.25,
      },
    },
  },

  // Test health thresholds
  testHealth: {
    passRate: {
      warning: 95,
      critical: 90,
    },
    coverage: {
      warning: 85,
      critical: 80,
    },
    flakiness: {
      warning: 2, // 2% flaky tests
      critical: 5, // 5% flaky tests
    },
    react19Compatibility: {
      warning: 90,
      critical: 80,
    },
  },

  // Memory usage thresholds
  memory: {
    heapUsage: {
      warning: 512 * 1024 * 1024, // 512MB
      critical: 1024 * 1024 * 1024, // 1GB
    },
    memoryLeaks: {
      warning: 50 * 1024 * 1024, // 50MB increase
      critical: 100 * 1024 * 1024, // 100MB increase
    },
  },

  // CI/CD specific settings
  ci: {
    // Fail CI on critical issues
    failOnCritical: true,

    // Fail CI on high issues for main branch only
    failOnHighForMain: true,

    // Generate GitHub step summary
    generateStepSummary: true,

    // Upload artifacts
    uploadArtifacts: true,

    // Notification settings
    notifications: {
      slack: {
        enabled: !!process.env.SLACK_WEBHOOK_URL,
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#dev-alerts',
        onlyOnFailure: true,
      },
      email: {
        enabled: false,
        recipients: [],
      },
    },
  },

  // Dashboard configuration
  dashboard: {
    // Refresh interval in milliseconds
    refreshInterval: 30000, // 30 seconds

    // Number of historical reports to keep
    historyLimit: 100,

    // Output directory for dashboard files
    outputDir: 'test-reports/dashboard',

    // Enable real-time monitoring
    realTimeMonitoring: process.env.CI !== 'true',

    // Chart configuration
    charts: {
      healthScore: {
        enabled: true,
        timeRange: '24h',
      },
      performance: {
        enabled: true,
        timeRange: '24h',
      },
      coverage: {
        enabled: true,
        timeRange: '7d',
      },
    },
  },

  // Reporting configuration
  reporting: {
    // Output formats
    formats: ['json', 'html', 'markdown'],

    // Include detailed metrics
    includeDetailedMetrics: true,

    // Include trend analysis
    includeTrends: true,

    // Include recommendations
    includeRecommendations: true,

    // Archive old reports
    archiveReports: true,
    archiveAfterDays: 30,
  },

  // React 19 specific monitoring
  react19: {
    // Track AggregateError occurrences
    trackAggregateErrors: true,

    // Track hook-related errors
    trackHookErrors: true,

    // Track rendering errors
    trackRenderErrors: true,

    // Compatibility score calculation weights
    compatibilityWeights: {
      aggregateErrors: 0.4,
      hookErrors: 0.3,
      renderErrors: 0.3,
    },

    // Error categorization
    errorCategories: {
      critical: ['AggregateError', 'TypeError in hooks'],
      high: ['RenderError', 'Hook dependency issues'],
      medium: ['Warning messages', 'Deprecated API usage'],
      low: ['Performance warnings'],
    },
  },

  // Integration settings
  integrations: {
    // GitHub Actions
    githubActions: {
      enabled: process.env.GITHUB_ACTIONS === 'true',
      setOutputs: true,
      generateStepSummary: true,
      uploadArtifacts: true,
    },

    // Codecov
    codecov: {
      enabled: !!process.env.CODECOV_TOKEN,
      token: process.env.CODECOV_TOKEN,
    },

    // Lighthouse CI
    lighthouseCI: {
      enabled: true,
      uploadTarget: 'temporary-public-storage',
      budgets: {
        performance: 80,
        accessibility: 90,
        'best-practices': 90,
        seo: 90,
      },
    },
  },

  // Environment-specific overrides
  environments: {
    development: {
      performance: {
        testExecution: {
          warning: 60000, // More lenient in dev
          critical: 120000,
        },
      },
      ci: {
        failOnCritical: false,
        failOnHighForMain: false,
      },
    },

    staging: {
      // Use default settings
    },

    production: {
      performance: {
        testExecution: {
          warning: 20000, // Stricter in prod
          critical: 25000,
        },
      },
      ci: {
        failOnCritical: true,
        failOnHighForMain: true,
      },
    },
  },

  // Experimental features
  experimental: {
    // AI-powered test analysis
    aiAnalysis: false,

    // Predictive performance monitoring
    predictiveMonitoring: false,

    // Advanced trend analysis
    advancedTrends: false,
  },
};

// Export environment-specific configuration
const environment = process.env.NODE_ENV || 'development';
const config = module.exports;

// Apply environment-specific overrides
if (config.environments[environment]) {
  const envConfig = config.environments[environment];

  // Deep merge environment config
  function deepMerge(target, source) {
    for (const key in source) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key])
      ) {
        target[key] = target[key] || {};
        deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
    return target;
  }

  deepMerge(config, envConfig);
}

module.exports = config;
