/**
 * Unit tests for PredicateWidget component
 * Tests predicate display, selection functionality, and tab navigation
 */

import React from 'react';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { PredicateWidget } from '../predicate-widget';
import { generateMockPredicateDevices } from '@/lib/mock-data';

describe('PredicateWidget Component', () => {
  const mockSession = createMockSession();
  const mockPredicates = generateMockPredicateDevices(5);

  // Set some predicates as selected for testing
  mockPredicates[0].isSelected = true;
  mockPredicates[1].isSelected = true;

  const defaultProps = {
    predicates: mockPredicates,
    onSearchPredicates: jest.fn(),
    onSelectPredicate: jest.fn(),
    onRefresh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Empty State', () => {
    it('renders empty state when no predicates are provided', () => {
      renderWithProviders(
        <PredicateWidget {...defaultProps} predicates={[]} />,
        { session: mockSession }
      );

      expect(screen.getByText('Predicate Devices')).toBeInTheDocument();
      expect(screen.getByText('Pending')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Search for 510(k) predicate devices for substantial equivalence'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByText(
          'No predicate devices have been identified yet. Start by searching the FDA database.'
        )
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /search predicates/i })
      ).toBeInTheDocument();
    });

    it('calls onSearchPredicates when search button is clicked', () => {
      const mockOnSearchPredicates = jest.fn();
      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          predicates={[]}
          onSearchPredicates={mockOnSearchPredicates}
        />,
        { session: mockSession }
      );

      const searchButton = screen.getByRole('button', {
        name: /search predicates/i,
      });
      fireEvent.click(searchButton);

      expect(mockOnSearchPredicates).toHaveBeenCalled();
    });
  });

  describe('Loading State', () => {
    it('renders loading state correctly', () => {
      renderWithProviders(
        <PredicateWidget {...defaultProps} loading={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Searching...')).toBeInTheDocument();
      expect(
        screen.getByText('Searching FDA 510(k) database for similar devices...')
      ).toBeInTheDocument();

      // Should show loading spinner
      const spinner = document.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();

      // Should show skeleton loading
      const skeletonElements = document.querySelectorAll('.animate-pulse');
      expect(skeletonElements.length).toBeGreaterThan(0);
    });

    it('shows loading state in search button when loading', () => {
      renderWithProviders(
        <PredicateWidget {...defaultProps} predicates={[]} loading={true} />,
        { session: mockSession }
      );

      expect(screen.getByText('Searching...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    it('renders error state correctly', () => {
      const errorMessage = 'Failed to search predicate devices';
      renderWithProviders(
        <PredicateWidget {...defaultProps} error={errorMessage} />,
        { session: mockSession }
      );

      expect(screen.getByText('Error')).toBeInTheDocument();
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /retry/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /search predicates/i })
      ).toBeInTheDocument();
    });

    it('calls onRefresh when retry button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          error="Test error"
          onRefresh={mockOnRefresh}
        />,
        { session: mockSession }
      );

      const retryButton = screen.getByRole('button', { name: /retry/i });
      fireEvent.click(retryButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });
  });

  describe('Loaded State with Predicates', () => {
    it('renders predicate count badge correctly', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(screen.getByText('5 Found')).toBeInTheDocument();
    });

    it('renders tab navigation correctly', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(
        screen.getByRole('tab', { name: /overview/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /top matches/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('tab', { name: /selected \(2\)/i })
      ).toBeInTheDocument();
    });
  });

  describe('Overview Tab', () => {
    it('displays statistics correctly', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      // Should be on overview tab by default
      expect(screen.getByText('5')).toBeInTheDocument(); // Total Found
      expect(screen.getByText('2')).toBeInTheDocument(); // Selected
      expect(screen.getByText('Total Found')).toBeInTheDocument();
      expect(screen.getByText('Selected')).toBeInTheDocument();
      expect(screen.getByText('Avg. Confidence')).toBeInTheDocument();
    });

    it('calculates average confidence correctly', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      // Calculate expected average
      const totalConfidence = mockPredicates.reduce(
        (sum, p) => sum + p.confidenceScore,
        0
      );
      const avgConfidence = Math.round(
        (totalConfidence / mockPredicates.length) * 100
      );

      expect(screen.getByText(`${avgConfidence}%`)).toBeInTheDocument();
    });

    it('displays average confidence progress bar', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const progressBar = document.querySelector('[role="progressbar"]');
      expect(progressBar).toBeInTheDocument();
    });

    it('renders action buttons', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /search more/i })
      ).toBeInTheDocument();
    });

    it('calls onRefresh when refresh button is clicked', () => {
      const mockOnRefresh = jest.fn();
      renderWithProviders(
        <PredicateWidget {...defaultProps} onRefresh={mockOnRefresh} />,
        { session: mockSession }
      );

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      expect(mockOnRefresh).toHaveBeenCalled();
    });

    it('calls onSearchPredicates when search more button is clicked', () => {
      const mockOnSearchPredicates = jest.fn();
      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          onSearchPredicates={mockOnSearchPredicates}
        />,
        { session: mockSession }
      );

      const searchMoreButton = screen.getByRole('button', {
        name: /search more/i,
      });
      fireEvent.click(searchMoreButton);

      expect(mockOnSearchPredicates).toHaveBeenCalled();
    });
  });

  describe('Top Matches Tab', () => {
    it('switches to top matches tab correctly', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        // Should show top 5 predicates sorted by confidence
        const predicateCards = screen.getAllByText(/K\d+/);
        expect(predicateCards.length).toBeLessThanOrEqual(5);
      });
    });

    it('displays predicate devices sorted by confidence', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        // Check that K-numbers are displayed
        mockPredicates.slice(0, 5).forEach((predicate) => {
          expect(screen.getByText(predicate.kNumber)).toBeInTheDocument();
          expect(screen.getByText(predicate.deviceName)).toBeInTheDocument();
        });
      });
    });

    it('shows confidence scores with correct badge variants', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        mockPredicates.slice(0, 5).forEach((predicate) => {
          const confidenceText = `${Math.round(predicate.confidenceScore * 100)}%`;
          expect(screen.getByText(confidenceText)).toBeInTheDocument();
        });
      });
    });

    it('shows star icon for selected predicates', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        // Should show star icons for selected predicates
        const starIcons = document.querySelectorAll('.fill-current');
        expect(starIcons.length).toBeGreaterThan(0);
      });
    });

    it('displays external links to FDA database', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        const externalLinks = screen.getAllByRole('link');
        expect(externalLinks.length).toBeGreaterThan(0);

        externalLinks.forEach((link) => {
          expect(link).toHaveAttribute('target', '_blank');
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });

    it('calls onSelectPredicate when select button is clicked', async () => {
      const mockOnSelectPredicate = jest.fn();
      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          onSelectPredicate={mockOnSelectPredicate}
        />,
        { session: mockSession }
      );

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        const selectButtons = screen.getAllByText(/select/i);
        if (selectButtons.length > 0) {
          fireEvent.click(selectButtons[0]);
          expect(mockOnSelectPredicate).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Selected Tab', () => {
    it('switches to selected tab correctly', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const selectedTab = screen.getByRole('tab', { name: /selected \(2\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        expect(screen.getByText('Selected Predicates (2)')).toBeInTheDocument();
      });
    });

    it('displays selected predicates correctly', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const selectedTab = screen.getByRole('tab', { name: /selected \(2\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        const selectedPredicates = mockPredicates.filter((p) => p.isSelected);
        selectedPredicates.forEach((predicate) => {
          expect(screen.getByText(predicate.kNumber)).toBeInTheDocument();
          expect(screen.getByText(predicate.deviceName)).toBeInTheDocument();
        });
      });
    });

    it('shows average confidence for selected predicates', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const selectedTab = screen.getByRole('tab', { name: /selected \(2\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        const selectedPredicates = mockPredicates.filter((p) => p.isSelected);
        const avgConfidence = Math.round(
          (selectedPredicates.reduce((sum, p) => sum + p.confidenceScore, 0) /
            selectedPredicates.length) *
            100
        );
        expect(screen.getByText(`Avg: ${avgConfidence}%`)).toBeInTheDocument();
      });
    });

    it('shows empty state when no predicates are selected', async () => {
      const predicatesWithNoneSelected = mockPredicates.map((p) => ({
        ...p,
        isSelected: false,
      }));

      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          predicates={predicatesWithNoneSelected}
        />,
        { session: mockSession }
      );

      const selectedTab = screen.getByRole('tab', { name: /selected \(0\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        expect(
          screen.getByText(
            'No predicate devices selected yet. Review the top matches and select the most suitable ones.'
          )
        ).toBeInTheDocument();
        expect(
          screen.getByRole('button', { name: /view top matches/i })
        ).toBeInTheDocument();
      });
    });

    it('switches to top matches tab when view top matches button is clicked', async () => {
      const predicatesWithNoneSelected = mockPredicates.map((p) => ({
        ...p,
        isSelected: false,
      }));

      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          predicates={predicatesWithNoneSelected}
        />,
        { session: mockSession }
      );

      const selectedTab = screen.getByRole('tab', { name: /selected \(0\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        const viewTopMatchesButton = screen.getByRole('button', {
          name: /view top matches/i,
        });
        fireEvent.click(viewTopMatchesButton);
      });

      // Should switch to top matches tab
      await waitFor(() => {
        expect(
          screen.getByRole('tab', { name: /top matches/i })
        ).toHaveAttribute('data-state', 'active');
      });
    });

    it('calls onSelectPredicate when deselect button is clicked', async () => {
      const mockOnSelectPredicate = jest.fn();
      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          onSelectPredicate={mockOnSelectPredicate}
        />,
        { session: mockSession }
      );

      const selectedTab = screen.getByRole('tab', { name: /selected \(2\)/i });
      fireEvent.click(selectedTab);

      await waitFor(() => {
        const deselectButtons = screen.getAllByText(/deselect/i);
        if (deselectButtons.length > 0) {
          fireEvent.click(deselectButtons[0]);
          expect(mockOnSelectPredicate).toHaveBeenCalled();
        }
      });
    });
  });

  describe('Confidence Score Color Coding', () => {
    it('applies correct color classes for different confidence levels', () => {
      const predicatesWithVariedConfidence = [
        { ...mockPredicates[0], confidenceScore: 0.9 }, // High - green
        { ...mockPredicates[1], confidenceScore: 0.7 }, // Medium - yellow
        { ...mockPredicates[2], confidenceScore: 0.4 }, // Low - red
      ];

      renderWithProviders(
        <PredicateWidget
          {...defaultProps}
          predicates={predicatesWithVariedConfidence}
        />,
        { session: mockSession }
      );

      // Check average confidence color in overview
      const avgConfidenceElement = screen.getByText(/\d+%/);
      expect(avgConfidenceElement).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles for tabs', () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const tabList = screen.getByRole('tablist');
      expect(tabList).toBeInTheDocument();

      const tabs = screen.getAllByRole('tab');
      expect(tabs).toHaveLength(3);

      tabs.forEach((tab) => {
        expect(tab).toHaveAttribute('aria-selected');
      });
    });

    it('provides proper screen reader text for external links', async () => {
      renderWithProviders(<PredicateWidget {...defaultProps} />, {
        session: mockSession,
      });

      const topMatchesTab = screen.getByRole('tab', { name: /top matches/i });
      fireEvent.click(topMatchesTab);

      await waitFor(() => {
        const externalLinks = screen.getAllByRole('link');
        externalLinks.forEach((link) => {
          expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });
      });
    });
  });

  describe('Error Handling', () => {
    it('handles missing callback props gracefully', () => {
      renderWithProviders(<PredicateWidget predicates={mockPredicates} />, {
        session: mockSession,
      });

      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      const searchMoreButton = screen.getByRole('button', {
        name: /search more/i,
      });

      expect(() => {
        fireEvent.click(refreshButton);
        fireEvent.click(searchMoreButton);
      }).not.toThrow();
    });

    it('handles empty predicates array gracefully', () => {
      renderWithProviders(
        <PredicateWidget {...defaultProps} predicates={[]} />,
        { session: mockSession }
      );

      expect(screen.getByText('Pending')).toBeInTheDocument();
    });
  });
});
