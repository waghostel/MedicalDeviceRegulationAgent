/**
 * Enhanced Toaster component for rendering toast notifications
 * Supports all enhanced features including retry, progress, contextual messages, and accessibility
 */

'use client';

import { useEffect } from 'react';
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/toast';
import { useToast } from '@/hooks/use-toast';
import { useAccessibilityAnnouncements } from '@/hooks/use-accessibility-announcements';

export function Toaster() {
  const { toasts } = useToast();
  const { announce, liveRegionProps } = useAccessibilityAnnouncements();

  // Announce new toasts to screen readers
  useEffect(() => {
    const latestToast = toasts[0]; // Most recent toast is first
    if (latestToast && latestToast.title) {
      const message = latestToast.description
        ? `${latestToast.title}. ${latestToast.description}`
        : latestToast.title;

      const priority =
        latestToast.variant === 'destructive' ||
        latestToast.variant === 'warning'
          ? 'assertive'
          : 'polite';

      announce(message, priority);
    }
  }, [toasts, announce]);

  return (
    <>
      <ToastProvider>
        {toasts.map(function ({
          id,
          title,
          description,
          variant,
          onRetry,
          retryLabel,
          actionLabel,
          onAction,
          actionUrl,
          progress,
          showProgress,
          ...props
        }) {
          return (
            <Toast
              key={id}
              variant={variant}
              onRetry={onRetry}
              retryLabel={retryLabel}
              actionLabel={actionLabel}
              onAction={onAction}
              actionUrl={actionUrl}
              progress={progress}
              showProgress={showProgress}
              {...props}
            >
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
              <ToastClose />
            </Toast>
          );
        })}
        <ToastViewport />
      </ToastProvider>

      {/* Accessibility live regions for screen reader announcements */}
      <div {...liveRegionProps} />
    </>
  );
}
