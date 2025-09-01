import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogPage } from '../AuditLogPage';
import { AgentInteraction } from '@/types/audit';

// Mock the child components
jest.mock('../AuditLogFilters', () => ({
  AuditLogFilters: ({ onFiltersChange }: any) => (
    <div data-testid="audit-log-filters">
      <button onClick={() => onFiltersChange({ agentAction: 'predicate-search' })}>
        Apply Filter
      </button>
    </div>
  )
}));

jest.mock('../AgentInteractionCard', () => ({
  AgentInteractionCard: ({ interaction }: { interaction: AgentInteraction }) => (
    <div data-testid={`interaction-${interaction.id}`}>
      {interaction.agentAction}
    </div>
  )
}));

jest.mock('../AuditLogExport', () => ({
  AuditLogExport: ({ onClose }: any) => (
    <div data-testid="audit-log-export">
      <button onClick={onClose}>Close Export</button>
    </div>
  )
}));

describe('AuditLogPage', () => {
  beforeEach(() => {
    // Clear any previous timers
    jest.clearAllTimers();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render loading state initially', () => {
    render(<AuditLogPage />);
    
    expect(screen.getByText('Loading audit trail...')).toBeInTheDocument();
  });

  it('should render audit trail content after loading', async () => {
    render(<AuditLogPage />);
    
    // Fast-forward time to complete the loading
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    expect(screen.getByText('Complete history of agent interactions and regulatory decisions')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search interactions, reasoning, or input data...')).toBeInTheDocument();
  });

  it('should display summary statistics', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Total Interactions')).toBeInTheDocument();
    });

    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('Avg Confidence')).toBeInTheDocument();
    expect(screen.getByText('Success Rate')).toBeInTheDocument();
  });

  it('should filter interactions based on search term', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByTestId('interaction-1')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText('Search interactions, reasoning, or input data...');
    fireEvent.change(searchInput, { target: { value: 'predicate-search' } });

    // Should still show the predicate-search interaction
    expect(screen.getByTestId('interaction-1')).toBeInTheDocument();
    
    // Search for something that doesn't exist
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    
    await waitFor(() => {
      expect(screen.getByText('No interactions found matching your criteria.')).toBeInTheDocument();
    });
  });

  it('should toggle filters visibility', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    expect(screen.getByTestId('audit-log-filters')).toBeInTheDocument();
  });

  it('should apply filters correctly', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });

    // Open filters
    const filtersButton = screen.getByText('Filters');
    fireEvent.click(filtersButton);

    // Apply a filter
    const applyFilterButton = screen.getByText('Apply Filter');
    fireEvent.click(applyFilterButton);

    // Should still show the predicate-search interaction since it matches the filter
    expect(screen.getByTestId('interaction-1')).toBeInTheDocument();
  });

  it('should open export modal', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    expect(screen.getByTestId('audit-log-export')).toBeInTheDocument();
  });

  it('should close export modal', async () => {
    render(<AuditLogPage />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    // Open export modal
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    expect(screen.getByTestId('audit-log-export')).toBeInTheDocument();

    // Close export modal
    const closeExportButton = screen.getByText('Close Export');
    fireEvent.click(closeExportButton);

    expect(screen.queryByTestId('audit-log-export')).not.toBeInTheDocument();
  });

  it('should render with project ID', async () => {
    render(<AuditLogPage projectId="test-project" />);
    
    jest.advanceTimersByTime(1000);
    
    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Should render normally with project ID
    expect(screen.getByTestId('interaction-1')).toBeInTheDocument();
  });
});