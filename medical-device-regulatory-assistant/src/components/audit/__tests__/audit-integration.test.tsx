/**
 * Integration tests for audit trail and compliance components
 */

import { jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';

import { auditAPI } from '@/lib/api/audit';
import {
  AgentInteraction,
  ComplianceReport,
  AuditIntegrityResult,
} from '@/types/audit';

import { AuditLogPage } from '../AuditLogPage';
import { ComplianceDashboard } from '../ComplianceDashboard';

// Mock the audit API
jest.mock('@/lib/api/audit', () => ({
  auditAPI: {
    getAuditTrail: jest.fn(),
    generateComplianceReport: jest.fn(),
    verifyAuditIntegrity: jest.fn(),
    subscribeToAuditUpdates: jest.fn(),
    exportAuditTrail: jest.fn(),
  },
  downloadFile: jest.fn(),
  formatAuditAction: jest.fn((action: string) => action.replace(/[-_]/g, ' ')),
  getConfidenceColor: jest.fn(() => 'text-green-600'),
  getStatusColor: jest.fn(() => 'text-green-600'),
}));

// Mock the toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

const mockAuditEntries: AgentInteraction[] = [
  {
    id: '1',
    projectId: '1',
    userId: '1',
    agentAction: 'predicate-search',
    inputData: { deviceDescription: 'Test device' },
    outputData: { predicates: ['K123456'] },
    confidenceScore: 0.85,
    sources: [
      {
        url: 'https://fda.gov/test',
        title: 'Test Document',
        effectiveDate: '2024-01-01',
        documentType: 'FDA_510K',
        accessedDate: '2024-01-20',
      },
    ],
    reasoning: 'Test reasoning',
    executionTimeMs: 1500,
    createdAt: new Date('2024-01-20T10:00:00Z'),
    status: 'completed',
  },
  {
    id: '2',
    projectId: '1',
    userId: '1',
    agentAction: 'device-classification',
    inputData: { deviceType: 'Class II' },
    outputData: { classification: 'Class II' },
    confidenceScore: 0.92,
    sources: [],
    reasoning: 'Clear classification',
    executionTimeMs: 800,
    createdAt: new Date('2024-01-20T11:00:00Z'),
    status: 'completed',
  },
];

const mockAuditSummary = {
  total_interactions: 2,
  action_counts: {
    'predicate-search': 1,
    'device-classification': 1,
  },
  average_confidence: 0.885,
  total_execution_time: 2300,
  average_execution_time: 1150,
  error_count: 0,
  error_rate: 0,
};

const mockComplianceReport: ComplianceReport = {
  report_metadata: {
    project_id: 1,
    report_type: 'summary',
    generated_at: '2024-01-20T12:00:00Z',
    generated_by: 'test@example.com',
    total_entries: 2,
  },
  compliance_metrics: {
    reasoning_completeness: 1.0,
    citation_completeness: 0.5,
    confidence_score_coverage: 1.0,
    average_confidence: 0.885,
    action_distribution: {
      'predicate-search': 1,
      'device-classification': 1,
    },
    error_rate: 0,
    total_entries_analyzed: 2,
  },
  audit_summary: mockAuditSummary,
  regulatory_compliance: {
    fda_traceability: true,
    complete_reasoning_traces: true,
    source_citations_complete: false,
    confidence_scores_present: true,
  },
};

const mockIntegrityResult: AuditIntegrityResult = {
  is_valid: true,
  total_entries: 2,
  verified_entries: 2,
  tampered_entries: [],
  integrity_score: 1.0,
  verification_timestamp: '2024-01-20T12:00:00Z',
  hash_algorithm: 'SHA-256',
};

describe('AuditLogPage Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (auditAPI.getAuditTrail as jest.Mock).mockResolvedValue({
      audit_entries: mockAuditEntries,
      summary: mockAuditSummary,
      total_count: 2,
      filters_applied: { limit: 100 },
    });

    (auditAPI.subscribeToAuditUpdates as jest.Mock).mockReturnValue(() => {});
  });

  test('renders audit log page with data', async () => {
    render(<AuditLogPage projectId="1" />);

    // Check loading state
    expect(screen.getByText('Loading audit trail...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Check summary stats
    expect(screen.getByText('2')).toBeInTheDocument(); // Total interactions
    expect(screen.getByText('1s')).toBeInTheDocument(); // Avg response time
    expect(screen.getByText('89%')).toBeInTheDocument(); // Avg confidence
    expect(screen.getByText('100%')).toBeInTheDocument(); // Success rate

    // Check that API was called correctly
    expect(auditAPI.getAuditTrail).toHaveBeenCalledWith(1, {});
    expect(auditAPI.subscribeToAuditUpdates).toHaveBeenCalledWith(
      1,
      expect.any(Function),
      expect.any(Function)
    );
  });

  test('handles search and filtering', async () => {
    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Test search functionality
    const searchInput = screen.getByPlaceholderText(/search interactions/i);
    fireEvent.change(searchInput, { target: { value: 'predicate' } });

    // Should filter interactions (this would be tested with more complex mock data)
    expect(searchInput).toHaveValue('predicate');

    // Test filter toggle
    const filterButton = screen.getByText('Filters');
    fireEvent.click(filterButton);

    // Should show filter panel (implementation depends on AuditLogFilters component)
  });

  test('handles export functionality', async () => {
    const mockBlob = new Blob(['test data'], { type: 'application/json' });
    (auditAPI.exportAuditTrail as jest.Mock).mockResolvedValue(mockBlob);

    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Click export button
    const exportButton = screen.getByText('Export');
    fireEvent.click(exportButton);

    // Should show export modal (implementation depends on AuditLogExport component)
  });

  test('handles API errors gracefully', async () => {
    (auditAPI.getAuditTrail as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      // Should fall back to mock data or show error state
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });
  });
});

