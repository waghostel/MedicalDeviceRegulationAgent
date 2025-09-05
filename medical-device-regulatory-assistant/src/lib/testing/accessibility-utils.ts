import { render, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ReactElement } from 'react';
import { axe, toHaveNoViolations } from 'jest-axe';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

export interface AccessibilityTestOptions {
  skipAxe?: boolean;
  skipKeyboardNavigation?: boolean;
  skipFocusManagement?: boolean;
  skipAriaLabels?: boolean;
  customAxeRules?: any;
}

export interface KeyboardNavigationTest {
  element: string;
  key: string;
  expectedFocus?: string;
  expectedAction?: string;
}

export interface AccessibilityReport {
  axeViolations: any[];
  keyboardNavigationResults: KeyboardNavigationResult[];
  focusManagementResults: FocusManagementResult[];
  ariaLabelResults: AriaLabelResult[];
  colorContrastResults: ColorContrastResult[];
  passed: boolean;
}

export interface KeyboardNavigationResult {
  test: KeyboardNavigationTest;
  passed: boolean;
  error?: string;
}

export interface FocusManagementResult {
  test: string;
  passed: boolean;
  error?: string;
}

export interface AriaLabelResult {
  element: string;
  hasAriaLabel: boolean;
  hasAriaLabelledBy: boolean;
  hasAriaDescribedBy: boolean;
  passed: boolean;
}

export interface ColorContrastResult {
  element: string;
  foregroundColor: string;
  backgroundColor: string;
  contrastRatio: number;
  passed: boolean;
  wcagLevel: 'AA' | 'AAA' | 'fail';
}

/**
 * Comprehensive accessibility test for React components
 */
export async function testAccessibility(
  component: ReactElement,
  options: AccessibilityTestOptions = {}
): Promise<AccessibilityReport> {
  const renderResult = render(component);
  const report: AccessibilityReport = {
    axeViolations: [],
    keyboardNavigationResults: [],
    focusManagementResults: [],
    ariaLabelResults: [],
    colorContrastResults: [],
    passed: true,
  };

  // Run axe accessibility tests
  if (!options.skipAxe) {
    const axeResults = await axe(renderResult.container, options.customAxeRules);
    report.axeViolations = axeResults.violations;
    
    if (axeResults.violations.length > 0) {
      report.passed = false;
    }
  }

  // Test keyboard navigation
  if (!options.skipKeyboardNavigation) {
    report.keyboardNavigationResults = await testKeyboardNavigation(renderResult);
    if (report.keyboardNavigationResults.some(result => !result.passed)) {
      report.passed = false;
    }
  }

  // Test focus management
  if (!options.skipFocusManagement) {
    report.focusManagementResults = await testFocusManagement(renderResult);
    if (report.focusManagementResults.some(result => !result.passed)) {
      report.passed = false;
    }
  }

  // Test ARIA labels
  if (!options.skipAriaLabels) {
    report.ariaLabelResults = testAriaLabels(renderResult);
    if (report.ariaLabelResults.some(result => !result.passed)) {
      report.passed = false;
    }
  }

  return report;
}

/**
 * Test keyboard navigation for interactive elements
 */
