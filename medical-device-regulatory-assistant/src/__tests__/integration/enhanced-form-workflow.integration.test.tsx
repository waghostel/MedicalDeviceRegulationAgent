/**
 * Enhanced Form Integration Tests
 *
 * Comprehensive integration tests for the enhanced form workflow including:
 * - Real-time validation
 * - Auto-save functionality
 * - Accessibility features
 * - Form submission with feedback
 * - Error handling and recovery
 * - Performance characteristics
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { ProjectForm } from '@/components/projects/project-form';
import {
  setupTestEnvironment,
  teardownTestEnvironment,
} from '@/lib/testing/test-setup';
import { renderWithProviders } from '@/lib/testing/test-utils';
import { Project, ProjectStatus } from '@/types/project';

// Setup comprehensive test environment
beforeAll(() => {
  setupTestEnvironment({
    mockAPI: true,
    mockWebSocket: true,
    mockComponents: true,
  });
});

afterAll(() => {
  teardownTestEnvironment();
});

// Enhanced localStorage mock for auto-save testing
const createLocalStorageMock = () => {
  const store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach((key) => delete store[key]);
    }),
    get store() {
      return { ...store };
    },
  };
};

// Mock performance observer for performance tests
const mockPerformanceObserver = {
  observe: jest.fn(),
  disconnect: jest.fn(),
  takeRecords: jest.fn(() => []),
};

// Setup timer mocks for debounced operations
jest.useFakeTimers();

describe('Enhanced Form Integration Workflow', () => {
  let localStorageMock: ReturnType<typeof createLocalStorageMock>;
  let mockOnSubmit: jest.Mock;
  let mockOnOpenChange: jest.Mock;

  beforeEach(() => {
    // Setup fresh mocks for each test
    localStorageMock = createLocalStorageMock();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    mockOnSubmit = jest.fn();
    mockOnOpenChange = jest.fn();

    // Setup performance observer mock
    global.PerformanceObserver = jest
      .fn()
      .mockImplementation(() => mockPerformanceObserver);

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.useFakeTimers();
  });

  describe('Complete Form Lifecycle Integration', () => {
    it('completes full form lifecycle with validation, auto-save, and submission', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      const mockSubmitResponse = { id: 1, name: 'Test Project' };
      mockOnSubmit.mockResolvedValue(mockSubmitResponse);

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Step 1: Test real-time validation
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      // Verify character count appears
      await waitFor(() => {
        expect(screen.getByText('12/255')).toBeInTheDocument();
      });

      // Step 2: Test auto-save functionality
      const descriptionInput = screen.getByLabelText(/description/i);
      await user.type(
        descriptionInput,
        'This is a comprehensive test description for auto-save functionality'
      );

      // Advance timers to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Verify auto-save triggered
      await waitFor(
        () => {
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'project-form-new',
            expect.stringContaining('Test Project')
          );
          expect(localStorageMock.setItem).toHaveBeenCalledWith(
            'project-form-new_timestamp',
            expect.any(String)
          );
        },
        { timeout: 3000 }
      );

      // Step 3: Test form submission
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Project',
          description:
            'This is a comprehensive test description for auto-save functionality',
          device_type: undefined,
          intended_use: undefined,
        });
      });

      // Step 4: Verify auto-saved data is cleaned up after successful submission
      await waitFor(() => {
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          'project-form-new'
        );
        expect(localStorageMock.removeItem).toHaveBeenCalledWith(
          'project-form-new_timestamp'
        );
      });
    });

    it('handles form recovery from auto-saved data', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Pre-populate localStorage with saved form data
      const savedFormData = {
        name: 'Recovered Project',
        description: 'This project was recovered from auto-save',
        device_type: 'Cardiovascular Device',
        intended_use: 'Monitoring heart rhythm',
      };

      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'project-form-new') {
          return JSON.stringify(savedFormData);
        }
        if (key === 'project-form-new_timestamp') {
          return new Date(Date.now() - 30000).toISOString(); // 30 seconds ago
        }
        return null;
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify form is populated with recovered data
      await waitFor(() => {
        expect(
          screen.getByDisplayValue('Recovered Project')
        ).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('This project was recovered from auto-save')
        ).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('Cardiovascular Device')
        ).toBeInTheDocument();
        expect(
          screen.getByDisplayValue('Monitoring heart rhythm')
        ).toBeInTheDocument();
      });

      // Verify auto-save indicator shows last saved time
      expect(screen.getByText(/last saved/i)).toBeInTheDocument();
    });

    it('handles concurrent form editing with conflict resolution', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      // Simulate user typing in multiple fields simultaneously
      await Promise.all([
        user.type(nameInput, 'Concurrent Project'),
        user.type(descriptionInput, 'Testing concurrent editing capabilities'),
      ]);

      // Advance timers to trigger auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Verify both fields are saved correctly
      await waitFor(() => {
        const savedData = JSON.parse(
          localStorageMock.store['project-form-new'] || '{}'
        );
        expect(savedData.name).toBe('Concurrent Project');
        expect(savedData.description).toBe(
          'Testing concurrent editing capabilities'
        );
      });
    });
  });

  describe('Real-time Validation Integration', () => {
    it('provides immediate feedback for validation errors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Test invalid characters
      await user.type(nameInput, 'Invalid@Name!');

      // Advance timers for debounced validation
      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/can only contain letters, numbers, spaces/i)
        ).toBeInTheDocument();
      });

      // Test correction
      await user.clear(nameInput);
      await user.type(nameInput, 'Valid Project Name');

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(/can only contain letters, numbers, spaces/i)
        ).not.toBeInTheDocument();
      });
    });

    it('validates field dependencies and cross-field validation', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const deviceTypeInput = screen.getByLabelText(/device type/i);
      const intendedUseInput = screen.getByLabelText(/intended use/i);

      // Fill in device type and intended use
      await user.type(deviceTypeInput, 'Software');
      await user.type(intendedUseInput, 'Data analysis');

      // Verify that description becomes more important for software devices
      await user.type(descriptionInput, 'Short'); // Less than 10 characters

      act(() => {
        jest.advanceTimersByTime(300);
      });

      await waitFor(() => {
        expect(
          screen.getByText(/description must be at least 10 characters/i)
        ).toBeInTheDocument();
      });
    });

    it('handles validation during rapid typing with debouncing', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Simulate rapid typing
      await user.type(nameInput, 'Rapid');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await user.type(nameInput, 'Typing');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await user.type(nameInput, 'Test');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Validation should not trigger until debounce period
      expect(screen.queryByText(/validation/i)).not.toBeInTheDocument();

      // Complete debounce period
      act(() => {
        jest.advanceTimersByTime(300);
      });

      // Now validation should complete
      await waitFor(() => {
        expect(screen.getByText(/15\/255/)).toBeInTheDocument(); // Character count
      });
    });
  });

  describe('Auto-save Functionality Integration', () => {
    it('handles auto-save with network interruptions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock network failure
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('Storage quota exceeded');
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Network Test Project');

      // Trigger auto-save
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/auto-save failed/i)).toBeInTheDocument();
      });

      // Restore normal functionality
      localStorageMock.setItem.mockImplementation(originalSetItem);

      // Try auto-save again
      await user.type(nameInput, ' Updated');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should succeed this time
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'project-form-new',
          expect.stringContaining('Network Test Project Updated')
        );
      });
    });

    it('manages auto-save frequency and prevents excessive saves', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Type multiple characters rapidly
      await user.type(nameInput, 'A');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await user.type(nameInput, 'B');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      await user.type(nameInput, 'C');
      act(() => {
        jest.advanceTimersByTime(100);
      });

      // Auto-save should not trigger yet (debounced)
      expect(localStorageMock.setItem).not.toHaveBeenCalled();

      // Complete debounce period
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should save only once
      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledTimes(2); // Data + timestamp
      });
    });

    it('handles auto-save data corruption and recovery', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Setup corrupted localStorage data
      localStorageMock.getItem.mockImplementation((key: string) => {
        if (key === 'project-form-new') {
          return '{"invalid": json}'; // Corrupted JSON
        }
        return null;
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Form should start with empty state (corruption handled gracefully)
      const nameInput = screen.getByLabelText(
        /project name/i
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('');

      // Should show recovery message
      expect(
        screen.getByText(/recovered from corrupted data/i)
      ).toBeInTheDocument();

      // New data should save correctly
      await user.type(nameInput, 'Recovery Test');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      await waitFor(() => {
        expect(localStorageMock.setItem).toHaveBeenCalledWith(
          'project-form-new',
          expect.stringContaining('Recovery Test')
        );
      });
    });
  });

  describe('Accessibility Integration', () => {
    it('provides comprehensive screen reader support', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify ARIA labels and descriptions
      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveAttribute('aria-describedby');
      expect(nameInput).toHaveAttribute('aria-required', 'true');

      // Test error announcement
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const errorMessage = screen.getByText(/project name is required/i);
        expect(errorMessage).toHaveAttribute('role', 'alert');
        expect(errorMessage).toHaveAttribute('aria-live', 'assertive');
      });

      // Test focus management
      expect(nameInput).toHaveFocus();
    });

    it('supports keyboard navigation throughout the form', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Test tab navigation
      await user.tab();
      expect(screen.getByLabelText(/project name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/device type/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/intended use/i)).toHaveFocus();

      await user.tab();
      expect(
        screen.getByRole('button', { name: /create project/i })
      ).toHaveFocus();

      // Test shift+tab (reverse navigation)
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(screen.getByLabelText(/intended use/i)).toHaveFocus();
    });

    it('provides high contrast mode support', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: jest.fn().mockImplementation((query) => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: jest.fn(),
          removeListener: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          dispatchEvent: jest.fn(),
        })),
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Verify high contrast styles are applied
      const form = screen.getByRole('dialog');
      expect(form).toHaveClass('high-contrast');

      // Verify focus indicators are enhanced
      const nameInput = screen.getByLabelText(/project name/i);
      nameInput.focus();
      expect(nameInput).toHaveClass('focus-visible:ring-4'); // Enhanced focus ring
    });
  });

  describe('Error Handling and Recovery Integration', () => {
    it('handles submission errors with retry functionality', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock submission failure
      mockOnSubmit
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({ id: 1, name: 'Test Project' });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      // Verify error handling
      await waitFor(() => {
        expect(screen.getByText(/network error/i)).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /retry/i })
        ).toBeInTheDocument();
      });

      // Test retry functionality
      const retryButton = screen.getByRole('button', { name: /retry/i });
      await user.click(retryButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledTimes(2);
      });
    });

    it('handles validation errors with field-specific feedback', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      // Create multiple validation errors
      await user.type(nameInput, '   '); // Whitespace only
      await user.type(descriptionInput, 'Short'); // Too short

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      // Verify multiple errors are shown
      await waitFor(() => {
        expect(
          screen.getByText(/project name cannot be only whitespace/i)
        ).toBeInTheDocument();
        expect(
          screen.getByText(/description must be at least 10 characters/i)
        ).toBeInTheDocument();
      });

      // Verify focus goes to first error
      expect(nameInput).toHaveFocus();

      // Fix first error
      await user.clear(nameInput);
      await user.type(nameInput, 'Valid Project Name');

      // Submit again
      await user.click(submitButton);

      // Should now focus on second error
      await waitFor(() => {
        expect(descriptionInput).toHaveFocus();
      });
    });
  });

  describe('Performance Integration', () => {
    it('maintains responsive performance during heavy form interactions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Setup performance monitoring
      const performanceEntries: PerformanceEntry[] = [];
      const mockPerformanceObserver = {
        observe: jest.fn(),
        disconnect: jest.fn(),
        takeRecords: jest.fn(() => performanceEntries),
      };

      global.PerformanceObserver = jest.fn().mockImplementation((callback) => {
        // Simulate performance entries
        setTimeout(() => {
          callback({
            getEntries: () => performanceEntries,
            getEntriesByName: () => performanceEntries,
            getEntriesByType: () => performanceEntries,
          });
        }, 100);
        return mockPerformanceObserver;
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      // Simulate heavy typing load
      const heavyText = 'A'.repeat(1000);

      const startTime = performance.now();
      await user.type(nameInput, heavyText);
      await user.type(descriptionInput, heavyText);
      const endTime = performance.now();

      // Verify performance is acceptable (< 100ms for typing)
      expect(endTime - startTime).toBeLessThan(100);

      // Verify auto-save doesn't block UI
      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // UI should remain responsive
      await user.click(screen.getByRole('button', { name: /cancel/i }));
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('optimizes memory usage during long form sessions', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Simulate long editing session with many changes
      for (let i = 0; i < 100; i++) {
        await user.clear(nameInput);
        await user.type(nameInput, `Project ${i}`);

        act(() => {
          jest.advanceTimersByTime(100);
        });
      }

      // Verify localStorage doesn't accumulate excessive data
      const storageKeys = Object.keys(localStorageMock.store);
      expect(storageKeys.length).toBeLessThanOrEqual(2); // Only current form data + timestamp

      // Verify auto-save data is reasonable size
      const savedData = localStorageMock.store['project-form-new'];
      if (savedData) {
        expect(savedData.length).toBeLessThan(10000); // Reasonable size limit
      }
    });
  });

  describe('Cross-browser Compatibility Integration', () => {
    it('handles different localStorage implementations', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      // Mock Safari's localStorage behavior (throws on private mode)
      localStorageMock.setItem.mockImplementationOnce(() => {
        throw new Error('QuotaExceededError');
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Safari Test');

      act(() => {
        jest.advanceTimersByTime(2000);
      });

      // Should gracefully handle storage failure
      await waitFor(() => {
        expect(screen.getByText(/auto-save unavailable/i)).toBeInTheDocument();
      });

      // Form should still be functional
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalled();
      });
    });

    it('adapts to different input event behaviors', async () => {
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);

      // Test different input methods
      await user.type(nameInput, 'Typed Text');

      // Simulate paste event
      fireEvent.paste(nameInput, {
        clipboardData: {
          getData: () => ' Pasted Text',
        },
      });

      // Simulate composition events (IME input)
      fireEvent.compositionStart(nameInput);
      fireEvent.compositionUpdate(nameInput, { data: '中文' });
      fireEvent.compositionEnd(nameInput, { data: '中文' });

      act(() => {
        jest.advanceTimersByTime(300);
      });

      // All input methods should trigger validation
      await waitFor(() => {
        expect(screen.getByText(/\d+\/255/)).toBeInTheDocument(); // Character count
      });
    });
  });
});
