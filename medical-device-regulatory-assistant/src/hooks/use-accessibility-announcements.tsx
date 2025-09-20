/**
 * Accessibility announcements hook for screen reader support
 * Provides programmatic announcements for toast notifications
 */

import { useCallback, useRef, useEffect } from 'react';

export interface UseAccessibilityAnnouncementsReturn {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  liveRegionProps: React.HTMLAttributes<HTMLElement>;
}

export function useAccessibilityAnnouncements(): UseAccessibilityAnnouncementsReturn {
  const politeRegionRef = useRef<HTMLDivElement>(null);
  const assertiveRegionRef = useRef<HTMLDivElement>(null);

  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      const region =
        priority === 'assertive'
          ? assertiveRegionRef.current
          : politeRegionRef.current;

      if (region) {
        // Clear the region first to ensure the announcement is heard
        region.textContent = '';

        // Use a small delay to ensure screen readers pick up the change
        setTimeout(() => {
          region.textContent = message;
        }, 100);

        // Clear the message after a delay to prevent it from being read again
        setTimeout(() => {
          region.textContent = '';
        }, 5000);
      }
    },
    []
  );

  const liveRegionProps = {
    children: (
      <>
        <div
          ref={politeRegionRef}
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
          role="status"
        />
        <div
          ref={assertiveRegionRef}
          aria-live="assertive"
          aria-atomic="true"
          className="sr-only"
          role="alert"
        />
      </>
    ),
  };

  return {
    announce,
    liveRegionProps,
  };
}

/**
 * Enhanced toast hook that includes accessibility announcements
 */
export function useAccessibleToast() {
  const { announce } = useAccessibilityAnnouncements();

  const announceToast = useCallback(
    (
      title: string,
      description?: string,
      variant?: 'success' | 'destructive' | 'warning' | 'info'
    ) => {
      const message = description ? `${title}. ${description}` : title;
      const priority =
        variant === 'destructive' || variant === 'warning'
          ? 'assertive'
          : 'polite';

      announce(message, priority);
    },
    [announce]
  );

  return {
    announceToast,
    announce,
  };
}
