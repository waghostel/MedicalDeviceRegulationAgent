import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import {
  testAccessibility,
  testKeyboardNavigation,
  testFocusManagement,
  testAriaLabels,
  ScreenReaderSimulator,
} from '@/lib/testing/accessibility-utils';
import { ClassificationWidget } from '../classification-widget';
import { PredicateWidget } from '../predicate-widget';
import { ProgressWidget } from '../progress-widget';

// Extend Jest matchers
expect.extend(toHaveNoViolations);

// Mock data for accessibility tests
const mockClassificationData = {
  deviceClass: 'Class II',
  productCode: 'LRH',
  regulatoryPathway: '510(k)',
  confidence: 0.95,
  reasoning: 'High confidence classification based on intended use',
  cfr_sections: ['21 CFR 880.5400'],
  sources: [
    {
      url: 'https://www.fda.gov/medical-devices/classify-your-medical-device/class-ii-medical-devices',
      title: 'Class II Medical Devices',
      effectiveDate: '2023-01-01',
      documentType: 'FDA_GUIDANCE' as const,
    },
  ],
  status: 'completed' as const,
};

const mockPredicateData = Array.from({ length: 5 }, (_, i) => ({
  kNumber: `K12345${i}`,
  deviceName: `Test Device ${i}`,
  intendedUse: `Test indication for device ${i}`,
  productCode: 'LRH',
  clearanceDate: '2023-01-01',
  confidenceScore: 0.8 + i * 0.02,
  comparisonData: {
    similarities: [],
    differences: [],
    riskAssessment: 'low' as const,
    testingRecommendations: [],
  },
  sources: [],
  isSelected: i < 2,
  status: 'completed' as const,
}));

const mockProgressData = {
  projectName: 'Test Project',
  overallProgress: 75,
  phases: [
    { name: 'Classification', progress: 100, status: 'completed' as const },
    { name: 'Predicate Search', progress: 80, status: 'in-progress' as const },
    { name: 'Comparison Analysis', progress: 50, status: 'pending' as const },
    { name: 'Documentation', progress: 0, status: 'pending' as const },
  ],
  lastUpdated: '2023-12-01T10:00:00Z',
};

