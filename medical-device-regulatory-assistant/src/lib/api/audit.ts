/**
 * Audit API - Frontend service for audit trail and compliance management
 * Handles API communication with the backend for audit logging and compliance reporting
 */

import {
  AgentInteraction,
  AuditLogFilter,
  ComplianceReport,
  AuditIntegrityResult,
} from '@/types/audit';

export interface AuditTrailResponse {
  interactions: AgentInteraction[];
  summary: {
    total_interactions: number;
    confidence_distribution: Record<string, number>;
    action_types: Record<string, number>;
    date_range: {
      start: string;
      end: string;
    };
  };
  pagination: {
    page: number;
    size: number;
    total: number;
    pages: number;
  };
}

class AuditAPI {
  private baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

  /**
   * Make API request with error handling
   */
  private async apiRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  /**
   * Get audit trail for a project with filtering
   */
  async getAuditTrail(
    projectId: string,
    filters: AuditLogFilter = {},
    page = 1,
    size = 50
  ): Promise<AuditTrailResponse> {
    try {
      // For now, return mock data. Replace with API call when backend is ready
      const mockInteractions: AgentInteraction[] = [
        {
          id: 1,
          project_id: parseInt(projectId),
          user_id: 'user_123',
          agent_action: 'Device Classification',
          input_data: {
            device_description: 'Cardiac monitoring device',
            intended_use: 'Continuous cardiac rhythm monitoring',
          },
          output_data: {
            device_class: 'II',
            product_code: 'DPS',
            regulatory_pathway: '510k',
          },
          confidence_score: 0.85,
          sources: [
            {
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300',
              title: 'CFR 870.2300 - Cardiac monitor',
              effective_date: '2023-01-01',
              document_type: 'CFR_SECTION',
              accessed_date: '2024-01-20T10:00:00Z',
            },
          ],
          reasoning:
            'Device classified as Class II based on intended use for cardiac monitoring and comparison with existing product codes.',
          execution_time_ms: 2500,
          created_at: '2024-01-20T10:00:00Z',
        },
        {
          id: 2,
          project_id: parseInt(projectId),
          user_id: 'user_123',
          agent_action: 'Predicate Search',
          input_data: {
            device_description: 'Cardiac monitoring device',
            intended_use: 'Continuous cardiac rhythm monitoring',
            product_code: 'DPS',
          },
          output_data: {
            predicates: [
              {
                k_number: 'K123456',
                device_name: 'CardioWatch Pro',
                confidence_score: 0.92,
              },
              {
                k_number: 'K789012',
                device_name: 'HeartMonitor Elite',
                confidence_score: 0.88,
              },
            ],
          },
          confidence_score: 0.92,
          sources: [
            {
              url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
              title: 'FDA 510(k) - K123456',
              effective_date: '2023-06-15',
              document_type: 'FDA_510K',
              accessed_date: '2024-01-20T11:00:00Z',
            },
          ],
          reasoning:
            'Found 5 potential predicates with high similarity in intended use and technological characteristics.',
          execution_time_ms: 8500,
          created_at: '2024-01-20T11:00:00Z',
        },
      ];

      // Apply filters (mock implementation)
      let filteredInteractions = [...mockInteractions];

      if (filters.action_type) {
        filteredInteractions = filteredInteractions.filter(
          (interaction) => interaction.agent_action === filters.action_type
        );
      }

      if (filters.confidence_min !== undefined) {
        filteredInteractions = filteredInteractions.filter(
          (interaction) =>
            (interaction.confidence_score || 0) >= filters.confidence_min!
        );
      }

      if (filters.date_from) {
        filteredInteractions = filteredInteractions.filter(
          (interaction) =>
            new Date(interaction.created_at) >= new Date(filters.date_from!)
        );
      }

      if (filters.date_to) {
        filteredInteractions = filteredInteractions.filter(
          (interaction) =>
            new Date(interaction.created_at) <= new Date(filters.date_to!)
        );
      }

      // Pagination
      const startIndex = (page - 1) * size;
      const paginatedInteractions = filteredInteractions.slice(
        startIndex,
        startIndex + size
      );

      return {
        interactions: paginatedInteractions,
        summary: {
          total_interactions: filteredInteractions.length,
          confidence_distribution: {
            'high (>0.8)': filteredInteractions.filter(
              (i) => (i.confidence_score || 0) > 0.8
            ).length,
            'medium (0.5-0.8)': filteredInteractions.filter(
              (i) =>
                (i.confidence_score || 0) >= 0.5 &&
                (i.confidence_score || 0) <= 0.8
            ).length,
            'low (<0.5)': filteredInteractions.filter(
              (i) => (i.confidence_score || 0) < 0.5
            ).length,
          },
          action_types: filteredInteractions.reduce(
            (acc, interaction) => {
              acc[interaction.agent_action] =
                (acc[interaction.agent_action] || 0) + 1;
              return acc;
            },
            {} as Record<string, number>
          ),
          date_range: {
            start:
              filteredInteractions.length > 0
                ? filteredInteractions[filteredInteractions.length - 1]
                    .created_at
                : '',
            end:
              filteredInteractions.length > 0
                ? filteredInteractions[0].created_at
                : '',
          },
        },
        pagination: {
          page,
          size,
          total: filteredInteractions.length,
          pages: Math.ceil(filteredInteractions.length / size),
        },
      };
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      throw error;
    }
  }

