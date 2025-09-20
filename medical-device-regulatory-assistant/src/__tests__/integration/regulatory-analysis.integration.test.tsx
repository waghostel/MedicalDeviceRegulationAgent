/**
 * Integration tests for regulatory analysis workflows
 * Tests device classification, predicate search, comparison analysis, and agent conversations
 */

import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import { AgentWorkflowPage } from '@/components/agent/AgentWorkflowPage';
import { ClassificationWidget } from '@/components/dashboard/classification-widget';
import { PredicateWidget } from '@/components/dashboard/predicate-widget';
import {
  generateMockDeviceClassification,
  generateMockPredicateDevices,
  generateMockAgentInteraction,
  generateMockUser,
  generateMockProject,
} from '@/lib/mock-data';
import {
  setupMockAPI,
  teardownMockAPI,
  addMockHandlers,
} from '@/lib/testing/msw-utils';
import {
  renderWithProviders,
  createMockSession,
} from '@/lib/testing/test-utils';
import { ProjectContext } from '@/types/copilot';
import { DeviceClassification, PredicateDevice } from '@/types/dashboard';

// Mock CopilotKit components
jest.mock('@copilotkit/react-core', () => ({
  CopilotKit: ({ children }: any) => (
    <div data-testid="copilot-kit">{children}</div>
  ),
  CopilotChat: () => <div data-testid="copilot-chat">Chat Interface</div>,
}));

jest.mock('@copilotkit/react-ui', () => ({
  CopilotSidebar: ({ instructions }: any) => (
    <div data-testid="copilot-sidebar">
      <div data-testid="sidebar-instructions">{instructions}</div>
      <div data-testid="chat-input">
        <input placeholder="Type your message..." />
        <button>Send</button>
      </div>
    </div>
  ),
}));

// Mock hooks
jest.mock('@/hooks/useAgentExecution', () => ({
  useAgentExecution: jest.fn(() => ({
    status: { status: 'idle', message: '', progress: 0 },
    isExecuting: false,
    result: null,
    executeTask: jest.fn(),
    cancelExecution: jest.fn(),
  })),
}));

jest.mock('@/components/providers/ProjectContextProvider', () => ({
  useProjectContext: jest.fn(() => ({
    state: {
      currentProject: null,
      isLoading: false,
      availableCommands: [
        { command: '/predicate-search', description: 'Find predicate devices' },
        { command: '/classify-device', description: 'Classify device' },
        {
          command: '/compare-predicate',
          description: 'Compare with predicate',
        },
        { command: '/find-guidance', description: 'Find FDA guidance' },
      ],
    },
    setProject: jest.fn(),
    setLoading: jest.fn(),
    addMessage: jest.fn(),
  })),
}));

// Test wrapper for regulatory analysis workflows
const RegulatoryAnalysisTestWrapper: React.FC = () => {
  const [classification, setClassification] =
    React.useState<DeviceClassification | null>(null);
  const [predicates, setPredicates] = React.useState<PredicateDevice[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleStartClassification = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/1/classification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_description: 'Cardiac monitoring device',
          intended_use: 'Continuous cardiac rhythm monitoring',
        }),
      });

      if (!response.ok) {
        throw new Error('Classification failed');
      }

      const result = await response.json();
      setClassification(result);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPredicates = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/projects/1/predicates/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_description: 'Cardiac monitoring device',
          intended_use: 'Continuous cardiac rhythm monitoring',
          product_code: 'LRH',
        }),
      });

      if (!response.ok) {
        throw new Error('Predicate search failed');
      }

      const result = await response.json();
      setPredicates(result.predicates || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPredicate = (predicate: PredicateDevice) => {
    setPredicates((prev) =>
      prev.map((p) =>
        p.id === predicate.id ? { ...p, isSelected: !p.isSelected } : p
      )
    );
  };

  const handleRefresh = () => {
    setError(null);
    // Refresh logic would go here
  };

  return (
    <div data-testid="regulatory-analysis-wrapper" className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ClassificationWidget
          classification={classification}
          loading={loading}
          error={error}
          onStartClassification={handleStartClassification}
          onRefresh={handleRefresh}
        />

        <PredicateWidget
          predicates={predicates}
          loading={loading}
          error={error}
          onSearchPredicates={handleSearchPredicates}
          onSelectPredicate={handleSelectPredicate}
          onRefresh={handleRefresh}
        />
      </div>
    </div>
  );
};