describe('ComplianceDashboard Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    (auditAPI.generateComplianceReport as jest.Mock).mockResolvedValue(
      mockComplianceReport
    );
    (auditAPI.verifyAuditIntegrity as jest.Mock).mockResolvedValue(
      mockIntegrityResult
    );
  });

  test('renders compliance dashboard with data', async () => {
    render(<ComplianceDashboard projectId="1" />);

    // Check loading state
    expect(screen.getByText('Loading compliance data...')).toBeInTheDocument();

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });

    // Check overall compliance score
    expect(screen.getByText('75%')).toBeInTheDocument(); // 3/4 requirements met

    // Check regulatory requirements
    expect(screen.getByText('Fda Traceability')).toBeInTheDocument();
    expect(screen.getByText('Complete Reasoning Traces')).toBeInTheDocument();
    expect(screen.getByText('Source Citations Complete')).toBeInTheDocument();
    expect(screen.getByText('Confidence Scores Present')).toBeInTheDocument();

    // Check compliance metrics
    expect(screen.getByText('Reasoning Completeness')).toBeInTheDocument();
    expect(screen.getByText('Citation Completeness')).toBeInTheDocument();
    expect(screen.getByText('Confidence Score Coverage')).toBeInTheDocument();

    // Check that API was called correctly
    expect(auditAPI.generateComplianceReport).toHaveBeenCalledWith({
      project_id: 1,
      report_type: 'summary',
      include_integrity_check: true,
    });
  });

  test('handles integrity verification', async () => {
    render(<ComplianceDashboard projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });

    // Click verify integrity button
    const verifyButton = screen.getByText('Verify Now');
    fireEvent.click(verifyButton);

    await waitFor(() => {
      expect(auditAPI.verifyAuditIntegrity).toHaveBeenCalledWith(1);
    });

    // Should show integrity results
    expect(screen.getByText('Integrity Verified')).toBeInTheDocument();
    expect(screen.getByText('100% Valid')).toBeInTheDocument();
  });

  test('handles full report generation', async () => {
    const mockBlob = new Blob(['report data'], { type: 'application/json' });
    (auditAPI.generateComplianceReport as jest.Mock)
      .mockResolvedValueOnce(mockComplianceReport) // Initial load
      .mockResolvedValueOnce({ ...mockComplianceReport, report_type: 'full' }); // Full report

    render(<ComplianceDashboard projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });

    // Click full report button
    const fullReportButton = screen.getByText('Full Report');
    fireEvent.click(fullReportButton);

    await waitFor(() => {
      expect(auditAPI.generateComplianceReport).toHaveBeenCalledWith({
        project_id: 1,
        report_type: 'full',
        include_integrity_check: true,
      });
    });
  });

  test('shows integrity issues when detected', async () => {
    const tamperedIntegrityResult: AuditIntegrityResult = {
      ...mockIntegrityResult,
      is_valid: false,
      verified_entries: 1,
      tampered_entries: [2],
      integrity_score: 0.5,
    };

    (auditAPI.generateComplianceReport as jest.Mock).mockResolvedValue({
      ...mockComplianceReport,
      integrity_verification: tamperedIntegrityResult,
    });

    render(<ComplianceDashboard projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Compliance Dashboard')).toBeInTheDocument();
    });

    // Should show integrity issues
    expect(screen.getByText('Integrity Issues Detected')).toBeInTheDocument();
    expect(screen.getByText('50% Valid')).toBeInTheDocument();
    expect(
      screen.getByText(/1 entries show signs of tampering/)
    ).toBeInTheDocument();
  });

  test('handles API errors gracefully', async () => {
    (auditAPI.generateComplianceReport as jest.Mock).mockRejectedValue(
      new Error('API Error')
    );

    render(<ComplianceDashboard projectId="1" />);

    await waitFor(() => {
      // Should show error message or fallback state
      expect(
        screen.getByText(/No compliance data available/)
      ).toBeInTheDocument();
    });
  });
});

