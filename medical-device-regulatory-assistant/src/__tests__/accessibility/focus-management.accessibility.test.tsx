/**
 * @jest-environment jsdom
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { ProjectForm } from '@/components/projects/project-form';
import { Project, ProjectStatus } from '@/types/project';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock the hooks
jest.mock('@/hooks/use-loading-state', () => ({
  useFormSubmissionState: () => ({
    isLoading: false,
    progress: 0,
    currentStep: null,
    submitForm: jest.fn(),
  }),
}));

jest.mock('@/lib/performance/optimization', () => ({
  useRenderPerformance: jest.fn(),
}));

jest.mock('@/hooks/use-toast', () => ({
  contextualToast: {
    success: jest.fn(),
    validationError: jest.fn(),
    authExpired: jest.fn(),
    networkError: jest.fn(),
    projectSaveFailed: jest.fn(),
  },
}));

describe('Focus Management and Keyboard Navigation', () => {
  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'Test Description',
    device_type: 'Cardiovascular Device',
    intended_use: 'Test intended use',
    status: ProjectStatus.DRAFT,
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
  };

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(mockProject),
    loading: false,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial Focus Management', () => {
    it('should focus the first input field when dialog opens', async () => {
      render(<ProjectForm {...defaultProps} />);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        expect(nameInput).toHaveFocus();
      });
    });

    it('should focus the name input when editing existing project', async () => {
      render(<ProjectForm {...defaultProps} project={mockProject} />);

      await waitFor(() => {
        const nameInput = screen.getByDisplayValue(mockProject.name);
        expect(nameInput).toHaveFocus();
      });
    });
  });

  describe('Tab Order and Navigation', () => {
    it('should have proper tab order through form fields', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Start from the first field
      const nameInput = screen.getByLabelText(/project name/i);
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // Tab to description
      await user.tab();
      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveFocus();

      // Tab to device type
      await user.tab();
      const deviceTypeSelect = screen.getByRole('combobox', {
        name: /device type/i,
      });
      expect(deviceTypeSelect).toHaveFocus();

      // Tab to intended use
      await user.tab();
      const intendedUseInput = screen.getByLabelText(/intended use/i);
      expect(intendedUseInput).toHaveFocus();

      // Tab to cancel button
      await user.tab();
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveFocus();

      // Tab to submit button
      await user.tab();
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      expect(submitButton).toHaveFocus();
    });

    it('should support reverse tab navigation', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Start from submit button
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);
      expect(submitButton).toHaveFocus();

      // Shift+Tab to cancel button
      await user.tab({ shift: true });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton).toHaveFocus();

      // Shift+Tab to intended use
      await user.tab({ shift: true });
      const intendedUseInput = screen.getByLabelText(/intended use/i);
      expect(intendedUseInput).toHaveFocus();
    });
  });

  describe('Focus Trapping', () => {
    it('should trap focus within the dialog', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Get the last focusable element (submit button)
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);
      expect(submitButton).toHaveFocus();

      // Tab should wrap to first element
      await user.tab();
      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveFocus();
    });

    it('should handle shift+tab from first element', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Start from first element
      const nameInput = screen.getByLabelText(/project name/i);
      await user.click(nameInput);
      expect(nameInput).toHaveFocus();

      // Shift+Tab should wrap to last element
      await user.tab({ shift: true });
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      expect(submitButton).toHaveFocus();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('should close dialog on Escape key', async () => {
      const user = userEvent.setup();
      const onOpenChange = jest.fn();
      render(<ProjectForm {...defaultProps} onOpenChange={onOpenChange} />);

      await user.keyboard('{Escape}');
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('should submit form on Ctrl+Enter', async () => {
      const user = userEvent.setup();
      const onSubmit = jest.fn().mockResolvedValue(mockProject);
      render(<ProjectForm {...defaultProps} onSubmit={onSubmit} />);

      // Fill required field
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      // Ctrl+Enter should submit
      await user.keyboard('{Control>}{Enter}{/Control}');

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling and Focus', () => {
    it('should focus first error field on validation failure', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Try to submit without filling required field
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        expect(nameInput).toHaveFocus();
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });

    it('should announce validation errors to screen readers', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Try to submit without filling required field
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        // Check for error message
        expect(
          screen.getByText(/project name is required/i)
        ).toBeInTheDocument();

        // Check for live region announcement
        const liveRegion = document.querySelector('[aria-live]');
        expect(liveRegion).toBeInTheDocument();
      });
    });
  });

  describe('ARIA Labels and Descriptions', () => {
    it('should have proper ARIA labels for all form fields', () => {
      render(<ProjectForm {...defaultProps} />);

      // Check required field has aria-required
      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toHaveAttribute('aria-required', 'true');

      // Check fields have proper descriptions
      expect(nameInput).toHaveAttribute('aria-describedby');

      const descriptionInput = screen.getByLabelText(/description/i);
      expect(descriptionInput).toHaveAttribute('aria-describedby');
    });

    it('should have proper dialog ARIA attributes', () => {
      render(<ProjectForm {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
      expect(dialog).toHaveAttribute('aria-describedby');
    });

    it('should announce loading states', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} loading={true} />);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      expect(submitButton).toHaveAttribute('aria-busy', 'true');
      expect(submitButton).toBeDisabled();
    });
  });

  describe('Accessibility Compliance', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ProjectForm {...defaultProps} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations with errors', async () => {
      const user = userEvent.setup();
      const { container } = render(<ProjectForm {...defaultProps} />);

      // Trigger validation errors
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(async () => {
        const results = await axe(container);
        expect(results).toHaveNoViolations();
      });
    });

    it('should have no accessibility violations when editing', async () => {
      const { container } = render(
        <ProjectForm {...defaultProps} project={mockProject} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });
  });

  describe('Screen Reader Support', () => {
    it('should announce form submission progress', async () => {
      const user = userEvent.setup();
      render(<ProjectForm {...defaultProps} />);

      // Fill form and submit
      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      // Check for progress announcements
      await waitFor(() => {
        const liveRegions = document.querySelectorAll('[aria-live]');
        expect(liveRegions.length).toBeGreaterThan(0);
      });
    });

    it('should provide context for form fields', () => {
      render(<ProjectForm {...defaultProps} />);

      // Check that form fields have helpful descriptions
      expect(
        screen.getByText(/descriptive name for your medical device project/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/optional description to help identify/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/select the category that best describes/i)
      ).toBeInTheDocument();
    });
  });

  describe('High Contrast and Visual Focus', () => {
    it('should have visible focus indicators', () => {
      render(<ProjectForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/project name/i);
      nameInput.focus();

      // Check that focus styles are applied
      expect(nameInput).toHaveClass('focus-visible:ring-2');
    });

    it('should support high contrast mode', () => {
      // Add high contrast class to document
      document.documentElement.classList.add('high-contrast');

      render(<ProjectForm {...defaultProps} />);

      const nameInput = screen.getByLabelText(/project name/i);
      expect(nameInput).toBeInTheDocument();

      // Clean up
      document.documentElement.classList.remove('high-contrast');
    });
  });
});
