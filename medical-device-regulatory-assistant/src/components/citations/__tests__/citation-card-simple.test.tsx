import React from 'react';
import { render, screen } from '@testing-library/react';
import { CitationCard } from '../citation-card';
import { SourceCitation } from '@/types/copilot';

describe('CitationCard Simple Tests', () => {
  const mockCitation: SourceCitation = {
    url: 'https://www.fda.gov/medical-devices/510k-clearances/k123456',
    title: 'Test Medical Device 510(k) Summary',
    effectiveDate: '2023-01-15',
    documentType: 'FDA_510K',
    accessedDate: '2024-01-15'
  };

  it('should render without crashing', () => {
    render(<CitationCard citation={mockCitation} />);
    expect(screen.getByText(mockCitation.title)).toBeInTheDocument();
  });

  it('should show copy and visit buttons', () => {
    render(<CitationCard citation={mockCitation} />);
    
    expect(screen.getByText('Copy Citation')).toBeInTheDocument();
    expect(screen.getByText('Visit Source')).toBeInTheDocument();
  });

  it('should display formatted citation', () => {
    render(<CitationCard citation={mockCitation} />);
    
    const citationText = screen.getByText(/U\.S\. Food and Drug Administration/);
    expect(citationText).toBeInTheDocument();
  });
});