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