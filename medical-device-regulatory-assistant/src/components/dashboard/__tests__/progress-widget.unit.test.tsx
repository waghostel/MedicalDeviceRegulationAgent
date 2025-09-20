/**
 * Unit tests for ProgressWidget component
 * Tests progress display, step navigation, and various progress states
 */

import { screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { generateMockProjectProgress } from '@/lib/mock-data';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';

import { ProgressWidget } from '../progress-widget';


describe('ProgressWidget Component', () => {
  const mockSession = createMockSession();
  const mockProgress = generateMockProjectProgress({
    overallProgress: 65,
    classification: {
      status: 'completed',
      completedAt: '2024-01-15T10:00:00Z',
      confidenceScore: 0.87,
      details: 'Device classified as Class II with high confidence',
    },
    predicateSearch: {
      status: 'completed',
      completedAt: '2024-01-16T14:30:00Z',
      confidenceScore: 0.92,
      details: 'Found 8 potential predicates with top confidence of 0.92',
    },
    comparisonAnalysis: {
      status: 'in-progress',
      details: '2 predicates selected for comparison',
    },
    submissionReadiness: {
      status: 'pending',
      details: 'Awaiting completion of comparison analysis',
    },
    nextActions: [
      'Complete predicate comparison analysis',
      'Review testing recommendations',
      'Prepare submission checklist',
    ],
  });

  const defaultProps = {
    progress: mockProgress,
    onStepClick: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Loading State', () => {
    it('renders loading state correctly', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} loading={true} />, {
        session: mockSession,
      });

      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Should show skeleton loading
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    it('renders error state correctly', () => {
      const errorMessage = 'Failed to load progress data';
      renderWithProviders(
        <ProgressWidget {...defaultProps} error={errorMessage} />,
        { session: mockSession }
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
    });

    it('calls onRefresh when retry button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <ProgressWidget
          {...defaultProps}
          error="Test error"
          onRefresh={mockOnRefresh}
        />,
        { session: mockSession }
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Progress Display', () => {
    it('renders progress widget with correct title and completion count', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('2/4 Complete')).toBeInTheDocument();
      expect(
        screen.getByText('Regulatory milestone completion tracking')
      ).toBeInTheDocument();
    });

    it('displays overall progress percentage correctly', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Overall Progress')).toBeInTheDocument();
      expect(screen.getByText('65%')).toBeInTheDocument();

      // Should show progress bar
      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('displays all progress steps with correct titles', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Device Classification')).toBeInTheDocument();
      expect(screen.getByText('Predicate Search')).toBeInTheDocument();
      expect(screen.getByText('Comparison Analysis')).toBeInTheDocument();
      expect(screen.getByText('Submission Readiness')).toBeInTheDocument();
    });
  });

  describe('Step Status Display', () => {
    it('shows correct status badges for each step', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('completed')).toBeInTheDocument();
      expect(screen.getByText('in-progress')).toBeInTheDocument();
      expect(screen.getByText('pending')).toBeInTheDocument();
    });

    it('displays step icons correctly based on status', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      // Should show check icons for completed steps
      const checkIcons = document.querySelectorAll('.text-green-500');
      expect(checkIcons.length).toBeGreaterThan(0);

      // Should show spinner for in-progress steps
      const spinners = document.querySelectorAll('.animate-spin');
      expect(spinners.length).toBeGreaterThan(0);

      // Should show clock icons for pending steps
      const clockIcons = document.querySelectorAll('.text-gray-400');
      expect(clockIcons.length).toBeGreaterThan(0);
    });

    it('displays confidence scores when available', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('87%')).toBeInTheDocument(); // Classification confidence
      expect(screen.getByText('92%')).toBeInTheDocument(); // Predicate search confidence
    });

    it('shows completion dates for completed steps', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText(/Completed:/)).toBeInTheDocument();
    });

    it('displays step descriptions correctly', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(
        screen.getByText('FDA device class and product code determined')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Predicate devices identified and analyzed')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Compare device characteristics with predicates')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Prepare documentation for regulatory submission')
      ).toBeInTheDocument();
    });
  });

  describe('Step Interaction', () => {
    it('calls onStepClick when clickable step is clicked', () => {
      const mockOnStepClick = jest.fn();
      renderWithProviders(
        <ProgressWidget {...defaultProps} onStepClick={mockOnStepClick} />,
        { session: mockSession }
      );

      // Click on a completed step (should be clickable)
      const classificationStep = screen
        .getByText('Device Classification')
        .closest('div');
      if (classificationStep) {
        fireEvent.click(classificationStep);
        expect(mockOnStepClick).toHaveBeenCalledWith('classification');
      }
    });

    it('applies hover styles to clickable steps', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      const classificationStep = screen
        .getByText('Device Classification')
        .closest('div');
      expect(classificationStep).toHaveClass(
        'cursor-pointer',
        'hover:bg-gray-50'
      );
    });

    it('applies completed step styling', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      const classificationStep = screen
        .getByText('Device Classification')
        .closest('div');
      expect(classificationStep).toHaveClass('bg-green-50', 'border-green-200');
    });
  });

  describe('Error Step Display', () => {
    it('displays error state for failed steps', () => {
      const progressWithError = {
        ...mockProgress,
        classification: {
          status: 'error' as const,
          errorMessage: 'Classification failed due to insufficient data',
          details: 'Unable to determine device class',
        },
      };

      renderWithProviders(
        <ProgressWidget {...defaultProps} progress={progressWithError} />,
        { session: mockSession }
      );

      expect(screen.getByText('error')).toBeInTheDocument();
      expect(
        screen.getByText('Classification failed due to insufficient data')
      ).toBeInTheDocument();

      // Should show error icon
      const errorIcons = document.querySelectorAll('.text-red-500');
      expect(errorIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Next Actions', () => {
    it('displays next actions when available', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Next Actions')).toBeInTheDocument();
      expect(
        screen.getByText('Complete predicate comparison analysis')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Review testing recommendations')
      ).toBeInTheDocument();
      expect(
        screen.getByText('Prepare submission checklist')
      ).toBeInTheDocument();
    });

    it('does not display next actions section when empty', () => {
      const progressWithoutActions = {
        ...mockProgress,
        nextActions: [],
      };

      renderWithProviders(
        <ProgressWidget {...defaultProps} progress={progressWithoutActions} />,
        { session: mockSession }
      );

      expect(screen.queryByText('Next Actions')).not.toBeInTheDocument();
    });
  });

  describe('Quick Stats', () => {
    it('displays quick statistics correctly', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Steps Complete')).toBeInTheDocument();
      expect(screen.getByText('With Confidence')).toBeInTheDocument();

      // Should show count of completed steps
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 completed steps

      // Should show count of steps with confidence scores
      expect(screen.getByText('2')).toBeInTheDocument(); // 2 steps with confidence
    });
  });

  describe('Action Buttons', () => {
    it('renders refresh button', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <ProgressWidget {...defaultProps} onRefresh={mockOnRefresh} />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Timestamp Display', () => {
    it('displays last updated timestamp', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText(/Last updated:/)).toBeInTheDocument();
    });
  });

  describe('Confidence Score Color Coding', () => {
    it('applies correct color classes for different confidence levels', () => {
      const progressWithVariedConfidence = {
        ...mockProgress,
        classification: {
          ...mockProgress.classification,
          confidenceScore: 0.9, // High confidence - green
        },
        predicateSearch: {
          ...mockProgress.predicateSearch,
          confidenceScore: 0.7, // Medium confidence - yellow
        },
        comparisonAnalysis: {
          ...mockProgress.comparisonAnalysis,
          status: 'completed' as const,
          confidenceScore: 0.4, // Low confidence - red
        },
      };

      renderWithProviders(
        <ProgressWidget
          {...defaultProps}
          progress={progressWithVariedConfidence}
        />,
        { session: mockSession }
      );

      // Check that confidence scores are displayed with appropriate colors
      const highConfidence = screen.getByText('90%');
      const mediumConfidence = screen.getByText('70%');
      const lowConfidence = screen.getByText('40%');

      expect(highConfidence).toHaveClass('text-green-600');
      expect(mediumConfidence).toHaveClass('text-yellow-600');
      expect(lowConfidence).toHaveClass('text-red-600');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow');
    });

    it('provides proper semantic structure', () => {
      renderWithProviders(<ProgressWidget {...defaultProps} />, {
        session: mockSession,
      });

      // Should have proper heading structure
      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('Next Actions')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      renderWithProviders(<ProgressWidget progress={mockProgress} />, {
        session: mockSession,
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const classificationStep = screen
        .getByText('Device Classification')
        .closest('div');

      expect(() => {
        fireEvent.click(refreshButton);
        if (classificationStep) {
          fireEvent.click(classificationStep);
        }
      }).not.toThrow();
    });

    it('handles missing optional fields gracefully', () => {
      const minimalProgress = {
        projectId: 'project-1',
        classification: {
          status: 'pending' as const,
          details: 'Pending classification',
        },
        predicateSearch: {
          status: 'pending' as const,
          details: 'Pending search',
        },
        comparisonAnalysis: {
          status: 'pending' as const,
          details: 'Pending analysis',
        },
        submissionReadiness: {
          status: 'pending' as const,
          details: 'Pending readiness',
        },
        overallProgress: 0,
        lastUpdated: new Date().toISOString(),
      };

      renderWithProviders(
        <ProgressWidget {...defaultProps} progress={minimalProgress} />,
        { session: mockSession }
      );

      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('0%')).toBeInTheDocument();
    });
  });
});