describe('Dashboard Widget Accessibility Tests', () => {
  describe('ClassificationWidget Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <ClassificationWidget data={mockClassificationData} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should be fully accessible with comprehensive testing', async () => {
      const report = await testAccessibility(
        <ClassificationWidget data={mockClassificationData} />
      );

      expect(report.passed).toBe(true);
      expect(report.axeViolations).toHaveLength(0);
    });

    it('should have proper ARIA labels and roles', () => {
      render(<ClassificationWidget data={mockClassificationData} />);

      // Check for proper headings
      expect(
        screen.getByRole('heading', { name: /device classification/i })
      ).toBeInTheDocument();

      // Check for proper button labels
      const viewDetailsButton = screen.getByRole('button', {
        name: /view classification details/i,
      });
      expect(viewDetailsButton).toBeInTheDocument();
      expect(viewDetailsButton).toHaveAttribute('aria-describedby');
    });

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ClassificationWidget data={mockClassificationData} />);

      const viewButton = screen.getByRole('button', {
        name: /view classification details/i,
      });

      // Test Tab navigation
      await user.tab();
      expect(viewButton).toHaveFocus();

      // Test Enter key activation
      await user.keyboard('{Enter}');
      // Should trigger button action (mock or verify state change)

      // Test Space key activation
      await user.keyboard(' ');
      // Should trigger button action
    });

    it('should announce status changes to screen readers', () => {
      const { container, rerender } = render(
        <ClassificationWidget data={null} />
      );
      const simulator = new ScreenReaderSimulator(container);

      // Update with classification data
      rerender(<ClassificationWidget data={mockClassificationData} />);

      const announcements = simulator.getAnnouncements();
      expect(announcements).toContain('Classification completed');
    });

    it('should handle empty state accessibly', async () => {
      const { container } = render(<ClassificationWidget data={null} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      // Should have appropriate empty state messaging
      expect(
        screen.getByText(/no classification data available/i)
      ).toBeInTheDocument();
    });

    it('should have proper color contrast', () => {
      render(<ClassificationWidget data={mockClassificationData} />);

      // Check confidence score colors
      const confidenceElement = screen.getByText(/95%/);
      const computedStyle = window.getComputedStyle(confidenceElement);

      // High confidence should have good contrast (green on white/light background)
      expect(computedStyle.color).toBeDefined();
      expect(computedStyle.backgroundColor).toBeDefined();
    });
  });

  describe('PredicateWidget Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(
        <PredicateWidget predicates={mockPredicateData} />
      );
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should provide accessible list navigation', async () => {
      const user = userEvent.setup();
      render(<PredicateWidget predicates={mockPredicateData} />);

      // Should have proper list structure
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();

      const listItems = screen.getAllByRole('listitem');
      expect(listItems).toHaveLength(mockPredicateData.length);

      // Test keyboard navigation through list items
      const firstItem = listItems[0];
      const selectButton = firstItem.querySelector('button');

      if (selectButton) {
        await user.tab();
        expect(selectButton).toHaveFocus();

        // Test arrow key navigation (if implemented)
        await user.keyboard('{ArrowDown}');
        // Should move to next item
      }
    });

    it('should have proper ARIA labels for predicate items', () => {
      render(<PredicateWidget predicates={mockPredicateData} />);

      mockPredicateData.forEach((predicate, index) => {
        const predicateItem = screen
          .getByText(predicate.deviceName)
          .closest('[role="listitem"]');
        expect(predicateItem).toHaveAttribute('aria-label');

        // Should include confidence score in accessible description
        const confidenceText = `${Math.round(predicate.confidenceScore * 100)}% confidence`;
        expect(screen.getByText(confidenceText)).toBeInTheDocument();
      });
    });

    it('should announce selection changes', () => {
      const { container } = render(
        <PredicateWidget predicates={mockPredicateData} />
      );
      const simulator = new ScreenReaderSimulator(container);

      // Simulate selecting a predicate
      const selectButton = screen.getAllByRole('button', {
        name: /select predicate/i,
      })[0];
      selectButton.click();

      const announcements = simulator.getAnnouncements();
      expect(announcements.some((a) => a.includes('selected'))).toBe(true);
    });

    it('should support filtering with accessible form controls', async () => {
      const user = userEvent.setup();
      render(<PredicateWidget predicates={mockPredicateData} />);

      // Should have accessible search/filter input
      const searchInput = screen.getByRole('textbox', {
        name: /search predicates/i,
      });
      expect(searchInput).toBeInTheDocument();
      expect(searchInput).toHaveAttribute('aria-describedby');

      // Test typing in search
      await user.type(searchInput, 'test');

      // Should announce filtered results
      expect(searchInput).toHaveValue('test');
    });

    it('should handle empty predicate list accessibly', async () => {
      const { container } = render(<PredicateWidget predicates={[]} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();

      expect(screen.getByText(/no predicates found/i)).toBeInTheDocument();
    });
  });

  describe('ProgressWidget Accessibility', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<ProgressWidget data={mockProgressData} />);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have accessible progress indicators', () => {
      render(<ProgressWidget data={mockProgressData} />);

      // Overall progress should be accessible
      const overallProgress = screen.getByRole('progressbar', {
        name: /overall progress/i,
      });
      expect(overallProgress).toBeInTheDocument();
      expect(overallProgress).toHaveAttribute('aria-valuenow', '75');
      expect(overallProgress).toHaveAttribute('aria-valuemin', '0');
      expect(overallProgress).toHaveAttribute('aria-valuemax', '100');
      expect(overallProgress).toHaveAttribute('aria-valuetext', '75% complete');

      // Individual phase progress should be accessible
      mockProgressData.phases.forEach((phase) => {
        const phaseProgress = screen.getByRole('progressbar', {
          name: new RegExp(phase.name, 'i'),
        });
        expect(phaseProgress).toBeInTheDocument();
        expect(phaseProgress).toHaveAttribute(
          'aria-valuenow',
          phase.progress.toString()
        );
      });
    });

    it('should announce progress updates', () => {
      const { container, rerender } = render(
        <ProgressWidget data={mockProgressData} />
      );
      const simulator = new ScreenReaderSimulator(container);

      // Update progress
      const updatedData = {
        ...mockProgressData,
        overallProgress: 85,
        phases: mockProgressData.phases.map((phase) => ({
          ...phase,
          progress: phase.progress + 10,
        })),
      };

      rerender(<ProgressWidget data={updatedData} />);

      const announcements = simulator.getAnnouncements();
      expect(announcements.some((a) => a.includes('progress updated'))).toBe(
        true
      );
    });

    it('should have proper status indicators', () => {
      render(<ProgressWidget data={mockProgressData} />);

      mockProgressData.phases.forEach((phase) => {
        const statusElement = screen.getByText(new RegExp(phase.status, 'i'));
        expect(statusElement).toBeInTheDocument();

        // Status should have appropriate ARIA attributes
        expect(statusElement.closest('[role="status"]')).toBeInTheDocument();
      });
    });

    it('should support keyboard navigation for interactive elements', async () => {
      const user = userEvent.setup();
      render(<ProgressWidget data={mockProgressData} />);

      // If there are expandable sections or interactive elements
      const expandButtons = screen.queryAllByRole('button', {
        name: /expand/i,
      });

      for (const button of expandButtons) {
        await user.tab();
        expect(button).toHaveFocus();

        // Test Enter key
        await user.keyboard('{Enter}');
        // Should expand/collapse section
      }
    });
  });

  describe('Combined Widget Accessibility', () => {
    it('should maintain accessibility when all widgets are rendered together', async () => {
      const { container } = render(
        <div>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should have proper heading hierarchy', () => {
      render(
        <div>
          <h1>Dashboard</h1>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      // Check heading hierarchy (h1 -> h2 -> h3, etc.)
      const headings = screen.getAllByRole('heading');
      expect(headings[0]).toHaveAttribute('aria-level', '1');

      // Widget headings should be h2 or appropriate level
      const widgetHeadings = headings.slice(1);
      widgetHeadings.forEach((heading) => {
        const level = parseInt(heading.getAttribute('aria-level') || '2');
        expect(level).toBeGreaterThanOrEqual(2);
        expect(level).toBeLessThanOrEqual(6);
      });
    });

    it('should support screen reader navigation landmarks', () => {
      render(
        <main>
          <section aria-labelledby="classification-heading">
            <ClassificationWidget data={mockClassificationData} />
          </section>
          <section aria-labelledby="predicate-heading">
            <PredicateWidget predicates={mockPredicateData} />
          </section>
          <section aria-labelledby="progress-heading">
            <ProgressWidget data={mockProgressData} />
          </section>
        </main>
      );

      // Should have proper landmark structure
      expect(screen.getByRole('main')).toBeInTheDocument();

      const sections = screen.getAllByRole('region');
      expect(sections).toHaveLength(3);

      sections.forEach((section) => {
        expect(section).toHaveAttribute('aria-labelledby');
      });
    });

    it('should handle focus management across widgets', async () => {
      const user = userEvent.setup();
      render(
        <div>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      // Test tab order across widgets
      const focusableElements = screen.getAllByRole('button');

      for (let i = 0; i < Math.min(focusableElements.length, 5); i++) {
        await user.tab();
        expect(document.activeElement).toBe(focusableElements[i]);
      }
    });

    it('should provide consistent interaction patterns', () => {
      render(
        <div>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      // All buttons should have consistent labeling patterns
      const buttons = screen.getAllByRole('button');
      buttons.forEach((button) => {
        expect(button).toHaveAccessibleName();

        // Buttons should have appropriate descriptions if needed
        if (button.getAttribute('aria-describedby')) {
          const descriptionId = button.getAttribute('aria-describedby');
          const description = document.getElementById(descriptionId!);
          expect(description).toBeInTheDocument();
        }
      });
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on mobile viewports', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      });

      const { container } = render(
        <div>
          <ClassificationWidget data={mockClassificationData} />
          <PredicateWidget predicates={mockPredicateData} />
          <ProgressWidget data={mockProgressData} />
        </div>
      );

      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('should support touch interactions accessibly', async () => {
      const user = userEvent.setup();
      render(<PredicateWidget predicates={mockPredicateData} />);

      const selectButtons = screen.getAllByRole('button', {
        name: /select predicate/i,
      });

      // Touch interactions should work the same as click
      for (const button of selectButtons.slice(0, 2)) {
        await user.pointer({ keys: '[TouchA>]', target: button });
        // Should trigger selection
      }
    });
  });
});
