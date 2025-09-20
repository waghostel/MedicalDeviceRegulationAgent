import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { SourceCitation } from '@/types/copilot';

import { CitationCard } from '../citation-card';


// Mock clipboard API
const mockWriteText = jest.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock window.open
const mockWindowOpen = jest.fn();
Object.defineProperty(window, 'open', {
  value: mockWindowOpen,
});

describe('CitationCard', () => {
  const mockCitation: SourceCitation = {
    url: 'https://www.fda.gov/medical-devices/510k-clearances/k123456',
    title: 'Test Medical Device 510(k) Summary',
    effectiveDate: '2023-01-15',
    documentType: 'FDA_510K',
    accessedDate: '2024-01-15',
  };

  const mockOnCopy = jest.fn();
  const mockOnVisit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render citation information correctly', () => {
    render(<CitationCard citation={mockCitation} />);

    expect(screen.getByText(mockCitation.title)).toBeInTheDocument();
    expect(screen.getByText('FDA 510(k)')).toBeInTheDocument();
    expect(screen.getByText('2023-01-15')).toBeInTheDocument();
    expect(screen.getByText('2024-01-15')).toBeInTheDocument();
  });

  it('should display formatted citation in APA style by default', () => {
    render(<CitationCard citation={mockCitation} />);

    const citationText = screen.getByText(
      /U\.S\. Food and Drug Administration/
    );
    expect(citationText).toBeInTheDocument();
    expect(citationText.textContent).toContain('Retrieved January 15, 2024');
  });

  it('should display formatted citation in MLA style when specified', () => {
    render(<CitationCard citation={mockCitation} format="MLA" />);

    const citationText = screen.getByText(
      /U\.S\. Food and Drug Administration/
    );
    expect(citationText).toBeInTheDocument();
    expect(citationText.textContent).toContain('Accessed 15 January 2024');
  });

  it('should show validation status when enabled', () => {
    render(<CitationCard citation={mockCitation} showValidation={true} />);

    // Should show valid citation icon (CheckCircle)
    const validIcon = screen.getByTestId('validation-icon');
    expect(validIcon).toBeInTheDocument();
  });

  it('should show validation errors for invalid citation', () => {
    const invalidCitation: SourceCitation = {
      ...mockCitation,
      title: '',
      url: 'invalid-url',
    };

    render(<CitationCard citation={invalidCitation} showValidation={true} />);

    // Should show invalid citation icon (AlertCircle)
    const invalidIcon = screen.getByTestId('validation-icon');
    expect(invalidIcon).toBeInTheDocument();
  });

  it('should copy citation to clipboard when copy button is clicked', async () => {
    const user = userEvent.setup();
    render(<CitationCard citation={mockCitation} onCopy={mockOnCopy} />);

    const copyButton = screen.getByRole('button', { name: /copy citation/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(
        expect.stringContaining('U.S. Food and Drug Administration')
      );
      expect(mockOnCopy).toHaveBeenCalledWith(mockCitation);
    });
  });

  it('should open source URL when visit button is clicked', async () => {
    const user = userEvent.setup();
    render(<CitationCard citation={mockCitation} onVisit={mockOnVisit} />);

    const visitButton = screen.getByRole('button', { name: /visit source/i });
    await user.click(visitButton);

    expect(mockWindowOpen).toHaveBeenCalledWith(
      mockCitation.url,
      '_blank',
      'noopener,noreferrer'
    );
    expect(mockOnVisit).toHaveBeenCalledWith(mockCitation);
  });

  it('should handle copy error gracefully', async () => {
    const user = userEvent.setup();
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    // Mock clipboard to throw error
    mockWriteText.mockRejectedValueOnce(new Error('Clipboard error'));

    render(<CitationCard citation={mockCitation} />);

    const copyButton = screen.getByRole('button', { name: /copy citation/i });
    await user.click(copyButton);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy citation:',
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CitationCard citation={mockCitation} className="custom-class" />
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveClass('custom-class');
  });

  it('should display document type icon', () => {
    render(<CitationCard citation={mockCitation} />);

    // FDA 510(k) should show clipboard icon
    const icon = screen.getByRole('img');
    expect(icon).toHaveAttribute('aria-label', 'FDA 510(k)');
  });

  it('should truncate long titles with title attribute', () => {
    const longTitleCitation: SourceCitation = {
      ...mockCitation,
      title:
        'This is a very long title that should be truncated in the display but still available in the title attribute for accessibility',
    };

    render(<CitationCard citation={longTitleCitation} />);

    const titleElement = screen.getByTitle(longTitleCitation.title);
    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass('truncate');
  });
});
