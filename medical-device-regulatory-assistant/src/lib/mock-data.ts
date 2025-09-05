/**
 * Mock Data Generators - Legacy Support
 * 
 * This file contains mock data generators that were used during development
 * and testing phases. As of the migration to real backend integration,
 * these generators are no longer used in production components.
 * 
 * They are kept for:
 * - Unit testing isolated components
 * - Development environment seeding
 * - E2E testing scenarios
 * - Future testing needs
 * 
 * @deprecated Most generators are no longer used in production code
 */

import {
  DeviceClassification,
  PredicateDevice,
  SourceCitation,
  ComparisonMatrix,
  ProjectProgress,
  TechnicalCharacteristic,
  ProgressStep,
  ActivityItem,
  DashboardStatistics
} from '@/types/dashboard';

import {
  Project,
  ProjectStatus,
  DeviceClass,
  RegulatoryPathway,
  DocumentType,
  AgentInteraction as ProjectAgentInteraction
} from '@/types/project';

// Additional types for enhanced mock data
export interface User {
  id: string;
  email: string;
  name: string;
  image?: string;
  role: 'admin' | 'user' | 'viewer';
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  expires: string;
  sessionToken: string;
  accessToken?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  projectId?: string;
  action: string;
  entityType: 'project' | 'classification' | 'predicate' | 'user';
  entityId: string;
  changes: Record<string, any>;
  metadata: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface DatabaseSeed {
  users: User[];
  projects: Project[];
  classifications: DeviceClassification[];
  predicateDevices: PredicateDevice[];
  auditLogs: AuditLog[];
  sessions: Session[];
  agentInteractions: ProjectAgentInteraction[];
}

export enum TestScenario {
  NEW_USER_ONBOARDING = 'new_user_onboarding',
  EXISTING_PROJECT_WORKFLOW = 'existing_project_workflow',
  CLASSIFICATION_COMPLETE = 'classification_complete',
  PREDICATE_SEARCH_RESULTS = 'predicate_search_results',
  AGENT_CONVERSATION = 'agent_conversation',
  ERROR_SCENARIOS = 'error_scenarios',
  MULTI_USER_COLLABORATION = 'multi_user_collaboration',
  PERFORMANCE_TESTING = 'performance_testing',
}

export interface MockDataSet {
  scenario: TestScenario;
  users: User[];
  projects: Project[];
  classifications: DeviceClassification[];
  predicateDevices: PredicateDevice[];
  auditLogs: AuditLog[];
  sessions: Session[];
  agentInteractions: ProjectAgentInteraction[];
}

// Utility functions for generating random data
const getRandomDate = (daysBack: number = 30): string => {
  const date = new Date(Date.now() - Math.random() * daysBack * 24 * 60 * 60 * 1000);
  return date.toISOString();
};

const getRandomId = (prefix: string = 'id'): string => {
  return `${prefix}-${Math.random().toString(36).substring(2, 9)}`;
};

// Core mock data generators
export const generateMockSourceCitation = (overrides?: Partial<SourceCitation>): SourceCitation => ({
  url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
  title: 'FDA 510(k) Premarket Notification Database',
  effectiveDate: '2023-01-15',
  documentType: 'FDA_510K',
  accessedDate: new Date().toISOString().split('T')[0],
  ...overrides,
});

export const generateMockDeviceClassification = (overrides?: Partial<DeviceClassification>): DeviceClassification => ({
  id: getRandomId('classification'),
  projectId: getRandomId('project'),
  deviceClass: 'II',
  productCode: 'LRH',
  regulatoryPathway: '510k',
  cfrSections: ['21 CFR 870.2300', '21 CFR 870.2310'],
  confidenceScore: 0.87,
  reasoning: 'Device matches Class II cardiovascular monitoring device characteristics based on intended use and technological features.',
  sources: [
    generateMockSourceCitation(),
    generateMockSourceCitation({
      url: 'https://www.fda.gov/medical-devices/classify-your-medical-device/device-classification',
      title: 'FDA Device Classification Database',
      documentType: 'FDA_DATABASE',
    }),
  ],
  createdAt: getRandomDate(7),
  updatedAt: getRandomDate(1),
  ...overrides,
});

export const generateMockTechnicalCharacteristic = (overrides?: Partial<TechnicalCharacteristic>): TechnicalCharacteristic => ({
  category: 'Intended Use',
  userDevice: 'Continuous cardiac monitoring',
  predicateDevice: 'Continuous cardiac monitoring',
  similarity: 'identical',
  impact: 'none',
  justification: 'Both devices have identical intended use statements',
  ...overrides,
});

export const generateMockComparisonMatrix = (overrides?: Partial<ComparisonMatrix>): ComparisonMatrix => ({
  similarities: [
    generateMockTechnicalCharacteristic(),
    generateMockTechnicalCharacteristic({
      category: 'Technology',
      userDevice: 'ECG electrodes with wireless transmission',
      predicateDevice: 'ECG electrodes with Bluetooth transmission',
      similarity: 'similar',
      impact: 'low',
      justification: 'Similar wireless technology with minor protocol differences',
    }),
  ],
  differences: [
    generateMockTechnicalCharacteristic({
      category: 'Power Source',
      userDevice: 'Rechargeable lithium battery',
      predicateDevice: 'Disposable alkaline battery',
      similarity: 'different',
      impact: 'medium',
      justification: 'Different power source may require additional biocompatibility testing',
    }),
  ],
  riskAssessment: 'low',
  testingRecommendations: [
    'Biocompatibility testing for new battery materials',
    'Electrical safety testing for rechargeable components',
    'Wireless performance validation',
  ],
  substantialEquivalenceAssessment: 'Device demonstrates substantial equivalence with minor differences requiring additional testing',
  ...overrides,
});

export const generateMockPredicateDevice = (overrides?: Partial<PredicateDevice>): PredicateDevice => ({
  id: getRandomId('predicate'),
  projectId: getRandomId('project'),
  kNumber: 'K123456',
  deviceName: 'CardioMonitor Pro',
  intendedUse: 'For continuous monitoring of cardiac rhythm in hospital and home settings',
  productCode: 'LRH',
  clearanceDate: '2023-01-15',
  confidenceScore: 0.92,
  comparisonData: generateMockComparisonMatrix(),
  isSelected: true,
  createdAt: getRandomDate(7),
  updatedAt: getRandomDate(1),
  ...overrides,
});

export const generateMockProgressStep = (overrides?: Partial<ProgressStep>): ProgressStep => ({
  status: 'completed',
  completedAt: getRandomDate(3),
  confidenceScore: 0.87,
  details: 'Classification completed successfully',
  ...overrides,
});

export const generateMockProjectProgress = (overrides?: Partial<ProjectProgress>): ProjectProgress => ({
  projectId: getRandomId('project'),
  classification: generateMockProgressStep(),
  predicateSearch: generateMockProgressStep({
    status: 'completed',
    details: 'Found 8 potential predicates with top confidence of 0.92',
  }),
  comparisonAnalysis: generateMockProgressStep({
    status: 'in-progress',
    completedAt: undefined,
    details: '2 predicates selected for comparison',
  }),
  submissionReadiness: generateMockProgressStep({
    status: 'pending',
    completedAt: undefined,
    confidenceScore: undefined,
    details: 'Awaiting completion of comparison analysis',
  }),
  overallProgress: 65,
  nextActions: [
    'Complete predicate comparison analysis',
    'Review testing recommendations',
    'Prepare submission checklist',
  ],
  lastUpdated: getRandomDate(1),
  ...overrides,
});

// Generate multiple mock predicate devices for testing
export const generateMockPredicateDevices = (count: number = 5): PredicateDevice[] => {
  const kNumbers = ['K123456', 'K234567', 'K345678', 'K456789', 'K567890'];
  const deviceNames = [
    'CardioMonitor Pro',
    'HeartTrack Elite',
    'EKG Wireless Plus',
    'CardiacSense Monitor',
    'VitalWatch Pro',
  ];
  const confidenceScores = [0.92, 0.88, 0.85, 0.82, 0.79];

  return Array.from({ length: count }, (_, index) =>
    generateMockPredicateDevice({
      id: getRandomId('predicate'),
      kNumber: kNumbers[index] || `K${100000 + index}`,
      deviceName: deviceNames[index] || `Mock Device ${index + 1}`,
      confidenceScore: confidenceScores[index] || 0.75 - (index * 0.05),
      isSelected: index < 2, // First two are selected
    })
  );
};

// Generate mock classification with different statuses for testing
export const generateMockClassifications = (): DeviceClassification[] => [
  generateMockDeviceClassification({
    id: getRandomId('classification'),
    confidenceScore: 0.87,
  }),
  generateMockDeviceClassification({
    id: getRandomId('classification'),
    confidenceScore: 0.65,
    deviceClass: 'II',
  }),
  generateMockDeviceClassification({
    id: getRandomId('classification'),
    confidenceScore: 0,
    deviceClass: 'II',
  }),
];

// Enhanced mock data generators for comprehensive testing

export const generateMockUser = (overrides?: Partial<User>): User => ({
  id: getRandomId('user'),
  email: `user${Math.floor(Math.random() * 1000)}@example.com`,
  name: `Test User ${Math.floor(Math.random() * 100)}`,
  image: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Math.random()}`,
  role: 'user',
  createdAt: getRandomDate(30),
  updatedAt: getRandomDate(1),
  ...overrides,
});

export const generateMockSession = (overrides?: Partial<Session>): Session => ({
  id: getRandomId('session'),
  userId: getRandomId('user'),
  expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  sessionToken: `session_token_${Math.random().toString(36).substring(2, 15)}`,
  accessToken: `access_token_${Math.random().toString(36).substring(2, 15)}`,
  createdAt: getRandomDate(7),
  updatedAt: getRandomDate(1),
  ...overrides,
});

export const generateMockAuditLog = (overrides?: Partial<AuditLog>): AuditLog => ({
  id: getRandomId('audit'),
  userId: getRandomId('user'),
  projectId: getRandomId('project'),
  action: 'project_created',
  entityType: 'project',
  entityId: getRandomId('project'),
  changes: {
    name: 'New Medical Device Project',
    status: 'draft',
  },
  metadata: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    source: 'web_app',
  },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  createdAt: getRandomDate(7),
  ...overrides,
});

export const generateMockAgentInteraction = (overrides?: Partial<ProjectAgentInteraction>): ProjectAgentInteraction => ({
  id: Math.floor(Math.random() * 10000),
  project_id: Math.floor(Math.random() * 100),
  user_id: getRandomId('user'),
  agent_action: 'device_classification',
  input_data: {
    device_description: 'Wireless cardiac monitoring device',
    intended_use: 'Continuous monitoring of cardiac rhythm',
  },
  output_data: {
    device_class: 'II',
    product_code: 'LRH',
    regulatory_pathway: '510k',
    confidence_score: 0.87,
  },
  confidence_score: 0.87,
  sources: [generateMockSourceCitation()],
  reasoning: 'Device classified as Class II based on intended use and risk profile',
  execution_time_ms: 2500,
  created_at: getRandomDate(7),
  ...overrides,
});

export const generateMockProject = (overrides?: Partial<Project>): Project => ({
  id: Math.floor(Math.random() * 10000),
  user_id: getRandomId('user'),
  name: 'CardioProbe X',
  description: 'Next-generation wireless cardiac monitoring device for continuous patient monitoring',
  device_type: 'Cardiovascular Monitoring Device',
  intended_use: 'For continuous monitoring of cardiac rhythm in hospital and home care settings',
  status: ProjectStatus.IN_PROGRESS,
  created_at: getRandomDate(30),
  updated_at: getRandomDate(1),
  ...overrides,
});

export const generateMockActivityItem = (overrides?: Partial<ActivityItem>): ActivityItem => ({
  id: getRandomId('activity'),
  type: 'classification',
  title: 'Device Classification Completed',
  description: 'Device successfully classified as Class II with 87% confidence',
  timestamp: getRandomDate(7),
  status: 'success',
  metadata: {
    device_class: 'II',
    confidence: 0.87,
  },
  ...overrides,
});

export const generateMockDashboardStatistics = (overrides?: Partial<DashboardStatistics>): DashboardStatistics => ({
  totalPredicates: 8,
  selectedPredicates: 2,
  averageConfidence: 0.85,
  completionPercentage: 65,
  documentsCount: 5,
  agentInteractions: 12,
  ...overrides,
});

// Database seeding functions
export const generateDatabaseSeed = (): DatabaseSeed => {
  const users = [
    generateMockUser({
      id: 'user-1',
      email: 'john.doe@medtech.com',
      name: 'John Doe',
      role: 'admin'
    }),
    generateMockUser({
      id: 'user-2',
      email: 'jane.smith@medtech.com',
      name: 'Jane Smith',
      role: 'user'
    }),
    generateMockUser({
      id: 'user-3',
      email: 'bob.wilson@medtech.com',
      name: 'Bob Wilson',
      role: 'viewer'
    }),
  ];

  const projects = [
    generateMockProject({
      id: 1,
      user_id: 'user-1',
      name: 'CardioProbe X',
      status: ProjectStatus.IN_PROGRESS
    }),
    generateMockProject({
      id: 2,
      user_id: 'user-1',
      name: 'NeuroStim Device',
      device_type: 'Neurological Stimulation Device',
      status: ProjectStatus.DRAFT
    }),
    generateMockProject({
      id: 3,
      user_id: 'user-2',
      name: 'BloodGlucose Monitor',
      device_type: 'Glucose Monitoring Device',
      status: ProjectStatus.COMPLETED
    }),
  ];

  const classifications = [
    generateMockDeviceClassification({
      id: 'classification-1',
      projectId: 'project-1',
      confidenceScore: 0.87
    }),
    generateMockDeviceClassification({
      id: 'classification-2',
      projectId: 'project-2',
      deviceClass: 'III',
      confidenceScore: 0.65
    }),
  ];

  const predicateDevices = generateMockPredicateDevices(15);

  const auditLogs = [
    generateMockAuditLog({
      userId: 'user-1',
      projectId: 'project-1',
      action: 'project_created'
    }),
    generateMockAuditLog({
      userId: 'user-1',
      projectId: 'project-1',
      action: 'classification_completed',
      entityType: 'classification'
    }),
  ];

  const sessions = [
    generateMockSession({ userId: 'user-1' }),
    generateMockSession({ userId: 'user-2' }),
  ];

  const agentInteractions = [
    generateMockAgentInteraction({
      project_id: 1,
      user_id: 'user-1'
    }),
    generateMockAgentInteraction({
      project_id: 2,
      user_id: 'user-1',
      agent_action: 'predicate_search'
    }),
  ];

  return {
    users,
    projects,
    classifications,
    predicateDevices,
    auditLogs,
    sessions,
    agentInteractions,
  };
};

// Scenario-based mock data generation
export const generateTestScenario = (scenario: TestScenario): MockDataSet => {
  const baseData = generateDatabaseSeed();

  switch (scenario) {
    case TestScenario.NEW_USER_ONBOARDING:
      return {
        scenario,
        users: [generateMockUser({ id: 'new-user', email: 'newuser@example.com' })],
        projects: [],
        classifications: [],
        predicateDevices: [],
        auditLogs: [],
        sessions: [generateMockSession({ userId: 'new-user' })],
        agentInteractions: [],
      };

    case TestScenario.EXISTING_PROJECT_WORKFLOW:
      return {
        scenario,
        users: baseData.users,
        projects: baseData.projects,
        classifications: baseData.classifications,
        predicateDevices: baseData.predicateDevices,
        auditLogs: baseData.auditLogs,
        sessions: baseData.sessions,
        agentInteractions: baseData.agentInteractions,
      };

    case TestScenario.CLASSIFICATION_COMPLETE:
      return {
        scenario,
        users: baseData.users.slice(0, 1),
        projects: [generateMockProject({
          id: 1,
          status: ProjectStatus.IN_PROGRESS
        })],
        classifications: [generateMockDeviceClassification({
          projectId: 'project-1',
          confidenceScore: 0.92
        })],
        predicateDevices: [],
        auditLogs: [generateMockAuditLog({
          action: 'classification_completed',
          entityType: 'classification'
        })],
        sessions: baseData.sessions.slice(0, 1),
        agentInteractions: [generateMockAgentInteraction({
          agent_action: 'device_classification'
        })],
      };

    case TestScenario.PREDICATE_SEARCH_RESULTS:
      return {
        scenario,
        users: baseData.users.slice(0, 1),
        projects: baseData.projects.slice(0, 1),
        classifications: baseData.classifications.slice(0, 1),
        predicateDevices: generateMockPredicateDevices(10),
        auditLogs: [generateMockAuditLog({
          action: 'predicate_search_completed',
          entityType: 'predicate'
        })],
        sessions: baseData.sessions.slice(0, 1),
        agentInteractions: [generateMockAgentInteraction({
          agent_action: 'predicate_search'
        })],
      };

    case TestScenario.AGENT_CONVERSATION:
      return {
        scenario,
        users: baseData.users.slice(0, 1),
        projects: baseData.projects.slice(0, 1),
        classifications: [],
        predicateDevices: [],
        auditLogs: [],
        sessions: baseData.sessions.slice(0, 1),
        agentInteractions: [
          generateMockAgentInteraction({ agent_action: 'device_classification' }),
          generateMockAgentInteraction({ agent_action: 'predicate_search' }),
          generateMockAgentInteraction({ agent_action: 'guidance_search' }),
        ],
      };

    case TestScenario.ERROR_SCENARIOS:
      return {
        scenario,
        users: baseData.users.slice(0, 1),
        projects: [generateMockProject({
          id: 1,
          status: ProjectStatus.DRAFT
        })],
        classifications: [generateMockDeviceClassification({
          confidenceScore: 0.3 // Low confidence indicating potential error
        })],
        predicateDevices: [],
        auditLogs: [generateMockAuditLog({
          action: 'classification_failed',
          metadata: { error: 'Insufficient data for classification' }
        })],
        sessions: baseData.sessions.slice(0, 1),
        agentInteractions: [],
      };

    case TestScenario.MULTI_USER_COLLABORATION:
      return {
        scenario,
        users: baseData.users,
        projects: [generateMockProject({
          id: 1,
          user_id: 'user-1'
        })],
        classifications: baseData.classifications,
        predicateDevices: baseData.predicateDevices,
        auditLogs: [
          generateMockAuditLog({ userId: 'user-1', action: 'project_created' }),
          generateMockAuditLog({ userId: 'user-2', action: 'project_viewed' }),
          generateMockAuditLog({ userId: 'user-3', action: 'project_commented' }),
        ],
        sessions: baseData.sessions,
        agentInteractions: baseData.agentInteractions,
      };

    case TestScenario.PERFORMANCE_TESTING:
      return {
        scenario,
        users: Array.from({ length: 50 }, (_, i) =>
          generateMockUser({ id: `perf-user-${i}` })
        ),
        projects: Array.from({ length: 100 }, (_, i) =>
          generateMockProject({ id: i + 1 })
        ),
        classifications: Array.from({ length: 100 }, () =>
          generateMockDeviceClassification()
        ),
        predicateDevices: generateMockPredicateDevices(500),
        auditLogs: Array.from({ length: 1000 }, () =>
          generateMockAuditLog()
        ),
        sessions: Array.from({ length: 50 }, () =>
          generateMockSession()
        ),
        agentInteractions: Array.from({ length: 200 }, () =>
          generateMockAgentInteraction()
        ),
      };

    default:
      return {
        scenario,
        ...baseData,
      };
  }
};

// Utility functions for testing
export const generateMockProjects = (count: number = 3): Project[] => {
  const projectNames = [
    'CardioProbe X',
    'NeuroStim Device',
    'BloodGlucose Monitor',
    'InsulinPump Pro',
    'VitalWatch Elite',
  ];

  const deviceTypes = [
    'Cardiovascular Monitoring Device',
    'Neurological Stimulation Device',
    'Glucose Monitoring Device',
    'Insulin Delivery Device',
    'Vital Signs Monitor',
  ];

  return Array.from({ length: count }, (_, index) =>
    generateMockProject({
      id: index + 1,
      name: projectNames[index] || `Mock Project ${index + 1}`,
      device_type: deviceTypes[index] || 'Medical Device',
      status: index === 0 ? ProjectStatus.IN_PROGRESS :
        index === 1 ? ProjectStatus.DRAFT :
          ProjectStatus.COMPLETED,
    })
  );
};

export const generateMockUsers = (count: number = 3): User[] => {
  const userNames = ['John Doe', 'Jane Smith', 'Bob Wilson', 'Alice Johnson', 'Charlie Brown'];
  const roles: Array<'admin' | 'user' | 'viewer'> = ['admin', 'user', 'viewer'];

  return Array.from({ length: count }, (_, index) =>
    generateMockUser({
      id: `user-${index + 1}`,
      name: userNames[index] || `User ${index + 1}`,
      email: `user${index + 1}@example.com`,
      role: roles[index % roles.length],
    })
  );
};

// Export all generators for easy access
export const mockDataGenerators = {
  // Core generators
  generateMockSourceCitation,
  generateMockDeviceClassification,
  generateMockTechnicalCharacteristic,
  generateMockComparisonMatrix,
  generateMockPredicateDevice,
  generateMockProgressStep,
  generateMockProjectProgress,
  generateMockActivityItem,
  generateMockDashboardStatistics,

  // Enhanced generators
  generateMockUser,
  generateMockSession,
  generateMockAuditLog,
  generateMockAgentInteraction,
  generateMockProject,

  // Batch generators
  generateMockPredicateDevices,
  generateMockClassifications,
  generateMockProjects,
  generateMockUsers,

  // Database and scenario generators
  generateDatabaseSeed,
  generateTestScenario,
};

// Default export for convenience
export default mockDataGenerators;

/**
 * MIGRATION STATUS NOTES:
 * 
 * ✅ COMPLETED MIGRATIONS:
 * - All production components now use real API calls
 * - Dashboard widgets use real data from backend
 * - Project forms submit to real database
 * - Authentication uses NextAuth.js with real sessions
 * - Agent interactions use real LangGraph backend
 * 
 * 📋 CURRENT USAGE:
 * - Mock data generators are no longer imported by production components
 * - Kept for potential future testing needs
 * - May be used for development environment seeding
 * 
 * 🧹 CLEANUP RECOMMENDATIONS:
 * - Consider removing unused generators in future cleanup
 * - Keep core generators for testing infrastructure
 * - Update generators to match current API schemas if needed
 * 
 * Last Updated: 2024-12-28 (Task 7.3 - Final Migration Validation)
 */