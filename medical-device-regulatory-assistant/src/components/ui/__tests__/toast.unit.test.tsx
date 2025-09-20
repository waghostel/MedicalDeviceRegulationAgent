/**
 * Tests for enhanced Toast UI component
 */

import React from 'react';
import {
  screen,
  fireEvent,
  waitFor,
  render,
  cleanup,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
} from '../toast';

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  X: () => <div data-testid="close-icon">X</div>,
  AlertCircle: () => <div data-testid="alert-circle-icon">!</div>,
  CheckCircle: () => <div data-testid="check-circle-icon">✓</div>,
  Info: () => <div data-testid="info-icon">i</div>,
  AlertTriangle: () => <div data-testid="alert-triangle-icon">⚠</div>,
  RotateCcw: () => <div data-testid="retry-icon">↻</div>,
  ExternalLink: () => <div data-testid="external-link-icon">↗</div>,
}));

// Mock Progress component
jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className }: { value: number; className?: string }) => (
    <div data-testid="progress-bar" data-value={value} className={className}>
      Progress: {value}%
    </div>
  ),
}));

// Mock Button component
jest.mock('@/components/ui/button', () => ({
  Button: ({
    children,
    onClick,
    variant,
    size,
    className,
    asChild,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: string;
    size?: string;
    className?: string;
    asChild?: boolean;
  }) => {
    if (asChild) {
      return <div className={className}>{children}</div>;
    }
    return (
      <button
        onClick={onClick}
        className={className}
        data-variant={variant}
        data-size={size}
      >
        {children}
      </button>
    );
  },
}));

const renderToast = (props: unknown = {}) => {
  const defaultProps = {
    title: 'Test Toast',
    description: 'This is a test toast',
    variant: 'default' as const,
    open: true,
    ...props,
  };

  return render(
    <ToastProvider>
      <Toast {...defaultProps} />
      <ToastViewport />
    </ToastProvider>
  );
};

// Disable the global cleanup for toast tests to prevent DOM clearing issues
const originalAfterEach = global.afterEach;
const originalEnhancedCleanup = global.__ENHANCED_CLEANUP;

beforeAll(() => {
  // Replace the global cleanup with a safer version
  global.__ENHANCED_CLEANUP = function () {
    // Only clear mocks, not DOM
    jest.clearAllMocks();
    jest.restoreAllMocks();

    if (global.__GLOBAL_MOCK_REGISTRY) {
      global.__GLOBAL_MOCK_REGISTRY.clearAll();
    }

    if (global.__REACT_19_ERROR_TRACKER) {
      global.__REACT_19_ERROR_TRACKER.clear();
    }
  };
});

afterAll(() => {
  // Restore original cleanup
  global.__ENHANCED_CLEANUP = originalEnhancedCleanup;
});

// Use React Testing Library's cleanup for each test
afterEach(() => {
  cleanup();
});

