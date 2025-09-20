/**
 * Unit tests for ProjectForm component
 * Tests form validation, submission, and dialog behavior
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { ProjectForm } from '../project-form';
import { generateMockProject } from '@/lib/mock-data';
import { ProjectStatus } from '@/types/project';

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  toast: jest.fn(),
}));

describe('ProjectForm Component', () => {
  const mockSession = createMockSession();
  const mockProject = generateMockProject({
    id: 1,
    name: 'Test Cardiac Monitor',
    description: 'A wireless cardiac monitoring device',
    device_type: 'Cardiovascular Device',
    intended_use: 'For continuous monitoring of cardiac rhythm',
    status: ProjectStatus.IN_PROGRESS,
  });

  const defaultProps = {
    open: true,
    onOpenChange: jest.fn(),
    onSubmit: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Dialog Rendering', () => {
    it('renders create form when no project is provided', () => {
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Create New Project')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Create a new medical device regulatory project to get started.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /create project/i })
      ).toBeInTheDocument();
    });

    it('renders edit form when project is provided', () => {
      renderWithProviders(
        <ProjectForm {...defaultProps} project={mockProject} />,
        { session: mockSession }
      );

      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(
        screen.getByText('Update your project information and settings.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /update project/i })
      ).toBeInTheDocument();
    });

    it('does not render when open is false', () => {
      renderWithProviders(<ProjectForm {...defaultProps} open={false} />, {
        session: mockSession,
      });

      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('renders all required form fields', () => {
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/device type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/intended use/i)).toBeInTheDocument();
    });

    it('shows status field only in edit mode', () => {
      // Create mode - no status field
      const { rerender } = renderWithProviders(
        <ProjectForm {...defaultProps} />,
        { session: mockSession }
      );

      expect(
        screen.queryByLabelText(/project status/i)
      ).not.toBeInTheDocument();

      // Edit mode - status field should be present
      rerender(<ProjectForm {...defaultProps} project={mockProject} />);

      expect(screen.getByLabelText(/project status/i)).toBeInTheDocument();
    });

    it('populates form fields with project data in edit mode', () => {
      renderWithProviders(
        <ProjectForm {...defaultProps} project={mockProject} />,
        { session: mockSession }
      );

      expect(
        screen.getByDisplayValue('Test Cardiac Monitor')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('A wireless cardiac monitoring device')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('For continuous monitoring of cardiac rhythm')
      ).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty project name', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Project name is required')
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for project name too long', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const nameInput = screen.getByLabelText(/project name/i);
      const longName = 'a'.repeat(101); // Exceeds 100 character limit

      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Project name must be less than 100 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for description too long', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'a'.repeat(501); // Exceeds 500 character limit

      await user.type(nameInput, 'Valid Name');
      await user.type(descriptionInput, longDescription);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Description must be less than 500 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for intended use too long', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const nameInput = screen.getByLabelText(/project name/i);
      const intendedUseInput = screen.getByLabelText(/intended use/i);
      const longIntendedUse = 'a'.repeat(1001); // Exceeds 1000 character limit

      await user.type(nameInput, 'Valid Name');
      await user.type(intendedUseInput, longIntendedUse);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Intended use must be less than 1000 characters')
        ).toBeInTheDocument();
      });
    });
  });

  describe('Device Type Selection', () => {
    it('renders device type dropdown with common options', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const deviceTypeSelect = screen.getByRole('combobox', {
        name: /device type/i,
      });
      await user.click(deviceTypeSelect);

      await waitFor(() => {
        expect(
          screen.getByRole('option', { name: /cardiovascular device/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('option', { name: /orthopedic device/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('option', { name: /neurological device/i })
        ).toBeInTheDocument();
        expect(
          screen.getByRole('option', { name: /software as medical device/i })
        ).toBeInTheDocument();
      });
    });

    it('selects device type correctly', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const deviceTypeSelect = screen.getByRole('combobox', {
        name: /device type/i,
      });
      await user.click(deviceTypeSelect);

      const cardiovascularOption = screen.getByRole('option', {
        name: /cardiovascular device/i,
      });
      await user.click(cardiovascularOption);

      expect(
        screen.getByDisplayValue('Cardiovascular Device')
      ).toBeInTheDocument();
    });
  });

  describe('Form Submission', () => {
    it('submits form with valid data in create mode', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm {...defaultProps} onSubmit={mockOnSubmit} />,
        { session: mockSession }
      );

      // Fill form
      await user.type(
        screen.getByLabelText(/project name/i),
        'New Test Project'
      );
      await user.type(
        screen.getByLabelText(/description/i),
        'Test description'
      );
      await user.type(
        screen.getByLabelText(/intended use/i),
        'Test intended use'
      );

      // Select device type
      const deviceTypeSelect = screen.getByRole('combobox', {
        name: /device type/i,
      });
      await user.click(deviceTypeSelect);
      await user.click(
        screen.getByRole('option', { name: /cardiovascular device/i })
      );

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'New Test Project',
          description: 'Test description',
          device_type: 'Cardiovascular Device',
          intended_use: 'Test intended use',
          status: ProjectStatus.DRAFT,
        });
      });
    });

    it('submits form with valid data in edit mode', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm
          {...defaultProps}
          project={mockProject}
          onSubmit={mockOnSubmit}
        />,
        { session: mockSession }
      );

      // Modify name
      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Project Name');

      // Submit form
      const submitButton = screen.getByRole('button', {
        name: /update project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Updated Project Name',
          description: 'A wireless cardiac monitoring device',
          device_type: 'Cardiovascular Device',
          intended_use: 'For continuous monitoring of cardiac rhythm',
          status: ProjectStatus.IN_PROGRESS,
        });
      });
    });

    it('shows loading state during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      renderWithProviders(
        <ProjectForm {...defaultProps} onSubmit={mockOnSubmit} />,
        { session: mockSession }
      );

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      // Should show loading state
      expect(screen.getByText('Creating...')).toBeInTheDocument();
      expect(submitButton).toBeDisabled();
    });

    it('shows success toast on successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(mockProject);
      const { toast } = require('@/hooks/use-toast');

      renderWithProviders(
        <ProjectForm {...defaultProps} onSubmit={mockOnSubmit} />,
        { session: mockSession }
      );

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Project Created',
          description:
            'Project "Test Cardiac Monitor" has been created successfully.',
        });
      });
    });

    it('shows error toast on submission failure', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest
        .fn()
        .mockRejectedValue(new Error('Submission failed'));
      const { toast } = require('@/hooks/use-toast');

      renderWithProviders(
        <ProjectForm {...defaultProps} onSubmit={mockOnSubmit} />,
        { session: mockSession }
      );

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith({
          title: 'Creation Failed',
          description: 'Submission failed',
          variant: 'destructive',
        });
      });
    });

    it('closes dialog and resets form on successful submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest.fn().mockResolvedValue(mockProject);
      const mockOnOpenChange = jest.fn();

      renderWithProviders(
        <ProjectForm
          {...defaultProps}
          onSubmit={mockOnSubmit}
          onOpenChange={mockOnOpenChange}
        />,
        { session: mockSession }
      );

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });
  });

  describe('Form Actions', () => {
    it('closes dialog when cancel button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnOpenChange = jest.fn();

      renderWithProviders(
        <ProjectForm {...defaultProps} onOpenChange={mockOnOpenChange} />,
        { session: mockSession }
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog is closed and reopened', () => {
      const { rerender } = renderWithProviders(
        <ProjectForm {...defaultProps} open={true} />,
        { session: mockSession }
      );

      // Fill form
      const nameInput = screen.getByLabelText(/project name/i);
      fireEvent.change(nameInput, { target: { value: 'Test Name' } });

      // Close dialog
      rerender(<ProjectForm {...defaultProps} open={false} />);

      // Reopen dialog
      rerender(<ProjectForm {...defaultProps} open={true} />);

      // Form should be reset
      expect(screen.getByLabelText(/project name/i)).toHaveValue('');
    });
  });

  describe('Loading States', () => {
    it('disables form fields when loading prop is true', () => {
      renderWithProviders(<ProjectForm {...defaultProps} loading={true} />, {
        session: mockSession,
      });

      expect(screen.getByLabelText(/project name/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(
        screen.getByRole('button', { name: /create project/i })
      ).toBeDisabled();
    });

    it('disables form fields during submission', async () => {
      const user = userEvent.setup();
      const mockOnSubmit = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(resolve, 100))
        );

      renderWithProviders(
        <ProjectForm {...defaultProps} onSubmit={mockOnSubmit} />,
        { session: mockSession }
      );

      await user.type(screen.getByLabelText(/project name/i), 'Test Project');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      // Fields should be disabled during submission
      expect(screen.getByLabelText(/project name/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels and descriptions', () => {
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(
        screen.getByText('A descriptive name for your medical device project')
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'Optional description to help identify and organize your project'
        )
      ).toBeInTheDocument();
    });

    it('associates form fields with their labels', () => {
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const intendedUseInput = screen.getByLabelText(/intended use/i);

      expect(nameInput).toHaveAttribute('id');
      expect(descriptionInput).toHaveAttribute('id');
      expect(intendedUseInput).toHaveAttribute('id');
    });

    it('shows validation errors with proper ARIA attributes', async () => {
      const user = userEvent.setup();
      renderWithProviders(<ProjectForm {...defaultProps} />, {
        session: mockSession,
      });

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        expect(nameInput).toHaveAttribute('aria-invalid', 'true');
      });
    });
  });
});
