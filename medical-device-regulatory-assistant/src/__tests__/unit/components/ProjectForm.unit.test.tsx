/**
 * Unit tests for ProjectForm component
 * Tests form validation, submission flows, and user interactions
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProjectForm } from '@/components/projects/project-form';
import { useFormSubmissionState } from '@/hooks/use-loading-state';
import { contextualToast } from '@/hooks/use-toast';
import {
  Project,
  ProjectStatus,
  ProjectCreateRequest,
  ProjectUpdateRequest,
} from '@/types/project';
import { renderWithProviders } from '@/lib/testing/test-utils';

// Mock hooks and utilities
jest.mock('@/hooks/use-loading-state');
jest.mock('@/hooks/use-toast');
jest.mock('@/lib/performance/optimization', () => ({
  useRenderPerformance: jest.fn(),
}));

const mockUseFormSubmissionState =
  useFormSubmissionState as jest.MockedFunction<typeof useFormSubmissionState>;
const mockContextualToast = contextualToast as jest.Mocked<
  typeof contextualToast
>;

// Mock project data
const mockProject: Project = {
  id: 1,
  user_id: 'user-1',
  name: 'Cardiac Monitor X1',
  description: 'Advanced cardiac monitoring device',
  device_type: 'Cardiovascular Device',
  intended_use: 'Continuous cardiac rhythm monitoring',
  status: ProjectStatus.IN_PROGRESS,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-02T00:00:00Z',
};

const defaultMockFormSubmission = {
  isLoading: false,
  progress: 0,
  currentStep: '',
  submitForm: jest.fn(),
};

describe('ProjectForm Component', () => {
  const mockOnSubmit = jest.fn();
  const mockOnOpenChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseFormSubmissionState.mockReturnValue(defaultMockFormSubmission);
    mockContextualToast.success = jest.fn();
    mockContextualToast.validationError = jest.fn();
    mockContextualToast.authExpired = jest.fn();
    mockContextualToast.networkError = jest.fn();
    mockContextualToast.projectSaveFailed = jest.fn();
  });

  describe('Rendering', () => {
    it('renders create form when no project is provided', () => {
      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

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
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Edit Project')).toBeInTheDocument();
      expect(
        screen.getByText('Update your project information and settings.')
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /update project/i })
      ).toBeInTheDocument();
    });

    it('renders all form fields', () => {
      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/device type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/intended use/i)).toBeInTheDocument();
    });

    it('shows status field only when editing', () => {
      // Create form - no status field
      const { rerender } = renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.queryByLabelText(/project status/i)
      ).not.toBeInTheDocument();

      // Edit form - status field present
      rerender(
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/project status/i)).toBeInTheDocument();
    });

    it('does not render when dialog is closed', () => {
      renderWithProviders(
        <ProjectForm
          open={false}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.queryByText('Create New Project')).not.toBeInTheDocument();
    });
  });

  describe('Form Population', () => {
    it('populates form fields when editing existing project', () => {
      renderWithProviders(
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(
        screen.getByDisplayValue('Cardiac Monitor X1')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Advanced cardiac monitoring device')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Cardiovascular Device')
      ).toBeInTheDocument();
      expect(
        screen.getByDisplayValue('Continuous cardiac rhythm monitoring')
      ).toBeInTheDocument();
    });

    it('resets form when dialog opens without project', () => {
      const { rerender } = renderWithProviders(
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Form should be populated
      expect(
        screen.getByDisplayValue('Cardiac Monitor X1')
      ).toBeInTheDocument();

      // Rerender without project
      rerender(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Form should be reset
      const nameInput = screen.getByLabelText(
        /project name/i
      ) as HTMLInputElement;
      expect(nameInput.value).toBe('');
    });
  });

  describe('Form Validation', () => {
    it('shows validation error for empty project name', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Project name is required')
        ).toBeInTheDocument();
      });

      expect(mockOnSubmit).not.toHaveBeenCalled();
    });

    it('shows validation error for project name that is too long', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const longName = 'a'.repeat(256); // Exceeds 255 character limit

      await user.type(nameInput, longName);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Project name must be less than 255 characters')
        ).toBeInTheDocument();
      });
    });

    it('shows validation error for description that is too long', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);
      const longDescription = 'a'.repeat(1001); // Exceeds 1000 character limit

      await user.type(nameInput, 'Valid Project Name');
      await user.type(descriptionInput, longDescription);

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(
          screen.getByText('Description must be less than 1000 characters')
        ).toBeInTheDocument();
      });
    });

    it('allows submission with valid data', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn().mockResolvedValue(mockProject);

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
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

      await user.type(nameInput, 'Test Project');
      await user.type(descriptionInput, 'Test description');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockSubmitForm).toHaveBeenCalledWith(
          expect.any(Function),
          expect.objectContaining({
            steps: expect.arrayContaining(['Creating project']),
          })
        );
      });
    });
  });

  describe('Form Submission', () => {
    it('calls onSubmit with correct data for create', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn) => submitFn());

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

      mockOnSubmit.mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'Test Project');
      await user.type(descriptionInput, 'Test description');

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Project',
          description: 'Test description',
          device_type: undefined,
          intended_use: undefined,
        });
      });
    });

    it('calls onSubmit with correct data for update', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn) => submitFn());

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

      mockOnSubmit.mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Project Name');

      const submitButton = screen.getByRole('button', {
        name: /update project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Updated Project Name',
          description: 'Advanced cardiac monitoring device',
          device_type: 'Cardiovascular Device',
          intended_use: 'Continuous cardiac rhythm monitoring',
          status: ProjectStatus.IN_PROGRESS,
        });
      });
    });

    it('cleans up empty strings to undefined', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn) => submitFn());

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

      mockOnSubmit.mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      const descriptionInput = screen.getByLabelText(/description/i);

      await user.type(nameInput, 'Test Project');
      await user.type(descriptionInput, '   '); // Whitespace only

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockOnSubmit).toHaveBeenCalledWith({
          name: 'Test Project',
          description: undefined, // Should be cleaned up
          device_type: undefined,
          intended_use: undefined,
        });
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading state during submission', () => {
      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        isLoading: true,
        currentStep: 'Creating project',
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Creating project')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /creating/i })).toBeDisabled();
    });

    it('disables form fields during submission', () => {
      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        isLoading: true,
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/project name/i)).toBeDisabled();
      expect(screen.getByLabelText(/description/i)).toBeDisabled();
      expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    });

    it('shows progress indicator when available', () => {
      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        isLoading: true,
        progress: 50,
        currentStep: 'Validating project data',
      });

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByText('Validating project data')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('shows validation error toast for invalid data', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn, options) => {
        options.onError('Invalid project data');
      });

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

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

      await waitFor(() => {
        expect(mockContextualToast.validationError).toHaveBeenCalledWith(
          'Please check your input and try again.'
        );
      });
    });

    it('shows auth expired toast for authentication errors', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn, options) => {
        options.onError('Authentication required');
      });

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

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

      await waitFor(() => {
        expect(mockContextualToast.authExpired).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });

    it('shows network error toast for network issues', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn, options) => {
        options.onError('Network error');
      });

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

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

      await waitFor(() => {
        expect(mockContextualToast.networkError).toHaveBeenCalledWith(
          expect.any(Function)
        );
      });
    });
  });

  describe('Success Handling', () => {
    it('shows success toast and closes dialog on successful submission', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn, options) => {
        const result = submitFn();
        options.onSuccess(result);
        return result;
      });

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

      mockOnSubmit.mockResolvedValue(mockProject);

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

      await waitFor(() => {
        expect(mockContextualToast.success).toHaveBeenCalledWith(
          'Project Created',
          'Project "Cardiac Monitor X1" has been created successfully.'
        );
        expect(mockOnOpenChange).toHaveBeenCalledWith(false);
      });
    });

    it('shows update success toast for edit operations', async () => {
      const user = userEvent.setup();
      const mockSubmitForm = jest.fn((submitFn, options) => {
        const result = submitFn();
        options.onSuccess(result);
        return result;
      });

      mockUseFormSubmissionState.mockReturnValue({
        ...defaultMockFormSubmission,
        submitForm: mockSubmitForm,
      });

      mockOnSubmit.mockResolvedValue(mockProject);

      renderWithProviders(
        <ProjectForm
          project={mockProject}
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /update project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        expect(mockContextualToast.success).toHaveBeenCalledWith(
          'Project Updated',
          'Project "Cardiac Monitor X1" has been updated successfully.'
        );
      });
    });
  });

  describe('Dialog Controls', () => {
    it('calls onOpenChange when cancel button is clicked', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });

    it('resets form when dialog is closed', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const nameInput = screen.getByLabelText(/project name/i);
      await user.type(nameInput, 'Test Project');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Form should be reset when reopened
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  describe('Device Type Selection', () => {
    it('provides common device type options', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const deviceTypeSelect = screen.getByLabelText(/device type/i);
      await user.click(deviceTypeSelect);

      expect(
        screen.getByRole('option', { name: /cardiovascular device/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: /orthopedic device/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('option', { name: /software as medical device/i })
      ).toBeInTheDocument();
    });

    it('allows selection of device type', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const deviceTypeSelect = screen.getByLabelText(/device type/i);
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

  describe('Accessibility', () => {
    it('has proper form labels and descriptions', () => {
      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      expect(screen.getByLabelText(/project name/i)).toBeInTheDocument();
      expect(
        screen.getByText(/a descriptive name for your medical device project/i)
      ).toBeInTheDocument();
      expect(screen.getByLabelText(/description/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/device type/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/intended use/i)).toBeInTheDocument();
    });

    it('associates error messages with form fields', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      const submitButton = screen.getByRole('button', {
        name: /create project/i,
      });
      await user.click(submitButton);

      await waitFor(() => {
        const nameInput = screen.getByLabelText(/project name/i);
        const errorMessage = screen.getByText('Project name is required');

        expect(nameInput).toHaveAttribute(
          'aria-describedby',
          expect.stringContaining(errorMessage.id)
        );
      });
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();

      renderWithProviders(
        <ProjectForm
          open={true}
          onOpenChange={mockOnOpenChange}
          onSubmit={mockOnSubmit}
        />
      );

      // Tab through form fields
      await user.tab();
      expect(screen.getByLabelText(/project name/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/description/i)).toHaveFocus();

      await user.tab();
      expect(screen.getByLabelText(/device type/i)).toHaveFocus();
    });
  });
});
