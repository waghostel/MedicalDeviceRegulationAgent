/**
 * Audit Trail and Compliance Types
 * Defines interfaces for tracking agent interactions and compliance data
 */

export interface SourceCitation {
  url: string;
  title: string;
  effective_date: string;
  document_type: 'FDA_510K' | 'FDA_GUIDANCE' | 'CFR_SECTION' | 'FDA_DATABASE';
  accessed_date: string;
}

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

export interface AuditLogFilter {
  project_id?: string;
  action_type?: string;
  date_from?: string;
  date_to?: string;
  confidence_min?: number;
  confidence_max?: number;
  search_term?: string;
}

export interface AuditLogExportOptions {
  format: 'PDF' | 'CSV';
  includeReasoningTraces: boolean;
  includeSources: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface ReasoningStep {
  step: number;
  description: string;
  data?: Record<string, unknown>;
  confidence?: number;
  sources?: SourceCitation[];
}

export interface ExpandedReasoning {
  summary: string;
  steps: ReasoningStep[];
  conclusion: string;
  limitations: string[];
}

export interface ComplianceMetrics {
  reasoning_completeness: number;
  citation_completeness: number;
  confidence_score_coverage: number;
  average_confidence: number;
  action_distribution: Record<string, number>;
  error_rate: number;
  total_entries_analyzed: number;
}

export interface ComplianceReport {
  project_id: number;
  generated_at: string;
  compliance_score: number;
  requirements_met: number;
  total_requirements: number;
  critical_issues: Array<{
    category: string;
    message: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    affected_interactions: number[];
  }>;
  warnings: Array<{
    category: string;
    message: string;
    severity: 'low' | 'medium' | 'high';
    affected_interactions: number[];
  }>;
  recommendations: string[];
  audit_trail_summary: {
    total_interactions: number;
    human_approvals: number;
    pending_approvals: number;
    confidence_distribution: Record<string, number>;
  };
  regulatory_readiness: {
    classification_complete: boolean;
    predicates_identified: boolean;
    documentation_complete: boolean;
    submission_ready: boolean;
  };
}

export interface AuditIntegrityResult {
  project_id: number;
  verified_at: string;
  integrity_score: number;
  total_interactions: number;
  verified_interactions: number;
  tampered_interactions: number;
  missing_interactions: number;
  checksum_valid: boolean;
  timestamp_valid: boolean;
  source_citations_valid: boolean;
  issues: string[];
  verification_details: {
    hash_algorithm: string;
    verification_method: string;
    last_backup: string;
  };
}

