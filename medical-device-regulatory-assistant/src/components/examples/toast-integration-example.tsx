/**
 * Example component demonstrating comprehensive toast integration
 * Shows how to integrate toasts with all user actions and API responses
 */

'use client';

import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAccessibleToast } from '@/hooks/use-accessibility-announcements';
import { useFormToast } from '@/hooks/use-form-toast';
import { useToast, contextualToast } from '@/hooks/use-toast';

export const ToastIntegrationExample = () => {
  const { toast } = useToast();
  const {
    showValidationError,
    showSubmissionSuccess,
    showSubmissionError,
    showSaveProgress,
    showAutoSaveSuccess,
    showNetworkError,
    showAuthError,
  } = useFormToast();
  const { announceToast } = useAccessibleToast();

  const [formData, setFormData] = useState({
    projectName: '',
    deviceType: '',
    intendedUse: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Example: Basic toast notifications
  const handleBasicToasts = () => {
    toast({
      title: 'Basic Toast',
      description: 'This is a basic toast notification.',
      variant: 'default',
    });
  };

  // Example: Success toast
  const handleSuccessToast = () => {
    contextualToast.success(
      'Project Created Successfully',
      'Your medical device project has been created and is ready for regulatory analysis.'
    );
  };

  // Example: Error toast with retry
  const handleErrorWithRetry = () => {
    const retryAction = () => {
      console.log('Retrying action...');
      contextualToast.success(
        'Retry Successful',
        'The operation completed successfully.'
      );
    };

    contextualToast.fdaApiError(retryAction);
  };

  // Example: Progress toast
  const handleProgressToast = () => {
    const progressToast = contextualToast.progress(
      'Processing FDA Database Search',
      'Searching for predicate devices...'
    );

    let progress = 0;
    const interval = setInterval(() => {
      progress += 20;
      progressToast.updateProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
        setTimeout(() => {
          progressToast.dismiss();
          contextualToast.success(
            'Search Complete',
            'Found 15 potential predicate devices for your medical device.'
          );
        }, 500);
      }
    }, 1000);
  };

  // Example: Form validation with toast
  const handleFormValidation = () => {
    if (!formData.projectName.trim()) {
      showValidationError(
        'projectName',
        'Project name is required for regulatory submissions.',
        { formName: 'Medical Device Project', autoFocus: true }
      );
      return false;
    }

    if (!formData.deviceType.trim()) {
      showValidationError(
        'deviceType',
        'Device type is required for FDA classification.',
        { formName: 'Medical Device Project', autoFocus: true }
      );
      return false;
    }

    if (!formData.intendedUse.trim()) {
      showValidationError(
        'intendedUse',
        'Intended use statement is required for predicate search.',
        { formName: 'Medical Device Project', autoFocus: true }
      );
      return false;
    }

    return true;
  };

  // Example: Form submission with comprehensive error handling
  const handleFormSubmit = async () => {
    if (!handleFormValidation()) return;

    setIsSubmitting(true);

    // Show progress toast
    const saveProgress = showSaveProgress(0, {
      formName: 'Medical Device Project',
    });

    try {
      // Simulate API call with progress updates
      saveProgress.updateProgress(25);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      saveProgress.updateProgress(50);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      saveProgress.updateProgress(75);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate random success/failure
      if (Math.random() > 0.3) {
        saveProgress.complete();

        // Also announce to screen readers
        announceToast(
          'Project Saved Successfully',
          'Your medical device project has been saved and is ready for regulatory analysis.',
          'success'
        );
      } else {
        // Simulate different types of errors
        const errorType = Math.random();
        if (errorType > 0.7) {
          throw new Error('network error: Connection timeout');
        } else if (errorType > 0.4) {
          throw new Error('auth error: Session expired');
        } else {
          throw new Error('validation error: Invalid device classification');
        }
      }
    } catch (error) {
      saveProgress.updateProgress(0); // Reset progress
      setTimeout(() => {
        showSubmissionError(error as Error, {
          formName: 'Medical Device Project',
        });
      }, 500);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Example: Auto-save functionality
  const handleAutoSave = () => {
    showAutoSaveSuccess({ formName: 'Medical Device Project' });
  };

  // Example: Network error with retry
  const handleNetworkError = () => {
    const retryAction = () => {
      console.log('Retrying network request...');
      contextualToast.success(
        'Connection Restored',
        'Successfully reconnected to FDA database.'
      );
    };

    showNetworkError(retryAction);
  };

  // Example: Authentication error
  const handleAuthError = () => {
    const signInAction = () => {
      console.log('Redirecting to sign in...');
      contextualToast.info('Redirecting', 'Taking you to the sign-in page...');
    };

    showAuthError(signInAction);
  };

  // Example: Contextual regulatory toasts
  const handleRegulatoryToasts = () => {
    const examples = [
      () =>
        contextualToast.predicateSearchFailed(() =>
          console.log('Retry predicate search')
        ),
      () =>
        contextualToast.classificationError(() =>
          console.log('Retry classification')
        ),
      () => contextualToast.exportFailed(() => console.log('Retry export')),
    ];

    const randomExample = examples[Math.floor(Math.random() * examples.length)];
    randomExample();
  };

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Toast Integration Examples</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Toast Examples */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Basic Toast Types</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleBasicToasts} variant="outline">
                Basic Toast
              </Button>
              <Button onClick={handleSuccessToast} variant="outline">
                Success Toast
              </Button>
              <Button onClick={handleErrorWithRetry} variant="outline">
                Error with Retry
              </Button>
              <Button onClick={handleProgressToast} variant="outline">
                Progress Toast
              </Button>
            </div>
          </div>

          {/* Form Integration Example */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Form Integration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  name="projectName"
                  value={formData.projectName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      projectName: e.target.value,
                    }))
                  }
                  placeholder="Enter project name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deviceType">Device Type</Label>
                <Input
                  id="deviceType"
                  name="deviceType"
                  value={formData.deviceType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      deviceType: e.target.value,
                    }))
                  }
                  placeholder="e.g., Cardiac Monitor"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="intendedUse">Intended Use</Label>
                <Input
                  id="intendedUse"
                  name="intendedUse"
                  value={formData.intendedUse}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      intendedUse: e.target.value,
                    }))
                  }
                  placeholder="Describe the intended use of your device"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleFormSubmit}
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? 'Saving...' : 'Save Project'}
              </Button>
              <Button onClick={handleAutoSave} variant="outline">
                Trigger Auto-save
              </Button>
            </div>
          </div>

          {/* Error Handling Examples */}
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Error Handling</h3>
            <div className="flex flex-wrap gap-2">
              <Button onClick={handleNetworkError} variant="outline">
                Network Error
              </Button>
              <Button onClick={handleAuthError} variant="outline">
                Auth Error
              </Button>
              <Button onClick={handleRegulatoryToasts} variant="outline">
                Regulatory Errors
              </Button>
            </div>
          </div>

          {/* Accessibility Note */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">
              Accessibility Features
            </h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• All toasts include proper ARIA labels and roles</li>
              <li>• Screen reader announcements for new notifications</li>
              <li>• Keyboard navigation support for action buttons</li>
              <li>• High contrast mode compatibility</li>
              <li>• Appropriate live regions for different toast types</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
