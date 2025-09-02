/**
 * Classification Widget Component
 * Displays device classification status, product code, and regulatory pathway
 */

'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  FileText, 
  ExternalLink,
  Loader2
} from 'lucide-react';
import { DeviceClassification, ClassificationWidgetProps } from '@/types/dashboard';

export function ClassificationWidget({
  classification,
  loading = false,
  error,
  onStartClassification,
  onRefresh
}: ClassificationWidgetProps) {
  const getStatusIcon = () => {
    if (loading) return <Loader2 className="h-4 w-4 animate-spin" />;
    if (error) return <AlertCircle className="h-4 w-4 text-red-500" />;
    if (classification) return <CheckCircle className="h-4 w-4 text-green-500" />;
    return <Clock className="h-4 w-4 text-gray-400" />;
  };

  const getStatusText = () => {
    if (loading) return 'Analyzing...';
    if (error) return 'Error';
    if (classification) return 'Completed';
    return 'Pending';
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPathwayBadgeVariant = (pathway: string) => {
    switch (pathway) {
      case '510k':
        return 'default';
      case 'PMA':
        return 'destructive';
      case 'De Novo':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Device Classification
            <Badge variant="destructive">{getStatusText()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {error}
            </AlertDescription>
          </Alert>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={loading}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
            <Button onClick={onStartClassification} disabled={loading}>
              Start Classification
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!classification && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Device Classification
            <Badge variant="outline">{getStatusText()}</Badge>
          </CardTitle>
          <CardDescription>
            Determine FDA device class and regulatory pathway
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Device classification analysis has not been performed yet.
            </p>
            <Button onClick={onStartClassification} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Start Classification Analysis'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getStatusIcon()}
            Device Classification
            <Badge variant="outline">{getStatusText()}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
            <Progress value={undefined} className="h-2" />
            <p className="text-sm text-gray-600 text-center">
              Analyzing device characteristics and FDA regulations...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {getStatusIcon()}
          Device Classification
          <Badge variant="default">{getStatusText()}</Badge>
        </CardTitle>
        <CardDescription>
          FDA classification and regulatory pathway determination
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Classification Results */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-600">Device Class</label>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className="text-lg font-bold">
                Class {classification.deviceClass}
              </Badge>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-600">Product Code</label>
            <div className="flex items-center gap-2 mt-1">
              <code className="bg-gray-100 px-2 py-1 rounded text-sm font-mono">
                {classification.productCode}
              </code>
              <Button variant="ghost" size="sm" asChild>
                <a 
                  href={`https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpcd/classification.cfm?ID=${classification.productCode}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3 w-3" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        {/* Regulatory Pathway */}
        <div>
          <label className="text-sm font-medium text-gray-600">Regulatory Pathway</label>
          <div className="mt-1">
            <Badge variant={getPathwayBadgeVariant(classification.regulatoryPathway)}>
              {classification.regulatoryPathway}
            </Badge>
          </div>
        </div>

        {/* CFR Sections */}
        {classification.cfrSections && classification.cfrSections.length > 0 && (
          <div>
            <label className="text-sm font-medium text-gray-600">CFR Sections</label>
            <div className="flex flex-wrap gap-1 mt-1">
              {classification.cfrSections.slice(0, 3).map((section, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {section}
                </Badge>
              ))}
              {classification.cfrSections.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{classification.cfrSections.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Confidence Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-600">Confidence Score</label>
            <span className={`text-sm font-semibold ${getConfidenceColor(classification.confidenceScore)}`}>
              {Math.round(classification.confidenceScore * 100)}%
            </span>
          </div>
          <Progress 
            value={classification.confidenceScore * 100} 
            className="h-2"
          />
        </div>

        {/* Reasoning */}
        {classification.reasoning && (
          <div>
            <label className="text-sm font-medium text-gray-600">Analysis Reasoning</label>
            <div className="mt-1 p-3 bg-gray-50 rounded-md">
              <p className="text-sm text-gray-700">
                {classification.reasoning}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onStartClassification}>
            Re-analyze
          </Button>
        </div>

        {/* Metadata */}
        <div className="text-xs text-gray-500 pt-2 border-t">
          Completed: {new Date(classification.createdAt).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}