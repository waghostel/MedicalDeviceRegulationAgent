/**
 * Mock Data Generators
 * Generates realistic mock data compatible with database schema
 */

import { 
  Project, 
  ProjectStatus, 
  DeviceClassification, 
  PredicateDevice, 
  AgentInteraction,
  ProjectDocument,
  SourceCitation,
  DocumentType,
  DeviceClass,
  RegulatoryPathway
} from '@/types/project';

export interface MockDataOptions {
  seed?: number;
  locale?: string;
  realistic?: boolean;
}

export interface DatabaseSeed {
  users: MockUser[];
  projects: Project[];
  classifications: DeviceClassification[];
  predicateDevices: PredicateDevice[];
  documents: ProjectDocument[];
  interactions: AgentInteraction[];
  citations: SourceCitation[];
}

export interface MockUser {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at: string;
  last_login?: string;
}

/**
 * Mock Data Generator
 * Provides consistent, realistic mock data for testing and development
 */
export class MockDataGenerator {
  private seed: number;
  private random: () => number;

  constructor(options: MockDataOptions = {}) {
    this.seed = options.seed || Date.now();
    this.random = this.createSeededRandom(this.seed);
  }

  /**
   * Create seeded random number generator for consistent results
   */
  private createSeededRandom(seed: number): () => number {
    let state = seed;
    return () => {
      state = (state * 1664525 + 1013904223) % 4294967296;
      return state / 4294967296;
    };
  }

  /**
   * Generate random integer between min and max (inclusive)
   */
  private randomInt(min: number, max: number): number {
    return Math.floor(this.random() * (max - min + 1)) + min;
  }

