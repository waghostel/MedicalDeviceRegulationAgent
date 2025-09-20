import { test, expect } from '@playwright/test';

import {
  VisualTester,
  CrossBrowserTester,
  RESPONSIVE_BREAKPOINTS,
} from '../utils/visual-testing';

test.describe('Forms Visual Regression Tests', () => {
  let visualTester: VisualTester;
  let crossBrowserTester: CrossBrowserTester;

  test.beforeEach(async ({ page }) => {
    visualTester = new VisualTester(page);
    crossBrowserTester = new CrossBrowserTester(page);
  });

  test.describe('Device Information Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/projects/new');
      await page.waitForSelector('[data-testid="device-form"]');
    });

    test('should render device form in initial state', async ({ page }) => {
      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(form, 'device-form-initial');
    });

    test('should render form validation states', async ({ page }) => {
      const form = page.locator('[data-testid="device-form"]');

      // Test empty form validation
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await visualTester.compareElementScreenshot(
        form,
        'device-form-validation-errors'
      );

      // Test individual field validation
      const deviceNameInput = page.locator('#device-name');
      await deviceNameInput.fill('A'); // Too short
      await deviceNameInput.blur();

      await visualTester.compareElementScreenshot(
        deviceNameInput.locator('..'), // Parent container with error
        'device-name-validation-error'
      );

      // Test valid field state
      await deviceNameInput.fill('Valid Device Name');
      await deviceNameInput.blur();

      await visualTester.compareElementScreenshot(
        deviceNameInput.locator('..'),
        'device-name-validation-success'
      );
    });

    test('should render form field focus states', async ({ page }) => {
      const formFields = [
        { selector: '#device-name', name: 'device-name' },
        { selector: '#intended-use', name: 'intended-use' },
        { selector: '#product-code', name: 'product-code' },
      ];

      for (const field of formFields) {
        const element = page.locator(field.selector);
        await element.focus();

        await visualTester.compareElementScreenshot(
          element.locator('..'), // Parent container
          `${field.name}-focus-state`
        );
      }
    });

    test('should render radio button group states', async ({ page }) => {
      const radioGroup = page.locator('[role="radiogroup"]');

      // Initial state
      await visualTester.compareElementScreenshot(
        radioGroup,
        'radio-group-initial'
      );

      // Select each option
      const radioOptions = ['class-1', 'class-2', 'class-3'];

      for (const option of radioOptions) {
        await page.locator(`#${option}`).check();
        await visualTester.compareElementScreenshot(
          radioGroup,
          `radio-group-${option}-selected`
        );
      }
    });

    test('should render checkbox states', async ({ page }) => {
      const checkboxes = page.locator('input[type="checkbox"]');
      const count = await checkboxes.count();

      for (let i = 0; i < count; i++) {
        const checkbox = checkboxes.nth(i);
        const container = checkbox.locator('..');

        // Unchecked state
        await visualTester.compareElementScreenshot(
          container,
          `checkbox-${i}-unchecked`
        );

        // Checked state
        await checkbox.check();
        await visualTester.compareElementScreenshot(
          container,
          `checkbox-${i}-checked`
        );

        // Focus state
        await checkbox.focus();
        await visualTester.compareElementScreenshot(
          container,
          `checkbox-${i}-focus`
        );
      }
    });

    test('should render form responsive behavior', async ({ page }) => {
      await visualTester.testResponsiveComponent(
        'device-form',
        '[data-testid="device-form"]',
        RESPONSIVE_BREAKPOINTS
      );
    });

    test('should render form with filled data', async ({ page }) => {
      // Fill form with sample data
      await page.fill('#device-name', 'Cardiac Monitoring Device');
      await page.fill(
        '#intended-use',
        'This device is intended for continuous monitoring of cardiac rhythm in hospital settings.'
      );
      await page.selectOption('#product-code', 'LRH');
      await page.check('#class-2');
      await page.check('#has-software');

      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(form, 'device-form-filled');
    });
  });

  test.describe('Search Form', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/agent');
      await page.waitForSelector('[data-testid="search-form"]');
    });

    test('should render search form states', async ({ page }) => {
      const searchForm = page.locator('[data-testid="search-form"]');

      // Initial state
      await visualTester.compareElementScreenshot(
        searchForm,
        'search-form-initial'
      );

      // With search query
      const searchInput = page.locator('#search-query');
      await searchInput.fill('cardiac device');
      await visualTester.compareElementScreenshot(
        searchForm,
        'search-form-with-query'
      );

      // Focus state
      await searchInput.focus();
      await visualTester.compareElementScreenshot(
        searchForm,
        'search-form-focus'
      );
    });

    test('should render search filters', async ({ page }) => {
      const filtersSection = page.locator('[data-testid="search-filters"]');

      // Initial filters state
      await visualTester.compareElementScreenshot(
        filtersSection,
        'search-filters-initial'
      );

      // With filters applied
      await page.selectOption('#date-range', 'last-year');
      await page.locator('#confidence-threshold').fill('80');

      await visualTester.compareElementScreenshot(
        filtersSection,
        'search-filters-applied'
      );
    });

    test('should render range slider states', async ({ page }) => {
      const rangeSlider = page.locator('#confidence-threshold');
      const container = rangeSlider.locator('..');

      // Different values
      const values = ['0', '25', '50', '75', '100'];

      for (const value of values) {
        await rangeSlider.fill(value);
        await visualTester.compareElementScreenshot(
          container,
          `range-slider-${value}`
        );
      }

      // Focus state
      await rangeSlider.focus();
      await visualTester.compareElementScreenshot(
        container,
        'range-slider-focus'
      );
    });

    test('should render search results states', async ({ page }) => {
      const searchInput = page.locator('#search-query');
      const resultsContainer = page.locator('[data-testid="search-results"]');

      // Mock search results
      await page.route('**/api/search', async (route) => {
        await route.fulfill({
          json: {
            results: Array.from({ length: 5 }, (_, i) => ({
              kNumber: `K12345${i}`,
              deviceName: `Search Result Device ${i}`,
              confidenceScore: 0.9 - i * 0.1,
            })),
          },
        });
      });

      await searchInput.fill('test device');
      await page.keyboard.press('Enter');

      await page.waitForSelector('[data-testid="search-results"]');
      await visualTester.compareElementScreenshot(
        resultsContainer,
        'search-results-populated'
      );

      // Empty results
      await page.route('**/api/search', async (route) => {
        await route.fulfill({ json: { results: [] } });
      });

      await searchInput.fill('nonexistent device');
      await page.keyboard.press('Enter');

      await page.waitForTimeout(1000);
      await visualTester.compareElementScreenshot(
        resultsContainer,
        'search-results-empty'
      );
    });
  });

  test.describe('Modal and Dialog Forms', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/dashboard');
      await page.waitForSelector('[data-testid="dashboard-container"]');
    });

    test('should render modal form states', async ({ page }) => {
      // Open modal
      const openModalButton = page.locator('[data-testid="open-modal-button"]');
      if ((await openModalButton.count()) > 0) {
        await openModalButton.click();

        const modal = page.locator('[role="dialog"]');
        await modal.waitFor();

        // Modal initial state
        await visualTester.compareElementScreenshot(
          modal,
          'modal-form-initial'
        );

        // Modal with form data
        const modalForm = modal.locator('form');
        if ((await modalForm.count()) > 0) {
          await modalForm.locator('input').first().fill('Test input');
          await visualTester.compareElementScreenshot(
            modal,
            'modal-form-filled'
          );
        }

        // Modal overlay
        await visualTester.compareScreenshot('modal-overlay', {
          fullPage: true,
          animations: 'disabled',
        });
      }
    });

    test('should render confirmation dialogs', async ({ page }) => {
      // Trigger confirmation dialog
      const deleteButton = page.locator('[data-testid="delete-button"]');
      if ((await deleteButton.count()) > 0) {
        await deleteButton.click();

        const confirmDialog = page.locator('[role="alertdialog"]');
        await confirmDialog.waitFor();

        await visualTester.compareElementScreenshot(
          confirmDialog,
          'confirmation-dialog'
        );
      }
    });
  });

  test.describe('Form Accessibility Visual Tests', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/projects/new');
      await page.waitForSelector('[data-testid="device-form"]');
    });

    test('should render high contrast form elements', async ({ page }) => {
      await page.emulateMedia({ forcedColors: 'active' });
      await page.waitForTimeout(500);

      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(
        form,
        'device-form-high-contrast'
      );

      // Test individual form elements in high contrast
      const formElements = [
        { selector: '#device-name', name: 'input-high-contrast' },
        { selector: '#intended-use', name: 'textarea-high-contrast' },
        { selector: '#product-code', name: 'select-high-contrast' },
        { selector: '[role="radiogroup"]', name: 'radio-group-high-contrast' },
      ];

      for (const element of formElements) {
        const el = page.locator(element.selector);
        await visualTester.compareElementScreenshot(el, element.name);
      }
    });

    test('should render form error states with proper contrast', async ({
      page,
    }) => {
      // Trigger validation errors
      const submitButton = page.locator('button[type="submit"]');
      await submitButton.click();

      await page.emulateMedia({ forcedColors: 'active' });
      await page.waitForTimeout(500);

      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(
        form,
        'device-form-errors-high-contrast'
      );
    });

    test('should render focus indicators clearly', async ({ page }) => {
      const focusableElements = page.locator('input, select, textarea, button');
      const count = await focusableElements.count();

      for (let i = 0; i < Math.min(count, 5); i++) {
        const element = focusableElements.nth(i);
        await element.focus();

        // Test both normal and high contrast focus
        await visualTester.compareElementScreenshot(
          element.locator('..'),
          `form-element-focus-${i}`
        );

        await page.emulateMedia({ forcedColors: 'active' });
        await visualTester.compareElementScreenshot(
          element.locator('..'),
          `form-element-focus-high-contrast-${i}`
        );

        await page.emulateMedia({ forcedColors: 'none' });
      }
    });
  });

  test.describe('Cross-Browser Form Compatibility', () => {
    test('should render form elements consistently across browsers', async ({
      page,
      browserName,
    }) => {
      await page.goto('/projects/new');
      await page.waitForSelector('[data-testid="device-form"]');

      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(
        form,
        `device-form-${browserName}`
      );

      // Test form interactions
      await crossBrowserTester.testFormInteractions(
        '[data-testid="device-form"]'
      );

      // Test specific form elements that may render differently
      const criticalElements = [
        { selector: 'select', name: 'select-dropdown' },
        { selector: 'input[type="radio"]', name: 'radio-button' },
        { selector: 'input[type="checkbox"]', name: 'checkbox' },
        { selector: 'textarea', name: 'textarea' },
        { selector: 'input[type="range"]', name: 'range-slider' },
      ];

      for (const element of criticalElements) {
        const el = page.locator(element.selector).first();
        if ((await el.count()) > 0) {
          await visualTester.compareElementScreenshot(
            el.locator('..'),
            `${element.name}-${browserName}`
          );
        }
      }
    });

    test('should handle mobile form interactions', async ({
      page,
      browserName,
    }) => {
      if (!browserName.includes('mobile') && !browserName.includes('webkit')) {
        test.skip();
      }

      await page.goto('/projects/new');
      await page.waitForSelector('[data-testid="device-form"]');

      // Test mobile-specific form behaviors
      const form = page.locator('[data-testid="device-form"]');
      await visualTester.compareElementScreenshot(
        form,
        `device-form-mobile-${browserName}`
      );

      // Test touch interactions on form elements
      const touchElements = page.locator('input, select, textarea, button');
      const count = await touchElements.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const element = touchElements.nth(i);
        await crossBrowserTester.testTouchInteractions(element.toString());
      }

      // Test virtual keyboard behavior (visual impact)
      const textInput = page.locator('input[type="text"]').first();
      await textInput.tap();
      await page.waitForTimeout(500); // Wait for virtual keyboard

      await visualTester.compareScreenshot(`mobile-keyboard-${browserName}`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  });

  test.describe('Dynamic Form Behavior', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/projects/new');
      await page.waitForSelector('[data-testid="device-form"]');
    });

    test('should render conditional form fields', async ({ page }) => {
      const form = page.locator('[data-testid="device-form"]');

      // Initial state
      await visualTester.compareElementScreenshot(
        form,
        'form-conditional-initial'
      );

      // Show conditional fields based on selection
      const softwareCheckbox = page.locator('#has-software');
      await softwareCheckbox.check();

      // Wait for conditional fields to appear
      await page.waitForTimeout(300);
      await visualTester.compareElementScreenshot(
        form,
        'form-conditional-software-shown'
      );

      // Show AI/ML fields
      const aiCheckbox = page.locator('#has-ai');
      await aiCheckbox.check();

      await page.waitForTimeout(300);
      await visualTester.compareElementScreenshot(
        form,
        'form-conditional-ai-shown'
      );
    });

    test('should render form progress indicators', async ({ page }) => {
      // Mock multi-step form
      const progressIndicator = page.locator('[data-testid="form-progress"]');

      if ((await progressIndicator.count()) > 0) {
        // Different progress states
        const progressStates = [0, 25, 50, 75, 100];

        for (const progress of progressStates) {
          await page.evaluate((p) => {
            const indicator = document.querySelector(
              '[data-testid="form-progress"]'
            );
            if (indicator) {
              indicator.setAttribute('data-progress', p.toString());
            }
          }, progress);

          await visualTester.compareElementScreenshot(
            progressIndicator,
            `form-progress-${progress}`
          );
        }
      }
    });

    test('should render auto-save indicators', async ({ page }) => {
      const form = page.locator('[data-testid="device-form"]');

      // Fill form to trigger auto-save
      await page.fill('#device-name', 'Test Device');

      // Mock auto-save states
      const autoSaveStates = ['saving', 'saved', 'error'];

      for (const state of autoSaveStates) {
        await page.evaluate((s) => {
          const form = document.querySelector('[data-testid="device-form"]');
          if (form) {
            form.setAttribute('data-save-state', s);
          }
        }, state);

        await visualTester.compareElementScreenshot(
          form,
          `form-autosave-${state}`
        );
      }
    });
  });
});
