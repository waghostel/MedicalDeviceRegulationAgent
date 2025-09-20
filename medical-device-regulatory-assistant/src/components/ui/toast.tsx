/**
 * Enhanced Toast UI Component with retry options and progress indicators
 * Based on shadcn/ui patterns with medical device regulatory context
 * Includes comprehensive accessibility features and ARIA support
 */

import * as ToastPrimitives from '@radix-ui/react-toast';
import { cva, type VariantProps } from 'class-variance-authority';
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
} from 'lucide-react';
import * as React from 'react';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

const ToastProvider = ToastPrimitives.Provider;

const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Viewport
    ref={ref}
    className={cn(
      'fixed top-0 z-[100] flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]',
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitives.Viewport.displayName;

const toastVariants = cva(
  'group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-md border p-6 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full',
  {
    variants: {
      variant: {
        default: 'border bg-background text-foreground',
        destructive:
          'destructive border-destructive bg-destructive text-destructive-foreground',
        success:
          'border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950 dark:text-green-100',
        warning:
          'border-yellow-200 bg-yellow-50 text-yellow-900 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-100',
        info: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
        progress:
          'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-100',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Toast = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Root> &
    VariantProps<typeof toastVariants> & {
      onRetry?: () => void;
      retryLabel?: string;
      actionLabel?: string;
      onAction?: () => void;
      actionUrl?: string;
      progress?: number;
      showProgress?: boolean;
      title?: string;
      description?: string;
    }
>(
  (
    {
      className,
      variant,
      onRetry,
      retryLabel,
      actionLabel,
      onAction,
      actionUrl,
      progress,
      showProgress,
      title,
      description,
      children,
      ...props
    },
    ref
  ) => {
    const getIcon = () => {
      switch (variant) {
        case 'destructive':
          return <AlertCircle className="h-4 w-4" aria-hidden="true" />;
        case 'success':
          return <CheckCircle className="h-4 w-4" aria-hidden="true" />;
        case 'warning':
          return <AlertTriangle className="h-4 w-4" aria-hidden="true" />;
        case 'info':
        case 'progress':
          return <Info className="h-4 w-4" aria-hidden="true" />;
        default:
          return null;
      }
    };

    const getAriaRole = () => {
      switch (variant) {
        case 'destructive':
        case 'warning':
          return 'alert';
        default:
          return 'status';
      }
    };

    const getAriaLive = () => {
      switch (variant) {
        case 'destructive':
          return 'assertive';
        default:
          return 'polite';
      }
    };

    return (
      <ToastPrimitives.Root
        ref={ref}
        className={cn(toastVariants({ variant }), className)}
        role={getAriaRole()}
        aria-live={getAriaLive()}
        aria-atomic="true"
        {...props}
      >
        <div className="flex items-start space-x-3 flex-1">
          {getIcon() && <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>}
          <div className="flex-1 min-w-0">
            <div className="flex flex-col space-y-1">
              {title && (
                <ToastPrimitives.Title
                  className="text-sm font-semibold"
                  data-testid="toast-title"
                >
                  {title}
                </ToastPrimitives.Title>
              )}
              {description && (
                <ToastPrimitives.Description
                  className="text-sm opacity-90"
                  data-testid="toast-description"
                >
                  {description}
                </ToastPrimitives.Description>
              )}

              {/* Render children if provided */}
              {children}

              {/* Progress bar for long-running operations */}
              {showProgress && typeof progress === 'number' && (
                <div
                  className="mt-2"
                  role="progressbar"
                  aria-valuenow={progress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <Progress value={progress} className="h-2" />
                  <div className="text-xs opacity-75 mt-1" aria-live="polite">
                    {Math.round(progress)}% complete
                  </div>
                </div>
              )}

              {/* Action buttons */}
              {(onRetry || onAction || actionUrl) && (
                <div
                  className="flex items-center space-x-2 mt-2"
                  role="group"
                  aria-label="Toast actions"
                >
                  {onRetry && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onRetry}
                      className="h-7 px-2 text-xs"
                      aria-label={`${retryLabel || 'Retry'} action`}
                    >
                      <RotateCcw className="h-3 w-3 mr-1" aria-hidden="true" />
                      {retryLabel || 'Retry'}
                    </Button>
                  )}
                  {onAction && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onAction}
                      className="h-7 px-2 text-xs"
                      aria-label={`${actionLabel || 'Action'} button`}
                    >
                      {actionLabel || 'Action'}
                    </Button>
                  )}
                  {actionUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="h-7 px-2 text-xs"
                    >
                      <a
                        href={actionUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Learn more (opens in new tab)"
                      >
                        <ExternalLink
                          className="h-3 w-3 mr-1"
                          aria-hidden="true"
                        />
                        Learn More
                      </a>
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <ToastPrimitives.Close
          className="absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600"
          aria-label="Close notification"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </ToastPrimitives.Close>
      </ToastPrimitives.Root>
    );
  }
);
Toast.displayName = ToastPrimitives.Root.displayName;

const ToastTitle = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Title>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Title>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Title
    ref={ref}
    className={cn('text-sm font-semibold', className)}
    {...props}
  />
));
ToastTitle.displayName = ToastPrimitives.Title.displayName;

const ToastDescription = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Description>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Description>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Description
    ref={ref}
    className={cn('text-sm opacity-90', className)}
    {...props}
  />
));
ToastDescription.displayName = ToastPrimitives.Description.displayName;

type ToastProps = React.ComponentPropsWithoutRef<typeof Toast>;

type ToastActionElement = React.ReactElement<typeof ToastAction>;

const ToastAction = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Action>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Action>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Action
    ref={ref}
    className={cn(
      'inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium ring-offset-background transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 group-[.destructive]:hover:border-destructive/30 group-[.destructive]:hover:bg-destructive group-[.destructive]:hover:text-destructive-foreground group-[.destructive]:focus:ring-destructive',
      className
    )}
    {...props}
  />
));
ToastAction.displayName = ToastPrimitives.Action.displayName;

const ToastClose = React.forwardRef<
  React.ElementRef<typeof ToastPrimitives.Close>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitives.Close>
>(({ className, ...props }, ref) => (
  <ToastPrimitives.Close
    ref={ref}
    className={cn(
      'absolute right-2 top-2 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100 group-[.destructive]:text-red-300 group-[.destructive]:hover:text-red-50 group-[.destructive]:focus:ring-red-400 group-[.destructive]:focus:ring-offset-red-600',
      className
    )}
    toast-close=""
    {...props}
  >
    <X className="h-4 w-4" />
  </ToastPrimitives.Close>
));
ToastClose.displayName = ToastPrimitives.Close.displayName;

export {
  type ToastProps,
  type ToastActionElement,
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
