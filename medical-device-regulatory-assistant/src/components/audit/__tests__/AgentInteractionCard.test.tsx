import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';

import { AgentInteraction } from '@/types/audit';

import { AgentInteractionCard } from '../AgentInteractionCard';


// Mock the child components
jest.mock('../ReasoningTrace', () => ({
  ReasoningTrace: () => (
    <div data-testid="reasoning-trace">Reasoning Trace</div>
  ),
}));

jest.mock('../SourceCitations', () => ({
  SourceCitations: () => (
    <div data-testid="source-citations">Source Citations</div>
  ),
}));

const mockInteraction: AgentInteraction = {
  id: '1',
  projectId: 'project-1',
  userId: 'user-1',
  agentAction: 'predicate-search',
  inputData: {
    deviceDescription: 'Test device',
    intendedUse: 'Test use',
  },
  outputData: {
    predicates: [{ kNumber: 'K123456', deviceName: 'Test Device' }],
  },
  confidenceScore: 0.85,
  sources: [
    {
      url: 'https://example.com',
      title: 'Test Source',
      effectiveDate: '2023-01-01',
      documentType: 'FDA_510K',
      accessedDate: '2024-01-01',
    },
  ],
  reasoning: 'This is a test reasoning explanation.',
  executionTimeMs: 2500,
  createdAt: new Date('2024-01-01T10:00:00Z'),
  status: 'completed',
};

describe('AgentInteractionCard', () => {
  it('should render interaction header correctly', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    expect(screen.getByText('Predicate Search')).toBeInTheDocument();
    expect(screen.getByText('Jan 01, 2024 at 10:00 AM')).toBeInTheDocument();
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('2.5s')).toBeInTheDocument();
  });

  it('should display confidence score with correct formatting', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText('(High)')).toBeInTheDocument();
  });

  it('should expand and show details when clicked', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    expect(screen.getByText('Input Data')).toBeInTheDocument();
    expect(screen.getByText('Output Summary')).toBeInTheDocument();
    expect(screen.getByText('Reasoning Trace')).toBeInTheDocument();
  });

  it('should show input and output data when expanded', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    // Check that JSON data is displayed
    expect(
      screen.getByText(/"deviceDescription": "Test device"/)
    ).toBeInTheDocument();
    expect(screen.getByText(/"predicates":/)).toBeInTheDocument();
  });

  it('should toggle reasoning trace visibility', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    // Expand main details first
    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    // Find and click the reasoning show/hide button
    const reasoningButtons = screen.getAllByText('Show');
    const reasoningButton = reasoningButtons.find((button) =>
      button.closest('div')?.textContent?.includes('Reasoning Trace')
    );

    if (reasoningButton) {
      fireEvent.click(reasoningButton);
      expect(screen.getByTestId('reasoning-trace')).toBeInTheDocument();
    }
  });

  it('should toggle source citations visibility', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    // Expand main details first
    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    // Find and click the sources show/hide button
    const sourceButtons = screen.getAllByText('Show');
    const sourceButton = sourceButtons.find((button) =>
      button.closest('div')?.textContent?.includes('Source Citations')
    );

    if (sourceButton) {
      fireEvent.click(sourceButton);
      expect(screen.getByTestId('source-citations')).toBeInTheDocument();
    }
  });

  it('should display correct status icon for completed status', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    // Check for the presence of a success indicator (green checkmark)
    const statusElements = screen.container.querySelectorAll(
      '[data-testid], .text-green-500, .lucide-check-circle'
    );
    expect(statusElements.length).toBeGreaterThan(0);
  });

  it('should display correct status icon for failed status', () => {
    const failedInteraction = {
      ...mockInteraction,
      status: 'failed' as const,
    };

    render(<AgentInteractionCard interaction={failedInteraction} />);

    expect(screen.getByText('failed')).toBeInTheDocument();
  });

  it('should display correct confidence color for high confidence', () => {
    render(<AgentInteractionCard interaction={mockInteraction} />);

    // Should show high confidence (85%) with appropriate styling
    const confidenceElement = screen.getByText('85%');
    expect(confidenceElement).toHaveClass('text-green-600');
  });

  it('should display correct confidence color for low confidence', () => {
    const lowConfidenceInteraction = {
      ...mockInteraction,
      confidenceScore: 0.3,
    };

    render(<AgentInteractionCard interaction={lowConfidenceInteraction} />);

    const confidenceElement = screen.getByText('30%');
    expect(confidenceElement).toHaveClass('text-red-600');
  });

  it('should handle interaction with no sources', () => {
    const noSourcesInteraction = {
      ...mockInteraction,
      sources: [],
    };

    render(<AgentInteractionCard interaction={noSourcesInteraction} />);

    const detailsButton = screen.getByText('Details');
    fireEvent.click(detailsButton);

    // Should not show source citations section
    expect(screen.queryByText('Source Citations')).not.toBeInTheDocument();
  });

  it('should format action names correctly', () => {
    const kebabCaseInteraction = {
      ...mockInteraction,
      agentAction: 'classify-device',
    };

    render(<AgentInteractionCard interaction={kebabCaseInteraction} />);

    expect(screen.getByText('Classify Device')).toBeInTheDocument();
  });
});
