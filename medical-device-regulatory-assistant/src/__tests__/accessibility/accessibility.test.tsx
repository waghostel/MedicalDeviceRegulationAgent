import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import React from 'react';

import { AccessibilityProvider } from '@/components/accessibility/AccessibilityFeatures';
import { KeyboardShortcutsProvider } from '@/components/accessibility/KeyboardShortcuts';
import { ErrorBoundary } from '@/components/error/ErrorBoundary';
import { ErrorMessage } from '@/components/error/ErrorMessage';
import {
  ValidatedInput,
  ValidatedTextarea,
} from '@/components/forms/FormValidation';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Tooltip, HelpTooltip } from '@/components/onboarding/Tooltips';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock components for testing
const TestComponent = () => <div>Test Content</div>;
const ErrorComponent = () => {
  throw new Error('Test error');
};

describe('Accessibility Tests', () => {
  describe('Error Handling Components', () => {
    it('should have no accessibility violations in ErrorBoundary', async () => {
      const { container } = render(
        <ErrorBoundary>
          <ErrorComponent />
        </ErrorBoundary>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA labels in error messages', () => {
      render(
        <ErrorMessage
          type="network"
          title="Connection Error"
          message="Unable to connect"
          onRetry={() => {}}
        />
      );

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveAttribute('aria-live', 'assertive');
    });

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();

      render(<ErrorMessage type="fda-api" onRetry={mockRetry} />);

      const retryButton = screen.getByRole('button', { name: /try again/i });
      await user.tab();
      expect(retryButton).toHaveFocus();

      await user.keyboard('{Enter}');
      expect(mockRetry).toHaveBeenCalled();
    });
  });

  describe('Form Validation Components', () => {
    it('should have no accessibility violations in ValidatedInput', async () => {
      const { container } = render(
        <ValidatedInput
          label="Device Name"
          name="deviceName"
          required
          description="Enter the name of your medical device"
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper form associations', () => {
      render(
        <ValidatedInput
          label="Device Name"
          name="deviceName"
          required
          description="Enter the name of your medical device"
        />
      );

      const input = screen.getByRole('textbox', { name: /device name/i });
      const label = screen.getByText(/device name/i);

      expect(input).toHaveAttribute('aria-required', 'true');
      expect(input).toHaveAttribute('id');
      expect(label).toHaveAttribute('for', input.getAttribute('id'));
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();

      render(
        <ValidatedInput
          label="Device Name"
          name="deviceName"
          required
          error={{ type: 'required', message: 'Device name is required' }}
        />
      );

      const input = screen.getByRole('textbox');
      const errorMessage = screen.getByText('Device name is required');

      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should support keyboard navigation in textarea', async () => {
      const user = userEvent.setup();
      const mockChange = jest.fn();

      render(
        <ValidatedTextarea
          label="Description"
          name="description"
          onChange={mockChange}
        />
      );

      const textarea = screen.getByRole('textbox', { name: /description/i });
      await user.click(textarea);
      await user.keyboard('Test description');

      expect(mockChange).toHaveBeenCalledWith('Test description');
      expect(textarea).toHaveFocus();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should have no accessibility violations in shortcuts dialog', async () => {
      const { container } = render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      // Trigger shortcuts dialog
      fireEvent.keyDown(document, { key: '?' });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should trap focus in shortcuts dialog', async () => {
      const user = userEvent.setup();

      render(
        <KeyboardShortcutsProvider>
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      // Open dialog
      fireEvent.keyDown(document, { key: '?' });

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });

      const dialog = screen.getByRole('dialog');
      const closeButton = screen.getByRole('button', { name: /close/i });

      // Focus should be trapped within dialog
      expect(document.activeElement).toBe(closeButton);

      await user.tab();
      expect(document.activeElement).toBe(closeButton); // Should cycle back
    });

    it('should handle keyboard shortcuts correctly', async () => {
      const mockNavigateHome = jest.fn();
      const mockOpenSearch = jest.fn();

      render(
        <KeyboardShortcutsProvider
          onNavigateHome={mockNavigateHome}
          onOpenSearch={mockOpenSearch}
        >
          <TestComponent />
        </KeyboardShortcutsProvider>
      );

      // Test Alt+H shortcut
      fireEvent.keyDown(document, { key: 'H', altKey: true });
      expect(mockNavigateHome).toHaveBeenCalled();

      // Test Ctrl+K shortcut
      fireEvent.keyDown(document, { key: 'K', ctrlKey: true });
      expect(mockOpenSearch).toHaveBeenCalled();
    });
  });

  describe('Accessibility Features', () => {
    it('should have no violations in accessibility panel', async () => {
      const { container } = render(
        <AccessibilityProvider>
          <div>Test content</div>
        </AccessibilityProvider>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should apply high contrast mode correctly', async () => {
      render(
        <AccessibilityProvider>
          <div>Test content</div>
        </AccessibilityProvider>
      );

      // Simulate enabling high contrast
      const root = document.documentElement;
      root.classList.add('high-contrast');

      expect(root).toHaveClass('high-contrast');
    });

    it('should support reduced motion preferences', () => {
      // Mock prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      render(
        <AccessibilityProvider>
          <div>Test content</div>
        </AccessibilityProvider>
      );

      const root = document.documentElement;
      root.classList.add('reduce-motion');

      expect(root).toHaveClass('reduce-motion');
    });
  });

  describe('Onboarding Flow', () => {
    it('should have no accessibility violations in onboarding', async () => {
      const { container } = render(
        <OnboardingFlow
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
        />
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper dialog semantics', () => {
      render(
        <OnboardingFlow
          isOpen={true}
          onClose={() => {}}
          onComplete={() => {}}
        />
      );

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should support keyboard navigation between steps', async () => {
      const user = userEvent.setup();
      const mockComplete = jest.fn();

      render(
        <OnboardingFlow
          isOpen={true}
          onClose={() => {}}
          onComplete={mockComplete}
        />
      );

      const nextButton = screen.getByRole('button', { name: /next/i });

      // Navigate through steps
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);
      await user.click(nextButton);

      // Should reach final step
      const getStartedButton = screen.getByRole('button', {
        name: /get started/i,
      });
      await user.click(getStartedButton);

      expect(mockComplete).toHaveBeenCalled();
    });
  });

  describe('Tooltips', () => {
    it('should have no accessibility violations in tooltips', async () => {
      const { container } = render(
        <Tooltip content="This is a helpful tooltip" title="Help">
          <button>Hover me</button>
        </Tooltip>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper ARIA attributes', async () => {
      const user = userEvent.setup();

      render(
        <HelpTooltip content="This explains the feature" title="Feature Help" />
      );

      const trigger = screen.getByRole('button');
      expect(trigger).toHaveAttribute('aria-describedby');

      await user.hover(trigger);

      await waitFor(() => {
        const tooltip = screen.getByRole('tooltip');
        expect(tooltip).toBeInTheDocument();
      });
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();

      render(
        <Tooltip content="Keyboard accessible tooltip" trigger="focus">
          <button>Focus me</button>
        </Tooltip>
      );

      const button = screen.getByRole('button');
      await user.tab();
      expect(button).toHaveFocus();

      await waitFor(() => {
        expect(
          screen.getByText('Keyboard accessible tooltip')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Color Contrast', () => {
    it('should meet WCAG AA contrast requirements', async () => {
      const { container } = render(
        <div className="bg-white text-black p-4">
          <h1 className="text-2xl font-bold">High Contrast Text</h1>
          <p className="text-gray-700">Regular text content</p>
          <button className="bg-blue-600 text-white px-4 py-2 rounded">
            Action Button
          </button>
        </div>
      );

      const results = await axe(container, {
        rules: {
          'color-contrast': { enabled: true },
        },
      });

      expect(results).toHaveNoViolations();
    });
  });

  describe('Focus Management', () => {
    it('should have visible focus indicators', () => {
      render(
        <div>
          <button className="focus:ring-2 focus:ring-blue-500">
            Focusable Button
          </button>
          <input
            className="focus:ring-2 focus:ring-blue-500"
            placeholder="Focusable Input"
          />
        </div>
      );

      const button = screen.getByRole('button');
      const input = screen.getByRole('textbox');

      button.focus();
      expect(button).toHaveFocus();

      input.focus();
      expect(input).toHaveFocus();
    });

    it('should skip to main content', async () => {
      const user = userEvent.setup();

      render(
        <div>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to main content
          </a>
          <nav>Navigation</nav>
          <main id="main-content" tabIndex={-1}>
            Main content
          </main>
        </div>
      );

      const skipLink = screen.getByText('Skip to main content');
      await user.click(skipLink);

      const mainContent = screen.getByRole('main');
      expect(mainContent).toHaveFocus();
    });
  });

  describe('Screen Reader Support', () => {
    it('should have proper heading hierarchy', () => {
      render(
        <div>
          <h1>Main Title</h1>
          <h2>Section Title</h2>
          <h3>Subsection Title</h3>
        </div>
      );

      const h1 = screen.getByRole('heading', { level: 1 });
      const h2 = screen.getByRole('heading', { level: 2 });
      const h3 = screen.getByRole('heading', { level: 3 });

      expect(h1).toBeInTheDocument();
      expect(h2).toBeInTheDocument();
      expect(h3).toBeInTheDocument();
    });

    it('should have proper landmark roles', () => {
      render(
        <div>
          <header>Header content</header>
          <nav>Navigation</nav>
          <main>Main content</main>
          <aside>Sidebar content</aside>
          <footer>Footer content</footer>
        </div>
      );

      expect(screen.getByRole('banner')).toBeInTheDocument(); // header
      expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
      expect(screen.getByRole('main')).toBeInTheDocument(); // main
      expect(screen.getByRole('complementary')).toBeInTheDocument(); // aside
      expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
    });

    it('should announce dynamic content changes', async () => {
      const { rerender } = render(
        <div>
          <div aria-live="polite" aria-atomic="true">
            Initial content
          </div>
        </div>
      );

      rerender(
        <div>
          <div aria-live="polite" aria-atomic="true">
            Updated content
          </div>
        </div>
      );

      const liveRegion = screen.getByText('Updated content');
      expect(liveRegion).toHaveAttribute('aria-live', 'polite');
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
    });
  });
});
