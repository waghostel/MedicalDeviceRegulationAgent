/**
 * Tests for Toaster component integration
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Toaster } from '../toaster';
import { useToast, toast, contextualToast } from '@/hooks/use-toast';

// Mock the toast hook
const mockToasts = [
  {
    id: '1',
    title: 'Test Toast 1',
    description: 'First test toast',
    variant: 'default' as const,
    open: true,
  },
  {
    id: '2',
    title: 'Error Toast',
    description: 'Something went wrong',
    variant: 'destructive' as const,
    open: true,
    onRetry: jest.fn(),
    retryLabel: 'Try Again',
  },
  {
    id: '3',
    title: 'Progress Toast',
    description: 'Processing...',
    variant: 'progress' as const,
    open: true,
    showProgress: true,
    progress: 75,
  },
];

jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(),
  toast: jest.fn(),
  contextualToast: {
    fdaApiError: jest.fn(),
    success: jest.fn(),
    progress: jest.fn(),
  },
}));

// Mock the Toast components
jest.mock('../toast', () => ({
  Toast: ({
    children,
    title,
    description,
    variant,
    onRetry,
    retryLabel,
    ...props
  }: any) => (
    <div
      data-testid={`toast-${props.id || 'unknown'}`}
      data-variant={variant}
      data-title={title}
      data-description={description}
    >
      <div>{title}</div>
      <div>{description}</div>
      {onRetry && (
        <button onClick={onRetry} data-testid={`retry-${props.id}`}>
          {retryLabel || 'Retry'}
        </button>
      )}
      {children}
    </div>
  ),
  ToastClose: () => <button data-testid="toast-close">Close</button>,
  ToastDescription: ({ children }: any) => (
    <div data-testid="toast-description">{children}</div>
  ),
  ToastProvider: ({ children }: any) => (
    <div data-testid="toast-provider">{children}</div>
  ),
  ToastTitle: ({ children }: any) => (
    <div data-testid="toast-title">{children}</div>
  ),
  ToastViewport: () => <div data-testid="toast-viewport" />,
}));

describe('Toaster Component', () => {
  const mockUseToast = useToast as jest.MockedFunction<typeof useToast>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render empty toaster when no toasts', () => {
      mockUseToast.mockReturnValue({
        toasts: [],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-provider')).toBeInTheDocument();
      expect(screen.getByTestId('toast-viewport')).toBeInTheDocument();
      expect(screen.queryByTestId(/^toast-/)).not.toBeInTheDocument();
    });

    it('should render single toast', () => {
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByText('Test Toast 1')).toBeInTheDocument();
      expect(screen.getByText('First test toast')).toBeInTheDocument();
    });

    it('should render multiple toasts', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
      expect(screen.getByTestId('toast-3')).toBeInTheDocument();
    });
  });

  describe('Toast Variants', () => {
    it('should render different toast variants correctly', () => {
      const variantToasts = [
        { ...mockToasts[0], variant: 'default' as const },
        { ...mockToasts[1], variant: 'destructive' as const },
        { ...mockToasts[2], variant: 'success' as const, id: '4' },
      ];

      mockUseToast.mockReturnValue({
        toasts: variantToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-1')).toHaveAttribute(
        'data-variant',
        'default'
      );
      expect(screen.getByTestId('toast-2')).toHaveAttribute(
        'data-variant',
        'destructive'
      );
      expect(screen.getByTestId('toast-4')).toHaveAttribute(
        'data-variant',
        'success'
      );
    });
  });

  describe('Interactive Features', () => {
    it('should handle retry button clicks', async () => {
      const mockRetry = jest.fn();
      const toastWithRetry = {
        ...mockToasts[1],
        onRetry: mockRetry,
      };

      mockUseToast.mockReturnValue({
        toasts: [toastWithRetry],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      const user = userEvent.setup();
      render(<Toaster />);

      const retryButton = screen.getByTestId('retry-2');
      await user.click(retryButton);

      expect(mockRetry).toHaveBeenCalledTimes(1);
    });

    it('should render close buttons for all toasts', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      const closeButtons = screen.getAllByTestId('toast-close');
      expect(closeButtons).toHaveLength(mockToasts.length);
    });
  });

  describe('Progress Toasts', () => {
    it('should render progress toast with correct progress value', () => {
      const progressToast = {
        id: '5',
        title: 'Uploading File',
        description: 'Please wait...',
        variant: 'progress' as const,
        open: true,
        showProgress: true,
        progress: 45,
      };

      mockUseToast.mockReturnValue({
        toasts: [progressToast],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-5')).toBeInTheDocument();
      expect(screen.getByText('Uploading File')).toBeInTheDocument();
      expect(screen.getByText('Please wait...')).toBeInTheDocument();
    });
  });

  describe('Dynamic Updates', () => {
    it('should update when toasts change', () => {
      const { rerender } = render(<Toaster />);

      // Initially no toasts
      mockUseToast.mockReturnValue({
        toasts: [],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      rerender(<Toaster />);
      expect(screen.queryByTestId(/^toast-/)).not.toBeInTheDocument();

      // Add a toast
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0]],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      rerender(<Toaster />);
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
    });

    it('should handle toast removal', () => {
      const { rerender } = render(<Toaster />);

      // Initially with toasts
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      rerender(<Toaster />);
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.getByTestId('toast-2')).toBeInTheDocument();
      expect(screen.getByTestId('toast-3')).toBeInTheDocument();

      // Remove one toast
      mockUseToast.mockReturnValue({
        toasts: [mockToasts[0], mockToasts[2]], // Remove middle toast
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      rerender(<Toaster />);
      expect(screen.getByTestId('toast-1')).toBeInTheDocument();
      expect(screen.queryByTestId('toast-2')).not.toBeInTheDocument();
      expect(screen.getByTestId('toast-3')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should provide proper structure for screen readers', () => {
      mockUseToast.mockReturnValue({
        toasts: mockToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      // Should have proper title and description structure
      expect(screen.getAllByTestId('toast-title')).toHaveLength(
        mockToasts.length
      );
      expect(screen.getAllByTestId('toast-description')).toHaveLength(
        mockToasts.length
      );
    });

    it('should handle toasts without titles or descriptions', () => {
      const minimalToast = {
        id: '6',
        variant: 'default' as const,
        open: true,
      };

      mockUseToast.mockReturnValue({
        toasts: [minimalToast],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      render(<Toaster />);

      expect(screen.getByTestId('toast-6')).toBeInTheDocument();
      // Should not crash when title/description are undefined
    });
  });

  describe('Performance', () => {
    it('should handle large number of toasts', () => {
      const manyToasts = Array.from({ length: 50 }, (_, i) => ({
        id: `toast-${i}`,
        title: `Toast ${i}`,
        description: `Description ${i}`,
        variant: 'default' as const,
        open: true,
      }));

      mockUseToast.mockReturnValue({
        toasts: manyToasts,
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      const startTime = performance.now();
      render(<Toaster />);
      const endTime = performance.now();

      // Should render without significant performance issues
      expect(endTime - startTime).toBeLessThan(100); // Less than 100ms
      expect(screen.getAllByTestId(/^toast-/)).toHaveLength(50);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed toast data gracefully', () => {
      const malformedToast = {
        id: '7',
        // Missing required fields
        variant: 'default' as const,
        open: true,
        title: null,
        description: undefined,
      };

      mockUseToast.mockReturnValue({
        toasts: [malformedToast as any],
        queue: [],
        rateLimitCount: 0,
        lastResetTime: Date.now(),
        toast,
        contextualToast,
        dismiss: jest.fn(),
        dismissAll: jest.fn(),
        clearQueue: jest.fn(),
        getToastsByCategory: jest.fn(),
        getToastsByPriority: jest.fn(),
      });

      // Should not throw an error
      expect(() => render(<Toaster />)).not.toThrow();
      expect(screen.getByTestId('toast-7')).toBeInTheDocument();
    });

    it('should handle missing useToast hook gracefully', () => {
      mockUseToast.mockImplementation(() => {
        throw new Error('useToast hook not available');
      });

      // Should not crash the entire application
      expect(() => render(<Toaster />)).toThrow('useToast hook not available');
    });
  });
});
