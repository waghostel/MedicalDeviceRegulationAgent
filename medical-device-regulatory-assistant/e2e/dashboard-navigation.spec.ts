import { test, expect } from '@playwright/test';

test.describe('Dashboard Navigation and Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user-123',
            name: 'Test User',
            email: 'test@example.com'
          },
          expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
        })
      });
    });

    // Mock project data
    await page.route('**/api/projects/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/projects/test-project')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'test-project',
            name: 'Test Cardiac Monitor',
            description: 'Advanced cardiac monitoring device',
            device_type: 'Class II Medical Device',
            intended_use: 'Continuous cardiac rhythm monitoring',
            status: 'active',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z'
          })
        });
      } else {
        await route.continue();
      }
    });

    // Mock dashboard widget data
    await page.route('**/api/projects/test-project/classification', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device_class: 'Class II',
          product_code: 'DQK',
          regulatory_pathway: '510(k)',
          confidence: 0.92,
          reasoning: 'Based on intended use and technological characteristics',
          cfr_sections: ['21 CFR 870.2300'],
          status: 'completed'
        })
      });
    });

    await page.route('**/api/projects/test-project/predicates', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            k_number: 'K123456',
            device_name: 'CardioMonitor Pro',
            intended_use: 'Cardiac rhythm monitoring',
            confidence_score: 0.89,
            clearance_date: '2023-06-15'
          },
          {
            k_number: 'K789012',
            device_name: 'HeartTracker Elite',
            intended_use: 'Continuous cardiac monitoring',
            confidence_score: 0.85,
            clearance_date: '2023-08-22'
          }
        ])
      });
    });
  });

  test('Navigation between Project Hub, Dashboard, and Agent Workflow pages', async ({ page }) => {
    // Start at project hub
    await page.goto('/projects');
    
    // Verify project hub loads
    await expect(page.locator('[data-testid="project-hub"]')).toBeVisible();
    await expect(page.locator('[data-testid="projects-list"]')).toBeVisible();
    
    // Take screenshot of project hub
    await page.screenshot({ 
      path: 'test-results/screenshots/15-project-hub.png',
      fullPage: true 
    });

    // Navigate to specific project dashboard
    await page.click('[data-testid="project-card"]:first-child, [data-testid="view-project-button"]:first-child');
    
    // Verify dashboard loads
    await expect(page.locator('[data-testid="project-dashboard"]')).toBeVisible();
    await expect(page.locator('[data-testid="classification-widget"]')).toBeVisible();
    
    // Take screenshot of dashboard
    await page.screenshot({ 
      path: 'test-results/screenshots/16-project-dashboard.png',
      fullPage: true 
    });

    // Navigate to agent workflow
    await page.click('[data-testid="agent-workflow-button"], [data-testid="agent-tab"]');
    
    // Verify agent workflow loads
    await expect(page.locator('[data-testid="agent-interface"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    
    // Take screenshot of agent workflow
    await page.screenshot({ 
      path: 'test-results/screenshots/17-agent-workflow.png',
      fullPage: true 
    });

    // Navigate back to dashboard
    await page.click('[data-testid="dashboard-button"], [data-testid="dashboard-tab"]');
    await expect(page.locator('[data-testid="project-dashboard"]')).toBeVisible();

    // Navigate back to project hub
    await page.click('[data-testid="projects-button"], [data-testid="back-to-projects"]');
    await expect(page.locator('[data-testid="project-hub"]')).toBeVisible();

    // Test breadcrumb navigation if present
    const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
    if (await breadcrumbs.isVisible()) {
      await page.click('[data-testid="project-card"]:first-child');
      await expect(breadcrumbs).toBeVisible();
      await page.click('[data-testid="breadcrumb-projects"]');
      await expect(page.locator('[data-testid="project-hub"]')).toBeVisible();
    }
  });

  test('Widget interactions and state persistence across page transitions', async ({ page }) => {
    await page.goto('/projects/test-project');
    
    // Wait for dashboard to load
    await expect(page.locator('[data-testid="project-dashboard"]')).toBeVisible();

    // Test Classification Widget interactions
    const classificationWidget = page.locator('[data-testid="classification-widget"]');
    await expect(classificationWidget).toBeVisible();
    
    // Check if classification data loads
    await expect(page.locator('[data-testid="device-class"]')).toContainText('Class II');
    await expect(page.locator('[data-testid="confidence-score"]')).toBeVisible();
    
    // Take screenshot of loaded widgets
    await page.screenshot({ 
      path: 'test-results/screenshots/18-dashboard-widgets-loaded.png',
      fullPage: true 
    });

    // Test widget expansion/collapse if available
    const expandButton = page.locator('[data-testid="expand-classification-widget"]');
    if (await expandButton.isVisible()) {
      await expandButton.click();
      await page.screenshot({ 
        path: 'test-results/screenshots/19-expanded-classification-widget.png',
        fullPage: true 
      });
    }

    // Test Predicate Widget interactions
    const predicateWidget = page.locator('[data-testid="predicate-widget"]');
    await expect(predicateWidget).toBeVisible();
    
    // Check predicate data loads
    await expect(page.locator('[data-testid="predicate-card"]')).toBeVisible();
    
    // Select a predicate
    await page.click('[data-testid="predicate-card"]:first-child');
    
    // Verify selection state
    await expect(page.locator('[data-testid="predicate-card"]:first-child')).toHaveClass(/selected|active/);
    
    // Navigate away and back to test state persistence
    await page.click('[data-testid="agent-workflow-button"]');
    await page.waitForSelector('[data-testid="agent-interface"]');
    
    await page.click('[data-testid="dashboard-button"]');
    await page.waitForSelector('[data-testid="project-dashboard"]');
    
    // Verify predicate selection is still active
    await expect(page.locator('[data-testid="predicate-card"]:first-child')).toHaveClass(/selected|active/);
    
    // Test Progress Widget if present
    const progressWidget = page.locator('[data-testid="progress-widget"]');
    if (await progressWidget.isVisible()) {
      await expect(progressWidget).toBeVisible();
      
      // Check progress indicators
      const progressBar = page.locator('[data-testid="progress-bar"]');
      const progressSteps = page.locator('[data-testid="progress-step"]');
      
      if (await progressBar.isVisible()) {
        await expect(progressBar).toBeVisible();
      }
      
      if (await progressSteps.count() > 0) {
        await expect(progressSteps.first()).toBeVisible();
      }
    }
  });

  test('Sidebar navigation and quick actions toolbar functionality', async ({ page }) => {
    await page.goto('/projects/test-project');
    
    // Test sidebar navigation
    const sidebar = page.locator('[data-testid="sidebar"]');
    await expect(sidebar).toBeVisible();
    
    // Test sidebar menu items
    const sidebarItems = [
      'dashboard',
      'agent-workflow', 
      'classification',
      'predicates',
      'documents',
      'settings'
    ];
    
    for (const item of sidebarItems) {
      const menuItem = page.locator(`[data-testid="sidebar-${item}"]`);
      if (await menuItem.isVisible()) {
        await menuItem.click();
        
        // Verify navigation occurred
        await page.waitForTimeout(500);
        
        // Take screenshot of each section
        await page.screenshot({ 
          path: `test-results/screenshots/20-sidebar-${item}.png`,
          fullPage: true 
        });
      }
    }
    
    // Test sidebar collapse/expand
    const sidebarToggle = page.locator('[data-testid="sidebar-toggle"]');
    if (await sidebarToggle.isVisible()) {
      // Collapse sidebar
      await sidebarToggle.click();
      await expect(sidebar).toHaveClass(/collapsed|minimized/);
      
      // Expand sidebar
      await sidebarToggle.click();
      await expect(sidebar).not.toHaveClass(/collapsed|minimized/);
    }
    
    // Test quick actions toolbar
    const quickActionsToolbar = page.locator('[data-testid="quick-actions-toolbar"]');
    if (await quickActionsToolbar.isVisible()) {
      await expect(quickActionsToolbar).toBeVisible();
      
      // Test quick action buttons
      const quickActions = [
        'classify-device',
        'search-predicates',
        'find-guidance',
        'export-report'
      ];
      
      for (const action of quickActions) {
        const actionButton = page.locator(`[data-testid="quick-action-${action}"]`);
        if (await actionButton.isVisible()) {
          await actionButton.click();
          
          // Verify action triggered (modal, navigation, etc.)
          await page.waitForTimeout(1000);
          
          // Close any modals that opened
          const closeButton = page.locator('[data-testid="close-modal"], [data-testid="cancel-button"]');
          if (await closeButton.isVisible()) {
            await closeButton.click();
          } else {
            await page.keyboard.press('Escape');
          }
        }
      }
      
      // Take screenshot of quick actions
      await page.screenshot({ 
        path: 'test-results/screenshots/21-quick-actions-toolbar.png',
        fullPage: true 
      });
    }
  });

  test('Responsive layout changes on tablet and mobile viewports', async ({ page }) => {
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 1024, height: 768, name: 'tablet-landscape' },
      { width: 768, height: 1024, name: 'tablet-portrait' },
      { width: 414, height: 896, name: 'mobile-large' },
      { width: 375, height: 667, name: 'mobile-medium' },
      { width: 320, height: 568, name: 'mobile-small' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.goto('/projects/test-project');
      
      // Wait for layout to adjust
      await page.waitForTimeout(1000);
      
      // Take screenshot of responsive layout
      await page.screenshot({ 
        path: `test-results/screenshots/responsive-dashboard-${viewport.name}.png`,
        fullPage: true 
      });
      
      // Test mobile-specific elements
      if (viewport.width <= 768) {
        // Check for mobile navigation
        const mobileMenu = page.locator('[data-testid="mobile-menu"], [data-testid="hamburger-menu"]');
        if (await mobileMenu.isVisible()) {
          await mobileMenu.click();
          
          // Verify mobile navigation opens
          await expect(page.locator('[data-testid="mobile-navigation"]')).toBeVisible();
          
          // Take screenshot of mobile menu
          await page.screenshot({ 
            path: `test-results/screenshots/mobile-menu-${viewport.name}.png`,
            fullPage: true 
          });
          
          // Close mobile menu
          await mobileMenu.click();
        }
        
        // Test widget stacking on mobile
        const widgets = page.locator('[data-testid*="widget"]');
        const widgetCount = await widgets.count();
        
        if (widgetCount > 0) {
          // Verify widgets stack vertically on mobile
          const firstWidget = widgets.first();
          const secondWidget = widgets.nth(1);
          
          if (await secondWidget.isVisible()) {
            const firstBox = await firstWidget.boundingBox();
            const secondBox = await secondWidget.boundingBox();
            
            if (firstBox && secondBox) {
              // On mobile, second widget should be below first widget
              expect(secondBox.y).toBeGreaterThan(firstBox.y + firstBox.height - 50);
            }
          }
        }
      }
      
      // Test desktop-specific elements
      if (viewport.width >= 1024) {
        // Verify sidebar is visible on desktop
        const sidebar = page.locator('[data-testid="sidebar"]');
        if (await sidebar.isVisible()) {
          await expect(sidebar).toBeVisible();
        }
        
        // Verify widgets are arranged horizontally on desktop
        const widgets = page.locator('[data-testid*="widget"]');
        const widgetCount = await widgets.count();
        
        if (widgetCount >= 2) {
          const firstWidget = widgets.first();
          const secondWidget = widgets.nth(1);
          
          const firstBox = await firstWidget.boundingBox();
          const secondBox = await secondWidget.boundingBox();
          
          if (firstBox && secondBox) {
            // On desktop, widgets might be side by side
            const horizontalLayout = Math.abs(firstBox.y - secondBox.y) < 100;
            const verticalLayout = secondBox.y > firstBox.y + firstBox.height - 50;
            
            // Either layout is acceptable depending on design
            expect(horizontalLayout || verticalLayout).toBeTruthy();
          }
        }
      }
    }
  });

  test('Keyboard navigation and accessibility features', async ({ page }) => {
    await page.goto('/projects/test-project');
    
    // Test keyboard navigation through dashboard
    await page.keyboard.press('Tab');
    
    // Track focus movement through interactive elements
    const interactiveElements = [];
    let attempts = 0;
    
    while (attempts < 20) {
      const focusedElement = page.locator(':focus');
      
      if (await focusedElement.isVisible()) {
        const tagName = await focusedElement.evaluate(el => el.tagName);
        const testId = await focusedElement.getAttribute('data-testid');
        const ariaLabel = await focusedElement.getAttribute('aria-label');
        
        interactiveElements.push({
          tagName,
          testId,
          ariaLabel,
          attempt: attempts
        });
        
        // Test activation with Enter/Space for buttons
        if (tagName === 'BUTTON' && testId?.includes('widget')) {
          await page.keyboard.press('Enter');
          await page.waitForTimeout(500);
        }
      }
      
      await page.keyboard.press('Tab');
      attempts++;
    }
    
    // Verify we found interactive elements
    expect(interactiveElements.length).toBeGreaterThan(0);
    
    // Test skip links if present
    await page.keyboard.press('Home'); // Go to top
    await page.keyboard.press('Tab');
    
    const skipLink = page.locator('[data-testid="skip-to-content"]');
    if (await skipLink.isVisible()) {
      await page.keyboard.press('Enter');
      
      // Verify focus moved to main content
      const mainContent = page.locator('[data-testid="main-content"]');
      if (await mainContent.isVisible()) {
        await expect(mainContent).toBeFocused();
      }
    }
    
    // Test ARIA landmarks and labels
    const landmarks = [
      '[role="main"]',
      '[role="navigation"]',
      '[role="banner"]',
      '[role="complementary"]'
    ];
    
    for (const landmark of landmarks) {
      const element = page.locator(landmark);
      if (await element.isVisible()) {
        await expect(element).toBeVisible();
        
        // Check for accessible name
        const ariaLabel = await element.getAttribute('aria-label');
        const ariaLabelledby = await element.getAttribute('aria-labelledby');
        
        expect(ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
    
    // Test widget accessibility
    const widgets = page.locator('[data-testid*="widget"]');
    const widgetCount = await widgets.count();
    
    for (let i = 0; i < widgetCount; i++) {
      const widget = widgets.nth(i);
      
      // Check for proper heading structure
      const heading = widget.locator('h1, h2, h3, h4, h5, h6').first();
      if (await heading.isVisible()) {
        await expect(heading).toBeVisible();
      }
      
      // Check for ARIA attributes
      const ariaLabel = await widget.getAttribute('aria-label');
      const role = await widget.getAttribute('role');
      
      // Widget should have accessible name or role
      expect(ariaLabel || role).toBeTruthy();
    }
    
    // Take screenshot of accessibility testing
    await page.screenshot({ 
      path: 'test-results/screenshots/22-accessibility-dashboard.png',
      fullPage: true 
    });
  });

  test('Dashboard performance and loading states', async ({ page }) => {
    // Measure initial page load performance
    const startTime = Date.now();
    
    await page.goto('/projects/test-project');
    
    // Wait for dashboard to be fully loaded
    await page.waitForSelector('[data-testid="project-dashboard"]');
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    // Verify reasonable load time (adjust threshold as needed)
    expect(loadTime).toBeLessThan(5000); // 5 seconds
    
    // Test loading states for widgets
    await page.route('**/api/projects/test-project/classification', async (route) => {
      // Add delay to test loading state
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          device_class: 'Class II',
          product_code: 'DQK',
          confidence: 0.92,
          status: 'completed'
        })
      });
    });
    
    // Reload page to test loading states
    await page.reload();
    
    // Verify loading indicators appear
    const loadingSpinner = page.locator('[data-testid="classification-loading"]');
    if (await loadingSpinner.isVisible({ timeout: 1000 })) {
      await expect(loadingSpinner).toBeVisible();
      
      // Take screenshot of loading state
      await page.screenshot({ 
        path: 'test-results/screenshots/23-widget-loading-state.png',
        fullPage: true 
      });
      
      // Wait for loading to complete
      await expect(loadingSpinner).not.toBeVisible({ timeout: 10000 });
    }
    
    // Verify final loaded state
    await expect(page.locator('[data-testid="device-class"]')).toBeVisible();
    
    // Test error states
    await page.route('**/api/projects/test-project/predicates', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    await page.reload();
    
    // Verify error state appears
    const errorMessage = page.locator('[data-testid="predicate-error"]');
    if (await errorMessage.isVisible({ timeout: 5000 })) {
      await expect(errorMessage).toBeVisible();
      
      // Take screenshot of error state
      await page.screenshot({ 
        path: 'test-results/screenshots/24-widget-error-state.png',
        fullPage: true 
      });
      
      // Test retry functionality if available
      const retryButton = page.locator('[data-testid="retry-predicates"]');
      if (await retryButton.isVisible()) {
        await retryButton.click();
        // Error should persist since we're still mocking the error
        await expect(errorMessage).toBeVisible();
      }
    }
  });
});