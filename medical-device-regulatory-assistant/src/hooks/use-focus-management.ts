'use client';

import { useEffect, useRef, useCallback, useState } from 'react';

export interface UseFocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
  initialFocusRef?: React.RefObject<HTMLElement>;
}

export interface UseFocusManagementReturn {
  containerRef: React.RefObject<HTMLDivElement>;
  focusProps: React.HTMLAttributes<HTMLElement>;
  restoreFocus: () => void;
  focusFirst: () => void;
  focusLast: () => void;
}

/**
 * Hook for managing focus within a container, with support for focus trapping
 * and restoration. Built to work with Radix UI components.
 */
export function useFocusManagement(
  options: UseFocusManagementOptions = {}
): UseFocusManagementReturn {
  const {
    trapFocus = false,
    restoreFocus = true,
    autoFocus = true,
    initialFocusRef,
  } = options;

  const containerRef = useRef<HTMLDivElement>(null);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);
  const [isActive, setIsActive] = useState(false);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"]):not([disabled])',
      '[contenteditable="true"]',
    ].join(', ');

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(focusableSelectors)
    ).filter((element) => {
      // Additional check for visibility and interactability
      const style = window.getComputedStyle(element);
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        !element.hasAttribute('aria-hidden')
      );
    });
  }, []);

  // Focus the first focusable element
  const focusFirst = useCallback(() => {
    const focusableElements = getFocusableElements();
    const firstElement = initialFocusRef?.current || focusableElements[0];
    firstElement?.focus();
  }, [getFocusableElements, initialFocusRef]);

  // Focus the last focusable element
  const focusLast = useCallback(() => {
    const focusableElements = getFocusableElements();
    const lastElement = focusableElements[focusableElements.length - 1];
    lastElement?.focus();
  }, [getFocusableElements]);

  // Restore focus to the previously focused element
  const restoreFocusToElement = useCallback(() => {
    if (restoreFocus && previousActiveElementRef.current) {
      previousActiveElementRef.current.focus();
      previousActiveElementRef.current = null;
    }
  }, [restoreFocus]);

  // Handle keyboard navigation for focus trapping
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!trapFocus || !isActive) return;

      if (event.key === 'Tab') {
        const focusableElements = getFocusableElements();
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement as HTMLElement;

        if (event.shiftKey) {
          // Shift + Tab: moving backwards
          if (activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
          }
        } else {
          // Tab: moving forwards
          if (activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
          }
        }
      }

      // Escape key handling (can be overridden by parent components)
      if (event.key === 'Escape') {
        restoreFocusToElement();
      }
    },
    [trapFocus, isActive, getFocusableElements, restoreFocusToElement]
  );

  // Set up focus management when component mounts or becomes active
  useEffect(() => {
    if (isActive) {
      // Store the currently focused element
      if (restoreFocus) {
        previousActiveElementRef.current =
          document.activeElement as HTMLElement;
      }

      // Auto-focus the first element if requested
      if (autoFocus) {
        // Use setTimeout to ensure the DOM is ready
        const timeoutId = setTimeout(() => {
          focusFirst();
        }, 0);
        return () => clearTimeout(timeoutId);
      }
    }
  }, [isActive, autoFocus, focusFirst, restoreFocus]);

  // Set up keyboard event listeners
  useEffect(() => {
    if (trapFocus && isActive) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [trapFocus, isActive, handleKeyDown]);

  // Props to spread on the container element
  const focusProps: React.HTMLAttributes<HTMLElement> = {
    onFocus: () => setIsActive(true),
    onBlur: (event) => {
      // Only deactivate if focus is moving outside the container
      if (!containerRef.current?.contains(event.relatedTarget as Node)) {
        setIsActive(false);
      }
    },
    // Add role and tabindex for screen readers if trapping focus
    ...(trapFocus && {
      role: 'dialog',
      'aria-modal': 'true',
      tabIndex: -1,
    }),
  };

  return {
    containerRef,
    focusProps,
    restoreFocus: restoreFocusToElement,
    focusFirst,
    focusLast,
  };
}

/**
 * Hook for managing focus within form components
 */
export function useFormFocusManagement() {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [focusedFieldId, setFocusedFieldId] = useState<string | null>(null);

  // Focus the first input when form becomes active
  const focusFirstInput = useCallback(() => {
    firstInputRef.current?.focus();
  }, []);

  // Focus a specific field by ID
  const focusField = useCallback((fieldId: string) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.focus();
      setFocusedFieldId(fieldId);
    }
  }, []);

  // Focus the first field with an error
  const focusFirstError = useCallback(() => {
    const errorField = document.querySelector(
      '[aria-invalid="true"]'
    ) as HTMLElement;
    if (errorField) {
      errorField.focus();
      setFocusedFieldId(errorField.id);
    }
  }, []);

  // Handle form keyboard navigation
  const handleFormKeyDown = useCallback((event: React.KeyboardEvent) => {
    // Enter key in form fields (except textarea)
    if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
      const form = event.currentTarget as HTMLFormElement;
      const formElements = Array.from(
        form.querySelectorAll<HTMLElement>('input, select, textarea, button')
      ).filter((el) => !el.disabled && el.tabIndex !== -1);

      const currentIndex = formElements.indexOf(event.target);
      const nextElement = formElements[currentIndex + 1];

      if (nextElement) {
        event.preventDefault();
        nextElement.focus();
      }
    }
  }, []);

  return {
    firstInputRef,
    focusedFieldId,
    focusFirstInput,
    focusField,
    focusFirstError,
    handleFormKeyDown,
  };
}

/**
 * Hook for accessibility announcements
 */
export function useAccessibilityAnnouncements() {
  const [announcement, setAnnouncement] = useState<string>('');
  const [priority, setPriority] = useState<'polite' | 'assertive'>('polite');

  const announce = useCallback(
    (
      message: string,
      announcementPriority: 'polite' | 'assertive' = 'polite'
    ) => {
      setAnnouncement(message);
      setPriority(announcementPriority);

      // Clear the announcement after a short delay to allow for re-announcements
      setTimeout(() => setAnnouncement(''), 100);
    },
    []
  );

  const liveRegionProps = {
    'aria-live': priority,
    'aria-atomic': 'true',
    className: 'sr-only',
  };

  return {
    announcement,
    announce,
    liveRegionProps,
  };
}
