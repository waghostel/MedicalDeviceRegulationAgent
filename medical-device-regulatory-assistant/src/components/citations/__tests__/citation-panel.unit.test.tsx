/**
 * Unit tests for CitationPanel component
 * Tests citation display, filtering, and external link handling
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { CitationPanel } from '../citation-panel';
import { generateMockSourceCitation } from '@/lib/mock-data';
import { SourceCitation } from '@/types/copilot';

// Mock the child components
jest.mock('../citation-card', () => ({
  CitationCard: (props) => (
    <div data-testid="citation-card" data-citation-url={props.citation.url}>
      <div>{props.citation.title}</div>
      <div>{props.citation.documentType}</div>
      <button onClick={() => props.onCopy?.(props.citation)}>Copy</button>
      <button onClick={() => props.onVisit?.(props.citation)}>Visit</button>
    </div>
  ),
}));

jest.mock('../citation-search', () => ({
  CitationSearch: (props) => (
    <div data-testid="citation-search">
      <input
        placeholder="Search citations..."
        onChange={(e) => {
          // Simulate filtering
          const filtered = props.citations.filter((c) =>
            c.title.toLowerCase().includes(e.target.value.toLowerCase())
          );
          props.onFilteredResults(filtered);
        }}
      />
    </div>
  ),
}));

jest.mock('../citation-exporter', () => ({
  CitationExporter: (props) => (
    <div data-testid="citation-exporter">
      <button>Export {props.citations.length} citations</button>
    </div>
  ),
}));

jest.mock('../citation-utils', () => ({
  validateSourceUrl: jest.fn().mockResolvedValue(true),
  CitationFormat: {
    APA: 'APA',
    MLA: 'MLA',
  },
}));

describe('CitationPanel Component', () => {
  const mockSession = createMockSession();
  const mockCitations: SourceCitation[] = [
    generateMockSourceCitation({
      title: 'FDA 510(k) Database Entry K123456',
      documentType: 'FDA_510K',
      url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
    }),
    generateMockSourceCitation({
      title: 'FDA Guidance Document - Class II Special Controls',
      documentType: 'FDA_GUIDANCE',
      url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/class-ii-special-controls',
    }),
    generateMockSourceCitation({
      title: '21 CFR 870.2300 - Cardiovascular Devices',
      documentType: 'CFR_SECTION',
      url: 'https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-870/section-870.2300',
    }),
  ];

  const defaultProps = {
    citations: mockCitations,
    projectName: 'Test Project',
    onRefresh: jest.fn(),
    onToggle: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('renders citation panel with correct title and count', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('Citations & Sources')).toBeInTheDocument();
      expect(screen.getByText('(3)')).toBeInTheDocument();
    });

    it('renders collapsible trigger button', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const triggerButton = screen.getByRole('button', {
        name: /citations & sources/i,
      });
      expect(triggerButton).toBeInTheDocument();
    });

    it('shows expanded state by default', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByTestId('citation-search')).toBeInTheDocument();
      expect(screen.getByTestId('citation-exporter')).toBeInTheDocument();
    });

    it('shows collapsed state when isOpen is false', () => {
      renderWithProviders(<CitationPanel {...defaultProps} isOpen={false} />, {
        session: mockSession,
      });

      expect(screen.queryByTestId('citation-search')).not.toBeInTheDocument();
      expect(screen.queryByTestId('citation-exporter')).not.toBeInTheDocument();
    });
  });

  describe('Citation Display', () => {
    it('displays all citations grouped by document type', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('FDA 510K (1)')).toBeInTheDocument();
      expect(screen.getByText('FDA GUIDANCE (1)')).toBeInTheDocument();
      expect(screen.getByText('CFR SECTION (1)')).toBeInTheDocument();
    });

    it('renders citation cards for each citation', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const citationCards = screen.getAllByTestId('citation-card');
      expect(citationCards).toHaveLength(3);

      expect(
        screen.getByText('FDA 510(k) Database Entry K123456')
      ).toBeInTheDocument();
      expect(
        screen.getByText('FDA Guidance Document - Class II Special Controls')
      ).toBeInTheDocument();
      expect(
        screen.getByText('21 CFR 870.2300 - Cardiovascular Devices')
      ).toBeInTheDocument();
    });

    it('shows empty state when no citations are provided', () => {
      renderWithProviders(<CitationPanel {...defaultProps} citations={[]} />, {
        session: mockSession,
      });

      expect(screen.getByText('No citations found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Citations will appear here as you interact with the AI assistant'
        )
      ).toBeInTheDocument();
    });
  });

  describe('Citation Format Selection', () => {
    it('renders format selector with default APA format', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const formatSelector = screen.getByRole('combobox');
      expect(formatSelector).toBeInTheDocument();
      expect(formatSelector).toHaveValue('APA');
    });

    it('allows changing citation format to MLA', async () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const formatSelector = screen.getByRole('combobox');
      fireEvent.click(formatSelector);

      await waitFor(() => {
        const mlaOption = screen.getByRole('option', { name: 'MLA' });
        fireEvent.click(mlaOption);
      });

      expect(formatSelector).toHaveValue('MLA');
    });
  });

  describe('Control Buttons', () => {
    it('renders refresh button when onRefresh is provided', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const refreshButton = screen.getByRole('button', {
        name: /refresh citations/i,
      });
      expect(refreshButton).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <CitationPanel {...defaultProps} onRefresh={mockOnRefresh} />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', {
        name: /refresh citations/i,
      });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('renders validate URLs button', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const validateButton = screen.getByRole('button', {
        name: /validate all urls/i,
      });
      expect(validateButton).toBeInTheDocument();
    });

    it('validates URLs when validate button is clicked', async () => {
      const { validateSourceUrl } = require('../citation-utils');
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const validateButton = screen.getByRole('button', {
        name: /validate all urls/i,
      });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(validateSourceUrl).toHaveBeenCalledTimes(mockCitations.length);
      });
    });

    it('disables validate button during validation', async () => {
      const { validateSourceUrl } = require('../citation-utils');
      validateSourceUrl.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const validateButton = screen.getByRole('button', {
        name: /validate all urls/i,
      });
      fireEvent.click(validateButton);

      expect(validateButton).toBeDisabled();

      await waitFor(() => {
        expect(validateButton).not.toBeDisabled();
      });
    });
  });

  describe('Citation Search', () => {
    it('renders citation search component', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByTestId('citation-search')).toBeInTheDocument();
    });

    it('filters citations based on search input', async () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const searchInput = screen.getByPlaceholderText('Search citations...');
      fireEvent.change(searchInput, { target: { value: 'guidance' } });

      await waitFor(() => {
        // Should only show the guidance document
        expect(
          screen.getByText('FDA Guidance Document - Class II Special Controls')
        ).toBeInTheDocument();
        expect(
          screen.queryByText('FDA 510(k) Database Entry K123456')
        ).not.toBeInTheDocument();
      });
    });
  });

  describe('Citation Export', () => {
    it('renders citation exporter component', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByTestId('citation-exporter')).toBeInTheDocument();
      expect(screen.getByText('Export 3 citations')).toBeInTheDocument();
    });

    it('updates export count when citations are filtered', async () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const searchInput = screen.getByPlaceholderText('Search citations...');
      fireEvent.change(searchInput, { target: { value: 'guidance' } });

      await waitFor(() => {
        expect(screen.getByText('Export 1 citations')).toBeInTheDocument();
      });
    });
  });

  describe('Citation Interactions', () => {
    it('handles citation copy action', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const copyButtons = screen.getAllByText('Copy');
      fireEvent.click(copyButtons[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Citation copied:',
        mockCitations[0].title
      );
      consoleSpy.mockRestore();
    });

    it('handles citation visit action', () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const visitButtons = screen.getAllByText('Visit');
      fireEvent.click(visitButtons[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        'Citation visited:',
        mockCitations[0].url
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Collapsible Behavior', () => {
    it('toggles panel when trigger is clicked', () => {
      const mockOnToggle = jest.fn();
      renderWithProviders(
        <CitationPanel {...defaultProps} onToggle={mockOnToggle} />,
        { session: mockSession }
      );

      const triggerButton = screen.getByRole('button', {
        name: /citations & sources/i,
      });
      fireEvent.click(triggerButton);

      expect(mockOnToggle).toHaveBeenCalledWith(false);
    });

    it('shows correct chevron icon based on open state', () => {
      const { rerender } = renderWithProviders(
        <CitationPanel {...defaultProps} isOpen={true} />,
        { session: mockSession }
      );

      // Should show down chevron when open
      expect(
        document.querySelector('[data-lucide="chevron-down"]')
      ).toBeInTheDocument();

      rerender(<CitationPanel {...defaultProps} isOpen={false} />);

      // Should show right chevron when closed
      expect(
        document.querySelector('[data-lucide="chevron-right"]')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const triggerButton = screen.getByRole('button', {
        name: /citations & sources/i,
      });
      expect(triggerButton).toHaveAttribute('aria-expanded');
    });

    it('provides proper semantic structure', () => {
      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      // Should have proper heading structure for document type groups
      expect(screen.getByText('FDA 510K (1)')).toBeInTheDocument();
      expect(screen.getByText('FDA GUIDANCE (1)')).toBeInTheDocument();
      expect(screen.getByText('CFR SECTION (1)')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      renderWithProviders(<CitationPanel citations={mockCitations} />, {
        session: mockSession,
      });

      const triggerButton = screen.getByRole('button', {
        name: /citations & sources/i,
      });

      expect(() => {
        fireEvent.click(triggerButton);
      }).not.toThrow();
    });

    it('handles URL validation errors gracefully', async () => {
      const { validateSourceUrl } = require('../citation-utils');
      validateSourceUrl.mockRejectedValue(new Error('Network error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      renderWithProviders(<CitationPanel {...defaultProps} />, {
        session: mockSession,
      });

      const validateButton = screen.getByRole('button', {
        name: /validate all urls/i,
      });
      fireEvent.click(validateButton);

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith(
          'Failed to validate URLs:',
          expect.any(Error)
        );
      });

      consoleSpy.mockRestore();
    });

    it('updates filtered citations when citations prop changes', () => {
      const { rerender } = renderWithProviders(
        <CitationPanel
          {...defaultProps}
          citations={mockCitations.slice(0, 1)}
        />,
        { session: mockSession }
      );

      expect(screen.getByText('(1)')).toBeInTheDocument();

      rerender(<CitationPanel {...defaultProps} citations={mockCitations} />);

      expect(screen.getByText('(3)')).toBeInTheDocument();
    });
  });
});
