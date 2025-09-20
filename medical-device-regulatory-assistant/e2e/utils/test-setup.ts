import { test as base, expect, Page, BrowserContext } from '@playwright/test';

import {
  ProjectTestHelper,
  WebSocketTestHelper,
  PerformanceTestHelper,
  UITestHelper,
  AuthTestHelper,
  CleanupTestHelper,
} from './test-helpers';

/**
 * Test Setup and Configuration for End-to-End Tests
 *
 * Provides extended test fixtures with helper classes,
 * common setup/teardown, and test utilities.
 */

export interface TestFixtures {
  projectHelper: ProjectTestHelper;
  wsHelper: WebSocketTestHelper;
  performanceHelper: PerformanceTestHelper;
  uiHelper: UITestHelper;
  authHelper: AuthTestHelper;
  cleanupHelper: CleanupTestHelper;
}

export interface WorkerFixtures {
  // Worker-scoped fixtures can be added here
}

// Extend the base test with custom fixtures
export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Project management helper
  projectHelper: async ({ page }, use) => {
    const helper = new ProjectTestHelper(page);
    await use(helper);
  },

  // WebSocket testing helper
  wsHelper: async ({ page }, use) => {
    const helper = new WebSocketTestHelper(page);
    await use(helper);
  },

  // Performance testing helper
  performanceHelper: async ({ page }, use) => {
    const helper = new PerformanceTestHelper(page);
    await use(helper);
  },

  // UI testing helper
  uiHelper: async ({ page }, use) => {
    const helper = new UITestHelper(page);
    await use(helper);
  },

  // Authentication helper
  authHelper: async ({ page }, use) => {
    const helper = new AuthTestHelper(page);
    await use(helper);
  },

  // Cleanup helper
  cleanupHelper: async ({ page }, use) => {
    const helper = new CleanupTestHelper(page);
    await use(helper);

    // Automatic cleanup after each test
    await helper.cleanupAll();
  },
});

/**
 * Common test setup functions
 */
