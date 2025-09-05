import { test, expect } from '@playwright/test';
import { VisualTester, CrossBrowserTester, RESPONSIVE_BREAKPOINTS } from '../utils/visual-testing';

test.describe('Dashboard Visual Regression Tests', () => {
  let visualTester: VisualTester;
  let crossBrowserTester: CrossBrowserTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new VisualTester(page);
    crossBrowserTester = new CrossBrowserTester(page);
    
    // Navigate to dashboard
    await page.goto('/dashboard');
    
    // Wait for dashboard to load
    await page.waitForSelector('[data-testid="dashboard-container"]');
  });

  test.describe('Dashboard Layout', () => {
    test('should render dashboard layout consistently', async ({ page }) => {
      await visualTester.compareScreenshot('dashboard-full-page', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render dashboard header correctly', async ({ page }) => {
      const header = page.locator('[data-testid="dashboard-header"]');
      await visualTester.compareElementScreenshot(header, 'dashboard-header');
    });

    test('should render dashboard sidebar consistently', async ({ page }) => {
      const sidebar = page.locator('[data-testid="dashboard-sidebar"]');
      await visualTester.compareElementScreenshot(sidebar, 'dashboard-sidebar');
    });

    test('should handle responsive breakpoints', async ({ page }) => {
      await visualTester.testResponsiveComponent(
        'dashboard-layout',
        '[data-testid="dashboard-container"]',
        RESPONSIVE_BREAKPOINTS
      );
    });
  });

  test.describe('Classification Widget', () => {
    test('should render classification widget in completed state', async ({ page }) => {
      // Mock completed classification data
      await page.route('**/api/classification', async route => {
        await route.fulfill({
          json: {
            deviceClass: 'Class II',
            productCode: 'LRH',
            regulatoryPathway: '510(k)',
            confidence: 0.95,
            status: 'completed',
          },
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="classification-widget"]');

      const widget = page.locator('[data-testid="classification-widget"]');
      await visualTester.compareElementScreenshot(widget, 'classification-widget-completed');
    });

    test('should render classification widget in loading state', async ({ page }) => {
      // Mock loading state
      await page.route('**/api/classification', async route => {
        // Delay response to capture loading state
        await new Promise(resolve => setTimeout(resolve, 1000));
        await route.fulfill({ json: { status: 'loading' } });
      });

      await page.reload();
      
      const widget = page.locator('[data-testid="classification-widget"]');
      await visualTester.compareElementScreenshot(widget, 'classification-widget-loading');
    });

    test('should render classification widget in error state', async ({ page }) => {
      await page.route('**/api/classification', async route => {
        await route.fulfill({
          status: 500,
          json: { error: 'Classification failed' },
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="classification-widget"]');

      const widget = page.locator('[data-testid="classification-widget"]');
      await visualTester.compareElementScreenshot(widget, 'classification-widget-error');
    });

    test('should test classification widget states', async ({ page }) => {
      const widget = page.locator('[data-testid="classification-widget"]');

      await visualTester.testComponentStates('classification-widget', '[data-testid="classification-widget"]', {
        'initial': async () => {
          await page.route('**/api/classification', route => route.fulfill({ json: null }));
          await page.reload();
        },
        'high-confidence': async () => {
          await page.route('**/api/classification', route => route.fulfill({
            json: { confidence: 0.95, deviceClass: 'Class II', status: 'completed' }
          }));
          await page.reload();
        },
        'low-confidence': async () => {
          await page.route('**/api/classification', route => route.fulfill({
            json: { confidence: 0.45, deviceClass: 'Class II', status: 'completed' }
          }));
          await page.reload();
        },
      });
    });

    test('should test theme variations', async ({ page }) => {
      await page.waitForSelector('[data-testid="classification-widget"]');
      
      await visualTester.testThemeVariations(
        'classification-widget',
        '[data-testid="classification-widget"]'
      );
    });
  });

  test.describe('Predicate Widget', () => {
    test('should render predicate widget with results', async ({ page }) => {
      // Mock predicate search results
      await page.route('**/api/predicates', async route => {
        await route.fulfill({
          json: {
            predicates: Array.from({ length: 5 }, (_, i) => ({
              kNumber: `K12345${i}`,
              deviceName: `Test Device ${i}`,
              confidenceScore: 0.8 + (i * 0.02),
              status: 'completed',
            })),
          },
        });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="predicate-widget"]');

      const widget = page.locator('[data-testid="predicate-widget"]');
      await visualTester.compareElementScreenshot(widget, 'predicate-widget-with-results');
    });

    test('should render predicate widget empty state', async ({ page }) => {
      await page.route('**/api/predicates', async route => {
        await route.fulfill({ json: { predicates: [] } });
      });

      await page.reload();
      await page.waitForSelector('[data-testid="predicate-widget"]');

      const widget = page.locator('[data-testid="predicate-widget"]');
      await visualTester.compareElementScreenshot(widget, 'predicate-widget-empty');
    });

    test('should test predicate selection states', async ({ page }) => {
      await page.waitForSelector('[data-testid="predicate-widget"]');

      // Test unselected state
      const firstPredicate = page.locator('[data-testid="predicate-item"]').first();
      await visualTester.compareElementScreenshot(firstPredicate, 'predicate-item-unselected');

      // Test hover state
      await firstPredicate.hover();
      await visualTester.compareElementScreenshot(firstPredicate, 'predicate-item-hover');

      // Test selected state
      await firstPredicate.click();
      await visualTester.compareElementScreenshot(firstPredicate, 'predicate-item-selected');
    });

    test('should test predicate widget responsive behavior', async ({ page }) => {
      await page.waitForSelector('[data-testid="predicate-widget"]');
      
      await visualTester.testResponsiveComponent(
        'predicate-widget',
        '[data-testid="predicate-widget"]'
      );
    });
  });

  test.describe('Progress Widget', () => {
    test('should render progress widget with various completion levels', async ({ page }) => {
      const progressLevels = [0, 25, 50, 75, 100];

      for (const progress of progressLevels) {
        await page.route('**/api/progress', async route => {
          await route.fulfill({
            json: {
              overallProgress: progress,
              phases: [
                { name: 'Classification', progress: Math.min(100, progress * 1.5), status: progress > 0 ? 'completed' : 'pending' },
                { name: 'Predicate Search', progress: Math.max(0, progress - 25), status: progress > 25 ? 'in-progress' : 'pending' },
                { name: 'Analysis', progress: Math.max(0, progress - 50), status: progress > 50 ? 'in-progress' : 'pending' },
                { name: 'Documentation', progress: Math.max(0, progress - 75), status: progress > 75 ? 'in-progress' : 'pending' },
              ],
            },
          });
        });

        await page.reload();
        await page.waitForSelector('[data-testid="progress-widget"]');

        const widget = page.locator('[data-testid="progress-widget"]');
        await visualTester.compareElementScreenshot(widget, `progress-widget-${progress}pct`);
      }
    });

    test('should test progress bar animations', async ({ page }) => {
      await page.waitForSelector('[data-testid="progress-widget"]');

      // Test with animations enabled
      const widget = page.locator('[data-testid="progress-widget"]');
      await visualTester.compareElementScreenshot(widget, 'progress-widget-animated', {
        animations: 'allow',
      });

      // Test with animations disabled
      await visualTester.compareElementScreenshot(widget, 'progress-widget-static', {
        animations: 'disabled',
      });
    });
  });

  test.describe('Cross-Browser Compatibility', () => {
    test('should render consistently across browsers', async ({ page, browserName }) => {
      // Test main dashboard elements
      await visualTester.compareScreenshot(`dashboard-${browserName}`, {
        fullPage: true,
        animations: 'disabled',
      });

      // Test form interactions
      const searchForm = page.locator('[data-testid="search-form"]');
      if (await searchForm.count() > 0) {
        await crossBrowserTester.testFormInteractions('[data-testid="search-form"]');
      }

      // Test layout consistency
      await crossBrowserTester.testLayoutConsistency('[data-testid="dashboard-container"]');

      // Test JavaScript API support
      await crossBrowserTester.testJavaScriptAPIs();
    });

    test('should handle touch interactions on mobile', async ({ page, browserName }) => {
      // Skip on desktop browsers
      if (!browserName.includes('mobile') && !browserName.includes('webkit')) {
        test.skip();
      }

      // Test touch interactions on interactive elements
      const interactiveElements = page.locator('button, [role="button"], a');
      const count = await interactiveElements.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = interactiveElements.nth(i);
        await crossBrowserTester.testTouchInteractions(element.toString());
      }
    });
  });

  test.describe('Accessibility Visual Tests', () => {
    test('should render high contrast mode correctly', async ({ page }) => {
      // Enable high contrast mode
      await page.emulateMedia({ forcedColors: 'active' });
      await page.waitForTimeout(500);

      await visualTester.compareScreenshot('dashboard-high-contrast', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render with reduced motion', async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.waitForTimeout(500);

      await visualTester.compareScreenshot('dashboard-reduced-motion', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render focus states correctly', async ({ page }) => {
      const focusableElements = page.locator('button, input, select, textarea, a, [tabindex]');
      const count = await focusableElements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();
        
        await visualTester.compareElementScreenshot(
          element,
          `focus-state-${i}`,
          { animations: 'disabled' }
        );
      }
    });
  });

  test.describe('Error States and Edge Cases', () => {
    test('should render network error states', async ({ page }) => {
      // Simulate network failure
      await page.route('**/api/**', route => route.abort());

      await page.reload();
      await page.waitForTimeout(2000);

      await visualTester.compareScreenshot('dashboard-network-error', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should render loading states', async ({ page }) => {
      // Simulate slow API responses
      await page.route('**/api/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 2000));
        await route.continue();
      });

      await page.reload();
      
      // Capture loading state
      await page.waitForTimeout(500);
      await visualTester.compareScreenshot('dashboard-loading', {
        fullPage: true,
        animations: 'disabled',
      });
    });

    test('should handle empty data states', async ({ page }) => {
      // Mock empty responses
      await page.route('**/api/classification', route => route.fulfill({ json: null }));
      await page.route('**/api/predicates', route => route.fulfill({ json: { predicates: [] } }));
      await page.route('**/api/progress', route => route.fulfill({ json: { overallProgress: 0, phases: [] } }));

      await page.reload();
      await page.waitForSelector('[data-testid="dashboard-container"]');

      await visualTester.compareScreenshot('dashboard-empty-state', {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });
});