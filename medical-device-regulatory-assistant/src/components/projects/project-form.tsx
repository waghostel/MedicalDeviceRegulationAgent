/**
 * Project Form Component for creating and editing projects
 * Enhanced with proper keyboard navigation and focus management
 * Optimized with React.memo and useMemo for performance
 */

import { useState, useEffect, memo, useMemo, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEnhancedForm } from '@/hooks/use-enhanced-form';
import {
  EnhancedInput,
  EnhancedTextarea,
  AutoSaveIndicator,
} from '@/components/forms/EnhancedFormField';
import { z } from 'zod';
import { Loader2, Save, X } from 'lucide-react';
import { useFormSubmissionState } from '@/hooks/use-loading-state';
import {
  useFormFocusManagement,
  useAccessibilityAnnouncements,
} from '@/hooks/use-focus-management';
import { FormSubmissionProgress } from '@/components/loading';
import { EnhancedButton } from '@/components/ui/enhanced-button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  EnhancedForm,
} from '@/components/ui/enhanced-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/enhanced-dialog';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectStatus,
} from '@/types/project';
import { contextualToast } from '@/hooks/use-toast';
import { useRenderPerformance } from '@/lib/performance/optimization';

// Enhanced form validation schema with comprehensive rules
const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(255, 'Project name must be less than 255 characters')
    .regex(
      /^[a-zA-Z0-9\s\-_().]+$/,
      'Project name can only contain letters, numbers, spaces, hyphens, underscores, and parentheses'
    )
    .refine(
      (val) => val.trim().length > 0,
      'Project name cannot be only whitespace'
    )
    .refine(
      (val) => !val.match(/^\s/),
      'Project name cannot start with whitespace'
    )
    .refine(
      (val) => !val.match(/\s$/),
      'Project name cannot end with whitespace'
    ),
  description: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length === 0 || val.trim().length >= 10,
      'Description must be at least 10 characters when provided'
    )
    .refine(
      (val) => !val || val.length <= 1000,
      'Description must be less than 1000 characters'
    ),
  device_type: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length === 0 || val.trim().length >= 3,
      'Device type must be at least 3 characters when provided'
    )
    .refine(
      (val) => !val || val.length <= 255,
      'Device type must be less than 255 characters'
    ),
  intended_use: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length === 0 || val.trim().length >= 20,
      'Intended use must be at least 20 characters when provided'
    )
    .refine(
      (val) => !val || val.length <= 2000,
      'Intended use must be less than 2000 characters'
    ),
  status: z.nativeEnum(ProjectStatus).optional(),
});

type ProjectFormData = z.infer<typeof projectFormSchema>;

interface ProjectFormProps {
  project?: Project;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (
    data: ProjectCreateRequest | ProjectUpdateRequest
  ) => Promise<Project | null>;
  loading?: boolean;
}

// Common device types for suggestions
const COMMON_DEVICE_TYPES = [
  'Cardiovascular Device',
  'Orthopedic Device',
  'Neurological Device',
  'Ophthalmic Device',
  'Dental Device',
  'General Hospital Device',
  'Anesthesiology Device',
  'Surgical Instrument',
  'Diagnostic Device',
  'Therapeutic Device',
  'Monitoring Device',
  'Implantable Device',
  'Software as Medical Device (SaMD)',
  'In Vitro Diagnostic (IVD)',
  'Other',
];

