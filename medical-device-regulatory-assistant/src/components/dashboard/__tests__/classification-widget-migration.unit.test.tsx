/**
 * Migration test for ClassificationWidget - verifies real API integration
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ClassificationWidget } from '../classification-widget';
import { dashboardService } from '@/lib/services/dashboard-service';
import { generateMockDeviceClassification } from '@/lib/mock-data';

// Mock the dashboard service
jest.mock('@/lib/services/dashboard-service', () => ({
  dashboardService: {
    getClassification: jest.fn(),
    startClassification: jest.fn(),
  },
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockDashboardService = dashboardService as jest.Mocked<
  typeof dashboardService
>;

describe('ClassificationWidget Migration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load classification data from real API', async () => {
    const mockClassification = generateMockDeviceClassification({
      deviceClass: 'II',
      productCode: 'LRH',
      regulatoryPathway: '510k',
      confidenceScore: 0.87,
    });

    mockDashboardService.getClassification.mockResolvedValue(
      mockClassification
    );

    render(<ClassificationWidget projectId={1} />);

    // Should show loading initially
    expect(screen.getByText('Analyzing...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    // Verify API was called with correct project ID
    expect(mockDashboardService.getClassification).toHaveBeenCalledWith(1);

    // Verify classification data is displayed
    expect(screen.getByText('Class II')).toBeInTheDocument();
    expect(screen.getByText('LRH')).toBeInTheDocument();
    expect(screen.getByText('510k')).toBeInTheDocument();
    expect(screen.getByText('87%')).toBeInTheDocument();
  });

  it('should handle no classification data', async () => {
    mockDashboardService.getClassification.mockResolvedValue(null);

    render(<ClassificationWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    expect(
      screen.getByText(
        'Device classification analysis has not been performed yet.'
      )
    ).toBeInTheDocument();
    expect(
      screen.getByText('Start Classification Analysis')
    ).toBeInTheDocument();
  });

  it('should handle API errors', async () => {
    mockDashboardService.getClassification.mockRejectedValue(
      new Error('API Error')
    );

    render(<ClassificationWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should start classification when button is clicked', async () => {
    mockDashboardService.getClassification.mockResolvedValue(null);
    mockDashboardService.startClassification.mockResolvedValue({
      message: 'Classification started',
    });

    render(<ClassificationWidget projectId={1} />);

    await waitFor(() => {
      expect(
        screen.getByText('Start Classification Analysis')
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Start Classification Analysis'));

    expect(mockDashboardService.startClassification).toHaveBeenCalledWith(1);
  });

  it('should refresh classification data when refresh is clicked', async () => {
    const mockClassification = generateMockDeviceClassification();
    mockDashboardService.getClassification.mockResolvedValue(
      mockClassification
    );

    render(<ClassificationWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Completed')).toBeInTheDocument();
    });

    // Clear the mock to verify refresh call
    mockDashboardService.getClassification.mockClear();
    mockDashboardService.getClassification.mockResolvedValue(
      mockClassification
    );

    fireEvent.click(screen.getByText('Refresh'));

    // Should call API again
    await waitFor(() => {
      expect(mockDashboardService.getClassification).toHaveBeenCalledWith(1);
    });
  });
});