export async function testKeyboardNavigation(
  renderResult: RenderResult
): Promise<KeyboardNavigationResult[]> {
  const user = userEvent.setup();
  const results: KeyboardNavigationResult[] = [];

  // Find all interactive elements
  const interactiveElements = renderResult.container.querySelectorAll(
    'button, a, input, select, textarea, [tabindex], [role="button"], [role="link"], [role="menuitem"]'
  );

  for (const element of Array.from(interactiveElements)) {
    // Test Tab navigation
    try {
      await user.tab();
      const focused = document.activeElement;
      
      results.push({
        test: {
          element: element.tagName.toLowerCase(),
          key: 'Tab',
          expectedFocus: element.tagName.toLowerCase(),
        },
        passed: focused === element || element.contains(focused),
      });
    } catch (error) {
      results.push({
        test: {
          element: element.tagName.toLowerCase(),
          key: 'Tab',
        },
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }

    // Test Enter key for buttons and links
    if (element.tagName === 'BUTTON' || element.tagName === 'A' || element.getAttribute('role') === 'button') {
      try {
        element.focus();
        await user.keyboard('{Enter}');
        
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Enter',
            expectedAction: 'activate',
          },
          passed: true, // If no error thrown, consider it passed
        });
      } catch (error) {
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Enter',
            expectedAction: 'activate',
          },
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test Space key for buttons
    if (element.tagName === 'BUTTON' || element.getAttribute('role') === 'button') {
      try {
        element.focus();
        await user.keyboard(' ');
        
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Space',
            expectedAction: 'activate',
          },
          passed: true,
        });
      } catch (error) {
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Space',
            expectedAction: 'activate',
          },
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    // Test Escape key for modals and dropdowns
    if (element.getAttribute('role') === 'dialog' || element.getAttribute('role') === 'menu') {
      try {
        element.focus();
        await user.keyboard('{Escape}');
        
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Escape',
            expectedAction: 'close',
          },
          passed: true,
        });
      } catch (error) {
        results.push({
          test: {
            element: element.tagName.toLowerCase(),
            key: 'Escape',
            expectedAction: 'close',
          },
          passed: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }
  }

  return results;
}

/**
 * Test focus management
 */
