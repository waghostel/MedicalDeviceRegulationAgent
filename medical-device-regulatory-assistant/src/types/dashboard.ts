/**
 * Dashboard data types and interfaces for regulatory strategy dashboard
 */

export interface DeviceClassification {
  id: string;
  projectId: string;
  deviceClass: 'I' | 'II' | 'III';
  productCode: string;
  regulatoryPathway: '510k' | 'PMA' | 'De Novo';
  cfrSections: string[];
  confidenceScore: number;
  reasoning: string;
  sources: SourceCitation[];
  createdAt: string;
  updatedAt: string;
}

export interface PredicateDevice {
  id: string;
  projectId: string;
  kNumber: string;
  deviceName: string;
  intendedUse: string;
  productCode: string;
  clearanceDate: string;
  confidenceScore: number;
  comparisonData: ComparisonMatrix;
  isSelected: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ComparisonMatrix {
  similarities: TechnicalCharacteristic[];
  differences: TechnicalCharacteristic[];
  riskAssessment: 'low' | 'medium' | 'high';
  testingRecommendations: string[];
  substantialEquivalenceAssessment: string;
}

export interface TechnicalCharacteristic {
  category: string;
  userDevice: string;
  predicateDevice: string;
  similarity: 'identical' | 'similar' | 'different';
  impact: 'none' | 'low' | 'medium' | 'high';
  justification: string;
}

export interface SourceCitation {
  url: string;
  title: string;
  effectiveDate: string;
  documentType: 'FDA_510K' | 'FDA_GUIDANCE' | 'CFR_SECTION' | 'FDA_DATABASE';
  accessedDate: string;
}

export interface ProjectProgress {
  projectId: string;
  classification: ProgressStep;
  predicateSearch: ProgressStep;
  comparisonAnalysis: ProgressStep;
  submissionReadiness: ProgressStep;
  overallProgress: number;
  nextActions: string[];
  lastUpdated: string;
}

export interface ProgressStep {
  status: 'pending' | 'in-progress' | 'completed' | 'error';
  completedAt?: string;
  confidenceScore?: number;
  details?: string;
  errorMessage?: string;
}

export interface DashboardData {
  project: {
    id: string;
    name: string;
    description: string;
    deviceType: string;
    intendedUse: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  classification?: DeviceClassification;
  predicateDevices: PredicateDevice[];
  progress: ProjectProgress;
  recentActivity: ActivityItem[];
  statistics: DashboardStatistics;
}

export interface ActivityItem {
  id: string;
  type:
    | 'classification'
    | 'predicate_search'
    | 'comparison'
    | 'document_upload'
    | 'agent_interaction';
  title: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
  metadata?: Record<string, any>;
}

export interface DashboardStatistics {
  totalPredicates: number;
  selectedPredicates: number;
  averageConfidence: number;
  completionPercentage: number;
  documentsCount: number;
  agentInteractions: number;
}

export interface DashboardConfig {
  widgets: {
    classification: WidgetConfig;
    predicates: WidgetConfig;
    progress: WidgetConfig;
    activity: WidgetConfig;
  };
  layout: 'default' | 'compact' | 'detailed';
  refreshInterval: number;
  autoRefresh: boolean;
}

export interface WidgetConfig {
  visible: boolean;
  position: number;
  size: 'small' | 'medium' | 'large';
  customSettings?: Record<string, any>;
}

export interface DashboardExportOptions {
  format: 'json' | 'pdf' | 'csv';
  includeCharts: boolean;
  includeDetails: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
}

export interface DashboardUpdate {
  type:
    | 'classification_updated'
    | 'predicate_added'
    | 'progress_updated'
    | 'activity_added';
  projectId: string;
  data: any;
  timestamp: string;
}

// Status enums for better type safety
export type ClassificationStatus =
  | 'pending'
  | 'in-progress'
  | 'completed'
  | 'error';
export type PredicateStatus =
  | 'pending'
  | 'searching'
  | 'found'
  | 'analyzed'
  | 'selected';
export type ProgressStatus = 'pending' | 'in-progress' | 'completed' | 'error';

// Widget component props interfaces
export interface ClassificationWidgetProps {
  classification?: DeviceClassification;
  loading?: boolean;
  error?: string;
  onStartClassification?: () => void;
  onRefresh?: () => void;
}

export interface PredicateWidgetProps {
  predicates: PredicateDevice[];
  loading?: boolean;
  error?: string;
  onSearchPredicates?: () => void;
  onSelectPredicate?: (predicate: PredicateDevice) => void;
  onRefresh?: () => void;
}

export interface ProgressWidgetProps {
  progress: ProjectProgress;
  loading?: boolean;
  error?: string;
  onStepClick?: (
    step: keyof Omit<
      ProjectProgress,
      'projectId' | 'overallProgress' | 'nextActions' | 'lastUpdated'
    >
  ) => void;
  onRefresh?: () => void;
}

export interface ActivityWidgetProps {
  activities: ActivityItem[];
  loading?: boolean;
  error?: string;
  onRefresh?: () => void;
}
