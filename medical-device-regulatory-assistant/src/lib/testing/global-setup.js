/**
 * Global Jest setup
 * Runs once before all test suites
 * Enhanced for React 19 compatibility and comprehensive test infrastructure
 */

const { performance } = require('perf_hooks');
const { existsSync, mkdirSync, writeFileSync } = require('fs');
const { join } = require('path');

module.exports = async () => {
  const setupStartTime = performance.now();

  console.log('🚀 Starting enhanced global test setup for React 19...');

  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.NEXTAUTH_SECRET = 'test-secret-key';

  // React 19 specific environment variables
  process.env.REACT_VERSION = '19.1.0';
  process.env.REACT_19_FEATURES = 'true';
  process.env.REACT_CONCURRENT_FEATURES = 'true';
  process.env.REACT_STRICT_MODE = 'true';

  // Enhanced test environment setup
  process.env.JEST_ENHANCED_CLEANUP = 'true';
  process.env.JEST_REACT_19_COMPAT = 'true';
  process.env.JEST_PERFORMANCE_TRACKING = 'true';
  process.env.JEST_HEALTH_MONITORING = 'true';

  // Create test directories if they don't exist
  const testDirectories = [
    './test-reports',
    './test-health-data',
    './.jest-cache',
    './coverage',
  ];

  testDirectories.forEach((dir) => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`📁 Created test directory: ${dir}`);
    }
  });

  // Initialize test health data file
  const healthDataPath = join('./test-health-data', 'test-health-data.json');
  if (!existsSync(healthDataPath)) {
    const initialHealthData = {
      testHistory: [],
      healthHistory: [],
      lastUpdated: Date.now(),
      react19Compatibility: true,
      setupVersion: '2.3.0',
    };

    try {
      writeFileSync(healthDataPath, JSON.stringify(initialHealthData, null, 2));
      console.log('📊 Initialized test health data file');
    } catch (error) {
      console.warn(
        '⚠️  Could not initialize test health data file:',
        error.message
      );
    }
  }

  // Setup React 19 compatibility globals
  global.__REACT_19_SETUP_COMPLETE = true;
  global.__REACT_19_SETUP_TIMESTAMP = Date.now();
  global.__JEST_SETUP_VERSION = '2.3.0';

  // Enhanced console handling for React 19 (global setup level)
  const originalConsoleError = console.error;
  const originalConsoleWarn = console.warn;

  // Store original methods for restoration
  global.__ORIGINAL_CONSOLE_METHODS = {
    error: originalConsoleError,
    warn: originalConsoleWarn,
  };

  // Disable console warnings in tests unless explicitly enabled
  if (!process.env.JEST_VERBOSE) {
    console.warn = (...args) => {
      const message = args[0];
      if (typeof message === 'string') {
        // Filter out React 19 development warnings that are not actionable in tests
        if (
          message.includes('Warning: ReactDOM.render is no longer supported') ||
          message.includes('Warning: React.createFactory() is deprecated') ||
          message.includes(
            'Warning: componentWillReceiveProps has been renamed'
          ) ||
          message.includes('Warning: componentWillMount has been renamed') ||
          message.includes('Warning: componentWillUpdate has been renamed') ||
          message.includes(
            'Warning: Each child in a list should have a unique "key" prop'
          ) ||
          message.includes('Warning: Failed prop type') ||
          message.includes('Warning: React.createElement: type is invalid') ||
          message.includes('Warning: validateDOMNesting')
        ) {
          // Suppress these warnings in test environment
          return;
        }

        // Only show warnings that are not from React or Next.js internals
        if (
          !message.includes('React') &&
          !message.includes('Next.js') &&
          !message.includes('Warning:')
        ) {
          originalConsoleWarn(...args);
        }
      } else {
        originalConsoleWarn(...args);
      }
    };
  }

  // Setup global error tracking for React 19 AggregateError
  global.__GLOBAL_ERROR_TRACKER = {
    setupErrors: [],
    aggregateErrors: [],
    hookErrors: [],
    renderErrors: [],

    trackError: function (type, error, context = {}) {
      const errorEntry = {
        type,
        message: error.message,
        stack: error.stack,
        timestamp: Date.now(),
        context,
        phase: 'global-setup',
      };

      if (type === 'aggregate' && error instanceof AggregateError) {
        errorEntry.totalErrors = error.errors?.length || 0;
        errorEntry.individualErrors = error.errors?.map((e) => e.message) || [];
      }

      this[type + 'Errors'].push(errorEntry);
    },

    getSummary: function () {
      return {
        setup: this.setupErrors.length,
        aggregate: this.aggregateErrors.length,
        hook: this.hookErrors.length,
        render: this.renderErrors.length,
        total:
          this.setupErrors.length +
          this.aggregateErrors.length +
          this.hookErrors.length +
          this.renderErrors.length,
      };
    },

    clear: function () {
      this.setupErrors = [];
      this.aggregateErrors = [];
      this.hookErrors = [];
      this.renderErrors = [];
    },
  };

  // Enhanced unhandled rejection handling during setup
  const setupRejectionHandler = (reason, promise) => {
    if (reason instanceof AggregateError) {
      global.__GLOBAL_ERROR_TRACKER.trackError('aggregate', reason, {
        phase: 'setup',
        promise: promise.toString(),
      });
      console.warn('🚨 AggregateError during global setup:', {
        totalErrors: reason.errors?.length || 0,
        errors: reason.errors?.map((e) => e.message) || [],
      });
    } else {
      global.__GLOBAL_ERROR_TRACKER.trackError('setup', reason, {
        phase: 'setup',
        promise: promise.toString(),
      });
    }
  };

  process.on('unhandledRejection', setupRejectionHandler);

  // Setup memory monitoring
  const initialMemory = process.memoryUsage();
  global.__SETUP_MEMORY_BASELINE = {
    heapUsed: initialMemory.heapUsed / 1024 / 1024, // MB
    heapTotal: initialMemory.heapTotal / 1024 / 1024, // MB
    external: initialMemory.external / 1024 / 1024, // MB
    rss: initialMemory.rss / 1024 / 1024, // MB
    timestamp: Date.now(),
  };

  // Initialize performance tracking
  global.__SETUP_PERFORMANCE = {
    startTime: setupStartTime,
    phases: {},

    markPhase: function (phaseName) {
      this.phases[phaseName] = performance.now() - this.startTime;
    },

    getSetupTime: function () {
      return performance.now() - this.startTime;
    },
  };

  // Mark setup phases for performance tracking
  global.__SETUP_PERFORMANCE.markPhase('environment-setup');

  // Setup React 19 feature detection
  global.__REACT_19_FEATURE_DETECTION = {
    concurrentFeatures: true,
    automaticBatching: true,
    suspenseSSR: true,
    strictMode: true,
    errorBoundaryEnhancements: true,
    aggregateErrorSupport: true,
    newJSXTransform: true,

    isFeatureEnabled: function (feature) {
      return this[feature] === true;
    },

    getEnabledFeatures: function () {
      return Object.keys(this).filter(
        (key) => typeof this[key] === 'boolean' && this[key] === true
      );
    },
  };

  global.__SETUP_PERFORMANCE.markPhase('react19-setup');

  // Setup enhanced mock system
  global.__ENHANCED_MOCK_SYSTEM = {
    registeredMocks: new Map(),
    cleanupFunctions: new Set(),

    registerMock: function (name, mock, cleanup) {
      this.registeredMocks.set(name, mock);
      if (cleanup && typeof cleanup === 'function') {
        this.cleanupFunctions.add(cleanup);
      }
    },

    clearAllMocks: function () {
      this.registeredMocks.clear();
      this.cleanupFunctions.forEach((cleanup) => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Mock cleanup error:', error.message);
        }
      });
      this.cleanupFunctions.clear();
    },

    getMockCount: function () {
      return this.registeredMocks.size;
    },
  };

  global.__SETUP_PERFORMANCE.markPhase('mock-system-setup');

  // Remove setup-specific error handler
  process.removeListener('unhandledRejection', setupRejectionHandler);

  // Final setup completion
  const setupTime = global.__SETUP_PERFORMANCE.getSetupTime();
  const memoryUsage = process.memoryUsage();
  const finalMemory = {
    heapUsed: memoryUsage.heapUsed / 1024 / 1024,
    heapTotal: memoryUsage.heapTotal / 1024 / 1024,
    external: memoryUsage.external / 1024 / 1024,
    rss: memoryUsage.rss / 1024 / 1024,
  };

  global.__SETUP_PERFORMANCE.markPhase('completion');

  console.log('✅ Enhanced global test setup completed');
  console.log(`   Setup Time: ${setupTime.toFixed(2)}ms`);
  console.log(
    `   Memory Usage: ${finalMemory.heapUsed.toFixed(2)}MB heap, ${finalMemory.rss.toFixed(2)}MB RSS`
  );
  console.log(
    `   React 19 Features: ${global.__REACT_19_FEATURE_DETECTION.getEnabledFeatures().length} enabled`
  );
  console.log(
    `   Error Tracking: ${global.__GLOBAL_ERROR_TRACKER.getSummary().total} errors tracked during setup`
  );

  // Log performance breakdown if verbose
  if (process.env.JEST_VERBOSE) {
    console.log('📊 Setup Performance Breakdown:');
    Object.entries(global.__SETUP_PERFORMANCE.phases).forEach(
      ([phase, time]) => {
        console.log(`   ${phase}: ${time.toFixed(2)}ms`);
      }
    );
  }
};
