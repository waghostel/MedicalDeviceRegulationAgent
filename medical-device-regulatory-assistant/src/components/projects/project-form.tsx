/**
 * Project Form Component for creating and editing projects
 * Optimized with React.memo and useMemo for performance
 */

import { useState, useEffect, memo, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Save, X } from 'lucide-react';
import { useFormSubmissionState } from '@/hooks/use-loading-state';
import { FormSubmissionProgress } from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
} from '@/components/ui/form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Project,
  ProjectCreateRequest,
  ProjectUpdateRequest,
  ProjectStatus,
} from '@/types/project';
import { contextualToast } from '@/hooks/use-toast';
import { useRenderPerformance } from '@/lib/performance/optimization';

// Form validation schema - matches backend validation
const projectFormSchema = z.object({
  name: z
    .string()
    .min(1, 'Project name is required')
    .max(255, 'Project name must be less than 255 characters'),
  description: z
    .string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional()
    .or(z.literal('')),
  device_type: z
    .string()
    .max(255, 'Device type must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  intended_use: z
    .string()
    .max(2000, 'Intended use must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
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

  // Memoize form configuration
  const formConfig = useMemo(
    () => ({
      resolver: zodResolver(projectFormSchema),
      defaultValues: {
        name: '',
        description: '',
        device_type: '',
        intended_use: '',
        status: ProjectStatus.DRAFT,
      },
    }),
    []
  );

  const form = useForm<ProjectFormData>(formConfig);

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
    }
  }, [project, open, form]);

  const handleSubmit = async (data: ProjectFormData) => {
    try {
      // Clean up empty strings to undefined for backend
      const cleanData = {
        ...data,
        description: data.description?.trim() || undefined,
        device_type: data.device_type?.trim() || undefined,
        intended_use: data.intended_use?.trim() || undefined,
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
              contextualToast.success(
                isEditing ? 'Project Updated' : 'Project Created',
                `Project "${result.name}" has been ${isEditing ? 'updated' : 'created'} successfully.`
              );

              onOpenChange(false);
              form.reset();
            }
          },
          onError: (error) => {
            console.error("Form submission error:", error); // Log the actual error
            // Handle backend validation errors
            if (error.includes('Invalid project data')) {
              contextualToast.validationError(
                'Please check your input and try again.'
              );
            } else if (error.includes('Authentication required')) {
              contextualToast.authExpired(() => {
                window.location.href = '/api/auth/signin';
              });
            } else if (error.includes('Network') || error.includes('fetch')) {
              contextualToast.networkError(() => {
                handleSubmit(data);
              });
            } else {
              contextualToast.projectSaveFailed(() => {
                handleSubmit(data);
              });
            }
          },
        }
      );
    } catch (error) {
      console.error("Caught in handleSubmit:", error); // Log unexpected errors
      // Error is already handled in the submitForm function
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    form.reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Edit Project' : 'Create New Project'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Update your project information and settings.'
              : 'Create a new medical device regulatory project to get started.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(handleSubmit)}
            className="space-y-6"
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
                  <FormLabel>Project Name *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter project name (e.g., Cardiac Monitor X1)"
                      {...field}
                      disabled={formSubmission.isLoading || loading}
                    />
                  </FormControl>
                  <FormDescription>
                    A descriptive name for your medical device project
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the project and device..."
                      className="min-h-[80px]"
                      {...field}
                      disabled={formSubmission.isLoading || loading}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional description to help identify and organize your
                    project
                  </FormDescription>
                  <FormMessage />
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
                  <FormLabel>Intended Use</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe the intended use and clinical purpose of the device..."
                      className="min-h-[100px]"
                      {...field}
                      disabled={formSubmission.isLoading || loading}
                    />
                  </FormControl>
                  <FormDescription>
                    Clear statement of the device's intended medical purpose and
                    target patient population
                  </FormDescription>
                  <FormMessage />
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
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={formSubmission.isLoading || loading}
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={formSubmission.isLoading || loading}
              >
                {formSubmission.isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {formSubmission.isLoading
                  ? formSubmission.currentStep ||
                    (isEditing ? 'Updating...' : 'Creating...')
                  : isEditing
                    ? 'Update Project'
                    : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
});
