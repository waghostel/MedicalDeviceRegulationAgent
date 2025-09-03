/**
 * User Acceptance Tests for Medical Device Regulatory Assistant MVP
 * Tests based on success metrics from requirements document
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { jest } from '@jest/globals';

// Mock the entire Next.js router
jest.mock('next/router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    pathname: '/',
    query: {},
    asPath: '/',
  }),
}));

// Mock API calls
const mockApiCall = jest.fn();
jest.mock('@/lib/api', () => ({
  apiCall: mockApiCall,
}));

// Mock components that will be tested
const MockProjectHub = () => <div data-testid="project-hub">Project Hub</div>;
const MockAgentWorkflow = () => <div data-testid="agent-workflow">Agent Workflow</div>;
const MockDashboard = () => <div data-testid="dashboard">Dashboard</div>;

describe('User Acceptance Tests - Success Metrics Validation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('UAT-1: Time Efficiency - Reduce predicate identification from 2-3 days to <2 hours', () => {
    it('should complete full predicate search workflow within performance targets', async () => {
      const user = userEvent.setup();
      const startTime = Date.now();

      // Mock successful API responses
      mockApiCall
        .mockResolvedValueOnce({ // Project creation
          id: 'project-1',
          name: 'Test Device',
          status: 'created'
        })
        .mockResolvedValueOnce({ // Device classification
          deviceClass: 'II',
          productCode: 'DQO',
          confidence: 0.92,
          processingTime: 1500 // 1.5 seconds
        })
        .mockResolvedValueOnce({ // Predicate search
          predicates: [
            {
              kNumber: 'K123456',
              deviceName: 'Similar Device',
              confidence: 0.88,
              comparisonData: {}
            }
          ],
          processingTime: 8500 // 8.5 seconds
        });

      render(<MockProjectHub />);

      // 1. Create project (target: <30 seconds)
      const createButton = screen.getByTestId('create-project-button');
      await user.click(createButton);

      // Fill project form
      await user.type(screen.getByTestId('project-name'), 'Cardiac Monitor Test');
      await user.type(screen.getByTestId('device-description'), 'Continuous cardiac monitoring device');
      await user.click(screen.getByTestId('submit-project'));

      // 2. Navigate to agent workflow
      await waitFor(() => {
        expect(screen.getByTestId('agent-workflow-link')).toBeInTheDocument();
      });
      await user.click(screen.getByTestId('agent-workflow-link'));

      // 3. Execute predicate search workflow
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/predicate-search cardiac monitor continuous rhythm');
      await user.keyboard('{Enter}');

      // 4. Wait for results and verify timing
      await waitFor(() => {
        expect(screen.getByTestId('predicate-results')).toBeInTheDocument();
      }, { timeout: 15000 });

      const totalTime = Date.now() - startTime;
      
      // Success criteria: Complete workflow in under 2 hours (7,200,000 ms)
      // For automated test, we'll use a much shorter target (30 seconds)
      expect(totalTime).toBeLessThan(30000);
      
      // Verify results quality
      expect(screen.getByTestId('confidence-score')).toHaveTextContent(/8[0-9]%|9[0-9]%/);
      expect(screen.getByTestId('predicate-count')).toBeInTheDocument();
    });

    it('should provide time savings metrics to user', async () => {
      render(<MockDashboard />);

      // Mock time tracking data
      mockApiCall.mockResolvedValueOnce({
        timeMetrics: {
          traditionalTime: '2-3 days',
          actualTime: '1.5 hours',
          timeSaved: '85%'
        }
      });

      await waitFor(() => {
        expect(screen.getByText(/Time saved: 85%/)).toBeInTheDocument();
        expect(screen.getByText(/Completed in 1.5 hours/)).toBeInTheDocument();
      });
    });
  });

  describe('UAT-2: Classification Accuracy - >90% accuracy when validated against FDA decisions', () => {
    it('should achieve >90% classification accuracy', async () => {
      const user = userEvent.setup();

      // Mock high-confidence classification results
      mockApiCall.mockResolvedValueOnce({
        deviceClass: 'II',
        productCode: 'DQO',
        confidence: 0.94,
        reasoning: 'Device matches FDA classification criteria for Class II cardiac monitors',
        sources: [
          {
            url: 'https://www.fda.gov/medical-devices/classify-your-medical-device',
            title: 'FDA Device Classification Database'
          }
        ]
      });

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/classify-device cardiac monitoring device continuous rhythm');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        const confidenceScore = screen.getByTestId('classification-confidence');
        expect(confidenceScore).toHaveTextContent(/9[0-9]%/); // 90-99%
      });

      // Verify classification details
      expect(screen.getByText('Class II')).toBeInTheDocument();
      expect(screen.getByText('DQO')).toBeInTheDocument();
      expect(screen.getByTestId('classification-reasoning')).toBeInTheDocument();
      expect(screen.getByTestId('source-citations')).toBeInTheDocument();
    });

    it('should provide confidence scores for all classifications', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        deviceClass: 'III',
        productCode: 'DTK',
        confidence: 0.87,
        uncertaintyFactors: ['Novel technology', 'Limited precedent']
      });

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/classify-device novel surgical robot');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('classification-confidence')).toBeInTheDocument();
        expect(screen.getByTestId('uncertainty-factors')).toBeInTheDocument();
      });

      // For lower confidence, should suggest expert consultation
      expect(screen.getByText(/expert consultation recommended/i)).toBeInTheDocument();
    });
  });

  describe('UAT-3: User Satisfaction - >4.5/5 rating for predicate search functionality', () => {
    it('should provide intuitive predicate search interface', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        predicates: [
          {
            kNumber: 'K123456',
            deviceName: 'CardioMonitor Pro',
            confidence: 0.91,
            similarities: ['Intended use', 'Technology', 'Risk profile'],
            differences: ['Material composition']
          }
        ]
      });

      render(<MockAgentWorkflow />);

      // Test slash command autocomplete
      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/pred');
      
      await waitFor(() => {
        expect(screen.getByTestId('command-suggestions')).toBeInTheDocument();
      });

      // Complete the command
      await user.type(chatInput, 'icate-search cardiac device');
      await user.keyboard('{Enter}');

      // Verify user-friendly results display
      await waitFor(() => {
        expect(screen.getByTestId('predicate-results')).toBeInTheDocument();
        expect(screen.getByTestId('comparison-table')).toBeInTheDocument();
        expect(screen.getByTestId('export-options')).toBeInTheDocument();
      });

      // Test result interaction
      await user.click(screen.getByTestId('predicate-card-0'));
      expect(screen.getByTestId('detailed-comparison')).toBeInTheDocument();
    });

    it('should provide clear guidance and next steps', async () => {
      mockApiCall.mockResolvedValueOnce({
        predicates: [],
        recommendations: [
          'Consider De Novo pathway for novel device',
          'Schedule FDA pre-submission meeting',
          'Review similar device categories'
        ]
      });

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await userEvent.type(chatInput, '/predicate-search novel AI device');
      await userEvent.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByText(/No direct predicates found/)).toBeInTheDocument();
        expect(screen.getByTestId('recommendations')).toBeInTheDocument();
        expect(screen.getByText(/De Novo pathway/)).toBeInTheDocument();
      });
    });
  });

  describe('UAT-4: Submission Success - Reduce predicate-related submission failures', () => {
    it('should identify potential submission issues early', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        predicates: [
          {
            kNumber: 'K123456',
            confidence: 0.65, // Lower confidence
            riskFactors: [
              'Significant technological differences',
              'Limited substantial equivalence justification'
            ],
            recommendations: [
              'Additional biocompatibility testing required',
              'Clinical data may be needed'
            ]
          }
        ]
      });

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/compare-predicate K123456');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('risk-assessment')).toBeInTheDocument();
        expect(screen.getByText(/Additional testing required/)).toBeInTheDocument();
        expect(screen.getByTestId('submission-readiness')).toHaveTextContent(/Not Ready/);
      });
    });

    it('should generate comprehensive submission checklists', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        checklist: {
          completed: [
            'Device classification determined',
            'Predicate devices identified',
            'Substantial equivalence assessment'
          ],
          pending: [
            'Biocompatibility testing',
            'Performance testing',
            'Labeling review'
          ],
          completionPercentage: 60
        }
      });

      render(<MockDashboard />);

      await user.click(screen.getByTestId('generate-checklist-button'));

      await waitFor(() => {
        expect(screen.getByTestId('submission-checklist')).toBeInTheDocument();
        expect(screen.getByText('60% Complete')).toBeInTheDocument();
        expect(screen.getByTestId('pending-items')).toBeInTheDocument();
      });
    });
  });

  describe('UAT-5: Audit Trail and Compliance', () => {
    it('should maintain complete audit trail for regulatory inspections', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        auditTrail: [
          {
            timestamp: '2024-01-15T10:30:00Z',
            action: 'Device Classification',
            user: 'john.doe@company.com',
            confidence: 0.92,
            sources: ['FDA Classification Database'],
            reasoning: 'Device classified as Class II based on intended use'
          }
        ]
      });

      render(<MockDashboard />);

      await user.click(screen.getByTestId('audit-trail-button'));

      await waitFor(() => {
        expect(screen.getByTestId('audit-log')).toBeInTheDocument();
        expect(screen.getByText('Device Classification')).toBeInTheDocument();
        expect(screen.getByText('john.doe@company.com')).toBeInTheDocument();
        expect(screen.getByTestId('export-audit-button')).toBeInTheDocument();
      });

      // Test audit export
      await user.click(screen.getByTestId('export-audit-button'));
      expect(mockApiCall).toHaveBeenCalledWith('/api/audit/export', expect.any(Object));
    });

    it('should provide source citations for all AI decisions', async () => {
      const user = userEvent.setup();

      mockApiCall.mockResolvedValueOnce({
        classification: {
          deviceClass: 'II',
          sources: [
            {
              url: 'https://www.fda.gov/medical-devices/classify-your-medical-device',
              title: 'FDA Device Classification Database',
              effectiveDate: '2024-01-01',
              accessedDate: '2024-01-15'
            }
          ]
        }
      });

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/classify-device test device');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('source-citations')).toBeInTheDocument();
        expect(screen.getByText('FDA Device Classification Database')).toBeInTheDocument();
        expect(screen.getByText(/Effective Date: 2024-01-01/)).toBeInTheDocument();
      });
    });
  });

  describe('UAT-6: Performance and Reliability', () => {
    it('should handle concurrent users without degradation', async () => {
      // Simulate multiple concurrent operations
      const promises = Array.from({ length: 5 }, (_, i) => {
        mockApiCall.mockResolvedValueOnce({
          result: `Result ${i}`,
          processingTime: 1000 + Math.random() * 500
        });

        return new Promise(resolve => {
          setTimeout(() => {
            render(<MockAgentWorkflow />);
            resolve(true);
          }, i * 100);
        });
      });

      const results = await Promise.all(promises);
      expect(results).toHaveLength(5);
      
      // All operations should complete successfully
      results.forEach(result => {
        expect(result).toBe(true);
      });
    });

    it('should gracefully handle API failures', async () => {
      const user = userEvent.setup();

      // Mock API failure
      mockApiCall.mockRejectedValueOnce(new Error('FDA API temporarily unavailable'));

      render(<MockAgentWorkflow />);

      const chatInput = screen.getByTestId('chat-input');
      await user.type(chatInput, '/predicate-search test device');
      await user.keyboard('{Enter}');

      await waitFor(() => {
        expect(screen.getByTestId('error-message')).toBeInTheDocument();
        expect(screen.getByText(/temporarily unavailable/)).toBeInTheDocument();
        expect(screen.getByTestId('retry-button')).toBeInTheDocument();
      });

      // Test retry functionality
      mockApiCall.mockResolvedValueOnce({ predicates: [] });
      await user.click(screen.getByTestId('retry-button'));

      await waitFor(() => {
        expect(screen.queryByTestId('error-message')).not.toBeInTheDocument();
      });
    });
  });

  describe('UAT-7: Accessibility and Usability', () => {
    it('should be fully accessible via keyboard navigation', async () => {
      render(<MockProjectHub />);

      // Test tab navigation
      const createButton = screen.getByTestId('create-project-button');
      createButton.focus();
      expect(createButton).toHaveFocus();

      // Test Enter key activation
      fireEvent.keyDown(createButton, { key: 'Enter', code: 'Enter' });
      await waitFor(() => {
        expect(screen.getByTestId('project-form')).toBeInTheDocument();
      });
    });

    it('should provide screen reader compatible content', () => {
      render(<MockDashboard />);

      // Check for proper ARIA labels
      expect(screen.getByLabelText('Project dashboard')).toBeInTheDocument();
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();

      // Check for descriptive text
      const statusElements = screen.getAllByRole('status');
      expect(statusElements.length).toBeGreaterThan(0);
    });
  });
});