export const ProjectForm = memo(function ProjectForm({
  project,
  open,
  onOpenChange,
  onSubmit,
  loading = false,
}: ProjectFormProps) {
  // Performance monitoring
  useRenderPerformance('ProjectForm');
  const isEditing = useMemo(() => !!project, [project]);
  const formSubmission = useFormSubmissionState();

  // Focus management
  const { firstInputRef, focusFirstInput, focusFirstError, handleFormKeyDown } =
    useFormFocusManagement();
  const { announce } = useAccessibilityAnnouncements();

  // Refs for focus management
  const nameInputRef = useRef<HTMLInputElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  // Enhanced form with real-time validation and auto-save
  const form = useEnhancedForm<ProjectFormData>({
    schema: projectFormSchema,
    defaultValues: {
      name: '',
      description: '',
      device_type: '',
      intended_use: '',
      status: ProjectStatus.DRAFT,
    },
    mode: 'onChange',
    autoSave: {
      enabled: true,
      interval: 2000,
      onSave: async (data) => {
        // Auto-save to localStorage
        const storageKey = `project-form-${project?.id || 'new'}`;
        localStorage.setItem(storageKey, JSON.stringify(data));
      },
      storageKey: `project-form-${project?.id || 'new'}`,
    },
    realTimeValidation: {
      enabled: true,
      debounceMs: 300,
    },
    accessibility: {
      announceErrors: true,
      focusFirstError: true,
    },
    formName: isEditing ? 'Edit Project' : 'Create Project',
  });

  // Reset form when project changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (project) {
        form.reset({
          name: project.name,
          description: project.description || '',
          device_type: project.device_type || '',
          intended_use: project.intended_use || '',
          status: project.status,
        });
      } else {
        form.reset({
          name: '',
          description: '',
          device_type: '',
          intended_use: '',
          status: ProjectStatus.DRAFT,
        });
      }

      // Focus the first input when dialog opens
      setTimeout(() => {
        focusFirstInput();
      }, 100);

      // Announce dialog opening
      announce(
        isEditing
          ? 'Edit project dialog opened'
          : 'Create new project dialog opened',
        'polite'
      );
    }
  }, [project, open, form, focusFirstInput, announce, isEditing]);

  const handleSubmit = async (data: ProjectFormData) => {
    await form.submitWithFeedback(async (validatedData) => {
      // Clean up empty strings to undefined for backend
      const cleanData = {
        ...validatedData,
        description: validatedData.description?.trim() || undefined,
        device_type: validatedData.device_type?.trim() || undefined,
        intended_use: validatedData.intended_use?.trim() || undefined,
      };

      const submitData = isEditing
        ? (cleanData as ProjectUpdateRequest)
        : (cleanData as ProjectCreateRequest);

      const result = await formSubmission.submitForm(
        () => onSubmit(submitData),
        {
          steps: [
            'Validating project data',
            isEditing ? 'Updating project' : 'Creating project',
            'Refreshing interface',
          ],
          onSuccess: (result) => {
            if (result) {
              // Clear auto-saved data on successful submission
              const storageKey = `project-form-${project?.id || 'new'}`;
              localStorage.removeItem(storageKey);
              localStorage.removeItem(`${storageKey}_timestamp`);

              onOpenChange(false);
              form.reset();
            }
          },
          onError: (error) => {
            console.error('Form submission error:', error);
            // Enhanced error handling is now handled by submitWithFeedback
            throw error; // Re-throw to let submitWithFeedback handle it
          },
        }
      );
    });
  };

  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
    announce('Dialog closed', 'polite');
  };

  // Handle escape key to close dialog
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape') {
      handleCancel();
    }
    handleFormKeyDown(event);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto"
        announceOnOpen={
          isEditing
            ? 'Edit project dialog opened'
            : 'Create new project dialog opened'
        }
        announceOnClose="Dialog closed"
        customFocusTarget={nameInputRef}
        trapFocus={true}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>
              {isEditing ? 'Edit Project' : 'Create New Project'}
            </DialogTitle>
            <AutoSaveIndicator
              isSaving={form.isSaving}
              lastSaved={form.lastSaved}
              className="text-xs"
            />
          </div>
          <DialogDescription>
            {isEditing
              ? 'Update your project information and settings.'
              : 'Create a new medical device regulatory project to get started.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <EnhancedForm
            onSubmit={form.handleSubmit(handleSubmit)}
            onKeyDown={handleKeyDown}
            announceErrors={true}
          >
            {/* Form Submission Progress */}
            <FormSubmissionProgress
              isSubmitting={formSubmission.isLoading}
              progress={formSubmission.progress}
              currentStep={formSubmission.currentStep}
            />
            {/* Project Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <EnhancedInput
                    {...field}
                    ref={nameInputRef}
                    label="Project Name"
                    name="name"
                    placeholder="Enter project name (e.g., Cardiac Monitor X1)"
                    description="A descriptive name for your medical device project"
                    required={true}
                    disabled={formSubmission.isLoading || loading}
                    error={form.formState.errors.name}
                    validation={form.getFieldValidation('name')}
                    maxLength={255}
                    showCharacterCount={true}
                    autoFocus={true}
                    autoComplete="off"
                  />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <EnhancedTextarea
                    {...field}
                    label="Description"
                    name="description"
                    placeholder="Brief description of the project and device..."
                    description="Optional description to help identify and organize your project"
                    disabled={formSubmission.isLoading || loading}
                    error={form.formState.errors.description}
                    validation={form.getFieldValidation('description')}
                    rows={3}
                    maxLength={1000}
                    showCharacterCount={true}
                    resize={false}
                  />
                </FormItem>
              )}
            />

            {/* Device Type */}
            <FormField
              control={form.control}
              name="device_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Device Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={formSubmission.isLoading || loading}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select device type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {COMMON_DEVICE_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Select the category that best describes your medical device
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Intended Use */}
            <FormField
              control={form.control}
              name="intended_use"
              render={({ field }) => (
                <FormItem>
                  <EnhancedTextarea
                    {...field}
                    label="Intended Use"
                    name="intended_use"
                    placeholder="Describe the intended use and clinical purpose of the device..."
                    description="Clear statement of the device's intended medical purpose and target patient population"
                    disabled={formSubmission.isLoading || loading}
                    error={form.formState.errors.intended_use}
                    validation={form.getFieldValidation('intended_use')}
                    rows={4}
                    maxLength={2000}
                    showCharacterCount={true}
                    resize={false}
                  />
                </FormItem>
              )}
            />

            {/* Status (only for editing) */}
            {isEditing && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                      disabled={formSubmission.isLoading || loading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={ProjectStatus.DRAFT}>
                          Draft
                        </SelectItem>
                        <SelectItem value={ProjectStatus.IN_PROGRESS}>
                          In Progress
                        </SelectItem>
                        <SelectItem value={ProjectStatus.COMPLETED}>
                          Completed
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Current status of the regulatory project
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <DialogFooter className="gap-2">
              <EnhancedButton
                ref={cancelButtonRef}
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={formSubmission.isLoading || loading}
                announceClick={true}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </EnhancedButton>
              <EnhancedButton
                type="submit"
                disabled={formSubmission.isLoading || loading}
                loading={formSubmission.isLoading}
                loadingText={
                  formSubmission.currentStep ||
                  (isEditing ? 'Updating...' : 'Creating...')
                }
                announceClick={true}
              >
                {!formSubmission.isLoading && <Save className="h-4 w-4 mr-2" />}
                {isEditing ? 'Update Project' : 'Create Project'}
              </EnhancedButton>
            </DialogFooter>
          </EnhancedForm>
        </Form>
      </DialogContent>
    </Dialog>
  );
});
