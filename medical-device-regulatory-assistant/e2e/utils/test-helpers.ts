import { Page, expect, Locator } from '@playwright/test';

/**
 * Test Helper Utilities for End-to-End Tests
 *
 * Common utilities and helper functions for project workflow testing,
 * WebSocket management, performance monitoring, and data setup/cleanup.
 */

export interface TestProject {
  id: number;
  name: string;
  description?: string;
  device_type?: string;
  intended_use?: string;
  status?: string;
  priority?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface TestUser {
  id: string;
  email: string;
  name: string;
  token: string;
}

export interface WebSocketMessage {
  type: string;
  data?: any;
  project_id?: number;
  timestamp?: string;
  update_type?: string;
}

export interface PerformanceMetrics {
  startTime: number;
  endTime: number;
  duration: number;
  operationsPerSecond?: number;
  memoryUsage?: number;
  networkRequests?: number;
}

/**
 * Project Management Helper Class
 */
export class ProjectTestHelper {
  constructor(private page: Page) {}

  /**
   * Create a test project with specified data
   */
  async createProject(projectData: Partial<TestProject>): Promise<TestProject> {
    const defaultData = {
      name: `Test Project ${Date.now()}`,
      description: 'Test project description',
      device_type: 'Test Device',
      intended_use: 'Test intended use',
      priority: 'medium',
      tags: ['test'],
    };

    const data = { ...defaultData, ...projectData };

    const response = await this.page.request.post('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data,
    });

    expect(response.status()).toBe(201);
    return await response.json();
  }

  /**
   * Create multiple test projects
   */
  async createMultipleProjects(
    count: number,
    baseData?: Partial<TestProject>
  ): Promise<TestProject[]> {
    const projects: TestProject[] = [];
    const batchSize = 10;

    for (let batch = 0; batch < Math.ceil(count / batchSize); batch++) {
      const batchPromises = [];
      const batchStart = batch * batchSize;
      const batchEnd = Math.min(batchStart + batchSize, count);

      for (let i = batchStart; i < batchEnd; i++) {
        const projectData = {
          name: `Batch Test Project ${i + 1}`,
          description: `Batch test project ${i + 1} with detailed description`,
          device_type: `Test Device Type ${(i % 5) + 1}`,
          intended_use: `Test intended use for project ${i + 1}`,
          priority: ['high', 'medium', 'low'][i % 3],
          tags: [`tag${i % 3}`, 'batch-test'],
          ...baseData,
        };

        batchPromises.push(this.createProject(projectData));
      }

      const batchResults = await Promise.all(batchPromises);
      projects.push(...batchResults);
    }

    return projects;
  }

  /**
   * Update a project
   */
  async updateProject(
    projectId: number,
    updateData: Partial<TestProject>
  ): Promise<TestProject> {
    const response = await this.page.request.put(`/api/projects/${projectId}`, {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: updateData,
    });

    expect(response.status()).toBe(200);
    return await response.json();
  }

