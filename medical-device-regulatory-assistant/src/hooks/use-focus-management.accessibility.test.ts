/**
 * @jest-environment jsdom
 */

import { renderHook, act } from '@testing-library/react';
import { useFocusManagement, useFormFocusManagement, useAccessibilityAnnouncements } from './use-focus-management';

describe('Focus Management Hooks - Accessibility', () => {
  beforeEach(() => {
    // Clear the DOM
    document.body.innerHTML = '';
    
    // Mock focus methods
    HTMLElement.prototype.focus = jest.fn();
    HTMLElement.prototype.blur = jest.fn();
  });

  describe('useFocusManagement', () => {
    it('should provide focus management functionality', () => {
      const { result } = renderHook(() => useFocusManagement());

      expect(result.current.containerRef).toBeDefined();
      expect(result.current.focusProps).toBeDefined();
      expect(typeof result.current.restoreFocus).toBe('function');
      expect(typeof result.current.focusFirst).toBe('function');
      expect(typeof result.current.focusLast).toBe('function');
    });

    it('should provide proper focus props for accessibility', () => {
      const { result } = renderHook(() => useFocusManagement({ trapFocus: true }));

      expect(result.current.focusProps).toHaveProperty('role', 'dialog');
      expect(result.current.focusProps).toHaveProperty('aria-modal', 'true');
      expect(result.current.focusProps).toHaveProperty('tabIndex', -1);
    });

    it('should handle focus trapping when enabled', () => {
      const { result } = renderHook(() => useFocusManagement({ trapFocus: true }));

      // Create a container with focusable elements
      const container = document.createElement('div');
      const button1 = document.createElement('button');
      const button2 = document.createElement('button');
      
      button1.textContent = 'Button 1';
      button2.textContent = 'Button 2';
      
      container.appendChild(button1);
      container.appendChild(button2);
      document.body.appendChild(container);

      // Set the container ref
      if (result.current.containerRef.current) {
        result.current.containerRef.current = container;
      }

      // Test focus first
      act(() => {
        result.current.focusFirst();
      });

      expect(button1.focus).toHaveBeenCalled();
    });
  });

  describe('useFormFocusManagement', () => {
    it('should provide form focus management functionality', () => {
      const { result } = renderHook(() => useFormFocusManagement());

      expect(result.current.firstInputRef).toBeDefined();
      expect(typeof result.current.focusFirstInput).toBe('function');
      expect(typeof result.current.focusField).toBe('function');
      expect(typeof result.current.focusFirstError).toBe('function');
      expect(typeof result.current.handleFormKeyDown).toBe('function');
    });

    it('should focus first input when called', () => {
      const { result } = renderHook(() => useFormFocusManagement());

      // Create a mock input
      const input = document.createElement('input');
      input.focus = jest.fn();
      
      // Set the ref
      if (result.current.firstInputRef.current) {
        result.current.firstInputRef.current = input;
      }

      act(() => {
        result.current.focusFirstInput();
      });

      expect(input.focus).toHaveBeenCalled();
    });

    it('should focus field by ID', () => {
      const { result } = renderHook(() => useFormFocusManagement());

      // Create a mock input with ID
      const input = document.createElement('input');
      input.id = 'test-field';
      input.focus = jest.fn();
      document.body.appendChild(input);

      act(() => {
        result.current.focusField('test-field');
      });

      expect(input.focus).toHaveBeenCalled();
    });

    it('should focus first error field', () => {
      const { result } = renderHook(() => useFormFocusManagement());

      // Create a mock input with error
      const input = document.createElement('input');
      input.setAttribute('aria-invalid', 'true');
      input.id = 'error-field';
      input.focus = jest.fn();
      document.body.appendChild(input);

      act(() => {
        result.current.focusFirstError();
      });

      expect(input.focus).toHaveBeenCalled();
    });
  });

  describe('useAccessibilityAnnouncements', () => {
    it('should provide announcement functionality', () => {
      const { result } = renderHook(() => useAccessibilityAnnouncements());

      expect(typeof result.current.announce).toBe('function');
      expect(result.current.liveRegionProps).toBeDefined();
      expect(result.current.liveRegionProps).toHaveProperty('aria-live');
      expect(result.current.liveRegionProps).toHaveProperty('aria-atomic');
    });

    it('should update announcement when called', () => {
      const { result } = renderHook(() => useAccessibilityAnnouncements());

      act(() => {
        result.current.announce('Test announcement', 'assertive');
      });

      expect(result.current.announcement).toBe('Test announcement');
      expect(result.current.liveRegionProps['aria-live']).toBe('assertive');
    });

    it('should clear announcement after timeout', async () => {
      jest.useFakeTimers();
      
      const { result } = renderHook(() => useAccessibilityAnnouncements());

      act(() => {
        result.current.announce('Test announcement');
      });

      expect(result.current.announcement).toBe('Test announcement');

      // Fast-forward time
      act(() => {
        jest.advanceTimersByTime(150);
      });

      expect(result.current.announcement).toBe('');

      jest.useRealTimers();
    });

    it('should default to polite priority', () => {
      const { result } = renderHook(() => useAccessibilityAnnouncements());

      act(() => {
        result.current.announce('Test announcement');
      });

      expect(result.current.liveRegionProps['aria-live']).toBe('polite');
    });
  });
});