/**
 * Migration test for PredicateWidget - verifies real API integration
 */

import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { PredicateWidget } from '../predicate-widget';
import { dashboardService } from '@/lib/services/dashboard-service';
import { generateMockPredicateDevices } from '@/lib/mock-data';

// Mock the dashboard service
jest.mock('@/lib/services/dashboard-service', () => ({
  dashboardService: {
    getPredicateDevices: jest.fn(),
    startPredicateSearch: jest.fn(),
    updatePredicateSelection: jest.fn(),
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

describe('PredicateWidget Migration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should load predicate devices from real API', async () => {
    const mockPredicates = generateMockPredicateDevices(3);
    mockDashboardService.getPredicateDevices.mockResolvedValue(mockPredicates);

    render(<PredicateWidget projectId={1} />);

    // Should show loading initially
    expect(screen.getByText('Searching...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('3 Found')).toBeInTheDocument();
    });

    // Verify API was called with correct project ID
    expect(mockDashboardService.getPredicateDevices).toHaveBeenCalledWith(1);

    // Verify predicate data is displayed
    expect(screen.getByText('CardioMonitor Pro')).toBeInTheDocument();
  });

  it('should handle no predicate devices', async () => {
    mockDashboardService.getPredicateDevices.mockResolvedValue([]);

    render(<PredicateWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Pending')).toBeInTheDocument();
    });

    expect(
      screen.getByText('No predicate devices have been identified yet.')
    ).toBeInTheDocument();
    expect(screen.getByText('Search Predicates')).toBeInTheDocument();
  });

  it('should handle API errors', async () => {
    mockDashboardService.getPredicateDevices.mockRejectedValue(
      new Error('API Error')
    );

    render(<PredicateWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should start predicate search when button is clicked', async () => {
    mockDashboardService.getPredicateDevices.mockResolvedValue([]);
    mockDashboardService.startPredicateSearch.mockResolvedValue({
      message: 'Predicate search started',
    });

    render(<PredicateWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('Search Predicates')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Search Predicates'));

    expect(mockDashboardService.startPredicateSearch).toHaveBeenCalledWith(1);
  });

  it('should update predicate selection when select button is clicked', async () => {
    const mockPredicates = generateMockPredicateDevices(1);
    mockPredicates[0].isSelected = false;

    mockDashboardService.getPredicateDevices.mockResolvedValue(mockPredicates);
    mockDashboardService.updatePredicateSelection.mockResolvedValue({
      ...mockPredicates[0],
      isSelected: true,
    });

    render(<PredicateWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('1 Found')).toBeInTheDocument();
    });

    // Click on Top Matches tab to see the select button
    fireEvent.click(screen.getByText('Top Matches'));

    await waitFor(() => {
      expect(screen.getByText('Select')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Select'));

    expect(mockDashboardService.updatePredicateSelection).toHaveBeenCalledWith(
      1,
      mockPredicates[0].id,
      true
    );
  });

  it('should display statistics correctly', async () => {
    const mockPredicates = generateMockPredicateDevices(5);
    // Set some as selected
    mockPredicates[0].isSelected = true;
    mockPredicates[1].isSelected = true;

    mockDashboardService.getPredicateDevices.mockResolvedValue(mockPredicates);

    render(<PredicateWidget projectId={1} />);

    await waitFor(() => {
      expect(screen.getByText('5 Found')).toBeInTheDocument();
    });

    // Check statistics in overview tab
    expect(screen.getByText('5')).toBeInTheDocument(); // Total Found
    expect(screen.getByText('2')).toBeInTheDocument(); // Selected
  });
});
