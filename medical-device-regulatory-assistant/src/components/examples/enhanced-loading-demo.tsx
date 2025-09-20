/**
 * Enhanced Loading States Demo Component
 * Demonstrates all the enhanced loading states and progress indicators
 */

import React, { useState } from 'react';

import {
  EnhancedProgressBar,
  FormSubmissionProgress,
  BulkOperationsProgress,
  ExportProgress,
  DataLoadingProgress,
  LoadingOverlay,
  LoadingSpinner,
  InlineLoader,

  ProjectListSkeleton,
  EnhancedFormSkeleton,
  BulkOperationsSkeleton,
  ExportProgressSkeleton} from '@/components/loading';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useLoadingState,
  useFormSubmissionState,
  useBulkOperationState,
} from '@/hooks/use-loading-state';

export const EnhancedLoadingDemo = () => {
  const [showOverlay, setShowOverlay] = useState(false);
  const [progressValue, setProgressValue] = useState(45);
  const [showDataLoading, setShowDataLoading] = useState(false);
  const [dataError, setDataError] = useState<string | undefined>();

  const loadingState = useLoadingState();
  const formSubmission = useFormSubmissionState();
  const bulkOperation = useBulkOperationState();

  const handleStartProgress = () => {
    loadingState.startLoading({
      showProgress: true,
      estimatedDuration: 5000,
      steps: ['Initializing', 'Processing', 'Finalizing'],
      onComplete: () => {
        console.log('Progress completed!');
      },
    });
  };

  const handleFormSubmit = async () => {
    await formSubmission.submitForm(
      async () => {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return { id: 1, name: 'Test Project' };
      },
      {
        onSuccess: (result) => {
          console.log('Form submitted successfully:', result);
        },
        onError: (error) => {
          console.error('Form submission failed:', error);
        },
      }
    );
  };

  const handleBulkOperation = () => {
    const items = Array.from({ length: 10 }, (_, i) => `Item ${i + 1}`);

    bulkOperation.startBulkOperation(
      items,
      async (item, index) => {
        // Simulate processing each item
        await new Promise((resolve) => setTimeout(resolve, 500));
        if (index === 7) throw new Error('Simulated error'); // Simulate an error
        return `Processed ${item}`;
      },
      {
        onProgress: (processed, total, current) => {
          console.log(`Progress: ${processed}/${total}, Current: ${current}`);
        },
        onComplete: (results) => {
          console.log('Bulk operation completed:', results);
        },
        onError: (error, item) => {
          console.error(`Error processing ${item}:`, error);
        },
        batchSize: 2,
      }
    );
  };

  const handleDataLoad = () => {
    setShowDataLoading(true);
    setDataError(undefined);

    // Simulate data loading with potential error
    setTimeout(() => {
      if (Math.random() > 0.7) {
        setDataError('Failed to load data from server');
      }
      setShowDataLoading(false);
    }, 2000);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Enhanced Loading States Demo</h1>
        <p className="text-muted-foreground">
          Comprehensive demonstration of enhanced loading states and progress
          indicators
        </p>
      </div>

      <Tabs defaultValue="progress" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress">Progress Bars</TabsTrigger>
          <TabsTrigger value="forms">Form Loading</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Operations</TabsTrigger>
          <TabsTrigger value="skeletons">Skeletons</TabsTrigger>
        </TabsList>

        <TabsContent value="progress" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Enhanced Progress Bars</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Basic Progress Bar</h3>
                <EnhancedProgressBar
                  value={progressValue}
                  label="Upload Progress"
                  showPercentage={true}
                />
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProgressValue(Math.max(0, progressValue - 10))
                    }
                  >
                    -10%
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      setProgressValue(Math.min(100, progressValue + 10))
                    }
                  >
                    +10%
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Progress with ETA</h3>
                <EnhancedProgressBar
                  value={75}
                  label="Processing Files"
                  showPercentage={true}
                  showETA={true}
                  estimatedTimeRemaining="2m 15s"
                  variant="success"
                />
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Automated Progress</h3>
                <div className="space-y-2">
                  {loadingState.isLoading && (
                    <EnhancedProgressBar
                      value={loadingState.progress || 0}
                      label={loadingState.currentStep || 'Processing...'}
                      showPercentage={true}
                      showETA={true}
                      estimatedTimeRemaining={
                        loadingState.estimatedTimeRemaining
                      }
                      animated={true}
                    />
                  )}
                  <Button
                    onClick={handleStartProgress}
                    disabled={loadingState.isLoading}
                  >
                    {loadingState.isLoading
                      ? 'Processing...'
                      : 'Start Automated Progress'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Loading Spinners</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center">
                  <h4 className="font-medium mb-2">Small Spinner</h4>
                  <LoadingSpinner size="sm" message="Loading..." />
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-2">Medium Spinner</h4>
                  <LoadingSpinner size="md" message="Processing..." />
                </div>
                <div className="text-center">
                  <h4 className="font-medium mb-2">Large Spinner</h4>
                  <LoadingSpinner size="lg" message="Uploading..." />
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-medium">Inline Loaders</h4>
                <div className="flex items-center space-x-4">
                  <InlineLoader text="Saving" />
                  <InlineLoader text="Uploading" />
                  <InlineLoader text="Processing" />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Form Submission Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormSubmissionProgress
                isSubmitting={formSubmission.isLoading}
                progress={formSubmission.progress}
                currentStep={formSubmission.currentStep}
              />

              <Button
                onClick={handleFormSubmit}
                disabled={formSubmission.isLoading}
              >
                {formSubmission.isLoading ? 'Submitting...' : 'Submit Form'}
              </Button>

              {formSubmission.error && (
                <div className="text-red-600 text-sm">
                  Error: {formSubmission.error}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Loading with Retry</CardTitle>
            </CardHeader>
            <CardContent>
              <DataLoadingProgress
                isLoading={showDataLoading}
                error={dataError}
                onRetry={handleDataLoad}
                loadingMessage="Loading project data..."
                retryCount={0}
                maxRetries={3}
              />

              {!showDataLoading && !dataError && (
                <Button onClick={handleDataLoad}>Load Data</Button>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bulk" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations Progress</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {bulkOperation.isRunning && (
                <BulkOperationsProgress
                  totalItems={bulkOperation.totalItems}
                  processedItems={bulkOperation.processedItems}
                  currentItem={bulkOperation.currentItem}
                  errors={bulkOperation.errors}
                  operation="Processing Items"
                  onCancel={bulkOperation.cancelOperation}
                />
              )}

              <Button
                onClick={handleBulkOperation}
                disabled={bulkOperation.isRunning}
              >
                {bulkOperation.isRunning
                  ? 'Processing...'
                  : 'Start Bulk Operation'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportProgress
                exportType="pdf"
                progress={85}
                currentStep="Generating file"
                fileName="project-report.pdf"
                fileSize="3.2 MB"
                onDownload={() => console.log('Download started')}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="skeletons" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project List Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <ProjectListSkeleton count={4} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Enhanced Form Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <EnhancedFormSkeleton fields={5} showProgress={true} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Bulk Operations Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <BulkOperationsSkeleton />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Export Progress Skeleton</CardTitle>
            </CardHeader>
            <CardContent>
              <ExportProgressSkeleton />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader>
          <CardTitle>Loading Overlay</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setShowOverlay(true)}>
            Show Loading Overlay
          </Button>
        </CardContent>
      </Card>

      {showOverlay && (
        <LoadingOverlay
          message="Processing your request..."
          canCancel={true}
          onCancel={() => setShowOverlay(false)}
        />
      )}
    </div>
  );
}
