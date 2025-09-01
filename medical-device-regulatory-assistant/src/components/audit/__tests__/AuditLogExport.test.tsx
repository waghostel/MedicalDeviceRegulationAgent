import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuditLogExport } from '../AuditLogExport';
import { AgentInteraction } from '@/types/audit';

// Mock URL.createObjectURL and URL.revokeObjectURL
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockInteractions: AgentInteraction[] = [
  {
    id: '1',
    projectId: 'project-1',
    userId: 'user-1',
    agentAction: 'predicate-search',
    inputData: { deviceDescription: 'Test device' },
    outputData: { predicates: [] },
    confidenceScore: 0.85,
    sources: [],
    reasoning: 'Test reasoning',
    executionTimeMs: 2500,
    createdAt: new Date('2024-01-01T10:00:00Z'),
    status: 'completed'
  }
];

const mockOnClose = jest.fn();

describe('AuditLogExport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock document.createElement and appendChild/removeChild
    const mockLink = {
      href: '',
      download: '',
      click: jest.fn(),
    };
    
    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'a') {
        return mockLink as any;
      }
      return document.createElement(tagName);
    });
    
    jest.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink as any);
    jest.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render export dialog with default options', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    expect(screen.getByText('Export Audit Trail')).toBeInTheDocument();
    expect(screen.getByText('Export audit trail data for compliance and reporting purposes.')).toBeInTheDocument();
    expect(screen.getByText('PDF Report')).toBeInTheDocument();
  });

  it('should allow changing export format', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const formatSelect = screen.getByRole('combobox');
    fireEvent.click(formatSelect);
    
    const csvOption = screen.getByText('CSV Data');
    fireEvent.click(csvOption);
    
    expect(screen.getByText('CSV Data')).toBeInTheDocument();
  });

  it('should allow setting custom filename', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const filenameInput = screen.getByLabelText('Custom Filename (optional)');
    fireEvent.change(filenameInput, { target: { value: 'my-custom-audit-report' } });
    
    expect(filenameInput).toHaveValue('my-custom-audit-report');
  });

  it('should toggle reasoning traces option', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const reasoningCheckbox = screen.getByLabelText('Reasoning traces and analysis steps');
    expect(reasoningCheckbox).toBeChecked();
    
    fireEvent.click(reasoningCheckbox);
    expect(reasoningCheckbox).not.toBeChecked();
  });

  it('should toggle sources option', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const sourcesCheckbox = screen.getByLabelText('Source citations and references');
    expect(sourcesCheckbox).toBeChecked();
    
    fireEvent.click(sourcesCheckbox);
    expect(sourcesCheckbox).not.toBeChecked();
  });

  it('should display export summary', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    expect(screen.getByText('Export Summary:')).toBeInTheDocument();
    expect(screen.getByText('• 1 interaction will be exported')).toBeInTheDocument();
    expect(screen.getByText('• Format: PDF')).toBeInTheDocument();
  });

  it('should handle PDF export', async () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);
    
    expect(exportButton).toBeDisabled();
    expect(screen.getByText('Exporting...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });
    
    // Check that file download was triggered
    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('should handle CSV export', async () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    // Change to CSV format
    const formatSelect = screen.getByRole('combobox');
    fireEvent.click(formatSelect);
    fireEvent.click(screen.getByText('CSV Data'));
    
    const exportButton = screen.getByText('Export CSV');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });
    
    expect(document.createElement).toHaveBeenCalledWith('a');
  });

  it('should close dialog when cancel is clicked', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should disable export button when no interactions', () => {
    render(<AuditLogExport interactions={[]} onClose={mockOnClose} />);
    
    const exportButton = screen.getByText('Export PDF');
    expect(exportButton).toBeDisabled();
    
    expect(screen.getByText('• 0 interactions will be exported')).toBeInTheDocument();
  });

  it('should handle multiple interactions', () => {
    const multipleInteractions = [
      ...mockInteractions,
      {
        ...mockInteractions[0],
        id: '2',
        agentAction: 'classify-device'
      }
    ];
    
    render(<AuditLogExport interactions={multipleInteractions} onClose={mockOnClose} />);
    
    expect(screen.getByText('• 2 interactions will be exported')).toBeInTheDocument();
  });

  it('should generate correct filename with timestamp', () => {
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const filenameInput = screen.getByLabelText('Custom Filename (optional)');
    const placeholder = filenameInput.getAttribute('placeholder');
    
    expect(placeholder).toMatch(/audit-trail_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}\.pdf/);
  });

  it('should auto-close after successful export', async () => {
    jest.useFakeTimers();
    
    render(<AuditLogExport interactions={mockInteractions} onClose={mockOnClose} />);
    
    const exportButton = screen.getByText('Export PDF');
    fireEvent.click(exportButton);
    
    await waitFor(() => {
      expect(screen.getByText('Export completed successfully!')).toBeInTheDocument();
    });
    
    // Fast-forward time to trigger auto-close
    jest.advanceTimersByTime(2000);
    
    expect(mockOnClose).toHaveBeenCalled();
    
    jest.useRealTimers();
  });
});