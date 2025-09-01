import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationSearch } from '../citation-search';
import { SourceCitation } from '@/types/copilot';

describe('CitationSearch', () => {
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
    },
    {
      url: 'https://www.fda.gov/medical-devices/device-classification',
      title: 'FDA Device Classification Database',
      effectiveDate: '2023-12-01',
      documentType: 'FDA_DATABASE',
      accessedDate: '2024-01-20'
    }
  ];

  const mockOnFilteredResults = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search input with placeholder', () => {
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
        placeholder="Search test citations..."
      />
    );

    const searchInput = screen.getByPlaceholderText('Search test citations...');
    expect(searchInput).toBeInTheDocument();
  });

  it('should filter citations by search query', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    expect(mockOnFilteredResults).toHaveBeenCalledWith([mockCitations[0]]);
  });

  it('should filter citations by document type', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Open filters
    const filterButton = screen.getByTestId('filter-button');
    await user.click(filterButton);

    // Select FDA Guidance document type
    const documentTypeSelect = screen.getByRole('combobox');
    await user.click(documentTypeSelect);
    
    const guidanceOption = screen.getByText('FDA Guidance');
    await user.click(guidanceOption);

    expect(mockOnFilteredResults).toHaveBeenCalledWith([mockCitations[1]]);
  });

  it('should filter citations by date range', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Open filters
    const filterButton = screen.getByTestId('filter-button');
    await user.click(filterButton);

    // Select last year date range
    const dateRangeSelects = screen.getAllByRole('combobox');
    const dateRangeSelect = dateRangeSelects[1]; // Second select is date range
    await user.click(dateRangeSelect);
    
    const lastYearOption = screen.getByText('Last Year');
    await user.click(lastYearOption);

    // Should filter to citations from the last year
    expect(mockOnFilteredResults).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ title: 'Cardiac Monitor 510(k) Summary' }),
        expect.objectContaining({ title: 'Software as Medical Device Guidance' }),
        expect.objectContaining({ title: 'FDA Device Classification Database' })
      ])
    );
  });

  it('should combine multiple filters', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Search for "software"
    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'software');

    // Open filters and select FDA Guidance
    const filterButton = screen.getByTestId('filter-button');
    await user.click(filterButton);

    const documentTypeSelect = screen.getByRole('combobox');
    await user.click(documentTypeSelect);
    
    const guidanceOption = screen.getByText('FDA Guidance');
    await user.click(guidanceOption);

    // Should return only the software guidance document
    expect(mockOnFilteredResults).toHaveBeenCalledWith([mockCitations[1]]);
  });

  it('should display active filters as badges', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Add search query
    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    // Should show search filter badge
    expect(screen.getByText('Search: "cardiac"')).toBeInTheDocument();
  });

  it('should clear individual filters', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Add search query
    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    // Clear the search filter
    const clearButton = screen.getByRole('button', { name: '' }); // X button
    await user.click(clearButton);

    expect(mockOnFilteredResults).toHaveBeenCalledWith(mockCitations);
  });

  it('should clear all filters', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    // Add search query
    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    // Open filters
    const filterButton = screen.getByTestId('filter-button');
    await user.click(filterButton);

    // Clear all filters
    const clearAllButton = screen.getByText('Clear all');
    await user.click(clearAllButton);

    expect(mockOnFilteredResults).toHaveBeenCalledWith(mockCitations);
  });

  it('should display results count', () => {
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    expect(screen.getByText('4 of 4 citations')).toBeInTheDocument();
  });

  it('should update results count when filtered', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'cardiac');

    expect(screen.getByText('1 of 4 citations')).toBeInTheDocument();
  });

  it('should handle empty search results', async () => {
    const user = userEvent.setup();
    render(
      <CitationSearch 
        citations={mockCitations} 
        onFilteredResults={mockOnFilteredResults}
      />
    );

    const searchInput = screen.getByPlaceholderText('Search citations...');
    await user.type(searchInput, 'nonexistent');

    expect(screen.getByText('0 of 4 citations')).toBeInTheDocument();
    expect(mockOnFilteredResults).toHaveBeenCalledWith([]);
  });
});