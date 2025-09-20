import { test, expect } from '@playwright/test';

test.describe('Error Handling and Edge Cases', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: '1',
            name: 'Test User',
            email: 'test@example.com',
            image: 'https://example.com/avatar.jpg',
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        }),
      });
    });

    // Navigate to dashboard
    await page.goto('/dashboard');
  });

  test.describe('Network Failure Scenarios', () => {
    test('should handle API timeout gracefully', async ({ page }) => {
      // Mock slow API response
      await page.route('**/api/projects', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 10000)); // 10s delay
        await route.fulfill({
          status: 408,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Request timeout' }),
        });
      });

      // Trigger API call
      await page.click('[data-testid="refresh-projects"]');

      // Should show timeout error message
      await expect(page.locator('[data-testid="error-message"]')).toContainText(
        'Request timeout'
      );

      // Should show retry button
      await expect(page.locator('[data-testid="retry-button"]')).toBeVisible();
    });

    test('should handle network disconnection', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', async (route) => {
        await route.abort('failed');
      });

      // Try to create a new project
      await page.click('[data-testid="new-project-button"]');
      await page.fill('[data-testid="project-name-input"]', 'Test Project');
      await page.fill(
        '[data-testid="project-description-input"]',
        'Test Description'
      );
      await page.click('[data-testid="create-project-submit"]');

      // Should show network error
      await expect(page.locator('[data-testid="network-error"]')).toContainText(
        'Network connection failed'
      );

      // Should keep form data intact
      await expect(
        page.locator('[data-testid="project-name-input"]')
      ).toHaveValue('Test Project');
    });

    test('should handle offline functionality', async ({ page, context }) => {
      // Go offline
      await context.setOffline(true);

      // Should show offline indicator
      await expect(
        page.locator('[data-testid="offline-indicator"]')
      ).toBeVisible();

      // Should disable network-dependent actions
      await expect(
        page.locator('[data-testid="new-project-button"]')
      ).toBeDisabled();

      // Should show cached data if available
      await expect(
        page.locator('[data-testid="cached-projects"]')
      ).toBeVisible();

      // Go back online
      await context.setOffline(false);

      // Should hide offline indicator
      await expect(
        page.locator('[data-testid="offline-indicator"]')
      ).not.toBeVisible();

      // Should re-enable actions
      await expect(
        page.locator('[data-testid="new-project-button"]')
      ).toBeEnabled();
    });
  });

  test.describe('API Error Handling', () => {
    test('should handle 500 server errors', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal server error' }),
        });
      });

      await page.click('[data-testid="refresh-projects"]');

      await expect(page.locator('[data-testid="server-error"]')).toContainText(
        'Server error occurred'
      );
      await expect(
        page.locator('[data-testid="contact-support"]')
      ).toBeVisible();
    });

    test('should handle 401 unauthorized errors', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Unauthorized' }),
        });
      });

      await page.click('[data-testid="refresh-projects"]');

      // Should redirect to login
      await expect(page).toHaveURL(/.*\/auth\/signin/);
    });

    test('should handle 403 forbidden errors', async ({ page }) => {
      await page.route('**/api/projects/1', async (route) => {
        await route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Access denied' }),
        });
      });

      await page.click('[data-testid="project-1"]');

      await expect(page.locator('[data-testid="access-denied"]')).toContainText(
        'Access denied'
      );
      await expect(
        page.locator('[data-testid="back-to-dashboard"]')
      ).toBeVisible();
    });

    test('should handle rate limiting (429)', async ({ page }) => {
      await page.route('**/api/agent/chat', async (route) => {
        await route.fulfill({
          status: 429,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Rate limit exceeded',
            retryAfter: 60,
          }),
        });
      });

      // Navigate to agent workflow
      await page.goto('/agent');

      // Try to send a message
      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');

      await expect(
        page.locator('[data-testid="rate-limit-error"]')
      ).toContainText('Rate limit exceeded');
      await expect(
        page.locator('[data-testid="retry-countdown"]')
      ).toBeVisible();
    });
  });

  test.describe('Form Validation and Error States', () => {
    test('should handle form validation errors', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]');

      // Submit empty form
      await page.click('[data-testid="create-project-submit"]');

      // Should show validation errors
      await expect(page.locator('[data-testid="name-error"]')).toContainText(
        'Project name is required'
      );
      await expect(
        page.locator('[data-testid="description-error"]')
      ).toContainText('Description is required');

      // Form should remain open
      await expect(
        page.locator('[data-testid="new-project-dialog"]')
      ).toBeVisible();
    });

    test('should handle server-side validation errors', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Validation failed',
            details: {
              name: 'Project name already exists',
              description: 'Description too long',
            },
          }),
        });
      });

      await page.click('[data-testid="new-project-button"]');
      await page.fill('[data-testid="project-name-input"]', 'Existing Project');
      await page.fill(
        '[data-testid="project-description-input"]',
        'A'.repeat(1000)
      );
      await page.click('[data-testid="create-project-submit"]');

      await expect(
        page.locator('[data-testid="name-server-error"]')
      ).toContainText('Project name already exists');
      await expect(
        page.locator('[data-testid="description-server-error"]')
      ).toContainText('Description too long');
    });

    test('should handle file upload errors', async ({ page }) => {
      await page.goto('/agent');

      // Mock file upload error
      await page.route('**/api/upload', async (route) => {
        await route.fulfill({
          status: 413,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'File too large' }),
        });
      });

      // Try to upload a file
      const fileInput = page.locator('[data-testid="file-upload-input"]');
      await fileInput.setInputFiles({
        name: 'large-file.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.alloc(10 * 1024 * 1024), // 10MB file
      });

      await expect(page.locator('[data-testid="upload-error"]')).toContainText(
        'File too large'
      );
      await expect(
        page.locator('[data-testid="file-size-limit"]')
      ).toBeVisible();
    });
  });

  test.describe('Browser Refresh and State Recovery', () => {
    test('should recover form state after refresh', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]');
      await page.fill('[data-testid="project-name-input"]', 'Test Project');
      await page.fill(
        '[data-testid="project-description-input"]',
        'Test Description'
      );

      // Refresh the page
      await page.reload();

      // Should show recovery dialog
      await expect(
        page.locator('[data-testid="form-recovery-dialog"]')
      ).toBeVisible();

      // Click restore
      await page.click('[data-testid="restore-form-data"]');

      // Form should be restored
      await expect(
        page.locator('[data-testid="project-name-input"]')
      ).toHaveValue('Test Project');
      await expect(
        page.locator('[data-testid="project-description-input"]')
      ).toHaveValue('Test Description');
    });

    test('should handle refresh during ongoing operations', async ({
      page,
    }) => {
      // Mock slow project creation
      await page.route('**/api/projects', async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: '1', name: 'Test Project' }),
        });
      });

      await page.click('[data-testid="new-project-button"]');
      await page.fill('[data-testid="project-name-input"]', 'Test Project');
      await page.click('[data-testid="create-project-submit"]');

      // Wait for loading state
      await expect(
        page.locator('[data-testid="creating-project"]')
      ).toBeVisible();

      // Refresh during operation
      await page.reload();

      // Should show operation recovery dialog
      await expect(
        page.locator('[data-testid="operation-recovery"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="check-operation-status"]')
      ).toBeVisible();
    });

    test('should maintain agent conversation context after refresh', async ({
      page,
    }) => {
      await page.goto('/agent');

      // Send a message
      await page.fill('[data-testid="chat-input"]', 'Classify my device');
      await page.click('[data-testid="send-button"]');

      // Wait for response
      await expect(
        page.locator('[data-testid="agent-response"]')
      ).toBeVisible();

      // Refresh page
      await page.reload();

      // Conversation should be restored
      await expect(page.locator('[data-testid="chat-message"]')).toContainText(
        'Classify my device'
      );
      await expect(
        page.locator('[data-testid="agent-response"]')
      ).toBeVisible();
    });
  });

  test.describe('Concurrent User Sessions and Data Conflicts', () => {
    test('should handle concurrent project edits', async ({
      page,
      context,
    }) => {
      // Create second page (simulating another user)
      const page2 = await context.newPage();

      // Both pages navigate to same project
      await page.goto('/projects/1/edit');
      await page2.goto('/projects/1/edit');

      // First user makes changes
      await page.fill(
        '[data-testid="project-name-input"]',
        'Updated by User 1'
      );
      await page.click('[data-testid="save-project"]');

      // Second user tries to save conflicting changes
      await page2.fill(
        '[data-testid="project-name-input"]',
        'Updated by User 2'
      );
      await page2.click('[data-testid="save-project"]');

      // Should show conflict resolution dialog
      await expect(
        page2.locator('[data-testid="conflict-dialog"]')
      ).toBeVisible();
      await expect(
        page2.locator('[data-testid="conflict-options"]')
      ).toBeVisible();

      await page2.close();
    });

    test('should handle real-time updates from other users', async ({
      page,
      context,
    }) => {
      const page2 = await context.newPage();

      await page.goto('/dashboard');
      await page2.goto('/dashboard');

      // Simulate project creation from another user
      await page2.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: '2',
            name: 'New Project from User 2',
            createdBy: 'user2@example.com',
          }),
        });
      });

      // Create project on page2
      await page2.click('[data-testid="new-project-button"]');
      await page2.fill(
        '[data-testid="project-name-input"]',
        'New Project from User 2'
      );
      await page2.click('[data-testid="create-project-submit"]');

      // Page1 should receive real-time update
      await expect(page.locator('[data-testid="project-2"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="new-project-notification"]')
      ).toBeVisible();

      await page2.close();
    });
  });

  test.describe('Agent and AI Error Scenarios', () => {
    test('should handle AI service unavailable', async ({ page }) => {
      await page.goto('/agent');

      await page.route('**/api/agent/**', async (route) => {
        await route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'AI service unavailable' }),
        });
      });

      await page.fill(
        '[data-testid="chat-input"]',
        'Help me classify my device'
      );
      await page.click('[data-testid="send-button"]');

      await expect(
        page.locator('[data-testid="ai-service-error"]')
      ).toContainText('AI service is currently unavailable');
      await expect(
        page.locator('[data-testid="fallback-options"]')
      ).toBeVisible();
    });

    test('should handle malformed AI responses', async ({ page }) => {
      await page.goto('/agent');

      await page.route('**/api/agent/chat', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: 'invalid json response',
        });
      });

      await page.fill('[data-testid="chat-input"]', 'Test message');
      await page.click('[data-testid="send-button"]');

      await expect(
        page.locator('[data-testid="response-error"]')
      ).toContainText('Unable to process AI response');
      await expect(page.locator('[data-testid="retry-message"]')).toBeVisible();
    });

    test('should handle streaming response interruption', async ({ page }) => {
      await page.goto('/agent');

      // Mock interrupted streaming response
      await page.route('**/api/agent/stream', async (route) => {
        const response = new Response(
          new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode('data: {"partial": "response"}\n\n')
              );
              // Simulate connection drop
              controller.error(new Error('Connection lost'));
            },
          }),
          {
            status: 200,
            headers: { 'Content-Type': 'text/event-stream' },
          }
        );
        await route.fulfill(response);
      });

      await page.fill('[data-testid="chat-input"]', 'Start streaming response');
      await page.click('[data-testid="send-button"]');

      await expect(
        page.locator('[data-testid="stream-interrupted"]')
      ).toContainText('Response was interrupted');
      await expect(page.locator('[data-testid="retry-stream"]')).toBeVisible();
    });
  });

  test.describe('Data Validation and Edge Cases', () => {
    test('should handle empty API responses', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([]),
        });
      });

      await page.goto('/dashboard');

      await expect(
        page.locator('[data-testid="empty-projects"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="create-first-project"]')
      ).toBeVisible();
    });

    test('should handle malformed data responses', async ({ page }) => {
      await page.route('**/api/projects', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            projects: [
              { id: null, name: '', description: undefined },
              { id: '2', name: 'Valid Project' },
            ],
          }),
        });
      });

      await page.goto('/dashboard');

      // Should filter out invalid data and show valid projects
      await expect(page.locator('[data-testid="project-2"]')).toBeVisible();
      await expect(
        page.locator('[data-testid="data-validation-warning"]')
      ).toBeVisible();
    });

    test('should handle extremely long text inputs', async ({ page }) => {
      await page.click('[data-testid="new-project-button"]');

      const longText = 'A'.repeat(10000);
      await page.fill('[data-testid="project-description-input"]', longText);

      // Should show character limit warning
      await expect(
        page.locator('[data-testid="character-limit-warning"]')
      ).toBeVisible();

      // Should truncate on submit
      await page.fill('[data-testid="project-name-input"]', 'Test Project');
      await page.click('[data-testid="create-project-submit"]');

      await expect(
        page.locator('[data-testid="text-truncated-notice"]')
      ).toBeVisible();
    });
  });

  test.describe('Browser Compatibility and Edge Cases', () => {
    test('should handle unsupported browser features gracefully', async ({
      page,
    }) => {
      // Mock missing WebSocket support
      await page.addInitScript(() => {
        delete (window as any).WebSocket;
      });

      await page.goto('/agent');

      await expect(
        page.locator('[data-testid="websocket-fallback"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="polling-mode-notice"]')
      ).toContainText('Using polling mode');
    });

    test('should handle localStorage unavailable', async ({ page }) => {
      // Mock localStorage failure
      await page.addInitScript(() => {
        Object.defineProperty(window, 'localStorage', {
          value: {
            getItem: () => {
              throw new Error('localStorage unavailable');
            },
            setItem: () => {
              throw new Error('localStorage unavailable');
            },
            removeItem: () => {
              throw new Error('localStorage unavailable');
            },
          },
        });
      });

      await page.goto('/dashboard');

      await expect(
        page.locator('[data-testid="storage-fallback"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="session-only-notice"]')
      ).toContainText('Data will not persist');
    });

    test('should handle memory constraints', async ({ page }) => {
      // Simulate low memory by creating large objects
      await page.addInitScript(() => {
        const largeArray = new Array(1000000).fill('memory test');
        (window as any).memoryTest = largeArray;
      });

      await page.goto('/agent');

      // Try to load large conversation history
      await page.route('**/api/conversations/history', async (route) => {
        const largeHistory = new Array(1000).fill({
          id: 'msg',
          content: 'A'.repeat(1000),
          timestamp: new Date().toISOString(),
        });

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(largeHistory),
        });
      });

      await page.click('[data-testid="load-history"]');

      // Should show memory optimization notice
      await expect(
        page.locator('[data-testid="memory-optimization"]')
      ).toBeVisible();
      await expect(
        page.locator('[data-testid="pagination-enabled"]')
      ).toBeVisible();
    });
  });
});