export class TestSetup {
  /**
   * Set up a clean test environment
   */
  static async setupCleanEnvironment(page: Page): Promise<void> {
    // Clear browser storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();

      // Clear any cached data
      if ('caches' in window) {
        caches.keys().then((names) => {
          names.forEach((name) => {
            caches.delete(name);
          });
        });
      }
    });

    // Set up console logging
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        console.error('Browser console error:', msg.text());
      } else if (msg.type() === 'warning') {
        console.warn('Browser console warning:', msg.text());
      }
    });

    // Set up error handling
    page.on('pageerror', (error) => {
      console.error('Page error:', error.message);
    });

    // Set up request/response logging for debugging
    if (process.env.DEBUG_NETWORK) {
      page.on('request', (request) => {
        console.log('Request:', request.method(), request.url());
      });

      page.on('response', (response) => {
        if (response.status() >= 400) {
          console.error('Response error:', response.status(), response.url());
        }
      });
    }
  }

  /**
   * Set up mock authentication for testing
   */
  static async setupMockAuth(page: Page, customUser?: any): Promise<void> {
    const defaultUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      token: 'mock-jwt-token',
    };

    const user = { ...defaultUser, ...customUser };

    await page.evaluate((userData) => {
      localStorage.setItem('auth-token', userData.token);
      localStorage.setItem(
        'user-data',
        JSON.stringify({
          id: userData.id,
          email: userData.email,
          name: userData.name,
        })
      );
    }, user);
  }

  /**
   * Set up performance monitoring
   */
  static async setupPerformanceMonitoring(page: Page): Promise<void> {
    await page.addInitScript(() => {
      // Performance monitoring setup
      (window as any).testPerformance = {
        startTime: performance.now(),
        marks: {},
        measures: {},
        networkRequests: [],
        memoryUsage: [],
      };

      // Mark performance milestones
      (window as any).markPerformance = (name: string) => {
        const time = performance.now();
        (window as any).testPerformance.marks[name] = time;
        console.log(`Performance mark: ${name} at ${time.toFixed(2)}ms`);
      };

      // Measure performance between marks
      (window as any).measurePerformance = (
        name: string,
        startMark: string,
        endMark?: string
      ) => {
        const start = (window as any).testPerformance.marks[startMark];
        const end = endMark
          ? (window as any).testPerformance.marks[endMark]
          : performance.now();
        const duration = end - start;

        (window as any).testPerformance.measures[name] = duration;
        console.log(`Performance measure: ${name} = ${duration.toFixed(2)}ms`);

        return duration;
      };

      // Monitor network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const startTime = performance.now();
        const response = await originalFetch(...args);
        const endTime = performance.now();

        (window as any).testPerformance.networkRequests.push({
          url: args[0],
          method: args[1]?.method || 'GET',
          status: response.status,
          duration: endTime - startTime,
          timestamp: startTime,
        });

        return response;
      };

      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          (window as any).testPerformance.memoryUsage.push({
            timestamp: performance.now(),
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
            limit: (performance as any).memory.jsHeapSizeLimit,
          });
        }, 1000);
      }
    });
  }

  /**
   * Set up WebSocket monitoring
   */
  static async setupWebSocketMonitoring(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (window as any).webSocketMessages = [];
      (window as any).webSocketErrors = [];

      // Monitor WebSocket connections
      const originalWebSocket = window.WebSocket;
      window.WebSocket = class extends originalWebSocket {
        constructor(url: string | URL, protocols?: string | string[]) {
          super(url, protocols);

          this.addEventListener('open', (event) => {
            console.log('WebSocket connected:', url);
            (window as any).webSocketMessages.push({
              type: 'connection',
              event: 'open',
              timestamp: Date.now(),
              url: url.toString(),
            });
          });

          this.addEventListener('message', (event) => {
            try {
              const data = JSON.parse(event.data);
              (window as any).webSocketMessages.push({
                type: 'message',
                event: 'message',
                data,
                timestamp: Date.now(),
              });
            } catch (e) {
              (window as any).webSocketMessages.push({
                type: 'message',
                event: 'message',
                data: event.data,
                timestamp: Date.now(),
              });
            }
          });

          this.addEventListener('error', (event) => {
            console.error('WebSocket error:', event);
            (window as any).webSocketErrors.push({
              event: 'error',
              error: event,
              timestamp: Date.now(),
            });
          });

          this.addEventListener('close', (event) => {
            console.log('WebSocket closed:', event.code, event.reason);
            (window as any).webSocketMessages.push({
              type: 'connection',
              event: 'close',
              code: event.code,
              reason: event.reason,
              timestamp: Date.now(),
            });
          });
        }
      };
    });
  }

  /**
   * Wait for application to be ready
   */
  static async waitForAppReady(
    page: Page,
    timeout: number = 30000
  ): Promise<void> {
    // Wait for initial page load
    await page.waitForLoadState('networkidle', { timeout });

    // Wait for React to be ready
    await page.waitForFunction(
      () => (
          typeof window.React !== 'undefined' ||
          document.querySelector('[data-reactroot]') !== null ||
          document.querySelector('#__next') !== null
        ),
      { timeout }
    );

    // Wait for any loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '[data-testid="spinner"]',
      '.loading',
      '.spinner',
    ];

    for (const selector of loadingSelectors) {
      try {
        await page.waitForSelector(selector, {
          state: 'hidden',
          timeout: 5000,
        });
      } catch (error) {
        // Selector might not exist, continue
      }
    }

    // Mark app as ready
    await page.evaluate(() => {
      if ((window as any).markPerformance) {
        (window as any).markPerformance('app-ready');
      }
    });
  }

  /**
   * Set up error collection
   */
  static async setupErrorCollection(page: Page): Promise<void> {
    await page.addInitScript(() => {
      (window as any).testErrors = [];
      (window as any).testWarnings = [];

      // Collect JavaScript errors
      window.addEventListener('error', (event) => {
        (window as any).testErrors.push({
          type: 'javascript',
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error?.stack,
          timestamp: Date.now(),
        });
      });

      // Collect unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        (window as any).testErrors.push({
          type: 'unhandled-promise',
          reason: event.reason,
          timestamp: Date.now(),
        });
      });

      // Override console methods to collect warnings
      const originalWarn = console.warn;
      console.warn = (...args) => {
        (window as any).testWarnings.push({
          message: args.join(' '),
          timestamp: Date.now(),
        });
        originalWarn.apply(console, args);
      };
    });
  }

  /**
   * Get collected errors and warnings
   */
  static async getCollectedErrors(page: Page): Promise<{
    errors: any[];
    warnings: any[];
  }> {
    return await page.evaluate(() => ({
        errors: (window as any).testErrors || [],
        warnings: (window as any).testWarnings || [],
      }));
  }

  /**
   * Get performance metrics
   */
  static async getPerformanceMetrics(page: Page): Promise<any> {
    return await page.evaluate(() => (window as any).testPerformance || {});
  }

  /**
   * Get WebSocket messages
   */
  static async getWebSocketMessages(page: Page): Promise<any[]> {
    return await page.evaluate(() => (window as any).webSocketMessages || []);
  }

  /**
   * Clean up test data by pattern
   */
  static async cleanupTestData(page: Page, patterns: string[]): Promise<void> {
    for (const pattern of patterns) {
      try {
        // Clean up projects
        const projectsResponse = await page.request.get('/api/projects', {
          headers: {
            Authorization: 'Bearer mock-jwt-token',
          },
        });

        if (projectsResponse.status() === 200) {
          const projects = await projectsResponse.json();
          const testProjects = projects.filter((p: any) =>
            patterns.some((pattern) => p.name.includes(pattern))
          );

          if (testProjects.length > 0) {
            console.log(`Cleaning up ${testProjects.length} test projects`);

            const deletePromises = testProjects.map((project: any) =>
              page.request
                .delete(`/api/projects/${project.id}`, {
                  headers: {
                    Authorization: 'Bearer mock-jwt-token',
                  },
                })
                .catch((error) => {
                  console.warn(
                    `Failed to delete project ${project.id}:`,
                    error
                  );
                })
            );

            await Promise.all(deletePromises);
          }
        }
      } catch (error) {
        console.warn(`Failed to cleanup data for pattern "${pattern}":`, error);
      }
    }
  }

  /**
   * Set up test database state
   */
  static async setupTestDatabase(page: Page): Promise<void> {
    // This would typically involve seeding the database with test data
    // For now, we'll just ensure the database is accessible

    try {
      const healthResponse = await page.request.get('/api/health', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });

      if (healthResponse.status() !== 200) {
        throw new Error('Backend health check failed');
      }

      console.log('Database connection verified');
    } catch (error) {
      console.error('Failed to verify database connection:', error);
      throw error;
    }
  }

  /**
   * Set up mock data for testing
   */
  static async setupMockData(
    page: Page,
    dataType: 'minimal' | 'comprehensive' | 'performance'
  ): Promise<void> {
    const mockDataConfigs = {
      minimal: {
        projects: 5,
        users: 2,
      },
      comprehensive: {
        projects: 20,
        users: 5,
      },
      performance: {
        projects: 100,
        users: 10,
      },
    };

    const config = mockDataConfigs[dataType];

    try {
      // This would typically call a seeding endpoint or service
      const seedResponse = await page.request.post('/api/test/seed', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: config,
      });

      if (seedResponse.status() === 200) {
        console.log(`Mock data setup completed: ${dataType}`);
      } else {
        console.warn(`Mock data setup failed: ${seedResponse.status()}`);
      }
    } catch (error) {
      console.warn(
        'Mock data setup not available, continuing with empty database'
      );
    }
  }
}

