import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CitationExporter } from '../citation-exporter';
import { SourceCitation } from '@/types/copilot';

// Mock clipboard API
const mockWriteText = jest.fn(() => Promise.resolve());
Object.assign(navigator, {
  clipboard: {
    writeText: mockWriteText,
  },
});

// Mock URL.createObjectURL and related APIs
global.URL.createObjectURL = jest.fn(() => 'mock-url');
global.URL.revokeObjectURL = jest.fn();

// Mock document.createElement and appendChild/removeChild
const mockLink = {
  href: '',
  download: '',
  click: jest.fn(),
};

const originalCreateElement = document.createElement;
document.createElement = jest.fn((tagName) => {
  if (tagName === 'a') {
    return mockLink as any;
  }
  return originalCreateElement.call(document, tagName);
});

const mockAppendChild = jest.fn();
const mockRemoveChild = jest.fn();
document.body.appendChild = mockAppendChild;
document.body.removeChild = mockRemoveChild;

describe('CitationExporter', () => {
  const mockCitations: SourceCitation[] = [
    {
      url: 'https://www.fda.gov/medical-devices/510k-clearances/k123456',
      title: 'Cardiac Monitor 510(k) Summary',
      effectiveDate: '2023-01-15',
      documentType: 'FDA_510K',
      accessedDate: '2024-01-15',
    },
    {
      url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/software-medical-device',
      title: 'Software as Medical Device Guidance',
      effectiveDate: '2022-06-10',
      documentType: 'FDA_GUIDANCE',
      accessedDate: '2024-01-10',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    document.createElement = originalCreateElement;
  });

  it('should render disabled button when no citations', () => {
    render(<CitationExporter citations={[]} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations/i,
    });
    expect(exportButton).toBeDisabled();
  });

  it('should render enabled button with citation count', () => {
    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    expect(exportButton).toBeEnabled();
  });

  it('should open dialog when export button is clicked', async () => {
    const user = userEvent.setup();
    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    expect(screen.getByText('Export Citations')).toBeInTheDocument();
    expect(screen.getByText('Preview:')).toBeInTheDocument();
  });

  it('should display bibliography preview in APA format by default', async () => {
    const user = userEvent.setup();
    render(
      <CitationExporter citations={mockCitations} projectName="Test Project" />
    );

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const preview = screen.getByRole('textbox');
    expect(preview.value).toContain('# Bibliography - Test Project');
    expect(preview.value).toContain('**Format:** APA Style');
    expect(preview.value).toContain('U.S. Food and Drug Administration');
  });

  it('should switch to MLA format when selected', async () => {
    const user = userEvent.setup();
    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    // Change format to MLA
    const formatSelect = screen.getByRole('combobox');
    await user.click(formatSelect);

    const mlaOption = screen.getByText('MLA');
    await user.click(mlaOption);

    const preview = screen.getByRole('textbox');
    expect(preview.value).toContain('**Format:** MLA Style');
    expect(preview.value).toContain('Accessed');
  });

  it('should copy bibliography to clipboard', async () => {
    const user = userEvent.setup();
    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const copyButton = screen.getByRole('button', {
      name: /copy to clipboard/i,
    });
    await user.click(copyButton);

    expect(mockWriteText).toHaveBeenCalledWith(
      expect.stringContaining('# Bibliography - Regulatory Project')
    );
  });

  it('should download bibliography as text file', async () => {
    const user = userEvent.setup();
    render(
      <CitationExporter citations={mockCitations} projectName="Test Project" />
    );

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const downloadTextButton = screen.getByRole('button', {
      name: /download as text/i,
    });
    await user.click(downloadTextButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(expect.any(Blob));
    expect(mockLink.download).toBe('Test_Project_bibliography_apa.txt');
    expect(mockLink.click).toHaveBeenCalled();
    expect(mockAppendChild).toHaveBeenCalledWith(mockLink);
    expect(mockRemoveChild).toHaveBeenCalledWith(mockLink);
    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('mock-url');
  });

  it('should download bibliography as markdown file', async () => {
    const user = userEvent.setup();
    render(
      <CitationExporter citations={mockCitations} projectName="Test Project" />
    );

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const downloadMarkdownButton = screen.getByRole('button', {
      name: /download as markdown/i,
    });
    await user.click(downloadMarkdownButton);

    expect(global.URL.createObjectURL).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'text/markdown',
      })
    );
    expect(mockLink.download).toBe('Test_Project_bibliography_apa.md');
    expect(mockLink.click).toHaveBeenCalled();
  });

  it('should handle project names with spaces in filenames', async () => {
    const user = userEvent.setup();
    render(
      <CitationExporter
        citations={mockCitations}
        projectName="My Test Project"
      />
    );

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const downloadTextButton = screen.getByRole('button', {
      name: /download as text/i,
    });
    await user.click(downloadTextButton);

    expect(mockLink.download).toBe('My_Test_Project_bibliography_apa.txt');
  });

  it('should display citation count in dialog', async () => {
    const user = userEvent.setup();
    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    expect(screen.getByText('2 citations')).toBeInTheDocument();
  });

  it('should handle single citation count correctly', async () => {
    const user = userEvent.setup();
    render(<CitationExporter citations={[mockCitations[0]]} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(1\)/i,
    });
    await user.click(exportButton);

    expect(screen.getByText('1 citation')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(
      <CitationExporter citations={mockCitations} className="custom-class" />
    );

    const button = container.firstChild as HTMLElement;
    expect(button).toHaveClass('custom-class');
  });

  it('should generate bibliography with current date', async () => {
    const user = userEvent.setup();
    const mockDate = new Date('2024-01-15');
    jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

    render(<CitationExporter citations={mockCitations} />);

    const exportButton = screen.getByRole('button', {
      name: /export citations \(2\)/i,
    });
    await user.click(exportButton);

    const preview = screen.getByRole('textbox');
    expect(preview.value).toContain('**Generated:** 1/15/2024');

    (global.Date as any).mockRestore();
  });
});
