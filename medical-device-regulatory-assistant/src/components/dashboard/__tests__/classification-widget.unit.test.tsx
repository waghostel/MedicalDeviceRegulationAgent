/**
 * Unit tests for ClassificationWidget component
 * Tests classification display, confidence scores, and various data states
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithProviders, createMockSession } from '@/lib/testing/test-utils';
import { ClassificationWidget } from '../classification-widget';
import { generateMockDeviceClassification } from '@/lib/mock-data';

describe('ClassificationWidget Component', () => {
  const mockSession = createMockSession();
  const mockClassification = generateMockDeviceClassification({
    deviceClass: 'II',
    productCode: 'LRH',
    regulatoryPathway: '510k',
    confidenceScore: 0.87,
    reasoning: 'Device matches Class II cardiovascular monitoring device characteristics',
    cfrSections: ['21 CFR 870.2300', '21 CFR 870.2310', '21 CFR 870.2320'],
  });

  const defaultProps = {
    onStartClassification: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pending State', () => {
    it('renders pending state when no classification is provided', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} />,
        { session: mockSession }
      );

      expect(screen.getByText('Device Classification')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(screen.getByText('Determine FDA device class and regulatory pathway')).toBeInTheDocument();
      expect(screen.getByText('Device classification analysis has not been performed yet.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start classification analysis/i })).toBeInTheDocument();
    });

    it('calls onStartClassification when start button is clicked', () => {
      const mockOnStartClassification = jest.fn();
      renderWithProviders(
        <ClassificationWidget {...defaultProps} onStartClassification={mockOnStartClassification} />,
        { session: mockSession }
      );

      const startButton = screen.getByRole('button', { name: /start classification analysis/i });
      fireEvent.click(startButton);

      expect(mockOnStartClassification).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('renders loading state correctly', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} loading={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      expect(screen.getByText('Analyzing device characteristics and FDA regulations...')).toBeInTheDocument();
      
      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
      
      // Should show skeleton loading
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('shows loading state in start button when loading', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} loading={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state correctly', () => {
      const errorMessage = 'Classification failed due to insufficient data';
      renderWithProviders(
        <ClassificationWidget {...defaultProps} error={errorMessage} />,
        { session: mockSession }
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /retry/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /start classification/i })).toBeInTheDocument();
    });

    it('calls onRefresh when retry button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <ClassificationWidget 
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

    it('calls onStartClassification when start classification button is clicked in error state', () => {
      const mockOnStartClassification = jest.fn();
      renderWithProviders(
        <ClassificationWidget 
          {...defaultProps} 
          error="Test error" 
          onStartClassification={mockOnStartClassification} 
        />,
        { session: mockSession }
      );

      const startButton = screen.getByRole('button', { name: /start classification/i });
      fireEvent.click(startButton);

      expect(mockOnStartClassification).toHaveBeenCalled();
    });
  });

  describe('Completed State', () => {
    it('renders classification results correctly', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      expect(screen.getByText('Completed')).toBeInTheDocument();
      expect(screen.getByText('Class II')).toBeInTheDocument();
      expect(screen.getByText('LRH')).toBeInTheDocument();
      expect(screen.getByText('510k')).toBeInTheDocument();
      expect(screen.getByText('87%')).toBeInTheDocument();
    });

    it('displays device class with correct styling', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const deviceClassBadge = screen.getByText('Class II');
      expect(deviceClassBadge).toBeInTheDocument();
      expect(deviceClassBadge.closest('.badge')).toBeInTheDocument();
    });

    it('displays product code with external link', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const productCode = screen.getByText('LRH');
      expect(productCode).toBeInTheDocument();
      
      // Should have external link button
      const externalLink = screen.getByRole('link');
      expect(externalLink).toHaveAttribute('href', expect.stringContaining('LRH'));
      expect(externalLink).toHaveAttribute('target', '_blank');
    });

    it('displays regulatory pathway with correct badge variant', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const pathwayBadge = screen.getByText('510k');
      expect(pathwayBadge).toBeInTheDocument();
    });

    it('displays CFR sections correctly', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      expect(screen.getByText('21 CFR 870.2300')).toBeInTheDocument();
      expect(screen.getByText('21 CFR 870.2310')).toBeInTheDocument();
      expect(screen.getByText('21 CFR 870.2320')).toBeInTheDocument();
    });

    it('shows truncated CFR sections when more than 3', () => {
      const classificationWithManyCFRs = generateMockDeviceClassification({
        ...mockClassification,
        cfrSections: ['21 CFR 870.2300', '21 CFR 870.2310', '21 CFR 870.2320', '21 CFR 870.2330', '21 CFR 870.2340'],
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={classificationWithManyCFRs} />,
        { session: mockSession }
      );

      expect(screen.getByText('21 CFR 870.2300')).toBeInTheDocument();
      expect(screen.getByText('21 CFR 870.2310')).toBeInTheDocument();
      expect(screen.getByText('21 CFR 870.2320')).toBeInTheDocument();
      expect(screen.getByText('+2 more')).toBeInTheDocument();
    });

    it('displays confidence score with correct color coding', () => {
      // High confidence (green)
      const highConfidenceClassification = generateMockDeviceClassification({
        ...mockClassification,
        confidenceScore: 0.9,
      });

      const { rerender } = renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={highConfidenceClassification} />,
        { session: mockSession }
      );

      let confidenceText = screen.getByText('90%');
      expect(confidenceText).toHaveClass('text-green-600');

      // Medium confidence (yellow)
      const mediumConfidenceClassification = generateMockDeviceClassification({
        ...mockClassification,
        confidenceScore: 0.7,
      });

      rerender(<ClassificationWidget {...defaultProps} classification={mediumConfidenceClassification} />);

      confidenceText = screen.getByText('70%');
      expect(confidenceText).toHaveClass('text-yellow-600');

      // Low confidence (red)
      const lowConfidenceClassification = generateMockDeviceClassification({
        ...mockClassification,
        confidenceScore: 0.4,
      });

      rerender(<ClassificationWidget {...defaultProps} classification={lowConfidenceClassification} />);

      confidenceText = screen.getByText('40%');
      expect(confidenceText).toHaveClass('text-red-600');
    });

    it('displays reasoning when provided', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      expect(screen.getByText('Analysis Reasoning')).toBeInTheDocument();
      expect(screen.getByText('Device matches Class II cardiovascular monitoring device characteristics')).toBeInTheDocument();
    });

    it('displays creation timestamp', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      expect(screen.getByText(/Completed:/)).toBeInTheDocument();
    });
  });

  describe('Action Buttons', () => {
    it('renders refresh and re-analyze buttons in completed state', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      expect(screen.getByRole('button', { name: /refresh/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /re-analyze/i })).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <ClassificationWidget 
          {...defaultProps} 
          classification={mockClassification} 
          onRefresh={mockOnRefresh} 
        />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('calls onStartClassification when re-analyze button is clicked', () => {
      const mockOnStartClassification = jest.fn();
      renderWithProviders(
        <ClassificationWidget 
          {...defaultProps} 
          classification={mockClassification} 
          onStartClassification={mockOnStartClassification} 
        />,
        { session: mockSession }
      );

      const reAnalyzeButton = screen.getByRole('button', { name: /re-analyze/i });
      fireEvent.click(reAnalyzeButton);

      expect(mockOnStartClassification).toHaveBeenCalled();
    });

    it('disables buttons when loading', () => {
      renderWithProviders(
        <ClassificationWidget 
          {...defaultProps} 
          classification={mockClassification} 
          loading={true} 
        />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const reAnalyzeButton = screen.getByRole('button', { name: /re-analyze/i });

      expect(refreshButton).toBeDisabled();
      expect(reAnalyzeButton).toBeDisabled();
    });
  });

  describe('Regulatory Pathway Badge Variants', () => {
    it('shows correct badge variant for 510k pathway', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const pathwayBadge = screen.getByText('510k');
      expect(pathwayBadge).toBeInTheDocument();
    });

    it('shows correct badge variant for PMA pathway', () => {
      const pmaClassification = generateMockDeviceClassification({
        ...mockClassification,
        regulatoryPathway: 'PMA',
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={pmaClassification} />,
        { session: mockSession }
      );

      const pathwayBadge = screen.getByText('PMA');
      expect(pathwayBadge).toBeInTheDocument();
    });

    it('shows correct badge variant for De Novo pathway', () => {
      const deNovoClassification = generateMockDeviceClassification({
        ...mockClassification,
        regulatoryPathway: 'De Novo',
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={deNovoClassification} />,
        { session: mockSession }
      );

      const pathwayBadge = screen.getByText('De Novo');
      expect(pathwayBadge).toBeInTheDocument();
    });
  });

  describe('Optional Fields', () => {
    it('renders without reasoning when not provided', () => {
      const classificationWithoutReasoning = generateMockDeviceClassification({
        ...mockClassification,
        reasoning: undefined,
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={classificationWithoutReasoning} />,
        { session: mockSession }
      );

      expect(screen.queryByText('Analysis Reasoning')).not.toBeInTheDocument();
    });

    it('renders without CFR sections when not provided', () => {
      const classificationWithoutCFR = generateMockDeviceClassification({
        ...mockClassification,
        cfrSections: undefined,
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={classificationWithoutCFR} />,
        { session: mockSession }
      );

      expect(screen.queryByText('CFR Sections')).not.toBeInTheDocument();
    });

    it('renders without CFR sections when empty array', () => {
      const classificationWithEmptyCFR = generateMockDeviceClassification({
        ...mockClassification,
        cfrSections: [],
      });

      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={classificationWithEmptyCFR} />,
        { session: mockSession }
      );

      expect(screen.queryByText('CFR Sections')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const reAnalyzeButton = screen.getByRole('button', { name: /re-analyze/i });

      expect(refreshButton).toBeInTheDocument();
      expect(reAnalyzeButton).toBeInTheDocument();
    });

    it('provides screen reader text for external links', () => {
      renderWithProviders(
        <ClassificationWidget {...defaultProps} classification={mockClassification} />,
        { session: mockSession }
      );

      const externalLink = screen.getByRole('link');
      expect(externalLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      renderWithProviders(
        <ClassificationWidget classification={mockClassification} />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const reAnalyzeButton = screen.getByRole('button', { name: /re-analyze/i });

      expect(() => {
        fireEvent.click(refreshButton);
        fireEvent.click(reAnalyzeButton);
      }).not.toThrow();
    });
  });
});