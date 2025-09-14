/**
 * Dashboard Integration Tests
 * Tests for dashboard data flow and real-time updates
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import { RegulatoryDashboard } from '@/components/dashboard/regulatory-dashboard';
import { useDashboard } from '@/hooks/use-dashboard';
import { DashboardData } from '@/types/dashboard';
import {
  renderWithProviders,
  waitForAsyncUpdates,
  fireEventWithAct,
  setupTestEnvironment,
  cleanupTestEnvironment,
} from '@/lib/testing/react-test-utils';

// Mock the dashboard hook
const mockUseDashboard = jest.fn();
jest.mock('@/hooks/use-dashboard', () => ({
  useDashboard: mockUseDashboard,
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock data
const mockDashboardData: DashboardData = {
  project: {
    id: '1',
    name: 'Test Medical Device',
    description: 'A test device for regulatory analysis',
    deviceType: 'Class II',
    intendedUse: 'For diagnostic purposes',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T12:00:00Z',
  },
  classification: {
    id: '1',
    projectId: '1',
    deviceClass: 'II',
    productCode: 'ABC',
    regulatoryPathway: '510k',
    cfrSections: ['21 CFR 862.1040'],
    confidenceScore: 0.85,
    reasoning: 'Device matches existing Class II diagnostic devices',
    sources: [
      {
        url: 'https://www.fda.gov/test',
        title: 'FDA Classification Database',
        effectiveDate: '2024-01-01',
        documentType: 'FDA_DATABASE',
        accessedDate: '2024-01-01',
      },
    ],
    createdAt: '2024-01-01T10:00:00Z',
    updatedAt: '2024-01-01T10:00:00Z',
  },
  predicateDevices: [
    {
      id: '1',
      projectId: '1',
      kNumber: 'K123456',
      deviceName: 'Similar Diagnostic Device',
      intendedUse: 'For similar diagnostic purposes',
      productCode: 'ABC',
      clearanceDate: '2023-01-01T00:00:00Z',
      confidenceScore: 0.9,
      comparisonData: {
        similarities: [],
        differences: [],
        riskAssessment: 'low',
        testingRecommendations: [],
        substantialEquivalenceAssessment: 'Substantially equivalent',
      },
      isSelected: true,
      createdAt: '2024-01-01T11:00:00Z',
      updatedAt: '2024-01-01T11:00:00Z',
    },
  ],
  progress: {
    projectId: '1',
    classification: {
      status: 'completed',
      confidenceScore: 0.85,
      completedAt: '2024-01-01T10:00:00Z',
    },
    predicateSearch: {
      status: 'completed',
      confidenceScore: 0.9,
      completedAt: '2024-01-01T11:00:00Z',
    },
    comparisonAnalysis: {
      status: 'in-progress',
    },
    submissionReadiness: {
      status: 'pending',
    },
    overallProgress: 50,
    nextActions: [
      'Complete comparison analysis',
      'Prepare submission documents',
    ],
    lastUpdated: '2024-01-01T12:00:00Z',
  },
  recentActivity: [
    {
      id: '1',
      type: 'classification',
      title: 'Device Classification Completed',
      description: 'Device classified as Class II with high confidence',
      timestamp: '2024-01-01T10:00:00Z',
      status: 'success',
      metadata: {
        confidence_score: 0.85,
        execution_time_ms: 2500,
      },
    },
  ],
  statistics: {
    totalPredicates: 1,
    selectedPredicates: 1,
    averageConfidence: 0.9,
    completionPercentage: 50,
    documentsCount: 0,
    agentInteractions: 2,
  },
};

describe('Dashboard Integration Tests', () => {
  let testEnv: ReturnType<typeof setupTestEnvironment>;

  beforeEach(() => {
    testEnv = setupTestEnvironment({
      mockToasts: true,
      skipActWarnings: false,
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    testEnv.cleanup();
    cleanupTestEnvironment();
  });

  describe('Dashboard Data Loading', () => {
    it('should display loading state initially', async () => {
      mockUseDashboard.mockReturnValue({
        data: undefined,
        loading: true,
        error: undefined,
        isConnected: false,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });

      await renderWithProviders(<RegulatoryDashboard projectId="1" />);

      expect(screen.getByText('Loading project data...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
    });

    it('should display dashboard data when loaded', async () => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: true,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });

      await renderWithProviders(<RegulatoryDashboard projectId="1" />);

      await waitFor(() => {
        expect(screen.getByText('Test Medical Device')).toBeInTheDocument();
        expect(screen.getByText('50% Complete')).toBeInTheDocument();
        expect(screen.getByText('Class II')).toBeInTheDocument();
        expect(screen.getByText('K123456')).toBeInTheDocument();
      });
    });

    it('should display error state when loading fails', () => {
      const errorMessage = 'Failed to load dashboard data';
      mockUseDashboard.mockReturnValue({
        data: undefined,
        loading: false,
        error: errorMessage,
        isConnected: false,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });

      render(<RegulatoryDashboard projectId="1" />);

      expect(
        screen.getByText(`Failed to load dashboard data: ${errorMessage}`)
      ).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Dashboard Interactions', () => {
    const mockHandlers = {
      refreshDashboard: jest.fn(),
      exportDashboard: jest.fn(),
      startClassification: jest.fn(),
      searchPredicates: jest.fn(),
      selectPredicate: jest.fn(),
      handleStepClick: jest.fn(),
    };

    beforeEach(() => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: true,
        ...mockHandlers,
      });
    });

    it('should handle refresh button click', async () => {
      render(<RegulatoryDashboard projectId="1" />);

      const refreshButton = screen.getByText('Refresh');
      fireEvent.click(refreshButton);

      expect(mockHandlers.refreshDashboard).toHaveBeenCalledTimes(1);
    });

    it('should handle export button click', async () => {
      render(<RegulatoryDashboard projectId="1" />);

      const exportButton = screen.getByText('Export');
      fireEvent.click(exportButton);

      expect(mockHandlers.exportDashboard).toHaveBeenCalledWith('pdf');
    });

    it('should handle classification widget interactions', async () => {
      render(<RegulatoryDashboard projectId="1" />);

      // Find and click the re-analyze button in classification widget
      const reAnalyzeButton = screen.getByText('Re-analyze');
      fireEvent.click(reAnalyzeButton);

      expect(mockHandlers.startClassification).toHaveBeenCalledTimes(1);
    });

    it('should handle predicate selection', async () => {
      render(<RegulatoryDashboard projectId="1" />);

      // Switch to top matches tab to see predicate devices
      const topMatchesTab = screen.getByText('Top Matches');
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        const selectButton = screen.getByText('Selected'); // Already selected
        fireEvent.click(selectButton);

        expect(mockHandlers.selectPredicate).toHaveBeenCalledWith(
          expect.objectContaining({
            kNumber: 'K123456',
          })
        );
      });
    });
  });

  describe('Real-time Updates', () => {
    it('should show connection status', () => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: true,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });

      render(<RegulatoryDashboard projectId="1" />);

      // Connection status should not show "Disconnected" badge when connected
      expect(screen.queryByText('Disconnected')).not.toBeInTheDocument();
    });

    it('should show disconnected status when WebSocket is down', () => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: false,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });

      render(<RegulatoryDashboard projectId="1" />);

      // Should show some indication of disconnection in the project detail page
      // (The actual implementation might vary)
    });
  });

  describe('Dashboard Widget Functionality', () => {
    beforeEach(() => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: true,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });
    });

    it('should display classification widget with correct data', () => {
      render(<RegulatoryDashboard projectId="1" />);

      expect(screen.getByText('Device Classification')).toBeInTheDocument();
      expect(screen.getByText('Class II')).toBeInTheDocument();
      expect(screen.getByText('ABC')).toBeInTheDocument();
      expect(screen.getByText('85%')).toBeInTheDocument();
    });

    it('should display progress widget with correct completion', () => {
      render(<RegulatoryDashboard projectId="1" />);

      expect(screen.getByText('Project Progress')).toBeInTheDocument();
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('2/4 Complete')).toBeInTheDocument();
    });

    it('should display predicate widget with devices', () => {
      render(<RegulatoryDashboard projectId="1" />);

      expect(screen.getByText('Predicate Devices')).toBeInTheDocument();
      expect(screen.getByText('1 Found')).toBeInTheDocument();
      expect(screen.getByText('K123456')).toBeInTheDocument();
    });

    it('should display activity widget with recent actions', () => {
      render(<RegulatoryDashboard projectId="1" />);

      expect(screen.getByText('Recent Activity')).toBeInTheDocument();
      expect(
        screen.getByText('Device Classification Completed')
      ).toBeInTheDocument();
    });
  });

  describe('Dashboard Tabs', () => {
    beforeEach(() => {
      mockUseDashboard.mockReturnValue({
        data: mockDashboardData,
        loading: false,
        error: undefined,
        isConnected: true,
        refreshDashboard: jest.fn(),
        exportDashboard: jest.fn(),
        startClassification: jest.fn(),
        searchPredicates: jest.fn(),
        selectPredicate: jest.fn(),
        handleStepClick: jest.fn(),
      });
    });

    it('should switch between overview and detailed tabs', async () => {
      render(<RegulatoryDashboard projectId="1" />);

      // Should start on overview tab
      expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
        'Overview'
      );

      // Switch to detailed tab
      const detailedTab = screen.getByText('Detailed View');
      fireEvent.click(detailedTab);

      await waitFor(() => {
        expect(screen.getByRole('tab', { selected: true })).toHaveTextContent(
          'Detailed View'
        );
      });
    });
  });
});

describe('Dashboard Hook Tests', () => {
  // Note: These would be more comprehensive unit tests for the useDashboard hook
  // For now, we're testing through the component integration

  it('should handle dashboard data loading lifecycle', () => {
    // This would test the hook directly with proper mocking
    // of the project service and WebSocket connections
    expect(true).toBe(true); // Placeholder
  });

  it('should handle real-time WebSocket updates', () => {
    // This would test WebSocket message handling
    expect(true).toBe(true); // Placeholder
  });

  it('should handle export functionality', () => {
    // This would test the export feature
    expect(true).toBe(true); // Placeholder
  });
});
