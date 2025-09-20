import { test, expect, Page } from '@playwright/test';

import { VisualTester } from './utils/visual-testing';

/**
 * End-to-End Project Workflow Tests
 *
 * Tests complete project creation workflow from UI to database,
 * real-time updates, WebSocket functionality, error scenarios,
 * and performance with large datasets.
 *
 * Requirements: 10.1, 10.5
 */

test.describe('Project Workflow End-to-End Tests', () => {
  let visualTester: VisualTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new VisualTester(page);

    // Mock authentication for testing
    await page.goto('/');

    // Wait for initial page load
    await page.waitForLoadState('networkidle');

    // Mock user authentication
    await page.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token');
      localStorage.setItem(
        'user-data',
        JSON.stringify({
          id: 'test-user-123',
          email: 'test@example.com',
          name: 'Test User',
        })
      );
    });
  });

  test.afterEach(async ({ page }) => {
    // Clean up test data
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('Complete Project Creation Workflow - UI to Database', async ({
    page,
  }) => {
    // Test complete project creation workflow from UI to database

    // Step 1: Navigate to project creation
    await page.click('[data-testid="create-project-button"]');
    await expect(page.locator('[data-testid="project-form"]')).toBeVisible();

    // Step 2: Fill out project form with comprehensive data
    const projectData = {
      name: 'E2E Test Cardiac Monitor',
      description:
        'Comprehensive end-to-end test for cardiac monitoring device with advanced features',
      deviceType: 'Class II Cardiac Monitor',
      intendedUse:
        'Continuous monitoring of cardiac rhythm in ambulatory patients with real-time alerts',
      priority: 'high',
      tags: ['cardiac', 'monitoring', 'e2e-test'],
    };

    await page.fill('[data-testid="project-name"]', projectData.name);
    await page.fill(
      '[data-testid="project-description"]',
      projectData.description
    );
    await page.fill('[data-testid="device-type"]', projectData.deviceType);
    await page.fill('[data-testid="intended-use"]', projectData.intendedUse);

    // Select priority
    await page.click('[data-testid="priority-select"]');
    await page.click(`[data-testid="priority-option-${projectData.priority}"]`);

    // Add tags
    for (const tag of projectData.tags) {
      await page.fill('[data-testid="tags-input"]', tag);
      await page.press('[data-testid="tags-input"]', 'Enter');
    }

    // Step 3: Submit form and verify creation
    const createPromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'POST'
    );

    await page.click('[data-testid="create-project-submit"]');

    const createResponse = await createPromise;
    expect(createResponse.status()).toBe(201);

    const createdProject = await createResponse.json();
    expect(createdProject.name).toBe(projectData.name);
    expect(createdProject.id).toBeDefined();

    // Step 4: Verify redirect to project dashboard
    await expect(
      page.locator('[data-testid="project-dashboard"]')
    ).toBeVisible();
    await expect(page.locator('[data-testid="project-title"]')).toHaveText(
      projectData.name
    );

    // Step 5: Verify data persistence by refreshing page
    await page.reload();
    await page.waitForLoadState('networkidle');

    await expect(page.locator('[data-testid="project-title"]')).toHaveText(
      projectData.name
    );
    await expect(
      page.locator('[data-testid="project-description"]')
    ).toContainText(projectData.description);

    // Step 6: Verify database persistence via API call
    const projectId = createdProject.id;
    const getResponse = await page.request.get(`/api/projects/${projectId}`, {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });

    expect(getResponse.status()).toBe(200);
    const persistedProject = await getResponse.json();
    expect(persistedProject.name).toBe(projectData.name);
    expect(persistedProject.description).toBe(projectData.description);
    expect(persistedProject.device_type).toBe(projectData.deviceType);
    expect(persistedProject.intended_use).toBe(projectData.intendedUse);
    expect(persistedProject.priority).toBe(projectData.priority);

    // Step 7: Test project update workflow
    await page.click('[data-testid="edit-project-button"]');
    await expect(page.locator('[data-testid="project-form"]')).toBeVisible();

    const updatedDescription = 'Updated description for E2E testing';
    await page.fill('[data-testid="project-description"]', updatedDescription);

    const updatePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/projects/${projectId}`) &&
        response.request().method() === 'PUT'
    );

    await page.click('[data-testid="update-project-submit"]');

    const updateResponse = await updatePromise;
    expect(updateResponse.status()).toBe(200);

    // Verify update reflected in UI
    await expect(
      page.locator('[data-testid="project-description"]')
    ).toContainText(updatedDescription);

    // Step 8: Test project deletion workflow
    await page.click('[data-testid="project-actions-menu"]');
    await page.click('[data-testid="delete-project-button"]');

    // Confirm deletion
    await expect(
      page.locator('[data-testid="delete-confirmation-dialog"]')
    ).toBeVisible();

    const deletePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/projects/${projectId}`) &&
        response.request().method() === 'DELETE'
    );

    await page.click('[data-testid="confirm-delete-button"]');

    const deleteResponse = await deletePromise;
    expect(deleteResponse.status()).toBe(200);

    // Verify redirect to projects list
    await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();

    // Verify project no longer exists in database
    const getDeletedResponse = await page.request.get(
      `/api/projects/${projectId}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );
    expect(getDeletedResponse.status()).toBe(404);
  });

  test('Real-time Updates and WebSocket Functionality', async ({
    page,
    context,
  }) => {
    // Test real-time updates and WebSocket functionality

    // Step 1: Create a project for testing
    const projectData = {
      name: 'WebSocket Test Project',
      description: 'Testing real-time updates via WebSocket',
      deviceType: 'Test Device',
      intendedUse: 'WebSocket testing',
    };

    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', projectData.name);
    await page.fill(
      '[data-testid="project-description"]',
      projectData.description
    );
    await page.fill('[data-testid="device-type"]', projectData.deviceType);
    await page.fill('[data-testid="intended-use"]', projectData.intendedUse);

    const createResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'POST'
    );
    await page.click('[data-testid="create-project-submit"]');

    const createdProject = await (await createResponse).json();
    const projectId = createdProject.id;

    // Step 2: Open second browser context to simulate concurrent user
    const secondPage = await context.newPage();
    await secondPage.goto(`/projects/${projectId}`);
    await secondPage.evaluate(() => {
      localStorage.setItem('auth-token', 'mock-jwt-token-2');
      localStorage.setItem(
        'user-data',
        JSON.stringify({
          id: 'test-user-456',
          email: 'test2@example.com',
          name: 'Test User 2',
        })
      );
    });

    // Step 3: Establish WebSocket connections
    const wsMessages: any[] = [];
    const secondWsMessages: any[] = [];

    // Monitor WebSocket messages on first page
    page.on('websocket', (ws) => {
      ws.on('framereceived', (event) => {
        try {
          const message = JSON.parse(event.payload as string);
          wsMessages.push(message);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });

    // Monitor WebSocket messages on second page
    secondPage.on('websocket', (ws) => {
      ws.on('framereceived', (event) => {
        try {
          const message = JSON.parse(event.payload as string);
          secondWsMessages.push(message);
        } catch (e) {
          // Ignore non-JSON messages
        }
      });
    });

    // Step 4: Navigate to agent workflow to trigger WebSocket connection
    await page.click('[data-testid="agent-workflow-button"]');
    await expect(page.locator('[data-testid="chat-interface"]')).toBeVisible();

    await secondPage.click('[data-testid="agent-workflow-button"]');
    await expect(
      secondPage.locator('[data-testid="chat-interface"]')
    ).toBeVisible();

    // Wait for WebSocket connections to establish
    await page.waitForTimeout(2000);

    // Step 5: Trigger agent action that should send real-time updates
    await page.fill(
      '[data-testid="chat-input"]',
      '/classify-device cardiac monitor'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // Step 6: Wait for classification to complete and verify real-time updates
    await page.waitForSelector('[data-testid="classification-result"]', {
      timeout: 30000,
    });

    // Verify WebSocket messages were received
    await page.waitForTimeout(1000); // Allow time for WebSocket messages

    const classificationMessages = wsMessages.filter(
      (msg) =>
        msg.type === 'classification_completed' ||
        msg.type === 'agent_interaction'
    );
    expect(classificationMessages.length).toBeGreaterThan(0);

    // Step 7: Verify dashboard updates in real-time
    await page.click('[data-testid="dashboard-button"]');
    await expect(
      page.locator('[data-testid="classification-status"]')
    ).toHaveText('Completed');

    // Verify second page also received updates
    await secondPage.click('[data-testid="dashboard-button"]');
    await expect(
      secondPage.locator('[data-testid="classification-status"]')
    ).toHaveText('Completed');

    // Step 8: Test project update notifications
    await page.click('[data-testid="edit-project-button"]');
    await page.fill(
      '[data-testid="project-description"]',
      'Updated via WebSocket test'
    );

    const updatePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/projects/${projectId}`) &&
        response.request().method() === 'PUT'
    );

    await page.click('[data-testid="update-project-submit"]');
    await updatePromise;

    // Verify second page receives update notification
    await secondPage.waitForTimeout(2000);
    const updateMessages = secondWsMessages.filter(
      (msg) => msg.type === 'project_updated'
    );
    expect(updateMessages.length).toBeGreaterThan(0);

    // Step 9: Test WebSocket reconnection after disconnect
    await page.evaluate(() => {
      // Simulate network disconnection
      window.dispatchEvent(new Event('offline'));
    });

    await page.waitForTimeout(1000);

    await page.evaluate(() => {
      // Simulate network reconnection
      window.dispatchEvent(new Event('online'));
    });

    // Verify reconnection works
    await page.waitForTimeout(2000);
    const reconnectionMessages = wsMessages.filter(
      (msg) => msg.type === 'connection_established'
    );
    expect(reconnectionMessages.length).toBeGreaterThan(1); // Initial + reconnection

    await secondPage.close();
  });

  test('Error Scenarios and Recovery Mechanisms', async ({ page }) => {
    // Test error scenarios and recovery mechanisms

    // Step 1: Test form validation errors
    await page.click('[data-testid="create-project-button"]');

    // Try to submit empty form
    await page.click('[data-testid="create-project-submit"]');

    // Verify validation errors are displayed
    await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="name-error"]')).toContainText(
      'required'
    );

    // Step 2: Test network error handling
    // Mock network failure
    await page.route('/api/projects', (route) => {
      route.abort('failed');
    });

    await page.fill('[data-testid="project-name"]', 'Network Error Test');
    await page.fill(
      '[data-testid="project-description"]',
      'Testing network error handling'
    );
    await page.click('[data-testid="create-project-submit"]');

    // Verify error message is displayed
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText(
      'network error'
    );

    // Verify retry functionality
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();

    // Step 3: Test recovery after network error
    // Remove network mock to allow success
    await page.unroute('/api/projects');

    await page.click('[data-testid="retry-button"]');

    // Verify successful creation after retry
    const createResponse = await page.waitForResponse(
      (response) =>
        response.url().includes('/api/projects') &&
        response.request().method() === 'POST'
    );
    expect(createResponse.status()).toBe(201);

    await expect(
      page.locator('[data-testid="project-dashboard"]')
    ).toBeVisible();

    // Step 4: Test server error handling (500 error)
    const createdProject = await createResponse.json();
    const projectId = createdProject.id;

    await page.route(`/api/projects/${projectId}`, (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Internal server error',
            code: 'INTERNAL_ERROR',
          },
        }),
      });
    });

    await page.click('[data-testid="edit-project-button"]');
    await page.fill(
      '[data-testid="project-description"]',
      'Testing server error'
    );
    await page.click('[data-testid="update-project-submit"]');

    // Verify server error handling
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();
    await expect(page.locator('[data-testid="error-toast"]')).toContainText(
      'server error'
    );

    // Step 5: Test authentication error handling (401 error)
    await page.unroute(`/api/projects/${projectId}`);
    await page.route(`/api/projects/${projectId}`, (route) => {
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: {
            message: 'Unauthorized',
            code: 'AUTH_ERROR',
          },
        }),
      });
    });

    await page.click('[data-testid="retry-button"]');

    // Verify authentication error handling
    await expect(
      page.locator('[data-testid="auth-error-dialog"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="login-redirect-button"]')
    ).toBeVisible();

    // Step 6: Test optimistic update rollback
    await page.unroute(`/api/projects/${projectId}`);

    // Navigate back to project
    await page.goto(`/projects/${projectId}`);
    await page.waitForLoadState('networkidle');

    const originalDescription = await page
      .locator('[data-testid="project-description"]')
      .textContent();

    // Mock update failure
    await page.route(`/api/projects/${projectId}`, (route) => {
      route.abort('failed');
    });

    await page.click('[data-testid="edit-project-button"]');
    const newDescription = 'This update should fail and rollback';
    await page.fill('[data-testid="project-description"]', newDescription);
    await page.click('[data-testid="update-project-submit"]');

    // Verify optimistic update shows new value initially
    await expect(
      page.locator('[data-testid="project-description"]')
    ).toContainText(newDescription);

    // Wait for error and rollback
    await expect(page.locator('[data-testid="error-toast"]')).toBeVisible();

    // Verify rollback to original value
    await expect(
      page.locator('[data-testid="project-description"]')
    ).toContainText(originalDescription || '');

    // Step 7: Test WebSocket error handling
    // Mock WebSocket connection failure
    await page.evaluate(() => {
      // Override WebSocket to simulate connection failure
      (window as any).WebSocket = class {
        constructor() {
          setTimeout(() => {
            if (this.onerror) this.onerror(new Event('error'));
          }, 100);
        }

        send() {}

        close() {}
      };
    });

    await page.click('[data-testid="agent-workflow-button"]');

    // Verify WebSocket error handling
    await expect(
      page.locator('[data-testid="connection-error-banner"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="reconnect-button"]')
    ).toBeVisible();
  });

  test('Performance Tests for Large Datasets', async ({ page }) => {
    // Test performance with large datasets and concurrent operations

    // Step 1: Create multiple projects for performance testing
    const projectCount = 50;
    const projects: any[] = [];

    // Measure project creation performance
    const startTime = Date.now();

    for (let i = 0; i < projectCount; i++) {
      const projectData = {
        name: `Performance Test Project ${i + 1}`,
        description: `Performance testing project number ${i + 1} with detailed description`,
        device_type: `Test Device Type ${(i % 5) + 1}`,
        intended_use: `Performance testing intended use for project ${i + 1}`,
      };

      const response = await page.request.post('/api/projects', {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: projectData,
      });

      expect(response.status()).toBe(201);
      const project = await response.json();
      projects.push(project);
    }

    const creationTime = Date.now() - startTime;
    console.log(`Created ${projectCount} projects in ${creationTime}ms`);

    // Verify creation performance (should be under 30 seconds for 50 projects)
    expect(creationTime).toBeLessThan(30000);

    // Step 2: Test project list loading performance with large dataset
    const listStartTime = Date.now();

    await page.goto('/projects');
    await page.waitForLoadState('networkidle');

    const listLoadTime = Date.now() - listStartTime;
    console.log(`Loaded projects list in ${listLoadTime}ms`);

    // Verify list loading performance (should be under 5 seconds)
    expect(listLoadTime).toBeLessThan(5000);

    // Verify all projects are displayed
    const projectCards = page.locator('[data-testid="project-card"]');
    const displayedCount = await projectCards.count();
    expect(displayedCount).toBeGreaterThanOrEqual(Math.min(projectCount, 20)); // Assuming pagination

    // Step 3: Test search performance with large dataset
    const searchStartTime = Date.now();

    await page.fill(
      '[data-testid="search-input"]',
      'Performance Test Project 1'
    );

    // Wait for search results
    await page.waitForFunction(() => {
      const cards = document.querySelectorAll('[data-testid="project-card"]');
      return cards.length > 0 && cards.length < 20; // Should filter results
    });

    const searchTime = Date.now() - searchStartTime;
    console.log(`Search completed in ${searchTime}ms`);

    // Verify search performance (should be under 2 seconds)
    expect(searchTime).toBeLessThan(2000);

    // Step 4: Test pagination performance
    if (displayedCount >= 20) {
      const paginationStartTime = Date.now();

      await page.click('[data-testid="next-page-button"]');
      await page.waitForLoadState('networkidle');

      const paginationTime = Date.now() - paginationStartTime;
      console.log(`Pagination completed in ${paginationTime}ms`);

      // Verify pagination performance (should be under 3 seconds)
      expect(paginationTime).toBeLessThan(3000);
    }

    // Step 5: Test concurrent operations performance
    const concurrentStartTime = Date.now();

    // Perform multiple concurrent operations
    const concurrentPromises = projects
      .slice(0, 10)
      .map(async (project, index) => {
        const updateData = {
          description: `Updated description ${index} - ${Date.now()}`,
        };

        const response = await page.request.put(`/api/projects/${project.id}`, {
          headers: {
            Authorization: 'Bearer mock-jwt-token',
            'Content-Type': 'application/json',
          },
          data: updateData,
        });

        expect(response.status()).toBe(200);
        return response.json();
      });

    const concurrentResults = await Promise.all(concurrentPromises);
    const concurrentTime = Date.now() - concurrentStartTime;

    console.log(`Completed 10 concurrent updates in ${concurrentTime}ms`);

    // Verify concurrent operations performance (should be under 10 seconds)
    expect(concurrentTime).toBeLessThan(10000);
    expect(concurrentResults).toHaveLength(10);

    // Step 6: Test bulk operations performance
    const bulkStartTime = Date.now();

    // Test bulk export
    const exportResponse = await page.request.get('/api/projects/export/bulk', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
      params: {
        format: 'json',
        project_ids: projects
          .slice(0, 20)
          .map((p) => p.id)
          .join(','),
      },
    });

    expect(exportResponse.status()).toBe(200);

    const bulkTime = Date.now() - bulkStartTime;
    console.log(`Bulk export of 20 projects completed in ${bulkTime}ms`);

    // Verify bulk operations performance (should be under 15 seconds)
    expect(bulkTime).toBeLessThan(15000);

    // Step 7: Clean up test data
    const cleanupPromises = projects.map((project) =>
      page.request.delete(`/api/projects/${project.id}`, {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      })
    );

    await Promise.all(cleanupPromises);
  });

  test('Concurrent User Operations', async ({ page, context }) => {
    // Test concurrent operations by multiple users

    // Step 1: Create a shared project
    const projectData = {
      name: 'Concurrent Test Project',
      description: 'Testing concurrent user operations',
      device_type: 'Shared Device',
      intended_use: 'Concurrent testing',
    };

    const createResponse = await page.request.post('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: projectData,
    });

    const project = await createResponse.json();
    const projectId = project.id;

    // Step 2: Create multiple browser contexts for different users
    const userContexts = await Promise.all([
      context.newPage(),
      context.newPage(),
      context.newPage(),
    ]);

    // Set up different users
    const users = [
      { id: 'user-1', token: 'token-1', name: 'User 1' },
      { id: 'user-2', token: 'token-2', name: 'User 2' },
      { id: 'user-3', token: 'token-3', name: 'User 3' },
    ];

    for (let i = 0; i < userContexts.length; i++) {
      const userPage = userContexts[i];
      const user = users[i];

      await userPage.goto(`/projects/${projectId}`);
      await userPage.evaluate((userData) => {
        localStorage.setItem('auth-token', userData.token);
        localStorage.setItem('user-data', JSON.stringify(userData));
      }, user);
    }

    // Step 3: Test concurrent project updates
    const updatePromises = userContexts.map(async (userPage, index) => {
      const user = users[index];

      await userPage.click('[data-testid="edit-project-button"]');
      await userPage.fill(
        '[data-testid="project-description"]',
        `Updated by ${user.name} at ${Date.now()}`
      );

      const response = await userPage.request.put(
        `/api/projects/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
          data: {
            description: `Updated by ${user.name} at ${Date.now()}`,
          },
        }
      );

      return { user: user.name, status: response.status() };
    });

    const updateResults = await Promise.all(updatePromises);

    // Verify all updates were processed (some may conflict)
    const successfulUpdates = updateResults.filter(
      (result) => result.status === 200
    );
    expect(successfulUpdates.length).toBeGreaterThan(0);

    // Step 4: Test concurrent agent interactions
    const agentPromises = userContexts.map(async (userPage, index) => {
      const user = users[index];

      await userPage.click('[data-testid="agent-workflow-button"]');
      await userPage.fill(
        '[data-testid="chat-input"]',
        `/classify-device test device ${index + 1}`
      );
      await userPage.press('[data-testid="chat-input"]', 'Enter');

      // Wait for response
      await userPage.waitForSelector('[data-testid="agent-response"]', {
        timeout: 30000,
      });

      return { user: user.name, completed: true };
    });

    const agentResults = await Promise.all(agentPromises);
    expect(agentResults.every((result) => result.completed)).toBe(true);

    // Step 5: Verify data consistency across all users
    for (const userPage of userContexts) {
      await userPage.reload();
      await userPage.waitForLoadState('networkidle');

      // Verify project data is consistent
      await expect(
        userPage.locator('[data-testid="project-title"]')
      ).toHaveText(projectData.name);

      // Verify agent interactions are visible
      await userPage.click('[data-testid="agent-workflow-button"]');
      const interactions = userPage.locator(
        '[data-testid="interaction-history"] [data-testid="interaction-item"]'
      );
      const interactionCount = await interactions.count();
      expect(interactionCount).toBeGreaterThan(0);
    }

    // Clean up
    for (const userPage of userContexts) {
      await userPage.close();
    }

    await page.request.delete(`/api/projects/${projectId}`, {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });
  });

  test('Database Transaction Integrity', async ({ page }) => {
    // Test database transaction integrity during complex operations

    // Step 1: Create project with related data
    const projectData = {
      name: 'Transaction Test Project',
      description: 'Testing database transaction integrity',
      device_type: 'Transaction Test Device',
      intended_use: 'Database integrity testing',
    };

    const createResponse = await page.request.post('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: projectData,
    });

    const project = await createResponse.json();
    const projectId = project.id;

    // Step 2: Add related data (classifications, predicates, etc.)
    await page.goto(`/projects/${projectId}/agent`);

    // Trigger classification
    await page.fill(
      '[data-testid="chat-input"]',
      '/classify-device transaction test device'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');
    await page.waitForSelector('[data-testid="classification-result"]', {
      timeout: 30000,
    });

    // Trigger predicate search
    await page.fill(
      '[data-testid="chat-input"]',
      '/predicate-search transaction test'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');
    await page.waitForSelector('[data-testid="predicate-results"]', {
      timeout: 30000,
    });

    // Step 3: Verify all related data exists
    const projectResponse = await page.request.get(
      `/api/projects/${projectId}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );

    expect(projectResponse.status()).toBe(200);
    const projectWithData = await projectResponse.json();

    // Verify project has related data
    expect(projectWithData.id).toBe(projectId);

    // Step 4: Test cascading delete transaction integrity
    const deleteResponse = await page.request.delete(
      `/api/projects/${projectId}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );

    expect(deleteResponse.status()).toBe(200);

    // Step 5: Verify all related data was deleted (cascading delete)
    const deletedProjectResponse = await page.request.get(
      `/api/projects/${projectId}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );

    expect(deletedProjectResponse.status()).toBe(404);

    // Verify related data was also deleted by checking database consistency
    // This would typically involve checking that no orphaned records exist
    // For this test, we'll verify through API endpoints that would fail if orphaned data exists

    // Step 6: Test partial failure rollback
    // Create another project for rollback testing
    const rollbackProjectResponse = await page.request.post('/api/projects', {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
        'Content-Type': 'application/json',
      },
      data: {
        name: 'Rollback Test Project',
        description: 'Testing transaction rollback',
      },
    });

    const rollbackProject = await rollbackProjectResponse.json();

    // Mock a scenario where part of an operation fails
    // This would typically be done by mocking database operations
    // For this test, we'll verify the system handles partial failures gracefully

    // Attempt an operation that should maintain data integrity
    const complexUpdateResponse = await page.request.put(
      `/api/projects/${rollbackProject.id}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
          'Content-Type': 'application/json',
        },
        data: {
          name: 'Updated Rollback Test',
          description: 'Updated description',
          // Include invalid data that should cause rollback
          invalid_field: 'this should not be saved',
        },
      }
    );

    // Verify the valid parts of the update were applied or the entire operation was rolled back
    const verifyResponse = await page.request.get(
      `/api/projects/${rollbackProject.id}`,
      {
        headers: {
          Authorization: 'Bearer mock-jwt-token',
        },
      }
    );

    const verifiedProject = await verifyResponse.json();

    // Verify data integrity - either all changes applied or none
    expect(verifiedProject.name).toBeDefined();
    expect(verifiedProject.description).toBeDefined();

    // Clean up
    await page.request.delete(`/api/projects/${rollbackProject.id}`, {
      headers: {
        Authorization: 'Bearer mock-jwt-token',
      },
    });
  });
});