describe('Toast Component', () => {
  describe('Basic Rendering', () => {
    it('should render toast with title and description', () => {
      renderToast({
        title: 'Test Title',
        description: 'Test Description',
      });

      expect(screen.getByTestId('toast-title')).toHaveTextContent('Test Title');
      expect(screen.getByTestId('toast-description')).toHaveTextContent(
        'Test Description'
      );
    });

    it('should render close button', () => {
      renderToast();
      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });

    it('should render without title or description', () => {
      renderToast({
        title: undefined,
        description: undefined,
      });

      // Should still render the toast container - use getAllByRole to handle multiple status elements
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
      // The main toast should be the first one with proper attributes
      const mainToast = statusElements.find((el) => el.tagName === 'LI');
      expect(mainToast).toBeInTheDocument();
    });
  });

  describe('Variants and Icons', () => {
    it('should render default variant without icon', () => {
      renderToast({ variant: 'default' });

      expect(screen.queryByTestId('alert-circle-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('check-circle-icon')).not.toBeInTheDocument();
      expect(screen.queryByTestId('info-icon')).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('alert-triangle-icon')
      ).not.toBeInTheDocument();
    });

    it('should render destructive variant with alert icon', () => {
      renderToast({ variant: 'destructive' });
      expect(screen.getByTestId('alert-circle-icon')).toBeInTheDocument();
    });

    it('should render success variant with check icon', () => {
      renderToast({ variant: 'success' });
      expect(screen.getByTestId('check-circle-icon')).toBeInTheDocument();
    });

    it('should render warning variant with triangle icon', () => {
      renderToast({ variant: 'warning' });
      expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();
    });

    it('should render info variant with info icon', () => {
      renderToast({ variant: 'info' });
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });

    it('should render progress variant with info icon', () => {
      renderToast({ variant: 'progress' });
      expect(screen.getByTestId('info-icon')).toBeInTheDocument();
    });
  });

  describe('Progress Functionality', () => {
    it('should render progress bar when showProgress is true', () => {
      renderToast({
        showProgress: true,
        progress: 50,
      });

      expect(screen.getByTestId('progress-bar')).toBeInTheDocument();
      expect(screen.getByTestId('progress-bar')).toHaveAttribute(
        'data-value',
        '50'
      );
      expect(screen.getByText('50% complete')).toBeInTheDocument();
    });

    it('should not render progress bar when showProgress is false', () => {
      renderToast({
        showProgress: false,
        progress: 50,
      });

      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument();
    });

    it('should handle progress value of 0', () => {
      renderToast({
        showProgress: true,
        progress: 0,
      });

      expect(screen.getByTestId('progress-bar')).toHaveAttribute(
        'data-value',
        '0'
      );
      expect(screen.getByText('0% complete')).toBeInTheDocument();
    });

    it('should handle progress value of 100', () => {
      renderToast({
        showProgress: true,
        progress: 100,
      });

      expect(screen.getByTestId('progress-bar')).toHaveAttribute(
        'data-value',
        '100'
      );
      expect(screen.getByText('100% complete')).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('should render retry button when onRetry is provided', async () => {
      const mockRetry = jest.fn();
      const user = userEvent.setup();

      renderToast({
        onRetry: mockRetry,
        retryLabel: 'Try Again',
      });

      const retryButton = screen.getByRole('button', { name: /try again/i });
      expect(retryButton).toBeInTheDocument();
      expect(screen.getByTestId('retry-icon')).toBeInTheDocument();

      await user.click(retryButton);
      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should render retry button with default label', () => {
      renderToast({
        onRetry: jest.fn(),
      });

      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    it('should render action button when onAction is provided', async () => {
      const mockAction = jest.fn();
      const user = userEvent.setup();

      renderToast({
        onAction: mockAction,
        actionLabel: 'Custom Action',
      });

      const actionButton = screen.getByRole('button', {
        name: /custom action/i,
      });
      expect(actionButton).toBeInTheDocument();

      await user.click(actionButton);
      expect(mockAction).toHaveBeenCalledTimes(1);
    });

    it('should render action button with default label', () => {
      renderToast({
        onAction: jest.fn(),
      });

      expect(
        screen.getByRole('button', { name: /action/i })
      ).toBeInTheDocument();
    });

    it('should render external link when actionUrl is provided', () => {
      renderToast({
        actionUrl: 'https://example.com',
      });

      const link = screen.getByRole('link', { name: /learn more/i });
      expect(link).toBeInTheDocument();
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      expect(screen.getByTestId('external-link-icon')).toBeInTheDocument();
    });

    it('should render multiple action buttons', () => {
      renderToast({
        onRetry: jest.fn(),
        onAction: jest.fn(),
        actionUrl: 'https://example.com',
        retryLabel: 'Retry',
        actionLabel: 'Action',
      });

      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /action/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('link', { name: /learn more/i })
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      renderToast();

      // Get the main toast element (LI element, not the screen reader span)
      const statusElements = screen.getAllByRole('status');
      const mainToast = statusElements.find((el) => el.tagName === 'LI');
      expect(mainToast).toBeInTheDocument();
      expect(mainToast).toHaveAttribute('aria-atomic', 'true');
      expect(mainToast).toHaveAttribute('aria-live', 'polite');
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();

      renderToast({
        onRetry: mockRetry,
      });

      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Click to focus the button (more reliable than .focus() in tests)
      await user.click(retryButton);

      // Press Enter
      await user.keyboard('{Enter}');

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should support screen readers with proper text content', () => {
      renderToast({
        title: 'Error Occurred',
        description: 'Please try again later',
        variant: 'destructive',
      });

      expect(screen.getByTestId('toast-title')).toHaveTextContent(
        'Error Occurred'
      );
      expect(screen.getByTestId('toast-description')).toHaveTextContent(
        'Please try again later'
      );
    });
  });

  describe('Styling and CSS Classes', () => {
    it('should apply correct variant classes', () => {
      const { rerender } = renderToast({ variant: 'destructive' });

      // Get the main toast element (LI element)
      let statusElements = screen.getAllByRole('alert'); // destructive variant uses 'alert' role
      let mainToast = statusElements.find((el) => el.tagName === 'LI');
      expect(mainToast).toHaveClass('destructive');

      rerender(
        <ToastProvider>
          <Toast variant="success" open={true}>
            <div>Success Toast</div>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      statusElements = screen.getAllByRole('status'); // success variant uses 'status' role
      mainToast = statusElements.find((el) => el.tagName === 'LI');
      expect(mainToast).toHaveClass('border-green-200');
    });

    it('should apply custom className', () => {
      renderToast({
        className: 'custom-toast-class',
      });

      // Get the main toast element (LI element)
      const statusElements = screen.getAllByRole('status');
      const mainToast = statusElements.find((el) => el.tagName === 'LI');
      expect(mainToast).toHaveClass('custom-toast-class');
    });
  });

  describe('Integration with Toast System', () => {
    it('should handle onOpenChange callback', async () => {
      const mockOnOpenChange = jest.fn();
      const user = userEvent.setup();

      renderToast({
        onOpenChange: mockOnOpenChange,
      });

      const closeButton = screen.getByRole('button', {
        name: 'Close notification',
      });
      await user.click(closeButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('should render in ToastViewport', () => {
      render(
        <ToastProvider>
          <ToastViewport data-testid="toast-viewport" />
        </ToastProvider>
      );

      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined progress value', () => {
      renderToast({
        showProgress: true,
        progress: undefined,
      });

      // Should not crash and should not show progress text
      expect(screen.queryByText(/% complete/)).not.toBeInTheDocument();
    });

    it('should handle empty action handlers', () => {
      renderToast({
        onRetry: undefined,
        onAction: undefined,
        actionUrl: undefined,
      });

      // Should not render any action buttons
      expect(
        screen.queryByRole('button', { name: /retry/i })
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /action/i })
      ).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    it('should handle very long text content', () => {
      const longTitle = 'A'.repeat(200);
      const longDescription = 'B'.repeat(500);

      renderToast({
        title: longTitle,
        description: longDescription,
      });

      expect(screen.getByTestId('toast-title')).toHaveTextContent(longTitle);
      expect(screen.getByTestId('toast-description')).toHaveTextContent(
        longDescription
      );
    });
  });
});