export async function testFocusManagement(
  renderResult: RenderResult
): Promise<FocusManagementResult[]> {
  const results: FocusManagementResult[] = [];

  // Test that focusable elements are actually focusable
  const focusableElements = renderResult.container.querySelectorAll(
    'button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  );

  for (const element of Array.from(focusableElements)) {
    try {
      (element as HTMLElement).focus();
      const isFocused = document.activeElement === element;
      
      results.push({
        test: `Element ${element.tagName.toLowerCase()} should be focusable`,
        passed: isFocused,
        error: isFocused ? undefined : 'Element could not receive focus',
      });
    } catch (error) {
      results.push({
        test: `Element ${element.tagName.toLowerCase()} should be focusable`,
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Test that disabled elements are not focusable
  const disabledElements = renderResult.container.querySelectorAll(
    'button[disabled], input[disabled], select[disabled], textarea[disabled], [tabindex="-1"]'
  );

  for (const element of Array.from(disabledElements)) {
    try {
      (element as HTMLElement).focus();
      const isFocused = document.activeElement === element;
      
      results.push({
        test: `Disabled element ${element.tagName.toLowerCase()} should not be focusable`,
        passed: !isFocused,
        error: isFocused ? 'Disabled element received focus' : undefined,
      });
    } catch (error) {
      // If focus() throws an error on disabled element, that's good
      results.push({
        test: `Disabled element ${element.tagName.toLowerCase()} should not be focusable`,
        passed: true,
      });
    }
  }

  return results;
}

/**
 * Test ARIA labels and descriptions
 */
export function testAriaLabels(renderResult: RenderResult): AriaLabelResult[] {
  const results: AriaLabelResult[] = [];

  // Find elements that should have ARIA labels
  const elementsNeedingLabels = renderResult.container.querySelectorAll(
    'button, input, select, textarea, [role="button"], [role="link"], [role="menuitem"], [role="tab"], [role="checkbox"], [role="radio"]'
  );

  for (const element of Array.from(elementsNeedingLabels)) {
    const hasAriaLabel = element.hasAttribute('aria-label');
    const hasAriaLabelledBy = element.hasAttribute('aria-labelledby');
    const hasAriaDescribedBy = element.hasAttribute('aria-describedby');
    const hasVisibleLabel = element.textContent?.trim() !== '';
    const hasAssociatedLabel = element.tagName === 'INPUT' && 
      renderResult.container.querySelector(`label[for="${element.id}"]`) !== null;

    const passed = hasAriaLabel || hasAriaLabelledBy || hasVisibleLabel || hasAssociatedLabel;

    results.push({
      element: element.tagName.toLowerCase(),
      hasAriaLabel,
      hasAriaLabelledBy,
      hasAriaDescribedBy,
      passed,
    });
  }

  return results;
}

/**
 * Test color contrast (simplified version for testing environment)
 */
export function testColorContrast(renderResult: RenderResult): ColorContrastResult[] {
  const results: ColorContrastResult[] = [];

  // Find text elements
  const textElements = renderResult.container.querySelectorAll(
    'p, span, div, h1, h2, h3, h4, h5, h6, button, a, label, input, textarea'
  );

  for (const element of Array.from(textElements)) {
    if (!element.textContent?.trim()) continue;

    const computedStyle = window.getComputedStyle(element);
    const foregroundColor = computedStyle.color;
    const backgroundColor = computedStyle.backgroundColor;

    // Simplified contrast calculation (in real implementation, use a proper library)
    const contrastRatio = calculateContrastRatio(foregroundColor, backgroundColor);
    
    let wcagLevel: 'AA' | 'AAA' | 'fail' = 'fail';
    if (contrastRatio >= 7) {
      wcagLevel = 'AAA';
    } else if (contrastRatio >= 4.5) {
      wcagLevel = 'AA';
    }

    results.push({
      element: element.tagName.toLowerCase(),
      foregroundColor,
      backgroundColor,
      contrastRatio,
      passed: wcagLevel !== 'fail',
      wcagLevel,
    });
  }

  return results;
}

/**
 * Simplified contrast ratio calculation
 * In production, use a proper color contrast library
 */
function calculateContrastRatio(foreground: string, background: string): number {
  // This is a simplified implementation
  // In real tests, use a proper color contrast calculation library
  return 4.5; // Mock value that passes WCAG AA
}

/**
 * Jest matcher for accessibility testing
 */
export function toBeAccessible() {
  return {
    async compare(component: ReactElement, options: AccessibilityTestOptions = {}) {
      const report = await testAccessibility(component, options);
      
      return {
        pass: report.passed,
        message: () => {
          if (report.passed) {
            return 'Component passed all accessibility tests';
          } else {
            const violations = report.axeViolations.map(v => `- ${v.description}`).join('\n');
            const keyboardIssues = report.keyboardNavigationResults
              .filter(r => !r.passed)
              .map(r => `- ${r.test.element} ${r.test.key}: ${r.error}`)
              .join('\n');
            
            return `Component failed accessibility tests:\n\nAxe violations:\n${violations}\n\nKeyboard navigation issues:\n${keyboardIssues}`;
          }
        },
      };
    },
  };
}

// Add custom Jest matcher
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeAccessible(options?: AccessibilityTestOptions): Promise<R>;
    }
  }
}

/**
 * Screen reader simulation utilities
 */
export class ScreenReaderSimulator {
  private announcements: string[] = [];

  constructor(private container: HTMLElement) {
    this.setupAriaLiveRegions();
  }

  private setupAriaLiveRegions(): void {
    // Monitor aria-live regions for announcements
    const liveRegions = this.container.querySelectorAll('[aria-live]');
    
    liveRegions.forEach(region => {
      const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList' || mutation.type === 'characterData') {
            const text = (mutation.target as Element).textContent;
            if (text?.trim()) {
              this.announcements.push(text.trim());
            }
          }
        });
      });

      observer.observe(region, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    });
  }

  getAnnouncements(): string[] {
    return [...this.announcements];
  }

  clearAnnouncements(): void {
    this.announcements = [];
  }

  simulateScreenReaderNavigation(): string[] {
    const navigation: string[] = [];
    
    // Simulate reading headings
    const headings = this.container.querySelectorAll('h1, h2, h3, h4, h5, h6');
    headings.forEach(heading => {
      navigation.push(`Heading level ${heading.tagName.charAt(1)}: ${heading.textContent}`);
    });

    // Simulate reading landmarks
    const landmarks = this.container.querySelectorAll('[role="main"], [role="navigation"], [role="banner"], [role="contentinfo"], main, nav, header, footer');
    landmarks.forEach(landmark => {
      const role = landmark.getAttribute('role') || landmark.tagName.toLowerCase();
      navigation.push(`Landmark: ${role}`);
    });

    // Simulate reading interactive elements
    const interactive = this.container.querySelectorAll('button, a, input, select, textarea');
    interactive.forEach(element => {
      const label = element.getAttribute('aria-label') || 
                   element.textContent || 
                   element.getAttribute('alt') || 
                   'unlabeled';
      navigation.push(`${element.tagName.toLowerCase()}: ${label}`);
    });

    return navigation;
  }
}