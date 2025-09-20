'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Download,
  RefreshCw,
  FileText,
  Lock,
  Clock,
} from 'lucide-react';
import { ComplianceReport, AuditIntegrityResult } from '@/types/audit';
import { auditAPI, downloadFile } from '@/lib/api/audit';
import { useToast } from '@/hooks/use-toast';

interface ComplianceDashboardProps {
  projectId: string;
}

export function ComplianceDashboard({ projectId }: ComplianceDashboardProps) {
  const [complianceReport, setComplianceReport] =
    useState<ComplianceReport | null>(null);
  const [integrityResult, setIntegrityResult] =
    useState<AuditIntegrityResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [isVerifyingIntegrity, setIsVerifyingIntegrity] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadComplianceData();
  }, [projectId]);

  const loadComplianceData = async () => {
    try {
      setIsLoading(true);

      // Load compliance report
      const report = await auditAPI.generateComplianceReport({
        project_id: parseInt(projectId),
        report_type: 'summary',
        include_integrity_check: true,
      });

      setComplianceReport(report);

      if (report.integrity_verification) {
        setIntegrityResult(report.integrity_verification);
      }
    } catch (error) {
      console.error('Failed to load compliance data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load compliance data',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateFullReport = async () => {
    try {
      setIsGeneratingReport(true);

      const report = await auditAPI.generateComplianceReport({
        project_id: parseInt(projectId),
        report_type: 'full',
        include_integrity_check: true,
      });

      // Create and download report as JSON
      const blob = new Blob([JSON.stringify(report, null, 2)], {
        type: 'application/json',
      });

      const filename = `compliance_report_${projectId}_${new Date().toISOString().split('T')[0]}.json`;
      downloadFile(blob, filename);

      toast({
        title: 'Success',
        description: 'Compliance report generated and downloaded',
      });
    } catch (error) {
      console.error('Failed to generate report:', error);
      toast({
        title: 'Error',
        description: 'Failed to generate compliance report',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const verifyIntegrity = async () => {
    try {
      setIsVerifyingIntegrity(true);

      const result = await auditAPI.verifyAuditIntegrity(parseInt(projectId));
      setIntegrityResult(result);

      toast({
        title: result.is_valid
          ? 'Integrity Verified'
          : 'Integrity Issues Found',
        description: result.is_valid
          ? 'All audit entries are valid and untampered'
          : `${result.tampered_entries.length} entries show signs of tampering`,
        variant: result.is_valid ? 'default' : 'destructive',
      });
    } catch (error) {
      console.error('Failed to verify integrity:', error);
      toast({
        title: 'Error',
        description: 'Failed to verify audit integrity',
        variant: 'destructive',
      });
    } finally {
      setIsVerifyingIntegrity(false);
    }
  };

  const getComplianceStatus = (score: number) => {
    if (score >= 0.95)
      return {
        status: 'excellent',
        color: 'text-green-600',
        icon: CheckCircle,
      };
    if (score >= 0.8)
      return { status: 'good', color: 'text-yellow-600', icon: AlertTriangle };
    return { status: 'poor', color: 'text-red-600', icon: XCircle };
  };

  const getComplianceScore = () => {
    if (!complianceReport) return 0;

    const compliance = complianceReport.regulatory_compliance;
    const total = Object.keys(compliance).length;
    const passed = Object.values(compliance).filter(Boolean).length;

    return passed / total;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading compliance data...</p>
        </div>
      </div>
    );
  }

  if (!complianceReport) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          No compliance data available. Please ensure audit trail data exists
          for this project.
        </AlertDescription>
      </Alert>
    );
  }

  const complianceScore = getComplianceScore();
  const complianceStatus = getComplianceStatus(complianceScore);
  const StatusIcon = complianceStatus.icon;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Compliance Dashboard</h2>
          <p className="text-muted-foreground">
            Regulatory compliance status and audit trail integrity
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={loadComplianceData}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button>
          <Button
            onClick={generateFullReport}
            disabled={isGeneratingReport}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            {isGeneratingReport ? 'Generating...' : 'Full Report'}
          </Button>
        </div>
      </div>

      {/* Overall Compliance Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <StatusIcon className={`h-8 w-8 ${complianceStatus.color}`} />
              <div>
                <p className="text-2xl font-bold">
                  {Math.round(complianceScore * 100)}%
                </p>
                <p className="text-sm text-muted-foreground capitalize">
                  {complianceStatus.status} Compliance
                </p>
              </div>
            </div>
            <Progress value={complianceScore * 100} className="w-32" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-medium">Total Entries</p>
              <p className="text-muted-foreground">
                {complianceReport.report_metadata.total_entries}
              </p>
            </div>
            <div>
              <p className="font-medium">Avg Confidence</p>
              <p className="text-muted-foreground">
                {Math.round(
                  complianceReport.compliance_metrics.average_confidence * 100
                )}
                %
              </p>
            </div>
            <div>
              <p className="font-medium">Error Rate</p>
              <p className="text-muted-foreground">
                {complianceReport.compliance_metrics.error_rate.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="font-medium">Generated</p>
              <p className="text-muted-foreground">
                {new Date(
                  complianceReport.report_metadata.generated_at
                ).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Regulatory Requirements */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            FDA Regulatory Requirements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Object.entries(complianceReport.regulatory_compliance).map(
              ([requirement, status]) => (
                <div
                  key={requirement}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    {status ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-600" />
                    )}
                    <span className="capitalize">
                      {requirement.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <Badge variant={status ? 'default' : 'destructive'}>
                    {status ? 'Compliant' : 'Non-Compliant'}
                  </Badge>
                </div>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Compliance Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Detailed Compliance Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Reasoning Completeness
                </span>
                <span className="text-sm">
                  {Math.round(
                    complianceReport.compliance_metrics.reasoning_completeness *
                      100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  complianceReport.compliance_metrics.reasoning_completeness *
                  100
                }
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Citation Completeness
                </span>
                <span className="text-sm">
                  {Math.round(
                    complianceReport.compliance_metrics.citation_completeness *
                      100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  complianceReport.compliance_metrics.citation_completeness *
                  100
                }
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm font-medium">
                  Confidence Score Coverage
                </span>
                <span className="text-sm">
                  {Math.round(
                    complianceReport.compliance_metrics
                      .confidence_score_coverage * 100
                  )}
                  %
                </span>
              </div>
              <Progress
                value={
                  complianceReport.compliance_metrics
                    .confidence_score_coverage * 100
                }
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Integrity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Audit Trail Integrity
            <Button
              variant="outline"
              size="sm"
              onClick={verifyIntegrity}
              disabled={isVerifyingIntegrity}
              className="ml-auto"
            >
              {isVerifyingIntegrity ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                'Verify Now'
              )}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {integrityResult ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {integrityResult.is_valid ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                  <span className="font-medium">
                    {integrityResult.is_valid
                      ? 'Integrity Verified'
                      : 'Integrity Issues Detected'}
                  </span>
                </div>
                <Badge
                  variant={integrityResult.is_valid ? 'default' : 'destructive'}
                >
                  {Math.round(integrityResult.integrity_score * 100)}% Valid
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="font-medium">Total Entries</p>
                  <p className="text-muted-foreground">
                    {integrityResult.total_entries}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Verified</p>
                  <p className="text-muted-foreground">
                    {integrityResult.verified_entries}
                  </p>
                </div>
                <div>
                  <p className="font-medium">Tampered</p>
                  <p className="text-muted-foreground">
                    {integrityResult.tampered_entries.length}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                Last verified:{' '}
                {new Date(
                  integrityResult.verification_timestamp
                ).toLocaleString()}
                <span className="ml-2">
                  Algorithm: {integrityResult.hash_algorithm}
                </span>
              </div>

              {integrityResult.tampered_entries.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {integrityResult.tampered_entries.length} entries show signs
                    of tampering. Entry IDs:{' '}
                    {integrityResult.tampered_entries.join(', ')}
                  </AlertDescription>
                </Alert>
              )}
            </div>
          ) : (
            <p className="text-muted-foreground">
              Click "Verify Now" to check audit trail integrity
            </p>
          )}
        </CardContent>
      </Card>

      {/* Action Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Agent Action Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(
              complianceReport.compliance_metrics.action_distribution
            ).map(([action, count]) => (
              <div key={action} className="flex items-center justify-between">
                <span className="text-sm capitalize">
                  {action.replace(/[-_]/g, ' ')}
                </span>
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full"
                      style={{
                        width: `${(count / Math.max(...Object.values(complianceReport.compliance_metrics.action_distribution))) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-medium w-8 text-right">
                    {count}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
