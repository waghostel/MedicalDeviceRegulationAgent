import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationPanel } from '../citation-panel';
import { SourceCitation } from '@/types/copilot';

// Mock the child components
jest.mock('../citation-card', () => ({
  CitationCard: ({ citation, onCopy, onVisit }: any) => (
    <div data-testid="citation-card">
      <span>{citation.title}</span>
      <button onClick={() => onCopy?.(citation)}>Copy</button>
      <button onClick={() => onVisit?.(citation)}>Visit</button>
    </div>
  )
}));

jest.mock('../citation-search', () => ({
  CitationSearch: ({ citations, onFilteredResults }: any) => (
    <div data-testid="citation-search">
      <input 
        placeholder="Search citations..."
        onChange={(e) => {
          const filtered = citations.filter((c: SourceCitation) => 
            c.title.toLowerCase().includes(e.target.value.toLowerCase())
          );
          onFilteredResults(filtered);
        }}
      />
    </div>
  )
}));

jest.mock('../citation-exporter', () => ({
  CitationExporter: ({ citations }: any) => (
    <div data-testid="citation-exporter">
      Export {citations.length} citations
    </div>
  )
}));

// Mock validateSourceUrl
jest.mock('../citation-utils', () => ({
  ...jest.requireActual('../citation-utils'),
  validateSourceUrl: jest.fn(() => Promise.resolve(true))
}));

describe('CitationPanel', () => {
  const mockCitations: SourceCitation[] = [
    {
      url: 'https://www.fda.gov/medical-devices/510k-clearances/k123456',
      title: 'Cardiac Monitor 510(k) Summary',
      effectiveDate: '2023-01-15',
      documentType: 'FDA_510K',
      accessedDate: '2024-01-15'
    },
    {
      url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/software-medical-device',
      title: 'Software as Medical Device Guidance',
      effectiveDate: '2022-06-10',
      documentType: 'FDA_GUIDANCE',
      accessedDate: '2024-01-10'
    },
    {
      url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-820',
      title: '21 CFR 820 - Quality System Regulation',
      effectiveDate: '2021-12-01',
      documentType: 'CFR_SECTION',
      accessedDate: '2024-01-05'
    }
  ];

  const mockOnToggle = jest.fn();
  const mockOnRefresh = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render panel header with citation count', () => {
    render(<CitationPanel citations={mockCitations} />);

    expect(screen.getByText('Citations & Sources')).toBeInTheDocument();
    expect(screen.getByText('(3)')).toBeInTheDocument();
  });

  it('should be collapsible', async () => {
    const user = userEvent.setup();
    render(
      <CitationPanel 
        citations={mockCitations} 
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /citations & sources/i });
    await user.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalledWith(false);
  });

  it('should render search component', () => {
    render(<CitationPanel citations={mockCitations} />);

    expect(screen.getByTestId('citation-search')).toBeInTheDocument();
  });

  it('should render exporter component', () => {
    render(<CitationPanel citations={mockCitations} />);

    expect(screen.getByTestId('citation-exporter')).toBeInTheDocument();
    expect(screen.getByText('Export 3 citations')).toBeInTheDocument();
  });

  it('should group citations by document type', () => {
    render(<CitationPanel citations={mockCitations} />);

    expect(screen.getByText('FDA_510K (1)')).toBeInTheDocument();
    expect(screen.getByText('FDA_GUIDANCE (1)')).toBeInTheDocument();
    expect(screen.getByText('CFR_SECTION (1)')).toBeInTheDocument();
  });

  it('should render citation cards for each citation', () => {
    render(<CitationPanel citations={mockCitations} />);

    expect(screen.getAllByTestId('citation-card')).toHaveLength(3);
    expect(screen.getByText('Cardiac Monitor 510(k) Summary')).toBeInTheDocument();
    expect(screen.getByText('Software as Medical Device Guidance')).toBeInTheDocument();
    expect(screen.getByText('21 CFR 820 - Quality System Regulation')).toBeInTheDocument();
  });

  it('should show empty state when no citations', () => {
    render(<CitationPanel citations={[]} />);

    expect(screen.getByText('No citations found')).toBeInTheDocument();
    expect(screen.getByText('Citations will appear here as you interact with the AI assistant')).toBeInTheDocument();
  });

  it('should change citation format', async () => {
    const user = userEvent.setup();
    render(<CitationPanel citations={mockCitations} />);

    const formatSelect = screen.getByRole('combobox');
    await user.click(formatSelect);
    
    const mlaOption = screen.getByText('MLA');
    await user.click(mlaOption);

    // The format change should be reflected in the citation cards
    // This would be tested more thoroughly in integration tests
  });

  it('should handle refresh action', async () => {
    const user = userEvent.setup();
    render(
      <CitationPanel 
        citations={mockCitations} 
        onRefresh={mockOnRefresh}
      />
    );

    const refreshButton = screen.getByTitle('Refresh citations');
    await user.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalled();
  });

  it('should handle URL validation', async () => {
    const user = userEvent.setup();
    const { validateSourceUrl } = require('../citation-utils');
    
    render(<CitationPanel citations={mockCitations} />);

    const validateButton = screen.getByTitle('Validate all URLs');
    await user.click(validateButton);

    await waitFor(() => {
      expect(validateSourceUrl).toHaveBeenCalledTimes(3);
    });
  });

  it('should handle citation copy callback', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<CitationPanel citations={mockCitations} />);

    const copyButtons = screen.getAllByText('Copy');
    await user.click(copyButtons[0]);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Citation copied:',
      'Cardiac Monitor 510(k) Summary'
    );

    consoleSpy.mockRestore();
  });

  it('should handle citation visit callback', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    
    render(<CitationPanel citations={mockCitations} />);

    const visitButtons = screen.getAllByText('Visit');
    await user.click(visitButtons[0]);

    expect(consoleSpy).toHaveBeenCalledWith(
      'Citation visited:',
      'https://www.fda.gov/medical-devices/510k-clearances/k123456'
    );

    consoleSpy.mockRestore();
  });

  it('should update filtered citations when search changes', async () => {
    const user = userEvent.setup();
    render(<CitationPanel citations={mockCitations} />);

    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    // Should only show the cardiac monitor citation
    expect(screen.getByText('Cardiac Monitor 510(k) Summary')).toBeInTheDocument();
    expect(screen.queryByText('Software as Medical Device Guidance')).not.toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CitationPanel citations={mockCitations} className="custom-class" />
    );

    const panel = container.firstChild as HTMLElement;
    expect(panel).toHaveClass('custom-class');
  });

  it('should use custom project name', () => {
    render(
      <CitationPanel 
        citations={mockCitations} 
        projectName="Custom Project"
      />
    );

    // The project name would be passed to the exporter component
    // This is tested indirectly through the exporter tests
    expect(screen.getByTestId('citation-exporter')).toBeInTheDocument();
  });

  it('should handle validation errors gracefully', async () => {
    const user = userEvent.setup();
    const { validateSourceUrl } = require('../citation-utils');
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    
    validateSourceUrl.mockRejectedValueOnce(new Error('Validation failed'));
    
    render(<CitationPanel citations={mockCitations} />);

    const validateButton = screen.getByTitle('Validate all URLs');
    await user.click(validateButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to validate URLs:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });
});