  /**
   * Delete a project
   */
  async deleteProject(projectId: number): Promise<void> {
    const response = await this.page.request.delete(
      `/api/projects/${projectId}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );

    expect(response.status()).toBe(200);
  }

  /**
   * Delete multiple projects
   */
  async deleteMultipleProjects(projects: TestProject[]): Promise<void> {
    const deletePromises = projects.map((project) =>
      this.deleteProject(project.id)
    );
    await Promise.all(deletePromises);
  }

  /**
   * Get project by ID
   */
  async getProject(projectId: number): Promise<TestProject> {
    const response = await this.page.request.get(`/api/projects/${projectId}`, {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });

    expect(response.status()).toBe(200);
    return await response.json();
  }

  /**
   * List all projects
   */
  async listProjects(params?: Record<string, string>): Promise<TestProject[]> {
    const url = new URL('/api/projects', 'http://localhost:8000');
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }

    const response = await this.page.request.get(url.toString(), {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });

    expect(response.status()).toBe(200);
    return await response.json();
  }

  /**
   * Export project data
   */
  async exportProject(
    projectId: number,
    format: 'json' | 'pdf' | 'csv' = 'json'
  ): Promise<any> {
    const response = await this.page.request.get(
      `/api/projects/${projectId}/export`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
        params: { format },
      }
    );

    expect(response.status()).toBe(200);

    if (format === 'json') {
      return await response.json();
    } 
      return await response.body();
    
  }
}

/**
 * WebSocket Testing Helper Class
 */
export class WebSocketTestHelper {
  private wsMessages: WebSocketMessage[] = [];

  private wsConnection: any = null;

  constructor(private page: Page) {
    this.setupWebSocketMonitoring();
  }

  /**
   * Set up WebSocket message monitoring
   */
  private setupWebSocketMonitoring(): void {
    this.page.on('websocket', (ws) => {
      this.wsConnection = ws;

      ws.on('framereceived', (event) => {
        try {
          const message = JSON.parse(event.payload as string);
          this.wsMessages.push(message);
          console.log('WebSocket received:', message);
        } catch (e) {
          console.log('Non-JSON WebSocket message:', event.payload);
        }
      });

      ws.on('framesent', (event) => {
        try {
          const message = JSON.parse(event.payload as string);
          console.log('WebSocket sent:', message);
        } catch (e) {
          console.log('Non-JSON WebSocket sent:', event.payload);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed');
        this.wsConnection = null;
      });

      ws.on('socketerror', (error) => {
        console.log('WebSocket error:', error);
      });
    });
  }

  /**
   * Wait for WebSocket connection to establish
   */
  async waitForConnection(timeout: number = 5000): Promise<void> {
    await this.page.waitForFunction(
      () => (
          (window as any).websocketConnection &&
          (window as any).websocketConnection.readyState === WebSocket.OPEN
        ),
      { timeout }
    );
  }

  /**
   * Send WebSocket message
   */
  async sendMessage(message: any): Promise<void> {
    await this.page.evaluate((msg) => {
      const ws = (window as any).websocketConnection;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    }, message);
  }

  /**
   * Wait for specific WebSocket message type
   */
  async waitForMessage(
    messageType: string,
    timeout: number = 10000
  ): Promise<WebSocketMessage> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const message = this.wsMessages.find((msg) => msg.type === messageType);
      if (message) {
        return message;
      }
      await this.page.waitForTimeout(100);
    }

    throw new Error(
      `WebSocket message of type '${messageType}' not received within ${timeout}ms`
    );
  }

  /**
   * Get all messages of a specific type
   */
  getMessagesByType(messageType: string): WebSocketMessage[] {
    return this.wsMessages.filter((msg) => msg.type === messageType);
  }

  /**
   * Clear message history
   */
  clearMessages(): void {
    this.wsMessages = [];
  }

  /**
   * Get connection status
   */
  isConnected(): boolean {
    return this.wsConnection !== null;
  }

  /**
   * Subscribe to project updates
   */
  async subscribeToProject(projectId: number): Promise<void> {
    await this.sendMessage({
      type: 'subscribe',
      project_id: projectId,
    });
  }

  /**
   * Unsubscribe from project updates
   */
  async unsubscribeFromProject(projectId: number): Promise<void> {
    await this.sendMessage({
      type: 'unsubscribe',
      project_id: projectId,
    });
  }

  /**
   * Test ping-pong mechanism
   */
  async testPingPong(): Promise<boolean> {
    await this.sendMessage({ type: 'ping' });

    try {
      await this.waitForMessage('pong', 5000);
      return true;
    } catch (error) {
      return false;
    }
  }
}

/**
 * Performance Testing Helper Class
 */
export class PerformanceTestHelper {
  private metrics: PerformanceMetrics[] = [];

  constructor(private page: Page) {
    this.setupPerformanceMonitoring();
  }

  /**
   * Set up performance monitoring
   */
  private async setupPerformanceMonitoring(): Promise<void> {
    await this.page.addInitScript(() => {
      (window as any).performanceData = {
        navigationStart: performance.now(),
        requests: [],
        memoryUsage: [],
        timings: {},
      };

      // Monitor network requests
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        const start = performance.now();
        const response = await originalFetch(...args);
        const end = performance.now();

        (window as any).performanceData.requests.push({
          url: args[0],
          duration: end - start,
          status: response.status,
          size: response.headers.get('content-length') || 0,
        });

        return response;
      };

      // Monitor memory usage
      if ('memory' in performance) {
        setInterval(() => {
          (window as any).performanceData.memoryUsage.push({
            timestamp: performance.now(),
            used: (performance as any).memory.usedJSHeapSize,
            total: (performance as any).memory.totalJSHeapSize,
          });
        }, 1000);
      }
    });
  }

  /**
   * Start performance measurement
   */
  startMeasurement(name: string): void {
    const metric: PerformanceMetrics = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
    };

    this.metrics.push(metric);
    console.log(`Performance measurement started: ${name}`);
  }

  /**
   * End performance measurement
   */
  endMeasurement(name: string): PerformanceMetrics {
    const metric = this.metrics[this.metrics.length - 1];
    if (metric) {
      metric.endTime = Date.now();
      metric.duration = metric.endTime - metric.startTime;
      console.log(
        `Performance measurement completed: ${name} - ${metric.duration}ms`
      );
    }

    return metric;
  }

  /**
   * Measure operation performance
   */
  async measureOperation<T>(
    name: string,
    operation: () => Promise<T>
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    this.startMeasurement(name);
    const result = await operation();
    const metrics = this.endMeasurement(name);

    return { result, metrics };
  }

  /**
   * Get memory usage
   */
  async getMemoryUsage(): Promise<any> {
    return await this.page.evaluate(() => {
      if ('memory' in performance) {
        return {
          used: (performance as any).memory.usedJSHeapSize,
          total: (performance as any).memory.totalJSHeapSize,
          limit: (performance as any).memory.jsHeapSizeLimit,
        };
      }
      return null;
    });
  }

  /**
   * Get network performance data
   */
  async getNetworkPerformance(): Promise<any> {
    return await this.page.evaluate(() => (window as any).performanceData?.requests || []);
  }

  /**
   * Measure page load performance
   */
  async measurePageLoad(url: string): Promise<PerformanceMetrics> {
    const startTime = Date.now();

    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');

    const endTime = Date.now();
    const duration = endTime - startTime;

    const metrics: PerformanceMetrics = {
      startTime,
      endTime,
      duration,
    };

    console.log(`Page load performance: ${url} - ${duration}ms`);
    return metrics;
  }

  /**
   * Measure operation throughput
   */
  async measureThroughput<T>(
    name: string,
    operations: (() => Promise<T>)[],
    concurrent: boolean = false
  ): Promise<{
    results: T[];
    metrics: PerformanceMetrics & { operationsPerSecond: number };
  }> {
    const startTime = Date.now();

    let results: T[];
    if (concurrent) {
      results = await Promise.all(operations.map((op) => op()));
    } else {
      results = [];
      for (const operation of operations) {
        results.push(await operation());
      }
    }

    const endTime = Date.now();
    const duration = endTime - startTime;
    const operationsPerSecond = (operations.length / duration) * 1000;

    const metrics = {
      startTime,
      endTime,
      duration,
      operationsPerSecond,
    };

    console.log(
      `Throughput measurement: ${name} - ${operationsPerSecond.toFixed(2)} ops/sec`
    );

    return { results, metrics };
  }
}

/**
 * UI Testing Helper Class
 */
export class UITestHelper {
  constructor(private page: Page) {}

  /**
   * Wait for element to be visible and stable
   */
  async waitForStableElement(
    selector: string,
    timeout: number = 10000
  ): Promise<Locator> {
    const element = this.page.locator(selector);
    await element.waitFor({ state: 'visible', timeout });

    // Wait for element to be stable (not moving)
    await this.page.waitForFunction((sel) => {
      const el = document.querySelector(sel);
      if (!el) return false;

      const rect1 = el.getBoundingClientRect();
      setTimeout(() => {
        const rect2 = el.getBoundingClientRect();
        return rect1.top === rect2.top && rect1.left === rect2.left;
      }, 100);

      return true;
    }, selector);

    return element;
  }

  /**
   * Fill form with data
   */
  async fillForm(formData: Record<string, string>): Promise<void> {
    for (const [field, value] of Object.entries(formData)) {
      const selector = `[data-testid="${field}"]`;
      await this.page.fill(selector, value);
    }
  }

  /**
   * Wait for loading to complete
   */
  async waitForLoadingComplete(timeout: number = 30000): Promise<void> {
    // Wait for loading indicators to disappear
    const loadingSelectors = [
      '[data-testid="loading"]',
      '[data-testid="spinner"]',
      '.loading',
      '.spinner',
    ];

    for (const selector of loadingSelectors) {
      try {
        await this.page.waitForSelector(selector, {
          state: 'hidden',
          timeout: 1000,
        });
      } catch (error) {
        // Selector might not exist, continue
      }
    }

    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle', { timeout });
  }

  /**
   * Verify toast notification
   */
  async verifyToast(
    expectedText: string,
    type: 'success' | 'error' | 'info' = 'success'
  ): Promise<void> {
    const toastSelector = `[data-testid="${type}-toast"], [data-testid="toast"]`;
    const toast = await this.waitForStableElement(toastSelector);
    await expect(toast).toContainText(expectedText);
  }

  /**
   * Verify error message
   */
  async verifyErrorMessage(expectedText: string): Promise<void> {
    const errorSelectors = [
      '[data-testid="error-message"]',
      '[data-testid="error-toast"]',
      '.error-message',
      '.error',
    ];

    let errorFound = false;
    for (const selector of errorSelectors) {
      try {
        const element = this.page.locator(selector);
        if (await element.isVisible()) {
          await expect(element).toContainText(expectedText);
          errorFound = true;
          break;
        }
      } catch (error) {
        // Continue to next selector
      }
    }

    if (!errorFound) {
      throw new Error(`Error message "${expectedText}" not found`);
    }
  }

  /**
   * Take screenshot with timestamp
   */
  async takeTimestampedScreenshot(name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    await this.page.screenshot({
      path: `screenshots/${name}-${timestamp}.png`,
      fullPage: true,
    });
  }

  /**
   * Verify page accessibility
   */
  async verifyAccessibility(): Promise<void> {
    // Check for basic accessibility features
    const accessibilityChecks = [
      // Check for alt text on images
      async () => {
        const images = await this.page.locator('img').all();
        for (const img of images) {
          const alt = await img.getAttribute('alt');
          if (!alt) {
            console.warn('Image without alt text found');
          }
        }
      },

      // Check for form labels
      async () => {
        const inputs = await this.page.locator('input, select, textarea').all();
        for (const input of inputs) {
          const id = await input.getAttribute('id');
          const ariaLabel = await input.getAttribute('aria-label');
          const ariaLabelledBy = await input.getAttribute('aria-labelledby');

          if (id) {
            const label = this.page.locator(`label[for="${id}"]`);
            if (!(await label.count()) && !ariaLabel && !ariaLabelledBy) {
              console.warn('Input without proper labeling found');
            }
          }
        }
      },

      // Check for keyboard navigation
      async () => {
        const focusableElements = await this.page
          .locator(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
          .all();

        if (focusableElements.length === 0) {
          console.warn('No focusable elements found on page');
        }
      },
    ];

    for (const check of accessibilityChecks) {
      await check();
    }
  }
}

/**
 * Authentication Helper Class
 */
export class AuthTestHelper {
  constructor(private page: Page) {}

  /**
   * Set up mock authentication
   */
  async setupMockAuth(user?: Partial<TestUser>): Promise<void> {
    const defaultUser = {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      token: 'mock-jwt-token',
    };

    const userData = { ...defaultUser, ...user };

    await this.page.evaluate((data) => {
      localStorage.setItem('auth-token', data.token);
      localStorage.setItem(
        'user-data',
        JSON.stringify({
          id: data.id,
          email: data.email,
          name: data.name,
        })
      );
    }, userData);
  }

  /**
   * Clear authentication
   */
  async clearAuth(): Promise<void> {
    await this.page.evaluate(() => {
      localStorage.removeItem('auth-token');
      localStorage.removeItem('user-data');
    });
  }

  /**
   * Verify authentication state
   */
  async verifyAuthState(shouldBeAuthenticated: boolean): Promise<void> {
    const authData = await this.page.evaluate(() => ({
        token: localStorage.getItem('auth-token'),
        userData: localStorage.getItem('user-data'),
      }));

    if (shouldBeAuthenticated) {
      expect(authData.token).toBeTruthy();
      expect(authData.userData).toBeTruthy();
    } else {
      expect(authData.token).toBeFalsy();
      expect(authData.userData).toBeFalsy();
    }
  }

  /**
   * Create multiple test users
   */
  createTestUsers(count: number): TestUser[] {
    const users: TestUser[] = [];

    for (let i = 0; i < count; i++) {
      users.push({
        id: `test-user-${i + 1}`,
        email: `test${i + 1}@example.com`,
        name: `Test User ${i + 1}`,
        token: `mock-jwt-token-${i + 1}`,
      });
    }

    return users;
  }
}

/**
 * Data Cleanup Helper Class
 */
export class CleanupTestHelper {
  private createdProjects: TestProject[] = [];

  private createdUsers: TestUser[] = [];

  constructor(private page: Page) {}

  /**
   * Track created project for cleanup
   */
  trackProject(project: TestProject): void {
    this.createdProjects.push(project);
  }

  /**
   * Track created user for cleanup
   */
  trackUser(user: TestUser): void {
    this.createdUsers.push(user);
  }

  /**
   * Clean up all tracked resources
   */
  async cleanupAll(): Promise<void> {
    // Clean up projects
    if (this.createdProjects.length > 0) {
      console.log(
        `Cleaning up ${this.createdProjects.length} test projects...`
      );

      const deletePromises = this.createdProjects.map((project) =>
        this.page.request
          .delete(`/api/projects/${project.id}`, {
            headers: {
              Authorization: 'Bearer mock-jwt-token',
            },
          })
          .catch((error) => {
            console.warn(`Failed to delete project ${project.id}:`, error);
          })
      );

      await Promise.all(deletePromises);
      this.createdProjects = [];
    }

    // Clean up users (if applicable)
    if (this.createdUsers.length > 0) {
      console.log(`Cleaning up ${this.createdUsers.length} test users...`);
      // User cleanup would be implemented based on your user management system
      this.createdUsers = [];
    }

    // Clear browser storage
    await this.page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Clean up projects by name pattern
   */
  async cleanupProjectsByPattern(namePattern: string): Promise<void> {
    try {
      const response = await this.page.request.get('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      });

      if (response.status() === 200) {
        const projects = await response.json();
        const testProjects = projects.filter((p: TestProject) =>
          p.name.includes(namePattern)
        );

        if (testProjects.length > 0) {
          console.log(
            `Cleaning up ${testProjects.length} projects matching pattern "${namePattern}"`
          );

          const deletePromises = testProjects.map((project: TestProject) =>
            this.page.request
              .delete(`/api/projects/${project.id}`, {
                headers: {
                  Authorization: 'Bearer mock-jwt-token',
                },
              })
              .catch((error) => {
                console.warn(`Failed to delete project ${project.id}:`, error);
              })
          );

          await Promise.all(deletePromises);
        }
      }
    } catch (error) {
      console.warn('Failed to cleanup projects by pattern:', error);
    }
  }
}

// Export all helper classes
export {
  ProjectTestHelper,
  WebSocketTestHelper,
  PerformanceTestHelper,
  UITestHelper,
  AuthTestHelper,
  CleanupTestHelper,
};
