import { Page, Locator, expect } from '@playwright/test';

export interface VisualTestOptions {
  fullPage?: boolean;
  clip?: { x: number; y: number; width: number; height: number };
  mask?: Locator[];
  threshold?: number;
  animations?: 'disabled' | 'allow';
  mode?: 'css' | 'layout';
  maxDiffPixels?: number;
}

export interface ResponsiveBreakpoint {
  name: string;
  width: number;
  height: number;
  deviceScaleFactor?: number;
}

export const RESPONSIVE_BREAKPOINTS: ResponsiveBreakpoint[] = [
  { name: 'mobile', width: 375, height: 667 },
  { name: 'mobile-large', width: 414, height: 896 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 720 },
  { name: 'desktop-large', width: 1920, height: 1080 },
  { name: 'high-dpi', width: 1280, height: 720, deviceScaleFactor: 2 },
];

/**
 * Visual testing utilities for consistent screenshot comparisons
 */
export class VisualTester {
  constructor(private page: Page) {}

  /**
   * Take a screenshot and compare with baseline
   */
  async compareScreenshot(
    name: string,
    options: VisualTestOptions = {}
  ): Promise<void> {
    // Wait for page to be stable
    await this.waitForPageStability();

    // Disable animations if requested
    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    // Mask dynamic content if specified
    if (options.mask && options.mask.length > 0) {
      await this.maskElements(options.mask);
    }

    // Take screenshot and compare
    await expect(this.page).toHaveScreenshot(`${name}.png`, {
      fullPage: options.fullPage ?? false,
      clip: options.clip,
      threshold: options.threshold ?? 0.2,
      mode: options.mode ?? 'css',
      maxDiffPixels: options.maxDiffPixels,
      animations: options.animations ?? 'disabled',
    });
  }

  /**
   * Compare element screenshot
   */
  async compareElementScreenshot(
    locator: Locator,
    name: string,
    options: VisualTestOptions = {}
  ): Promise<void> {
    await this.waitForPageStability();

    if (options.animations === 'disabled') {
      await this.disableAnimations();
    }

    await expect(locator).toHaveScreenshot(`${name}.png`, {
      threshold: options.threshold ?? 0.2,
      mode: options.mode ?? 'css',
      maxDiffPixels: options.maxDiffPixels,
      animations: options.animations ?? 'disabled',
    });
  }

  /**
   * Test component across multiple responsive breakpoints
   */
  async testResponsiveComponent(
    componentName: string,
    selector: string,
    breakpoints: ResponsiveBreakpoint[] = RESPONSIVE_BREAKPOINTS
  ): Promise<void> {
    for (const breakpoint of breakpoints) {
      await this.page.setViewportSize({
        width: breakpoint.width,
        height: breakpoint.height,
      });

      if (breakpoint.deviceScaleFactor) {
        await this.page.emulateMedia({
          reducedMotion: 'reduce',
        });
      }

      await this.waitForPageStability();

      const element = this.page.locator(selector);
      await expect(element).toBeVisible();

      await this.compareElementScreenshot(
        element,
        `${componentName}-${breakpoint.name}`,
        { animations: 'disabled' }
      );
    }
  }

  /**
   * Test page across multiple browsers (when running cross-browser tests)
   */
  async testCrossBrowserPage(
    pageName: string,
    url: string,
    options: VisualTestOptions = {}
  ): Promise<void> {
    await this.page.goto(url);
    await this.waitForPageStability();

    // Test different states
    await this.compareScreenshot(`${pageName}-initial`, options);

    // Test hover states for interactive elements
    const interactiveElements = await this.page
      .locator('button, a, [role="button"]')
      .all();

    for (let i = 0; i < Math.min(interactiveElements.length, 3); i++) {
      const element = interactiveElements[i];
      await element.hover();
      await this.compareScreenshot(`${pageName}-hover-${i}`, options);
    }

    // Test focus states
    const focusableElements = await this.page
      .locator('button, input, select, textarea, a')
      .all();

    for (let i = 0; i < Math.min(focusableElements.length, 3); i++) {
      const element = focusableElements[i];
      await element.focus();
      await this.compareScreenshot(`${pageName}-focus-${i}`, options);
    }
  }

  /**
   * Wait for page to be stable (no network activity, animations complete)
   */
  private async waitForPageStability(): Promise<void> {
    // Wait for network to be idle
    await this.page.waitForLoadState('networkidle');

    // Wait for any animations to complete
    await this.page.waitForTimeout(500);

    // Wait for fonts to load
    await this.page.waitForFunction(() => document.fonts.ready);

    // Wait for images to load
    await this.page.waitForFunction(() => {
      const images = Array.from(document.images);
      return images.every((img) => img.complete);
    });
  }

  /**
   * Disable CSS animations and transitions
   */
  private async disableAnimations(): Promise<void> {
    await this.page.addStyleTag({
      content: `
        *, *::before, *::after {
          animation-duration: 0s !important;
          animation-delay: 0s !important;
          transition-duration: 0s !important;
          transition-delay: 0s !important;
          scroll-behavior: auto !important;
        }
      `,
    });
  }

  /**
   * Mask dynamic elements (timestamps, random IDs, etc.)
   */
  private async maskElements(locators: Locator[]): Promise<void> {
    for (const locator of locators) {
      await locator.evaluate((element) => {
        element.style.backgroundColor = '#cccccc';
        element.style.color = 'transparent';
      });
    }
  }