/**
 * Test configuration constants
 */
export const TEST_CONFIG = {
  // Timeouts
  DEFAULT_TIMEOUT: 30000,
  NETWORK_TIMEOUT: 10000,
  WEBSOCKET_TIMEOUT: 5000,
  AGENT_RESPONSE_TIMEOUT: 60000,

  // Performance thresholds
  PAGE_LOAD_THRESHOLD: 5000,
  API_RESPONSE_THRESHOLD: 2000,
  SEARCH_RESPONSE_THRESHOLD: 3000,
  WEBSOCKET_CONNECTION_THRESHOLD: 3000,

  // Test data patterns
  TEST_PROJECT_PATTERNS: [
    'Test Project',
    'E2E Test',
    'Performance Test',
    'Concurrent Test',
    'WebSocket Test',
    'Memory Test',
    'Batch Test',
    'Load Test',
  ],

  // API endpoints
  API_BASE_URL: process.env.API_BASE_URL || 'http://localhost:8000',
  FRONTEND_BASE_URL: process.env.FRONTEND_BASE_URL || 'http://localhost:3000',

  // Feature flags
  ENABLE_PERFORMANCE_MONITORING:
    process.env.ENABLE_PERFORMANCE_MONITORING === 'true',
  ENABLE_WEBSOCKET_TESTING: process.env.ENABLE_WEBSOCKET_TESTING !== 'false',
  ENABLE_VISUAL_TESTING: process.env.ENABLE_VISUAL_TESTING === 'true',
  DEBUG_MODE: process.env.DEBUG_MODE === 'true',
};

// Export the extended test and expect
export { expect };
