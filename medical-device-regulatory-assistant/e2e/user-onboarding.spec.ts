import { test, expect } from '@playwright/test';

test.describe('User Onboarding and Project Creation', () => {
  test.beforeEach(async ({ page }) => {
    // Set up mock authentication for testing
    await page.route('**/api/auth/**', async (route) => {
      const url = route.request().url();
      
      if (url.includes('/session')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            user: {
              id: 'test-user-123',
              name: 'Test User',
              email: 'test@example.com',
              image: 'https://example.com/avatar.jpg'
            },
            expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          })
        });
      } else if (url.includes('/signin')) {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: '<html><body>Mock Sign In Page</body></html>'
        });
      } else {
        await route.continue();
      }
    });

    // Mock project creation API
    await page.route('**/api/projects', async (route) => {
      if (route.request().method() === 'POST') {
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'project-123',
            name: requestBody.name,
            description: requestBody.description,
            device_type: requestBody.device_type,
            intended_use: requestBody.intended_use,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
        });
      } else {
        await route.continue();
      }
    });
  });

  test('Complete login flow with Google OAuth simulation', async ({ page }) => {
    // Navigate to the application
    await page.goto('/');

    // Take screenshot of landing page
    await page.screenshot({ 
      path: 'test-results/screenshots/01-landing-page.png',
      fullPage: true 
    });

    // Check if user is already authenticated or needs to sign in
    const signInButton = page.locator('[data-testid="sign-in-button"]');
    const createProjectButton = page.locator('[data-testid="create-project-button"]');

    if (await signInButton.isVisible()) {
      // Click sign in button
      await signInButton.click();

      // Take screenshot of sign in process
      await page.screenshot({ 
        path: 'test-results/screenshots/02-sign-in-page.png',
        fullPage: true 
      });

      // Simulate OAuth redirect back to app
      await page.goto('/?authenticated=true');
    }

    // Verify user is authenticated and can see main interface
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 10000 });
    await expect(createProjectButton).toBeVisible();

    // Take screenshot of authenticated state
    await page.screenshot({ 
      path: 'test-results/screenshots/03-authenticated-dashboard.png',
      fullPage: true 
    });
  });

  test('New user welcome experience and initial project setup', async ({ page }) => {
    await page.goto('/');

    // Check for new user welcome message or tutorial
    const welcomeMessage = page.locator('[data-testid="welcome-message"]');
    const tutorialModal = page.locator('[data-testid="tutorial-modal"]');
    const gettingStartedGuide = page.locator('[data-testid="getting-started"]');

    // Handle welcome experience if present
    if (await welcomeMessage.isVisible()) {
      await expect(welcomeMessage).toContainText('Welcome');
      await page.screenshot({ 
        path: 'test-results/screenshots/04-welcome-message.png',
        fullPage: true 
      });
    }

    if (await tutorialModal.isVisible()) {
      // Take screenshot of tutorial
      await page.screenshot({ 
        path: 'test-results/screenshots/05-tutorial-modal.png',
        fullPage: true 
      });
      
      // Close tutorial or complete it
      const skipButton = page.locator('[data-testid="skip-tutorial"]');
      const nextButton = page.locator('[data-testid="tutorial-next"]');
      
      if (await skipButton.isVisible()) {
        await skipButton.click();
      } else if (await nextButton.isVisible()) {
        // Go through tutorial steps
        while (await nextButton.isVisible()) {
          await nextButton.click();
          await page.waitForTimeout(1000);
        }
      }
    }

    // Verify user can access getting started guide
    if (await gettingStartedGuide.isVisible()) {
      await expect(gettingStartedGuide).toBeVisible();
      await page.screenshot({ 
        path: 'test-results/screenshots/06-getting-started-guide.png',
        fullPage: true 
      });
    }

    // Verify main navigation is accessible
    await expect(page.locator('[data-testid="main-navigation"]')).toBeVisible();
    await expect(page.locator('[data-testid="create-project-button"]')).toBeVisible();
  });

  test('Project creation form with validation and success feedback', async ({ page }) => {
    await page.goto('/');

    // Click create project button
    await page.click('[data-testid="create-project-button"]');

    // Verify project creation form opens
    await expect(page.locator('[data-testid="project-creation-form"]')).toBeVisible();
    
    // Take screenshot of empty form
    await page.screenshot({ 
      path: 'test-results/screenshots/07-project-creation-form.png',
      fullPage: true 
    });

    // Test form validation - submit empty form
    await page.click('[data-testid="create-project-submit"]');

    // Verify validation errors appear
    await expect(page.locator('[data-testid="project-name-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-name-error"]')).toContainText('required');

    // Take screenshot of validation errors
    await page.screenshot({ 
      path: 'test-results/screenshots/08-form-validation-errors.png',
      fullPage: true 
    });

    // Fill out the form with valid data
    await page.fill('[data-testid="project-name"]', 'CardioProbe X1 Monitor');
    await page.fill('[data-testid="project-description"]', 'Advanced cardiac monitoring device with real-time analysis capabilities');
    await page.fill('[data-testid="device-type"]', 'Class II Medical Device');
    await page.fill('[data-testid="intended-use"]', 'Continuous monitoring of cardiac rhythm and detection of arrhythmias in hospital settings');

    // Take screenshot of filled form
    await page.screenshot({ 
      path: 'test-results/screenshots/09-filled-project-form.png',
      fullPage: true 
    });

    // Submit the form
    await page.click('[data-testid="create-project-submit"]');

    // Verify success feedback
    const successMessage = page.locator('[data-testid="project-creation-success"]');
    const loadingSpinner = page.locator('[data-testid="project-creation-loading"]');

    // Check for loading state
    if (await loadingSpinner.isVisible()) {
      await expect(loadingSpinner).toBeVisible();
      await page.screenshot({ 
        path: 'test-results/screenshots/10-project-creation-loading.png',
        fullPage: true 
      });
    }

    // Wait for success message or redirect
    await expect(successMessage.or(page.locator('[data-testid="project-dashboard"]'))).toBeVisible({ timeout: 10000 });

    if (await successMessage.isVisible()) {
      await expect(successMessage).toContainText('successfully created');
      await page.screenshot({ 
        path: 'test-results/screenshots/11-project-creation-success.png',
        fullPage: true 
      });
    }
  });

  test('Navigation to newly created project dashboard', async ({ page }) => {
    await page.goto('/');

    // Create a project first
    await page.click('[data-testid="create-project-button"]');
    await page.fill('[data-testid="project-name"]', 'NeuroStim Device Pro');
    await page.fill('[data-testid="project-description"]', 'Advanced neurostimulation device for chronic pain management');
    await page.fill('[data-testid="device-type"]', 'Class III Medical Device');
    await page.fill('[data-testid="intended-use"]', 'Electrical stimulation for chronic pain relief in adult patients');
    await page.click('[data-testid="create-project-submit"]');

    // Wait for project creation to complete
    await page.waitForSelector('[data-testid="project-dashboard"], [data-testid="project-creation-success"]', { timeout: 10000 });

    // Navigate to project dashboard if not already there
    const projectDashboard = page.locator('[data-testid="project-dashboard"]');
    if (!(await projectDashboard.isVisible())) {
      // Look for navigation to project or "View Project" button
      const viewProjectButton = page.locator('[data-testid="view-project-button"]');
      const projectLink = page.locator('[data-testid="project-link"]');
      
      if (await viewProjectButton.isVisible()) {
        await viewProjectButton.click();
      } else if (await projectLink.isVisible()) {
        await projectLink.click();
      } else {
        // Navigate directly to project dashboard
        await page.goto('/projects/project-123');
      }
    }

    // Verify project dashboard loads correctly
    await expect(projectDashboard).toBeVisible();
    
    // Take screenshot of project dashboard
    await page.screenshot({ 
      path: 'test-results/screenshots/12-project-dashboard.png',
      fullPage: true 
    });

    // Verify project details are displayed
    await expect(page.locator('[data-testid="project-name-display"]')).toContainText('NeuroStim Device Pro');
    await expect(page.locator('[data-testid="project-description-display"]')).toContainText('neurostimulation');

    // Verify dashboard widgets are present
    await expect(page.locator('[data-testid="classification-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="predicate-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="progress-widget"]')).toBeVisible();

    // Verify navigation elements
    await expect(page.locator('[data-testid="agent-workflow-button"]')).toBeVisible();
    await expect(page.locator('[data-testid="project-settings-button"]')).toBeVisible();

    // Test navigation between dashboard sections
    const dashboardTab = page.locator('[data-testid="dashboard-tab"]');
    const overviewTab = page.locator('[data-testid="overview-tab"]');
    
    if (await overviewTab.isVisible()) {
      await overviewTab.click();
      await page.screenshot({ 
        path: 'test-results/screenshots/13-project-overview.png',
        fullPage: true 
      });
    }

    if (await dashboardTab.isVisible()) {
      await dashboardTab.click();
      await expect(page.locator('[data-testid="classification-widget"]')).toBeVisible();
    }
  });

  test('Visual regression testing for key onboarding steps', async ({ page }) => {
    // Test different viewport sizes for responsive design
    const viewports = [
      { width: 1920, height: 1080, name: 'desktop' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 375, height: 667, name: 'mobile' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      
      // Landing page
      await page.goto('/');
      await page.screenshot({ 
        path: `test-results/screenshots/landing-${viewport.name}.png`,
        fullPage: true 
      });

      // Project creation form
      await page.click('[data-testid="create-project-button"]');
      await page.screenshot({ 
        path: `test-results/screenshots/project-form-${viewport.name}.png`,
        fullPage: true 
      });

      // Close form for next iteration
      const closeButton = page.locator('[data-testid="close-form"], [data-testid="cancel-button"]');
      if (await closeButton.isVisible()) {
        await closeButton.click();
      } else {
        await page.keyboard.press('Escape');
      }
    }
  });

  test('Keyboard navigation and accessibility during onboarding', async ({ page }) => {
    await page.goto('/');

    // Test keyboard navigation
    await page.keyboard.press('Tab');
    
    // Verify focus is visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();

    // Navigate to create project button using keyboard
    let attempts = 0;
    while (attempts < 10) {
      const currentFocus = await page.locator(':focus').getAttribute('data-testid');
      if (currentFocus === 'create-project-button') {
        break;
      }
      await page.keyboard.press('Tab');
      attempts++;
    }

    // Activate create project with Enter key
    await page.keyboard.press('Enter');
    await expect(page.locator('[data-testid="project-creation-form"]')).toBeVisible();

    // Test form navigation with keyboard
    await page.keyboard.press('Tab'); // Should focus first form field
    await page.keyboard.type('Keyboard Navigation Test Project');
    
    await page.keyboard.press('Tab'); // Move to next field
    await page.keyboard.type('Testing keyboard accessibility in project creation');

    // Verify ARIA labels and accessibility attributes
    await expect(page.locator('[data-testid="project-name"]')).toHaveAttribute('aria-label');
    await expect(page.locator('[data-testid="project-description"]')).toHaveAttribute('aria-label');

    // Test form submission with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Enter'); // Submit form

    // Take screenshot of accessibility testing
    await page.screenshot({ 
      path: 'test-results/screenshots/14-accessibility-testing.png',
      fullPage: true 
    });
  });
});