  /**
   * Get compliance report for a project
   */
  async getComplianceReport(projectId: string): Promise<ComplianceReport> {
    try {
      // For now, return mock data. Replace with API call when backend is ready
      const mockReport: ComplianceReport = {
        project_id: parseInt(projectId),
        generated_at: new Date().toISOString(),
        compliance_score: 0.92,
        requirements_met: 18,
        total_requirements: 20,
        critical_issues: [],
        warnings: [
          {
            category: 'Source Citations',
            message: 'Some AI outputs lack complete source citations',
            severity: 'medium',
            affected_interactions: [1],
          },
        ],
        recommendations: [
          'Ensure all AI outputs include complete source citations with effective dates',
          'Consider additional predicate analysis for higher confidence scores',
        ],
        audit_trail_summary: {
          total_interactions: 15,
          human_approvals: 12,
          pending_approvals: 3,
          confidence_distribution: {
            high: 10,
            medium: 4,
            low: 1,
          },
        },
        regulatory_readiness: {
          classification_complete: true,
          predicates_identified: true,
          documentation_complete: false,
          submission_ready: false,
        },
      };

      return mockReport;
    } catch (error) {
      console.error('Failed to fetch compliance report:', error);
      throw error;
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditIntegrity(projectId: string): Promise<AuditIntegrityResult> {
    try {
      // For now, return mock data. Replace with API call when backend is ready
      const mockResult: AuditIntegrityResult = {
        project_id: parseInt(projectId),
        verified_at: new Date().toISOString(),
        integrity_score: 0.98,
        total_interactions: 15,
        verified_interactions: 15,
        tampered_interactions: 0,
        missing_interactions: 0,
        checksum_valid: true,
        timestamp_valid: true,
        source_citations_valid: true,
        issues: [],
        verification_details: {
          hash_algorithm: 'SHA-256',
          verification_method: 'Digital signature',
          last_backup: '2024-01-20T00:00:00Z',
        },
      };

      return mockResult;
    } catch (error) {
      console.error('Failed to verify audit integrity:', error);
      throw error;
    }
  }

  /**
   * Export audit trail
   */
  async exportAuditTrail(
    projectId: string,
    format: 'json' | 'csv' | 'pdf' = 'json',
    filters: AuditLogFilter = {}
  ): Promise<Blob> {
    try {
      // For now, create mock export. Replace with API call when backend is ready
      const auditData = await this.getAuditTrail(projectId, filters, 1, 1000);

      if (format === 'json') {
        const jsonString = JSON.stringify(auditData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
      } else if (format === 'csv') {
        // Simple CSV export
        const headers = [
          'ID',
          'Action',
          'Confidence',
          'Created At',
          'Reasoning',
        ];
        const rows = auditData.interactions.map((interaction) => [
          interaction.id.toString(),
          interaction.agent_action,
          (interaction.confidence_score || 0).toString(),
          interaction.created_at,
          interaction.reasoning || '',
        ]);

        const csvContent = [headers, ...rows]
          .map((row) => row.join(','))
          .join('\n');
        return new Blob([csvContent], { type: 'text/csv' });
      } else {
        // For PDF, we'd need a PDF generation library
        // For now, return JSON as fallback
        const jsonString = JSON.stringify(auditData, null, 2);
        return new Blob([jsonString], { type: 'application/json' });
      }
    } catch (error) {
      console.error('Failed to export audit trail:', error);
      throw error;
    }
  }
}

/**
 * Download file helper function
 */
export function downloadFile(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Export singleton instance
export const auditAPI = new AuditAPI();
