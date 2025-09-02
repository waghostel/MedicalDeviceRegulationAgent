/**
 * Audit Trail and Compliance Types
 * Defines interfaces for tracking agent interactions and compliance data
 */

export interface SourceCitation {
  url: string;
  title: string;
  effectiveDate: string;
  documentType: 'FDA_510K' | 'FDA_GUIDANCE' | 'CFR_SECTION' | 'FDA_DATABASE';
  accessedDate: string;
}

export interface AgentInteraction {
  id: string;
  projectId: string;
  userId: string;
  agentAction: string;
  inputData: Record<string, any>;
  outputData: Record<string, any>;
  confidenceScore: number;
  sources: SourceCitation[];
  reasoning: string;
  executionTimeMs: number;
  createdAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}

export interface AuditLogFilter {
  projectId?: string;
  agentAction?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
  status?: AgentInteraction['status'];
  searchTerm?: string;
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
  data?: Record<string, any>;
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
  report_metadata: {
    project_id: number;
    report_type: string;
    generated_at: string;
    generated_by: string;
    total_entries: number;
  };
  compliance_metrics: ComplianceMetrics;
  audit_summary: {
    total_interactions: number;
    action_counts: Record<string, number>;
    average_confidence: number;
    total_execution_time: number;
    average_execution_time: number;
    error_count: number;
    error_rate: number;
    date_range?: {
      start: string;
      end: string;
    };
  };
  integrity_verification?: AuditIntegrityResult;
  regulatory_compliance: {
    fda_traceability: boolean;
    complete_reasoning_traces: boolean;
    source_citations_complete: boolean;
    confidence_scores_present: boolean;
  };
  detailed_entries?: AgentInteraction[];
}

export interface AuditIntegrityResult {
  is_valid: boolean;
  total_entries: number;
  verified_entries: number;
  tampered_entries: number[];
  integrity_score: number;
  verification_timestamp: string;
  hash_algorithm: string;
}

export interface AuditLogFilter {
  projectId?: string;
  userId?: number;
  agentAction?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  confidenceRange?: {
    min: number;
    max: number;
  };
  status?: AgentInteraction['status'];
  searchTerm?: string;
}