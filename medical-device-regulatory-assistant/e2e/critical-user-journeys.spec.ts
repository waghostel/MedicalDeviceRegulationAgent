import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication for testing
    await page.goto('/');
  });

  test('Complete 510(k) Predicate Search Workflow', async ({ page }) => {
    // Test the primary user workflow: predicate search

    // 1. Navigate to project creation
    await page.click('[data-testid="create-project-button"]');

    // 2. Fill out project details
    await page.fill('[data-testid="project-name"]', 'Test Cardiac Monitor');
    await page.fill(
      '[data-testid="project-description"]',
      'Continuous cardiac monitoring device'
    );
    await page.fill('[data-testid="device-type"]', 'Class II Medical Device');
    await page.fill(
      '[data-testid="intended-use"]',
      'Continuous monitoring of cardiac rhythm'
    );

    // 3. Create project
    await page.click('[data-testid="create-project-submit"]');

    // 4. Verify project dashboard loads
    await expect(
      page.locator('[data-testid="project-dashboard"]')
    ).toBeVisible();

    // 5. Navigate to agent workflow
    await page.click('[data-testid="agent-workflow-button"]');

    // 6. Execute predicate search
    await page.fill(
      '[data-testid="chat-input"]',
      '/predicate-search cardiac monitor continuous rhythm'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 7. Wait for search results
    await expect(page.locator('[data-testid="predicate-results"]')).toBeVisible(
      { timeout: 30000 }
    );

    // 8. Verify confidence scores are displayed
    await expect(
      page.locator('[data-testid="confidence-score"]')
    ).toBeVisible();

    // 9. Select a predicate for comparison
    await page.click('[data-testid="predicate-card"]:first-child');

    // 10. Verify comparison table loads
    await expect(
      page.locator('[data-testid="comparison-table"]')
    ).toBeVisible();

    // 11. Export results
    await page.click('[data-testid="export-report-button"]');

    // 12. Verify audit trail is created
    await page.click('[data-testid="audit-trail-button"]');
    await expect(page.locator('[data-testid="audit-log-entry"]')).toBeVisible();
  });

  test('Device Classification Workflow', async ({ page }) => {
    // Test device classification functionality

    // 1. Create a project (reuse helper function in real implementation)
    await page.goto('/projects/new');
    await page.fill('[data-testid="project-name"]', 'Novel Surgical Robot');
    await page.fill('[data-testid="device-type"]', 'Robotic Surgical System');
    await page.fill(
      '[data-testid="intended-use"]',
      'Computer-assisted surgical procedures'
    );
    await page.click('[data-testid="create-project-submit"]');

    // 2. Navigate to classification
    await page.click('[data-testid="classify-device-button"]');

    // 3. Execute classification
    await page.fill(
      '[data-testid="chat-input"]',
      '/classify-device robotic surgical system computer-assisted'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 4. Verify classification results
    await expect(page.locator('[data-testid="device-class"]')).toBeVisible({
      timeout: 20000,
    });
    await expect(page.locator('[data-testid="product-code"]')).toBeVisible();
    await expect(
      page.locator('[data-testid="regulatory-pathway"]')
    ).toBeVisible();

    // 5. Verify confidence score
    const confidenceScore = await page
      .locator('[data-testid="classification-confidence"]')
      .textContent();
    expect(parseFloat(confidenceScore || '0')).toBeGreaterThan(0.5);
  });

  test('FDA Guidance Document Search', async ({ page }) => {
    // Test guidance document search functionality

    await page.goto('/projects/test-project/agent');

    // 1. Search for guidance documents
    await page.fill(
      '[data-testid="chat-input"]',
      '/find-guidance cybersecurity medical devices'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 2. Verify guidance results
    await expect(page.locator('[data-testid="guidance-results"]')).toBeVisible({
      timeout: 15000,
    });

    // 3. Verify source citations
    await expect(page.locator('[data-testid="source-citation"]')).toBeVisible();

    // 4. Click on guidance document link
    const guidanceLink = page.locator('[data-testid="guidance-link"]').first();
    await expect(guidanceLink).toHaveAttribute('href', /fda\.gov/);
  });

  test('Real-time Dashboard Updates', async ({ page }) => {
    // Test dashboard real-time updates

    await page.goto('/projects/test-project');

    // 1. Verify initial dashboard state
    await expect(
      page.locator('[data-testid="classification-widget"]')
    ).toBeVisible();
    await expect(
      page.locator('[data-testid="predicate-widget"]')
    ).toBeVisible();

    // 2. Navigate to agent and perform action
    await page.click('[data-testid="agent-workflow-button"]');
    await page.fill(
      '[data-testid="chat-input"]',
      '/classify-device test device'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 3. Wait for completion and return to dashboard
    await page.waitForSelector('[data-testid="classification-complete"]', {
      timeout: 30000,
    });
    await page.click('[data-testid="dashboard-button"]');

    // 4. Verify dashboard updated
    await expect(
      page.locator('[data-testid="classification-status"]')
    ).toHaveText('Completed');
  });

  test('Error Handling and Recovery', async ({ page }) => {
    // Test error scenarios and recovery

    await page.goto('/projects/test-project/agent');

    // 1. Test invalid command
    await page.fill('[data-testid="chat-input"]', '/invalid-command');
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 2. Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toBeVisible();

    // 3. Test recovery with valid command
    await page.fill(
      '[data-testid="chat-input"]',
      '/predicate-search valid device'
    );
    await page.press('[data-testid="chat-input"]', 'Enter');

    // 4. Verify recovery
    await expect(page.locator('[data-testid="predicate-results"]')).toBeVisible(
      { timeout: 30000 }
    );
  });

  test('Mobile Responsiveness', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');

    // 1. Verify mobile navigation
    await expect(
      page.locator('[data-testid="mobile-menu-button"]')
    ).toBeVisible();

    // 2. Test mobile project creation
    await page.click('[data-testid="mobile-menu-button"]');
    await page.click('[data-testid="create-project-mobile"]');

    // 3. Verify mobile form layout
    await expect(page.locator('[data-testid="mobile-form"]')).toBeVisible();
  });

  test('Accessibility Compliance', async ({ page }) => {
    // Test accessibility features

    await page.goto('/');

    // 1. Test keyboard navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter');

    // 2. Verify focus management
    const focusedElement = await page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // 3. Test screen reader compatibility (aria labels)
    await expect(
      page.locator('[aria-label="Create new project"]')
    ).toBeVisible();
  });

  test('Performance Benchmarks', async ({ page }) => {
    // Test performance metrics

    const startTime = Date.now();

    // 1. Navigate to dashboard
    await page.goto('/projects/test-project');

    // 2. Measure load time
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // 3. Verify performance targets
    expect(loadTime).toBeLessThan(3000); // 3 second target

    // 4. Test agent response time
    const agentStartTime = Date.now();
    await page.click('[data-testid="agent-workflow-button"]');
    await page.fill('[data-testid="chat-input"]', '/classify-device test');
    await page.press('[data-testid="chat-input"]', 'Enter');

    await page.waitForSelector('[data-testid="agent-response"]', {
      timeout: 10000,
    });
    const agentResponseTime = Date.now() - agentStartTime;

    expect(agentResponseTime).toBeLessThan(10000); // 10 second target for classification
  });
});