describe('Real-time Updates', () => {
  test('handles real-time audit updates', async () => {
    const mockUnsubscribe = jest.fn();
    let updateCallback: (interaction: AgentInteraction) => void;

    (auditAPI.subscribeToAuditUpdates as jest.Mock).mockImplementation(
      (projectId, onUpdate, onError) => {
        updateCallback = onUpdate;
        return mockUnsubscribe;
      }
    );

    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Simulate real-time update
    const newInteraction: AgentInteraction = {
      id: '3',
      projectId: '1',
      userId: '1',
      agentAction: 'new-action',
      inputData: {},
      outputData: {},
      confidenceScore: 0.9,
      sources: [],
      reasoning: 'New interaction',
      executionTimeMs: 1000,
      createdAt: new Date(),
      status: 'completed',
    };

    updateCallback!(newInteraction);

    // Should add new interaction to the list
    // (This would require more complex state management testing)
  });
});

describe('Error Handling', () => {
  test('handles network errors', async () => {
    (auditAPI.getAuditTrail as jest.Mock).mockRejectedValue(
      new Error('Network Error')
    );

    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      // Should show fallback data or error state
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });
  });

  test('handles invalid project ID', async () => {
    render(<AuditLogPage projectId="" />);

    // Should handle empty project ID gracefully
    expect(screen.getByText('Loading audit trail...')).toBeInTheDocument();
  });
});

describe('Accessibility', () => {
  test('has proper ARIA labels and roles', async () => {
    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Audit Trail'
    );

    // Check for proper button labels
    expect(screen.getByRole('button', { name: /export/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /filters/i })
    ).toBeInTheDocument();
  });

  test('supports keyboard navigation', async () => {
    render(<AuditLogPage projectId="1" />);

    await waitFor(() => {
      expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    });

    // Test search input focus
    const searchInput = screen.getByPlaceholderText(/search interactions/i);
    searchInput.focus();
    expect(document.activeElement).toBe(searchInput);

    // Test button focus
    const exportButton = screen.getByRole('button', { name: /export/i });
    exportButton.focus();
    expect(document.activeElement).toBe(exportButton);
  });
});
