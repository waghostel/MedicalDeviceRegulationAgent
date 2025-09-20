import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClassificationWidget } from '@/components/dashboard/ClassificationWidget';
import { DeviceClassification } from '@/types/classification';

const mockClassification: DeviceClassification = {
  id: '1',
  projectId: 'project-1',
  deviceClass: 'II',
  productCode: 'DQO',
  regulatoryPathway: '510k',
  cfrSections: ['21 CFR 870.2300'],
  confidenceScore: 0.85,
  reasoning:
    'Device matches existing Class II cardiac monitors with similar intended use',
  sources: [
    {
      url: 'https://www.fda.gov/medical-devices/classify-your-medical-device/device-classification',
      title: 'FDA Device Classification Database',
      effectiveDate: '2024-01-01',
      documentType: 'FDA_DATABASE',
      accessedDate: '2024-01-15',
    },
  ],
  createdAt: new Date('2024-01-01'),
};

const mockOnStartClassification = jest.fn();
const mockOnViewDetails = jest.fn();

describe('ClassificationWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pending state correctly', () => {
    render(
      <ClassificationWidget
        classification={null}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Device Classification')).toBeInTheDocument();
    expect(screen.getByText('Start Classification')).toBeInTheDocument();
    expect(screen.queryByText('Class II')).not.toBeInTheDocument();
  });

  it('renders completed classification correctly', () => {
    render(
      <ClassificationWidget
        classification={mockClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText('Device Classification')).toBeInTheDocument();
    expect(screen.getByText('Class II')).toBeInTheDocument();
    expect(screen.getByText('Product Code: DQO')).toBeInTheDocument();
    expect(screen.getByText('Regulatory Pathway: 510(k)')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument(); // Confidence score
  });

  it('displays confidence score with correct progress bar', () => {
    render(
      <ClassificationWidget
        classification={mockClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '85');
    expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });

  it('calls onStartClassification when start button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ClassificationWidget
        classification={null}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const startButton = screen.getByText('Start Classification');
    await user.click(startButton);

    expect(mockOnStartClassification).toHaveBeenCalledTimes(1);
  });

  it('calls onViewDetails when view details button is clicked', async () => {
    const user = userEvent.setup();

    render(
      <ClassificationWidget
        classification={mockClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const viewDetailsButton = screen.getByText('View Details');
    await user.click(viewDetailsButton);

    expect(mockOnViewDetails).toHaveBeenCalledWith(mockClassification.id);
  });

  it('displays CFR sections correctly', () => {
    const multiCfrClassification = {
      ...mockClassification,
      cfrSections: ['21 CFR 870.2300', '21 CFR 870.2310'],
    };

    render(
      <ClassificationWidget
        classification={multiCfrClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(
      screen.getByText('21 CFR 870.2300, 21 CFR 870.2310')
    ).toBeInTheDocument();
  });

  it('handles low confidence scores with warning styling', () => {
    const lowConfidenceClassification = {
      ...mockClassification,
      confidenceScore: 0.45,
    };

    render(
      <ClassificationWidget
        classification={lowConfidenceClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const confidenceIndicator = screen.getByTestId('confidence-indicator');
    expect(confidenceIndicator).toHaveClass('text-yellow-600'); // Warning color for low confidence
  });

  it('handles very low confidence scores with error styling', () => {
    const veryLowConfidenceClassification = {
      ...mockClassification,
      confidenceScore: 0.25,
    };

    render(
      <ClassificationWidget
        classification={veryLowConfidenceClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const confidenceIndicator = screen.getByTestId('confidence-indicator');
    expect(confidenceIndicator).toHaveClass('text-red-600'); // Error color for very low confidence
  });

  it('displays loading state correctly', () => {
    render(
      <ClassificationWidget
        classification={null}
        isLoading={true}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByTestId('classification-loading')).toBeInTheDocument();
    expect(screen.getByText('Classifying device...')).toBeInTheDocument();
  });

  it('displays error state correctly', () => {
    const errorMessage = 'Failed to classify device. Please try again.';

    render(
      <ClassificationWidget
        classification={null}
        error={errorMessage}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(screen.getByText(errorMessage)).toBeInTheDocument();
    expect(screen.getByText('Retry Classification')).toBeInTheDocument();
  });

  it('is accessible with proper ARIA labels', () => {
    render(
      <ClassificationWidget
        classification={mockClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const widget = screen.getByRole('region');
    expect(widget).toHaveAttribute(
      'aria-label',
      'Device Classification Status'
    );

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute(
      'aria-label',
      'Classification confidence: 85%'
    );
  });

  it('handles keyboard navigation correctly', async () => {
    const user = userEvent.setup();

    render(
      <ClassificationWidget
        classification={null}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const startButton = screen.getByText('Start Classification');

    // Tab to button and press Enter
    await user.tab();
    expect(startButton).toHaveFocus();

    await user.keyboard('{Enter}');
    expect(mockOnStartClassification).toHaveBeenCalledTimes(1);
  });

  it('displays device class with correct styling', () => {
    const classIIIClassification = {
      ...mockClassification,
      deviceClass: 'III' as const,
    };

    render(
      <ClassificationWidget
        classification={classIIIClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    const classIIIBadge = screen.getByText('Class III');
    expect(classIIIBadge).toHaveClass('bg-red-100'); // High-risk class styling
  });

  it('truncates long reasoning text with expand option', () => {
    const longReasoningClassification = {
      ...mockClassification,
      reasoning:
        'This is a very long reasoning text that should be truncated initially but can be expanded to show the full content when the user clicks the expand button or link.',
    };

    render(
      <ClassificationWidget
        classification={longReasoningClassification}
        onStartClassification={mockOnStartClassification}
        onViewDetails={mockOnViewDetails}
      />
    );

    expect(
      screen.getByText(/This is a very long reasoning text/)
    ).toBeInTheDocument();
    expect(screen.getByText('Show more')).toBeInTheDocument();
  });
});