describe('Regulatory Analysis Integration Tests', () => {
  const mockUser = generateMockUser();
  const mockSession = createMockSession(mockUser);

  beforeEach(() => {
    setupMockAPI();
    jest.clearAllMocks();
  });

  afterEach(() => {
    teardownMockAPI();
  });

  describe('Device Classification Workflow', () => {
    it('should perform complete device classification with mock openFDA API responses', async () => {
      const user = userEvent.setup();
      const mockClassification = generateMockDeviceClassification({
        deviceClass: 'II',
        productCode: 'LRH',
        regulatoryPathway: '510k',
        confidenceScore: 0.87,
        reasoning:
          'Device classified as Class II based on intended use and risk profile',
      });

      // Mock classification API
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/classification',
          response: mockClassification,
          delay: 2000, // Simulate processing time
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      // Initially should show pending state
      expect(
        screen.getByText('Start Classification Analysis')
      ).toBeInTheDocument();

      // Start classification
      const startBtn = screen.getByText('Start Classification Analysis');
      await user.click(startBtn);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Analyzing...')).toBeInTheDocument();
      });

      // Wait for classification to complete
      await waitFor(
        () => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
          expect(screen.getByText('Class II')).toBeInTheDocument();
          expect(screen.getByText('LRH')).toBeInTheDocument();
          expect(screen.getByText('510k')).toBeInTheDocument();
          expect(screen.getByText('87%')).toBeInTheDocument();
        },
        { timeout: 3000 }
      );

      // Verify reasoning is displayed
      expect(
        screen.getByText(/Device classified as Class II/)
      ).toBeInTheDocument();
    });

    it('should handle classification errors gracefully', async () => {
      const user = userEvent.setup();

      // Mock classification failure
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/classification',
          response: {
            error: 'Insufficient device information for classification',
          },
          error: true,
          statusCode: 400,
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      const startBtn = screen.getByText('Start Classification Analysis');
      await user.click(startBtn);

      // Should show error state
      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(
          screen.getByText(/Insufficient device information/)
        ).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });
    });

    it('should display confidence scores and regulatory pathway correctly', async () => {
      const user = userEvent.setup();
      const highConfidenceClassification = generateMockDeviceClassification({
        confidenceScore: 0.95,
        deviceClass: 'I',
        regulatoryPathway: '510k',
        cfrSections: ['21 CFR 870.2300', '21 CFR 870.2310', '21 CFR 870.2320'],
      });

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/classification',
          response: highConfidenceClassification,
          delay: 500,
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      const startBtn = screen.getByText('Start Classification Analysis');
      await user.click(startBtn);

      await waitFor(
        () => {
          // Check confidence score display
          expect(screen.getByText('95%')).toBeInTheDocument();

          // Check device class
          expect(screen.getByText('Class I')).toBeInTheDocument();

          // Check regulatory pathway
          expect(screen.getByText('510k')).toBeInTheDocument();

          // Check CFR sections (should show first 3 + more indicator)
          expect(screen.getByText('21 CFR 870.2300')).toBeInTheDocument();
          expect(screen.getByText('+0 more')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Predicate Search with Mock FDA Database Responses', () => {
    it('should search and display predicate devices with result ranking', async () => {
      const user = userEvent.setup();
      const mockPredicates = generateMockPredicateDevices(8).map(
        (p, index) => ({
          ...p,
          confidenceScore: 0.9 - index * 0.05, // Decreasing confidence scores
        })
      );

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/predicates/search',
          response: { predicates: mockPredicates, total: 8 },
          delay: 3000, // Simulate search time
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      // Initially should show pending state
      expect(screen.getByText('Search Predicates')).toBeInTheDocument();

      // Start predicate search
      const searchBtn = screen.getByText('Search Predicates');
      await user.click(searchBtn);

      // Should show searching state
      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      // Wait for search to complete
      await waitFor(
        () => {
          expect(screen.getByText('8 Found')).toBeInTheDocument();
          expect(screen.getByText('Top Matches')).toBeInTheDocument();
        },
        { timeout: 4000 }
      );

      // Check that predicates are ranked by confidence
      const topMatchesTab = screen.getByText('Top Matches');
      await user.click(topMatchesTab);

      await waitFor(() => {
        // Should show highest confidence first
        const confidenceElements = screen.getAllByText(/\d+%/);
        const confidenceValues = confidenceElements
          .map((el) => parseInt(el.textContent?.replace('%', '') || '0'))
          .filter((val) => val > 0);

        // Verify descending order
        for (let i = 1; i < confidenceValues.length; i++) {
          expect(confidenceValues[i]).toBeLessThanOrEqual(
            confidenceValues[i - 1]
          );
        }
      });
    });

    it('should handle predicate selection and deselection', async () => {
      const user = userEvent.setup();
      const mockPredicates = generateMockPredicateDevices(3);

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/predicates/search',
          response: { predicates: mockPredicates, total: 3 },
          delay: 500,
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      // Search for predicates
      const searchBtn = screen.getByText('Search Predicates');
      await user.click(searchBtn);

      await waitFor(
        () => {
          expect(screen.getByText('3 Found')).toBeInTheDocument();
        },
        { timeout: 1000 }
      );

      // Go to top matches tab
      const topMatchesTab = screen.getByText('Top Matches');
      await user.click(topMatchesTab);

      // Select first predicate
      const selectButtons = screen.getAllByText('Select');
      await user.click(selectButtons[0]);

      // Check selected tab
      const selectedTab = screen.getByText(/Selected \(1\)/);
      await user.click(selectedTab);

      await waitFor(() => {
        expect(screen.getByText('Selected Predicates (1)')).toBeInTheDocument();
      });

      // Deselect the predicate
      const deselectBtn = screen.getByText('Deselect');
      await user.click(deselectBtn);

      // Should show empty selected state
      await waitFor(() => {
        expect(
          screen.getByText('No predicate devices selected yet')
        ).toBeInTheDocument();
      });
    });

    it('should display predicate search statistics correctly', async () => {
      const user = userEvent.setup();
      const mockPredicates = generateMockPredicateDevices(10).map(
        (p, index) => ({
          ...p,
          isSelected: index < 3, // First 3 are selected
          confidenceScore: 0.8 + Math.random() * 0.2, // Random confidence 0.8-1.0
        })
      );

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/predicates/search',
          response: { predicates: mockPredicates, total: 10 },
          delay: 500,
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      const searchBtn = screen.getByText('Search Predicates');
      await user.click(searchBtn);

      await waitFor(
        () => {
          // Check overview statistics
          expect(screen.getByText('10')).toBeInTheDocument(); // Total found
          expect(screen.getByText('3')).toBeInTheDocument(); // Selected count

          // Check average confidence is displayed
          const avgConfidenceElements = screen.getAllByText(/\d+%/);
          expect(avgConfidenceElements.length).toBeGreaterThan(0);
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Predicate Comparison Analysis', () => {
    it('should perform predicate comparison with mock substantial equivalence data', async () => {
      const user = userEvent.setup();
      const mockPredicate = generateMockPredicateDevices(1)[0];
      const mockComparison = {
        similarities: [
          {
            category: 'Intended Use',
            userDevice: 'Continuous cardiac monitoring',
            predicateDevice: 'Continuous cardiac monitoring',
            similarity: 'identical',
            impact: 'none',
            justification:
              'Both devices have identical intended use statements',
          },
        ],
        differences: [
          {
            category: 'Power Source',
            userDevice: 'Rechargeable lithium battery',
            predicateDevice: 'Disposable alkaline battery',
            similarity: 'different',
            impact: 'medium',
            justification:
              'Different power source may require additional testing',
          },
        ],
        riskAssessment: 'low',
        testingRecommendations: [
          'Biocompatibility testing for battery materials',
        ],
        substantialEquivalenceAssessment:
          'Device demonstrates substantial equivalence',
      };

      // Mock comparison API
      addMockHandlers([
        {
          method: 'POST',
          path: `/api/projects/1/predicates/${mockPredicate.kNumber}/compare`,
          response: {
            predicate: mockPredicate,
            comparison: mockComparison,
            confidence: 0.85,
          },
          delay: 1500,
        },
      ]);

      // Mock comparison component
      const ComparisonTestComponent: React.FC = () => {
        const [comparison, setComparison] = React.useState<any>(null);
        const [loading, setLoading] = React.useState(false);

        const handleCompare = async () => {
          setLoading(true);
          try {
            const response = await fetch(
              `/api/projects/1/predicates/${mockPredicate.kNumber}/compare`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  user_device: {
                    name: 'Test Cardiac Monitor',
                    intended_use: 'Continuous cardiac monitoring',
                  },
                }),
              }
            );

            if (response.ok) {
              const result = await response.json();
              setComparison(result);
            }
          } finally {
            setLoading(false);
          }
        };

        return (
          <div data-testid="comparison-test">
            <button onClick={handleCompare} disabled={loading}>
              {loading ? 'Comparing...' : 'Compare with Predicate'}
            </button>

            {comparison && (
              <div data-testid="comparison-results">
                <div data-testid="similarities">
                  <h3>Similarities</h3>
                  {comparison.comparison.similarities.map(
                    (sim: any, index: number) => (
                      <div key={index} data-testid={`similarity-${index}`}>
                        {sim.category}: {sim.similarity}
                      </div>
                    )
                  )}
                </div>

                <div data-testid="differences">
                  <h3>Differences</h3>
                  {comparison.comparison.differences.map(
                    (diff: any, index: number) => (
                      <div key={index} data-testid={`difference-${index}`}>
                        {diff.category}: {diff.impact} impact
                      </div>
                    )
                  )}
                </div>

                <div data-testid="risk-assessment">
                  Risk: {comparison.comparison.riskAssessment}
                </div>

                <div data-testid="testing-recommendations">
                  {comparison.comparison.testingRecommendations.map(
                    (rec: string, index: number) => (
                      <div key={index}>{rec}</div>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        );
      };

      renderWithProviders(<ComparisonTestComponent />, {
        session: mockSession,
      });

      const compareBtn = screen.getByText('Compare with Predicate');
      await user.click(compareBtn);

      // Should show loading state
      await waitFor(() => {
        expect(screen.getByText('Comparing...')).toBeInTheDocument();
      });

      // Wait for comparison results
      await waitFor(
        () => {
          expect(screen.getByTestId('comparison-results')).toBeInTheDocument();
          expect(screen.getByText('Similarities')).toBeInTheDocument();
          expect(screen.getByText('Differences')).toBeInTheDocument();
          expect(screen.getByTestId('similarity-0')).toHaveTextContent(
            'Intended Use: identical'
          );
          expect(screen.getByTestId('difference-0')).toHaveTextContent(
            'Power Source: medium impact'
          );
          expect(screen.getByText('Risk: low')).toBeInTheDocument();
          expect(
            screen.getByText('Biocompatibility testing for battery materials')
          ).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });
  });

  describe('Agent Conversation Flow', () => {
    it('should handle agent conversation with mock LangGraph responses', async () => {
      const user = userEvent.setup();
      const mockProject: ProjectContext = {
        id: '1',
        name: 'Test Cardiac Monitor',
        description: 'Wireless cardiac monitoring device',
        deviceType: 'Cardiovascular Device',
        intendedUse: 'Continuous monitoring of cardiac rhythm',
        status: 'in_progress',
      };

      const mockAgentResponse = generateMockAgentInteraction({
        agent_action: 'predicate_search',
        output_data: {
          predicates_found: 5,
          top_confidence: 0.92,
          recommended_predicates: ['K123456', 'K234567'],
        },
        confidence_score: 0.88,
        reasoning: 'Found 5 potential predicates with high similarity scores',
      });

      // Mock agent interaction API
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/agent/interact',
          response: mockAgentResponse,
          delay: 1500,
        },
      ]);

      // Mock the useProjectContext hook to return our test project
      const mockUseProjectContext =
        require('@/components/providers/ProjectContextProvider').useProjectContext;
      mockUseProjectContext.mockReturnValue({
        state: {
          currentProject: mockProject,
          isLoading: false,
          availableCommands: [
            {
              command: '/predicate-search',
              description: 'Find predicate devices',
            },
            { command: '/classify-device', description: 'Classify device' },
          ],
        },
        setProject: jest.fn(),
        setLoading: jest.fn(),
        addMessage: jest.fn(),
      });

      renderWithProviders(<AgentWorkflowPage initialProject={mockProject} />, {
        session: mockSession,
      });

      // Should show project info
      await waitFor(() => {
        expect(screen.getByText('Test Cardiac Monitor')).toBeInTheDocument();
        expect(screen.getByText('Cardiovascular Device')).toBeInTheDocument();
      });

      // Should show chat interface
      expect(screen.getByTestId('copilot-sidebar')).toBeInTheDocument();
      expect(
        screen.getByPlaceholderText('Type your message...')
      ).toBeInTheDocument();

      // Test slash command execution
      const chatInput = screen.getByPlaceholderText('Type your message...');
      await user.type(chatInput, '/predicate-search');

      const sendBtn = screen.getByText('Send');
      await user.click(sendBtn);

      // Should trigger agent execution (mocked)
      // In a real test, we would verify the agent execution hook was called
    });

    it('should display agent instructions with project context', async () => {
      const mockProject: ProjectContext = {
        id: '1',
        name: 'Neural Stimulator',
        description: 'Implantable neural stimulation device',
        deviceType: 'Neurological Device',
        intendedUse: 'Treatment of chronic pain',
        status: 'draft',
      };

      const mockUseProjectContext =
        require('@/components/providers/ProjectContextProvider').useProjectContext;
      mockUseProjectContext.mockReturnValue({
        state: {
          currentProject: mockProject,
          isLoading: false,
          availableCommands: [],
        },
        setProject: jest.fn(),
        setLoading: jest.fn(),
        addMessage: jest.fn(),
      });

      renderWithProviders(<AgentWorkflowPage initialProject={mockProject} />, {
        session: mockSession,
      });

      // Check that instructions include project context
      const instructions = screen.getByTestId('sidebar-instructions');
      expect(instructions).toHaveTextContent('Neural Stimulator');
      expect(instructions).toHaveTextContent('Neurological Device');
      expect(instructions).toHaveTextContent('Treatment of chronic pain');
      expect(instructions).toHaveTextContent('draft');
    });
  });

  describe('Citation Panel Updates', () => {
    it('should update citation panel when agent provides new sources', async () => {
      const user = userEvent.setup();

      // Mock citation panel component
      const CitationPanelTest: React.FC = () => {
        const [citations, setCitations] = React.useState<any[]>([]);
        const [loading, setLoading] = React.useState(false);

        const handleAgentResponse = async () => {
          setLoading(true);
          try {
            const response = await fetch('/api/projects/1/agent/interact', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                action: 'guidance_search',
                input: { device_type: 'cardiovascular' },
              }),
            });

            if (response.ok) {
              const result = await response.json();
              setCitations(result.sources || []);
            }
          } finally {
            setLoading(false);
          }
        };

        return (
          <div data-testid="citation-panel-test">
            <button onClick={handleAgentResponse} disabled={loading}>
              {loading ? 'Searching...' : 'Search Guidance'}
            </button>

            <div data-testid="citations-list">
              {citations.map((citation, index) => (
                <div key={index} data-testid={`citation-${index}`}>
                  <a
                    href={citation.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {citation.title}
                  </a>
                  <span> - {citation.effectiveDate}</span>
                </div>
              ))}
            </div>
          </div>
        );
      };

      const mockSources = [
        {
          url: 'https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cardiovascular-devices',
          title: 'FDA Guidance for Cardiovascular Devices',
          effectiveDate: '2023-01-15',
          documentType: 'FDA_GUIDANCE',
        },
        {
          url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
          title: 'FDA 510(k) Database - K123456',
          effectiveDate: '2023-02-01',
          documentType: 'FDA_510K',
        },
      ];

      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/agent/interact',
          response: {
            ...generateMockAgentInteraction(),
            sources: mockSources,
          },
          delay: 1000,
        },
      ]);

      renderWithProviders(<CitationPanelTest />, {
        session: mockSession,
      });

      const searchBtn = screen.getByText('Search Guidance');
      await user.click(searchBtn);

      await waitFor(() => {
        expect(screen.getByText('Searching...')).toBeInTheDocument();
      });

      await waitFor(
        () => {
          expect(screen.getByTestId('citation-0')).toBeInTheDocument();
          expect(screen.getByTestId('citation-1')).toBeInTheDocument();
          expect(
            screen.getByText('FDA Guidance for Cardiovascular Devices')
          ).toBeInTheDocument();
          expect(
            screen.getByText('FDA 510(k) Database - K123456')
          ).toBeInTheDocument();
        },
        { timeout: 1500 }
      );

      // Verify external links
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', mockSources[0].url);
      expect(links[1]).toHaveAttribute('href', mockSources[1].url);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should handle API failures gracefully with retry mechanisms', async () => {
      const user = userEvent.setup();

      // Mock initial failure then success
      let callCount = 0;
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/classification',
          response: () => {
            callCount++;
            if (callCount === 1) {
              return { error: 'Service temporarily unavailable' };
            }
            return generateMockDeviceClassification();
          },
          error: callCount === 1,
          statusCode: callCount === 1 ? 503 : 200,
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      // First attempt should fail
      const startBtn = screen.getByText('Start Classification Analysis');
      await user.click(startBtn);

      await waitFor(() => {
        expect(screen.getByText('Error')).toBeInTheDocument();
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      // Retry should succeed
      const retryBtn = screen.getByText('Retry');
      await user.click(retryBtn);

      await waitFor(
        () => {
          expect(screen.getByText('Completed')).toBeInTheDocument();
        },
        { timeout: 2000 }
      );
    });

    it('should handle network timeouts and connection issues', async () => {
      const user = userEvent.setup();

      // Mock timeout scenario
      addMockHandlers([
        {
          method: 'POST',
          path: '/api/projects/1/predicates/search',
          response: { error: 'Request timeout' },
          error: true,
          statusCode: 408,
          delay: 5000, // Long delay to simulate timeout
        },
      ]);

      renderWithProviders(<RegulatoryAnalysisTestWrapper />, {
        session: mockSession,
      });

      const searchBtn = screen.getByText('Search Predicates');
      await user.click(searchBtn);

      // Should eventually show error state
      await waitFor(
        () => {
          expect(screen.getByText('Error')).toBeInTheDocument();
        },
        { timeout: 6000 }
      );
    });
  });
});
