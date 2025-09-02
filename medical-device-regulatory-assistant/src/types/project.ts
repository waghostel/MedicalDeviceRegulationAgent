/**
 * TypeScript types and interfaces for project management
 * Matches the backend Pydantic models for consistency
 */

// Enums
export enum ProjectStatus {
  DRAFT = 'draft',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
}

export enum DeviceClass {
  CLASS_I = 'I',
  CLASS_II = 'II',
  CLASS_III = 'III',
}

export enum RegulatoryPathway {
  FIVE_TEN_K = '510k',
  PMA = 'PMA',
  DE_NOVO = 'De Novo',
}

export enum DocumentType {
  FDA_510K = 'FDA_510K',
  FDA_GUIDANCE = 'FDA_GUIDANCE',
  CFR_SECTION = 'CFR_SECTION',
  FDA_DATABASE = 'FDA_DATABASE',
  USER_DOCUMENT = 'USER_DOCUMENT',
}

// Core Project Types
export interface Project {
  id: number;
  user_id: string;
  name: string;
  description?: string;
  device_type?: string;
  intended_use?: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

export interface ProjectCreateRequest {
  name: string;
  description?: string;
  device_type?: string;
  intended_use?: string;
}

export interface ProjectUpdateRequest {
  name?: string;
  description?: string;
  device_type?: string;
  intended_use?: string;
  status?: ProjectStatus;
}

// Device Classification Types
export interface DeviceClassification {
  id: number;
  project_id: number;
  device_class?: DeviceClass;
  product_code?: string;
  regulatory_pathway?: RegulatoryPathway;
  cfr_sections?: string[];
  confidence_score?: number;
  reasoning?: string;
  sources?: SourceCitation[];
  created_at: string;
}

// Predicate Device Types
export interface PredicateDevice {
  id: number;
  project_id: number;
  k_number: string;
  device_name?: string;
  intended_use?: string;
  product_code?: string;
  clearance_date?: string;
  confidence_score?: number;
  comparison_data?: ComparisonMatrix;
  is_selected: boolean;
  created_at: string;
}

export interface ComparisonMatrix {
  similarities: TechnicalCharacteristic[];
  differences: TechnicalCharacteristic[];
  risk_assessment: 'low' | 'medium' | 'high';
  testing_recommendations: string[];
  substantial_equivalence_assessment: string;
}

export interface TechnicalCharacteristic {
  category: string;
  user_device: string;
  predicate_device: string;
  similarity: 'identical' | 'similar' | 'different';
  impact: 'none' | 'low' | 'medium' | 'high';
  justification: string;
}

// Source Citation Types
export interface SourceCitation {
  url: string;
  title: string;
  effective_date: string;
  document_type: DocumentType;
  accessed_date: string;
}

// Agent Interaction Types
export interface AgentInteraction {
  id: number;
  project_id: number;
  user_id: string;
  agent_action: string;
  input_data: Record<string, any>;
  output_data: Record<string, any>;
  confidence_score?: number;
  sources?: SourceCitation[];
  reasoning?: string;
  execution_time_ms?: number;
  created_at: string;
}

// Document Types
export interface ProjectDocument {
  id: number;
  project_id: number;
  filename: string;
  file_path: string;
  document_type?: string;
  content_markdown?: string;
  metadata?: Record<string, any>;
  created_at: string;
  updated_at: string;
}

// Dashboard Data Types
export interface ProjectDashboardData {
  project: Project;
  classification_status: {
    has_classification: boolean;
    device_class?: DeviceClass;
    product_code?: string;
    regulatory_pathway?: RegulatoryPathway;
    confidence_score?: number;
  };
  predicate_summary: {
    total_predicates: number;
    selected_predicates: number;
    top_confidence_score?: number;
    last_search_date?: string;
  };
  document_summary: {
    total_documents: number;
    document_types: Record<string, number>;
    last_upload_date?: string;
  };
  interaction_summary: {
    total_interactions: number;
    recent_actions: string[];
    last_interaction_date?: string;
  };
  completion_percentage: number;
}

// Search and Filter Types
export interface ProjectSearchFilters {
  search?: string;
  status?: ProjectStatus;
  device_type?: string;
  limit?: number;
  offset?: number;
}

// Export Data Types
export interface ProjectExportData {
  project: Project;
  classifications: DeviceClassification[];
  predicates: PredicateDevice[];
  documents: ProjectDocument[];
  interactions: AgentInteraction[];
  export_date: string;
  export_format: 'json' | 'pdf';
}

// UI State Types
export interface ProjectListState {
  projects: Project[];
  loading: boolean;
  error?: string;
  filters: ProjectSearchFilters;
  totalCount: number;
  hasMore: boolean;
}

export interface ProjectDetailState {
  project?: Project;
  dashboardData?: ProjectDashboardData;
  loading: boolean;
  error?: string;
  lastUpdated?: string;
}

// Form Types
export interface ProjectFormData {
  name: string;
  description: string;
  device_type: string;
  intended_use: string;
}

export interface ProjectFormErrors {
  name?: string;
  description?: string;
  device_type?: string;
  intended_use?: string;
}

// WebSocket Message Types
export interface WebSocketMessage {
  type: 'project_updated' | 'classification_completed' | 'predicate_search_completed' | 'agent_interaction';
  project_id: number;
  data: any;
  timestamp: string;
}

// Cache Types
export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface ProjectCache {
  projects: CacheEntry<Project[]>;
  projectDetails: Record<number, CacheEntry<ProjectDashboardData>>;
}

// API Response Types
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface ApiErrorResponse {
  error: string;
  message: string;
  details?: any;
  suggestions?: string[];
}

// Optimistic Update Types
export interface OptimisticUpdate<T> {
  id: string;
  type: 'create' | 'update' | 'delete';
  data: T;
  timestamp: number;
  pending: boolean;
  error?: string;
}

export interface ProjectOptimisticState {
  updates: Record<string, OptimisticUpdate<Project>>;
  pendingCount: number;
}