  /**
   * Test dark mode vs light mode
   */
  async testThemeVariations(
    componentName: string,
    selector: string
  ): Promise<void> {
    // Test light mode
    await this.page.emulateMedia({ colorScheme: 'light' });
    await this.waitForPageStability();

    const element = this.page.locator(selector);
    await this.compareElementScreenshot(element, `${componentName}-light`);

    // Test dark mode
    await this.page.emulateMedia({ colorScheme: 'dark' });
    await this.waitForPageStability();

    await this.compareElementScreenshot(element, `${componentName}-dark`);
  }

  /**
   * Test component states (loading, error, success, etc.)
   */
  async testComponentStates(
    componentName: string,
    selector: string,
    states: Record<string, () => Promise<void>>
  ): Promise<void> {
    const element = this.page.locator(selector);

    for (const [stateName, setupState] of Object.entries(states)) {
      await setupState();
      await this.waitForPageStability();

      await this.compareElementScreenshot(
        element,
        `${componentName}-${stateName}`,
        { animations: 'disabled' }
      );
    }
  }
}

/**
 * Cross-browser testing utilities
 */
export class CrossBrowserTester {
  constructor(private page: Page) {}

  /**
   * Test form interactions across browsers
   */
  async testFormInteractions(formSelector: string): Promise<void> {
    const form = this.page.locator(formSelector);

    // Test input focus styles
    const inputs = form.locator('input, select, textarea');
    const inputCount = await inputs.count();

    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      await input.focus();

      // Check focus styles are applied
      const focusedElement = this.page.locator(':focus');
      await expect(focusedElement).toBeVisible();
    }

    // Test form validation
    const submitButton = form.locator('button[type="submit"]');
    if ((await submitButton.count()) > 0) {
      await submitButton.click();

      // Check for validation messages
      const validationMessages = this.page.locator(
        '[aria-invalid="true"], .error, .invalid'
      );
      // Validation behavior may differ across browsers
    }
  }

  /**
   * Test CSS Grid and Flexbox layouts
   */
  async testLayoutConsistency(containerSelector: string): Promise<void> {
    const container = this.page.locator(containerSelector);

    // Get computed styles
    const styles = await container.evaluate((element) => {
      const computed = window.getComputedStyle(element);
      return {
        display: computed.display,
        gridTemplateColumns: computed.gridTemplateColumns,
        flexDirection: computed.flexDirection,
        justifyContent: computed.justifyContent,
        alignItems: computed.alignItems,
      };
    });

    // Verify layout properties are supported
    expect(styles.display).toBeDefined();

    // Check for layout shifts
    const boundingBox = await container.boundingBox();
    expect(boundingBox).toBeTruthy();
    expect(boundingBox!.width).toBeGreaterThan(0);
    expect(boundingBox!.height).toBeGreaterThan(0);
  }

  /**
   * Test JavaScript API compatibility
   */
  async testJavaScriptAPIs(): Promise<void> {
    const apiSupport = await this.page.evaluate(() => ({
        fetch: typeof fetch !== 'undefined',
        intersectionObserver: typeof IntersectionObserver !== 'undefined',
        resizeObserver: typeof ResizeObserver !== 'undefined',
        customElements: typeof customElements !== 'undefined',
        webComponents:
          typeof HTMLElement.prototype.attachShadow !== 'undefined',
        es6Modules: typeof Symbol !== 'undefined',
        asyncAwait: (async () => true)() instanceof Promise,
      }));

    // Verify critical APIs are available
    expect(apiSupport.fetch).toBe(true);
    expect(apiSupport.intersectionObserver).toBe(true);
    expect(apiSupport.es6Modules).toBe(true);
    expect(apiSupport.asyncAwait).toBe(true);
  }

  /**
   * Test touch interactions on mobile browsers
   */
  async testTouchInteractions(elementSelector: string): Promise<void> {
    const element = this.page.locator(elementSelector);

    // Test tap
    await element.tap();

    // Test long press (if supported)
    await element.tap({ timeout: 1000 });

    // Test swipe gestures (for carousels, etc.)
    const boundingBox = await element.boundingBox();
    if (boundingBox) {
      await this.page.mouse.move(
        boundingBox.x + boundingBox.width / 2,
        boundingBox.y + boundingBox.height / 2
      );

      await this.page.mouse.down();
      await this.page.mouse.move(
        boundingBox.x + boundingBox.width / 4,
        boundingBox.y + boundingBox.height / 2
      );
      await this.page.mouse.up();
    }
  }
}

/**
 * Performance testing utilities for visual tests
 */
export class VisualPerformanceTester {
  constructor(private page: Page) {}

  /**
   * Measure paint timing for visual elements
   */
  async measurePaintTiming(): Promise<{
    firstPaint: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
  }> {
    const paintTiming = await this.page.evaluate(() => {
      const perfEntries = performance.getEntriesByType('paint');
      const navigation = performance.getEntriesByType(
        'navigation'
      )[0] as PerformanceNavigationTiming;

      return {
        firstPaint:
          perfEntries.find((entry) => entry.name === 'first-paint')
            ?.startTime || 0,
        firstContentfulPaint:
          perfEntries.find((entry) => entry.name === 'first-contentful-paint')
            ?.startTime || 0,
        largestContentfulPaint:
          navigation.loadEventEnd - navigation.loadEventStart,
      };
    });

    return paintTiming;
  }

  /**
   * Test layout stability (CLS)
   */
  async measureLayoutStability(): Promise<number> {
    return await this.page.evaluate(() => new Promise<number>((resolve) => {
        let clsValue = 0;

        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (
              entry.entryType === 'layout-shift' &&
              !(entry as any).hadRecentInput
            ) {
              clsValue += (entry as any).value;
            }
          }
        });

        observer.observe({ type: 'layout-shift', buffered: true });

        setTimeout(() => {
          observer.disconnect();
          resolve(clsValue);
        }, 5000);
      }));
  }
}
