/**
 * Tests for enhanced Toast UI component
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toast, ToastProvider, ToastViewport } from '../toast';
import {
  renderWithProvidersSync,
  waitForAsyncUpdates,
  fireEventWithAct,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/lib/testing/react-test-utils';
import {
  setupMockToastSystem,
  cleanupMockToastSystem,
} from '@/lib/testing/mock-toast-system';

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

  return renderWithProvidersSync(
    <ToastProvider>
      <Toast {...defaultProps}>
        <div className="grid gap-1">
          {defaultProps.title && (
            <div data-testid="toast-title">{defaultProps.title}</div>
          )}
          {defaultProps.description && (
            <div data-testid="toast-description">
              {defaultProps.description}
            </div>
          )}
        </div>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
};

describe('Toast Component', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    testEnv = setupTestEnvironment({
      mockToasts: true,
      skipActWarnings: false,
    });
  });

  afterEach(() => {
    testEnv.cleanup();
    // cleanupMockToastSystem(); // Disabled for now
    cleanupTestEnvironment();
  });

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

      // Should still render the toast container
      expect(screen.getByRole('status')).toBeInTheDocument();
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

      const toast = screen.getByRole('status');
      expect(toast).toBeInTheDocument();
    });

    it('should be keyboard accessible', async () => {
      const user = userEvent.setup();
      const mockRetry = jest.fn();

      renderToast({
        onRetry: mockRetry,
      });

      await waitForAsyncUpdates();

      const retryButton = screen.getByRole('button', { name: /retry/i });

      // Focus the button with proper act wrapping
      await fireEventWithAct(async () => {
        retryButton.focus();
      });

      expect(retryButton).toHaveFocus();

      // Press Enter with proper act wrapping
      await fireEventWithAct(async () => {
        await user.keyboard('{Enter}');
      });

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

      let toast = screen.getByRole('status');
      expect(toast).toHaveClass('destructive');

      rerender(
        <ToastProvider>
          <Toast variant="success" open={true}>
            <div>Success Toast</div>
          </Toast>
          <ToastViewport />
        </ToastProvider>
      );

      toast = screen.getByRole('status');
      expect(toast).toHaveClass('border-green-200');
    });

    it('should apply custom className', () => {
      renderToast({
        className: 'custom-toast-class',
      });

      const toast = screen.getByRole('status');
      expect(toast).toHaveClass('custom-toast-class');
    });
  });

  describe('Integration with Toast System', () => {
    it('should handle onOpenChange callback', async () => {
      const mockOnOpenChange = jest.fn();
      const user = userEvent.setup();

      renderToast({
        onOpenChange: mockOnOpenChange,
      });

      const closeButton = screen.getByRole('button', { name: 'X' });
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