  /**
   * Pick random element from array
   */
  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(this.random() * array.length)];
  }

  /**
   * Generate random date within range
   */
  private randomDate(start: Date, end: Date): Date {
    const startTime = start.getTime();
    const endTime = end.getTime();
    const randomTime = startTime + this.random() * (endTime - startTime);
    return new Date(randomTime);
  }

  /**
   * Generate mock user
   */
  generateMockUser(overrides: Partial<MockUser> = {}): MockUser {
    const firstNames = ['John', 'Jane', 'Michael', 'Sarah', 'David', 'Lisa', 'Robert', 'Emily'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
    const roles = ['Regulatory Affairs Manager', 'Quality Engineer', 'Product Manager', 'Compliance Specialist'];
    
    const firstName = this.randomChoice(firstNames);
    const lastName = this.randomChoice(lastNames);
    const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@company.com`;
    
    return {
      id: `user_${this.randomInt(1000, 9999)}`,
      email,
      name: `${firstName} ${lastName}`,
      role: this.randomChoice(roles),
      created_at: this.randomDate(new Date(2023, 0, 1), new Date()).toISOString(),
      last_login: this.random() > 0.2 ? this.randomDate(new Date(2024, 0, 1), new Date()).toISOString() : undefined,
      ...overrides
    };
  }

  /**
   * Generate mock project
   */
  generateMockProject(overrides: Partial<Project> = {}): Project {
    const deviceTypes = [
      'Cardiac Monitor',
      'Blood Glucose Meter',
      'Surgical Robot',
      'MRI Scanner',
      'Pacemaker',
      'Insulin Pump',
      'Ventilator',
      'Defibrillator',
      'CT Scanner',
      'Ultrasound System'
    ];

    const deviceNames = [
      'CardioProbe X1',
      'GlucoSense Pro',
      'SurgiBot 3000',
      'MagneVision Elite',
      'HeartSync Plus',
      'InsuFlow Smart',
      'BreathEase Pro',
      'LifeSaver AED',
      'ScanMaster CT',
      'EchoView HD'
    ];

    const intendedUses = [
      'Continuous monitoring of cardiac rhythm and vital signs in hospital settings',
      'Non-invasive measurement of blood glucose levels for diabetes management',
      'Minimally invasive surgical procedures with enhanced precision and control',
      'High-resolution magnetic resonance imaging for diagnostic purposes',
      'Cardiac rhythm management through electrical stimulation',
      'Automated insulin delivery for Type 1 diabetes patients',
      'Mechanical ventilation support for critically ill patients',
      'Emergency cardiac defibrillation and cardioversion',
      'Cross-sectional imaging for diagnostic and screening purposes',
      'Real-time ultrasound imaging for medical diagnosis'
    ];

    const deviceType = this.randomChoice(deviceTypes);
    const deviceName = this.randomChoice(deviceNames);
    const intendedUse = this.randomChoice(intendedUses);
    
    const createdAt = this.randomDate(new Date(2024, 0, 1), new Date());
    const updatedAt = this.randomDate(createdAt, new Date());

    return {
      id: this.randomInt(1, 10000),
      user_id: `user_${this.randomInt(1000, 9999)}`,
      name: deviceName,
      description: `Advanced ${deviceType.toLowerCase()} designed for clinical use with enhanced safety features and regulatory compliance.`,
      device_type: deviceType,
      intended_use: intendedUse,
      status: this.randomChoice(Object.values(ProjectStatus)),
      created_at: createdAt.toISOString(),
      updated_at: updatedAt.toISOString(),
      ...overrides
    };
  }

  /**
   * Generate mock device classification
   */
  generateMockDeviceClassification(overrides: Partial<DeviceClassification> = {}): DeviceClassification {
    const productCodes = ['DQK', 'FRN', 'BSM', 'CAF', 'DXH', 'FRO', 'BSN', 'CAG'];
    const cfrSections = [
      '21 CFR 870.2300',
      '21 CFR 862.1345',
      '21 CFR 878.4040',
      '21 CFR 892.2050',
      '21 CFR 870.3610',
      '21 CFR 880.5725'
    ];

    const deviceClass = this.randomChoice(Object.values(DeviceClass));
    const productCode = this.randomChoice(productCodes);
    const regulatoryPathway = deviceClass === DeviceClass.CLASS_III ? 
      RegulatoryPathway.PMA : 
      this.randomChoice([RegulatoryPathway.FIVE_TEN_K, RegulatoryPathway.DE_NOVO]);

    const confidenceScore = 0.7 + this.random() * 0.3; // 70-100%
    
    const reasoning = `Device classified as Class ${deviceClass} based on intended use and risk profile. ` +
      `Product code ${productCode} applies to this device category. ` +
      `${regulatoryPathway} pathway recommended based on predicate device availability and technological characteristics.`;

    const sources: SourceCitation[] = [
      {
        url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpcd/classification.cfm?ID=${productCode}`,
        title: `FDA Product Classification - ${productCode}`,
        effective_date: '2023-01-01',
        document_type: DocumentType.FDA_DATABASE,
        accessed_date: new Date().toISOString()
      },
      {
        url: `https://www.ecfr.gov/current/title-21/chapter-I/subchapter-H/part-${this.randomInt(800, 899)}`,
        title: `21 CFR ${this.randomChoice(cfrSections)}`,
        effective_date: '2023-01-01',
        document_type: DocumentType.CFR_SECTION,
        accessed_date: new Date().toISOString()
      }
    ];

    return {
      id: this.randomInt(1, 10000),
      project_id: this.randomInt(1, 1000),
      device_class: deviceClass,
      product_code: productCode,
      regulatory_pathway: regulatoryPathway,
      cfr_sections: [this.randomChoice(cfrSections)],
      confidence_score: confidenceScore,
      reasoning,
      sources,
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate mock predicate device
   */
  generateMockPredicateDevice(overrides: Partial<PredicateDevice> = {}): PredicateDevice {
    const kNumbers = [
      'K123456', 'K234567', 'K345678', 'K456789', 'K567890',
      'K678901', 'K789012', 'K890123', 'K901234', 'K012345'
    ];

    const deviceNames = [
      'CardioMonitor Pro 2000',
      'GlucoCheck Elite',
      'SurgicalBot Advanced',
      'MRI Vision System',
      'HeartPace Dual',
      'InsulinFlow Auto',
      'VentilatorMax Pro',
      'DefibSafe AED',
      'CTScan Master',
      'UltraSound Pro'
    ];

    const productCodes = ['DQK', 'FRN', 'BSM', 'CAF', 'DXH'];
    
    const kNumber = this.randomChoice(kNumbers);
    const deviceName = this.randomChoice(deviceNames);
    const productCode = this.randomChoice(productCodes);
    
    const clearanceDate = this.randomDate(new Date(2020, 0, 1), new Date(2024, 0, 1));
    const confidenceScore = 0.6 + this.random() * 0.4; // 60-100%

    const intendedUse = `Medical device intended for ${this.randomChoice([
      'continuous patient monitoring in clinical settings',
      'diagnostic imaging and analysis',
      'therapeutic intervention and treatment',
      'surgical assistance and guidance',
      'patient data collection and analysis'
    ])}.`;

    return {
      id: this.randomInt(1, 10000),
      project_id: this.randomInt(1, 1000),
      k_number: kNumber,
      device_name: deviceName,
      intended_use: intendedUse,
      product_code: productCode,
      clearance_date: clearanceDate.toISOString(),
      confidence_score: confidenceScore,
      comparison_data: this.generateMockComparisonMatrix(),
      is_selected: this.random() > 0.7, // 30% chance of being selected
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  /**
   * Generate mock comparison matrix
   */
  private generateMockComparisonMatrix() {
    const categories = ['Materials', 'Design', 'Energy Source', 'Software', 'Biocompatibility'];
    const similarities = [];
    const differences = [];

    for (let i = 0; i < 3; i++) {
      similarities.push({
        category: this.randomChoice(categories),
        user_device: 'Titanium alloy construction',
        predicate_device: 'Titanium alloy construction',
        similarity: 'identical' as const,
        impact: 'none' as const,
        justification: 'Both devices use identical materials and construction methods'
      });
    }

    for (let i = 0; i < 2; i++) {
      differences.push({
        category: this.randomChoice(categories),
        user_device: 'Advanced AI algorithms',
        predicate_device: 'Traditional signal processing',
        similarity: 'different' as const,
        impact: this.randomChoice(['low', 'medium', 'high'] as const),
        justification: 'Enhanced software capabilities require additional validation'
      });
    }

    return {
      similarities,
      differences,
      risk_assessment: this.randomChoice(['low', 'medium', 'high'] as const),
      testing_recommendations: [
        'Biocompatibility testing per ISO 10993',
        'Electrical safety testing per IEC 60601-1',
        'Software validation per IEC 62304'
      ],
      substantial_equivalence_assessment: 'Device demonstrates substantial equivalence to predicate with minor technological differences that do not affect safety or effectiveness.'
    };
  }

  /**
   * Generate mock agent interaction
   */
  generateMockAgentInteraction(overrides: Partial<AgentInteraction> = {}): AgentInteraction {
    const actions = [
      'device_classification',
      'predicate_search',
      'predicate_comparison',
      'guidance_search',
      'document_analysis'
    ];

    const action = this.randomChoice(actions);
    const confidenceScore = 0.7 + this.random() * 0.3;
    
    const inputData = this.generateMockInputData(action);
    const outputData = this.generateMockOutputData(action);
    const reasoning = this.generateMockReasoning(action);
    const sources = this.generateMockSources(action);

    return {
      id: this.randomInt(1, 10000),
      project_id: this.randomInt(1, 1000),
      user_id: `user_${this.randomInt(1000, 9999)}`,
      agent_action: action,
      input_data: inputData,
      output_data: outputData,
      confidence_score: confidenceScore,
      sources,
      reasoning,
      execution_time_ms: this.randomInt(500, 5000),
      created_at: new Date().toISOString(),
      ...overrides
    };
  }

  private generateMockInputData(action: string): Record<string, any> {
    switch (action) {
      case 'device_classification':
        return {
          device_description: 'Portable cardiac monitor with wireless connectivity',
          intended_use: 'Continuous ECG monitoring in hospital settings'
        };
      case 'predicate_search':
        return {
          device_type: 'Cardiac Monitor',
          product_code: 'DQK',
          intended_use: 'ECG monitoring'
        };
      default:
        return {
          query: 'General device analysis request',
          parameters: {}
        };
    }
  }

  private generateMockOutputData(action: string): Record<string, any> {
    switch (action) {
      case 'device_classification':
        return {
          device_class: 'II',
          product_code: 'DQK',
          regulatory_pathway: '510k',
          cfr_sections: ['21 CFR 870.2300']
        };
      case 'predicate_search':
        return {
          predicates_found: 5,
          top_matches: ['K123456', 'K234567', 'K345678'],
          search_criteria: 'cardiac monitoring devices'
        };
      default:
        return {
          result: 'Analysis completed successfully',
          recommendations: ['Review additional documentation', 'Consider expert consultation']
        };
    }
  }

  private generateMockReasoning(action: string): string {
    const reasoningTemplates = {
      device_classification: 'Device classified based on intended use and risk profile. Similar devices in this category are typically Class II with 510(k) pathway.',
      predicate_search: 'Search conducted using device description and intended use. Results filtered by product code and clearance date.',
      predicate_comparison: 'Comparison performed using technological characteristics and intended use similarities.',
      guidance_search: 'Relevant guidance documents identified based on device type and regulatory pathway.',
      document_analysis: 'Document analyzed for regulatory compliance and completeness.'
    };

    return reasoningTemplates[action as keyof typeof reasoningTemplates] || 'Standard analysis performed according to established procedures.';
  }

  private generateMockSources(action: string): SourceCitation[] {
    const baseSources: SourceCitation[] = [
      {
        url: 'https://www.fda.gov/medical-devices/classify-your-medical-device/device-classification',
        title: 'FDA Device Classification Database',
        effective_date: '2023-01-01',
        document_type: DocumentType.FDA_DATABASE,
        accessed_date: new Date().toISOString()
      },
      {
        url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm',
        title: 'FDA 510(k) Premarket Notification Database',
        effective_date: '2023-01-01',
        document_type: DocumentType.FDA_DATABASE,
        accessed_date: new Date().toISOString()
      }
    ];

    return baseSources.slice(0, this.randomInt(1, 2));
  }

  /**
   * Generate mock project document
   */
  generateMockProjectDocument(overrides: Partial<ProjectDocument> = {}): ProjectDocument {
    const documentTypes = ['user_manual', 'technical_specification', 'risk_analysis', 'clinical_data'];
    const filenames = [
      'device_specification.pdf',
      'user_manual_v2.pdf',
      'risk_management_file.docx',
      'clinical_evaluation_report.pdf',
      'software_documentation.pdf'
    ];

    const filename = this.randomChoice(filenames);
    const documentType = this.randomChoice(documentTypes);
    
    return {
      id: this.randomInt(1, 10000),
      project_id: this.randomInt(1, 1000),
      filename,
      file_path: `/uploads/projects/${this.randomInt(1, 1000)}/${filename}`,
      document_type: documentType,
      content_markdown: this.generateMockMarkdownContent(documentType),
      metadata: {
        file_size: this.randomInt(100000, 5000000),
        upload_date: new Date().toISOString(),
        content_type: filename.endsWith('.pdf') ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      ...overrides
    };
  }

  private generateMockMarkdownContent(documentType: string): string {
    const contentTemplates = {
      user_manual: `# User Manual\n\n## Overview\nThis document provides instructions for safe and effective use of the medical device.\n\n## Safety Warnings\n- Read all instructions before use\n- Follow proper sterilization procedures\n- Ensure proper training before operation`,
      technical_specification: `# Technical Specifications\n\n## Device Parameters\n- Operating voltage: 12V DC\n- Power consumption: 15W\n- Operating temperature: 10-40°C\n- Storage temperature: -20-60°C`,
      risk_analysis: `# Risk Management File\n\n## Risk Analysis Summary\nComprehensive risk analysis conducted per ISO 14971.\n\n## Identified Risks\n1. Electrical hazards\n2. Mechanical hazards\n3. Software failures`,
      clinical_data: `# Clinical Evaluation Report\n\n## Clinical Evidence Summary\nClinical data demonstrates safety and effectiveness for intended use.\n\n## Study Results\n- Primary endpoint achieved\n- No serious adverse events related to device`
    };

    return contentTemplates[documentType as keyof typeof contentTemplates] || '# Document\n\nContent not available.';
  }

  /**
   * Generate comprehensive database seed
   */
  generateDatabaseSeed(options: {
    userCount?: number;
    projectCount?: number;
    classificationsPerProject?: number;
    predicatesPerProject?: number;
    documentsPerProject?: number;
    interactionsPerProject?: number;
  } = {}): DatabaseSeed {
    const {
      userCount = 5,
      projectCount = 10,
      classificationsPerProject = 1,
      predicatesPerProject = 5,
      documentsPerProject = 3,
      interactionsPerProject = 8
    } = options;

    // Generate users
    const users: MockUser[] = [];
    for (let i = 0; i < userCount; i++) {
      users.push(this.generateMockUser());
    }

    // Generate projects
    const projects: Project[] = [];
    for (let i = 0; i < projectCount; i++) {
      const userId = users[i % users.length].id;
      projects.push(this.generateMockProject({ 
        id: i + 1,
        user_id: userId 
      }));
    }

    // Generate classifications
    const classifications: DeviceClassification[] = [];
    for (const project of projects) {
      for (let i = 0; i < classificationsPerProject; i++) {
        classifications.push(this.generateMockDeviceClassification({
          id: classifications.length + 1,
          project_id: project.id
        }));
      }
    }

    // Generate predicate devices
    const predicateDevices: PredicateDevice[] = [];
    for (const project of projects) {
      for (let i = 0; i < predicatesPerProject; i++) {
        predicateDevices.push(this.generateMockPredicateDevice({
          id: predicateDevices.length + 1,
          project_id: project.id
        }));
      }
    }

    // Generate documents
    const documents: ProjectDocument[] = [];
    for (const project of projects) {
      for (let i = 0; i < documentsPerProject; i++) {
        documents.push(this.generateMockProjectDocument({
          id: documents.length + 1,
          project_id: project.id
        }));
      }
    }

    // Generate interactions
    const interactions: AgentInteraction[] = [];
    for (const project of projects) {
      const userId = project.user_id;
      for (let i = 0; i < interactionsPerProject; i++) {
        interactions.push(this.generateMockAgentInteraction({
          id: interactions.length + 1,
          project_id: project.id,
          user_id: userId
        }));
      }
    }

    // Generate citations (from interactions)
    const citations: SourceCitation[] = [];
    for (const interaction of interactions) {
      if (interaction.sources) {
        citations.push(...interaction.sources);
      }
    }

    return {
      users,
      projects,
      classifications,
      predicateDevices,
      documents,
      interactions,
      citations
    };
  }

  /**
   * Generate test scenario data
   */
  generateTestScenario(scenario: TestScenario): DatabaseSeed {
    switch (scenario) {
      case TestScenario.NEW_USER_ONBOARDING:
        return this.generateNewUserScenario();
      case TestScenario.EXISTING_PROJECT_WORKFLOW:
        return this.generateExistingProjectScenario();
      case TestScenario.CLASSIFICATION_COMPLETE:
        return this.generateClassificationCompleteScenario();
      case TestScenario.PREDICATE_SEARCH_RESULTS:
        return this.generatePredicateSearchScenario();
      case TestScenario.AGENT_CONVERSATION:
        return this.generateAgentConversationScenario();
      case TestScenario.ERROR_SCENARIOS:
        return this.generateErrorScenario();
      default:
        return this.generateDatabaseSeed();
    }
  }

  private generateNewUserScenario(): DatabaseSeed {
    const user = this.generateMockUser({
      id: 'new_user_001',
      name: 'New User',
      created_at: new Date().toISOString()
    });

    return {
      users: [user],
      projects: [],
      classifications: [],
      predicateDevices: [],
      documents: [],
      interactions: [],
      citations: []
    };
  }

  private generateExistingProjectScenario(): DatabaseSeed {
    const seed = this.generateDatabaseSeed({
      userCount: 1,
      projectCount: 3,
      classificationsPerProject: 1,
      predicatesPerProject: 3,
      documentsPerProject: 2,
      interactionsPerProject: 5
    });

    // Set one project as in progress
    seed.projects[0].status = ProjectStatus.IN_PROGRESS;
    seed.projects[1].status = ProjectStatus.COMPLETED;
    seed.projects[2].status = ProjectStatus.DRAFT;

    return seed;
  }

  private generateClassificationCompleteScenario(): DatabaseSeed {
    const seed = this.generateDatabaseSeed({
      userCount: 1,
      projectCount: 1,
      classificationsPerProject: 1,
      predicatesPerProject: 0,
      documentsPerProject: 1,
      interactionsPerProject: 3
    });

    // Ensure classification is complete with high confidence
    seed.classifications[0].confidence_score = 0.95;
    seed.classifications[0].device_class = DeviceClass.CLASS_II;
    seed.classifications[0].regulatory_pathway = RegulatoryPathway.FIVE_TEN_K;

    return seed;
  }

  private generatePredicateSearchScenario(): DatabaseSeed {
    const seed = this.generateDatabaseSeed({
      userCount: 1,
      projectCount: 1,
      classificationsPerProject: 1,
      predicatesPerProject: 8,
      documentsPerProject: 1,
      interactionsPerProject: 2
    });

    // Set some predicates as selected
    seed.predicateDevices[0].is_selected = true;
    seed.predicateDevices[1].is_selected = true;
    seed.predicateDevices[2].confidence_score = 0.95;

    return seed;
  }

  private generateAgentConversationScenario(): DatabaseSeed {
    const seed = this.generateDatabaseSeed({
      userCount: 1,
      projectCount: 1,
      classificationsPerProject: 0,
      predicatesPerProject: 0,
      documentsPerProject: 1,
      interactionsPerProject: 10
    });

    // Create a conversation flow
    const conversationActions = [
      'device_classification',
      'predicate_search',
      'predicate_comparison',
      'guidance_search',
      'document_analysis'
    ];

    seed.interactions.forEach((interaction, index) => {
      interaction.agent_action = conversationActions[index % conversationActions.length];
      interaction.created_at = new Date(Date.now() - (seed.interactions.length - index) * 60000).toISOString();
    });

    return seed;
  }

  private generateErrorScenario(): DatabaseSeed {
    const seed = this.generateDatabaseSeed({
      userCount: 1,
      projectCount: 1,
      classificationsPerProject: 0,
      predicatesPerProject: 0,
      documentsPerProject: 0,
      interactionsPerProject: 3
    });

    // Create interactions with low confidence scores (indicating potential errors)
    seed.interactions.forEach(interaction => {
      interaction.confidence_score = 0.3;
      interaction.reasoning = 'Analysis completed with low confidence due to insufficient data.';
    });

    return seed;
  }
}

export enum TestScenario {
  NEW_USER_ONBOARDING = 'new_user_onboarding',
  EXISTING_PROJECT_WORKFLOW = 'existing_project_workflow',
  CLASSIFICATION_COMPLETE = 'classification_complete',
  PREDICATE_SEARCH_RESULTS = 'predicate_search_results',
  AGENT_CONVERSATION = 'agent_conversation',
  ERROR_SCENARIOS = 'error_scenarios'
}

/**
 * Export utility functions for common mock data generation
 */
export function generateMockProject(overrides?: Partial<Project>): Project {
  const generator = new MockDataGenerator();
  return generator.generateMockProject(overrides);
}

export function generateMockDeviceClassification(overrides?: Partial<DeviceClassification>): DeviceClassification {
  const generator = new MockDataGenerator();
  return generator.generateMockDeviceClassification(overrides);
}

export function generateMockPredicateDevices(count: number = 5): PredicateDevice[] {
  const generator = new MockDataGenerator();
  const devices: PredicateDevice[] = [];
  
  for (let i = 0; i < count; i++) {
    devices.push(generator.generateMockPredicateDevice({ id: i + 1 }));
  }
  
  return devices;
}

export function generateMockAgentInteraction(overrides?: Partial<AgentInteraction>): AgentInteraction {
  const generator = new MockDataGenerator();
  return generator.generateMockAgentInteraction(overrides);
}

export function generateDatabaseSeed(options?: Parameters<MockDataGenerator['generateDatabaseSeed']>[0]): DatabaseSeed {
  const generator = new MockDataGenerator();
  return generator.generateDatabaseSeed(options);
}

export function generateTestScenario(scenario: TestScenario): DatabaseSeed {
  const generator = new MockDataGenerator();
  return generator.generateTestScenario(scenario);
}