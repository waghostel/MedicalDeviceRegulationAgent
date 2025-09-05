/**
 * Audit Trail API Client
 * Handles all audit trail and compliance related API calls
 */

import { AgentInteraction, AuditLogFilter, ComplianceReport, AuditIntegrityResult } from '@/types/audit';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface AuditTrailResponse {
  audit_entries: AgentInteraction[];
  summary: {
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
  total_count: number;
  filters_applied: {
    user_id?: number;
    action_filter?: string;
    start_date?: string;
    end_date?: string;
    limit: number;
  };
}

export interface AuditExportRequest {
  project_id: number;
  format_type: 'json' | 'csv' | 'pdf';
  user_id?: number;
  start_date?: string;
  end_date?: string;
  include_reasoning?: boolean;
  include_sources?: boolean;
}

export interface ComplianceReportRequest {
  project_id: number;
  report_type: 'full' | 'summary' | 'regulatory';
  include_integrity_check?: boolean;
}

export interface RetentionPolicyRequest {
  retention_days: number;
  project_id?: number;
  archive_before_delete?: boolean;
}

class AuditAPI {
  private async fetchWithAuth(url: string, options: RequestInit = {}) {
    const token = localStorage.getItem('auth_token'); // Adjust based on your auth implementation
    
    const response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response;
  }

  /**
   * Get audit trail for a project with optional filtering
   */
  async getAuditTrail(
    projectId: number,
    filters: AuditLogFilter = {},
    limit: number = 100
  ): Promise<AuditTrailResponse> {
    const params = new URLSearchParams({
      limit: limit.toString(),
    });

    if (filters.userId) params.append('user_id', filters.userId.toString());
    if (filters.agentAction) params.append('action_filter', filters.agentAction);
    if (filters.dateRange?.start) params.append('start_date', filters.dateRange.start.toISOString());
    if (filters.dateRange?.end) params.append('end_date', filters.dateRange.end.toISOString());

    const response = await this.fetchWithAuth(`/api/audit/trail/${projectId}?${params}`);
    const data = await response.json();

    // Transform backend data to frontend format
    return {
      ...data,
      audit_entries: data.audit_entries.map(this.transformAuditEntry),
    };
  }

  /**
   * Export audit trail in specified format
   */
  async exportAuditTrail(request: AuditExportRequest): Promise<Blob> {
    const response = await this.fetchWithAuth('/api/audit/export', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.blob();
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(request: ComplianceReportRequest): Promise<ComplianceReport> {
    const response = await this.fetchWithAuth('/api/audit/compliance-report', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditIntegrity(projectId: number): Promise<AuditIntegrityResult> {
    const response = await this.fetchWithAuth(`/api/audit/integrity/${projectId}`);
    return response.json();
  }

  /**
   * Apply data retention policy
   */
  async applyRetentionPolicy(request: RetentionPolicyRequest): Promise<{ message: string }> {
    const response = await this.fetchWithAuth('/api/audit/retention-policy', {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response.json();
  }

  /**
   * Log a new audit entry (for internal use)
   */
  async logAuditEntry(
    projectId: number,
    action: string,
    inputData: any,
    outputData: any,
    confidenceScore: number,
    sources: any[],
    reasoning: string,
    executionTimeMs?: number
  ): Promise<{ message: string; timestamp: string }> {
    const params = new URLSearchParams({
      project_id: projectId.toString(),
      action,
    });

    const response = await this.fetchWithAuth(`/api/audit/log?${params}`, {
      method: 'POST',
      body: JSON.stringify({
        input_data: inputData,
        output_data: outputData,
        confidence_score: confidenceScore,
        sources,
        reasoning,
        execution_time_ms: executionTimeMs,
      }),
    });

    return response.json();
  }

  /**
   * Transform backend audit entry to frontend format
   */
  private transformAuditEntry(entry: any): AgentInteraction {
    return {
      id: entry.id.toString(),
      projectId: entry.project_id.toString(),
      userId: entry.user_id.toString(),
      agentAction: entry.action,
      inputData: entry.input_data || {},
      outputData: entry.output_data || {},
      confidenceScore: entry.confidence_score || 0,
      sources: entry.sources || [],
      reasoning: entry.reasoning || '',
      executionTimeMs: entry.execution_time_ms || 0,
      createdAt: new Date(entry.created_at),
      status: this.determineStatus(entry),
    };
  }

  /**
   * Determine interaction status based on entry data
   */
  private determineStatus(entry: any): AgentInteraction['status'] {
    if (entry.action.includes('error')) return 'failed';
    if (entry.confidence_score === null) return 'pending';
    return 'completed';
  }

  /**
   * Real-time audit log updates using Server-Sent Events
   */
  subscribeToAuditUpdates(
    projectId: number,
    onUpdate: (interaction: AgentInteraction) => void,
    onError?: (error: Error) => void
  ): () => void {
    const eventSource = new EventSource(`${API_BASE_URL}/api/audit/stream/${projectId}`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        const interaction = this.transformAuditEntry(data);
        onUpdate(interaction);
      } catch (error) {
        console.error('Failed to parse audit update:', error);
        onError?.(error as Error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('Audit stream error:', error);
      onError?.(new Error('Audit stream connection failed'));
    };

    // Return cleanup function
    return () => {
      eventSource.close();
    };
  }
}

// Export singleton instance
export const auditAPI = new AuditAPI();

// Export utility functions
export const downloadFile = (blob: Blob, filename: string) => {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const formatAuditAction = (action: string): string => {
  return action
    .split(/[-_]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

export const getConfidenceColor = (score: number): string => {
  if (score >= 0.8) return 'text-green-600';
  if (score >= 0.6) return 'text-yellow-600';
  return 'text-red-600';
};

export const getStatusColor = (status: AgentInteraction['status']): string => {
  switch (status) {
    case 'completed': return 'text-green-600';
    case 'pending': return 'text-yellow-600';
    case 'failed': return 'text-red-600';
    case 'cancelled': return 'text-gray-600';
    default: return 'text-gray-600';
  }
};