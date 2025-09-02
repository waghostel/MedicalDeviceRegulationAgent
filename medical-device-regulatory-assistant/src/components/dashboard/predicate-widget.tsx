/**
 * Predicate Widget Component
 * Displays predicate devices with confidence scores and selection status
 */

'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  RefreshCw, 
  Search, 
  ExternalLink,
  Loader2,
  Star,
  FileText,
  TrendingUp
} from 'lucide-react';
import { PredicateDevice, PredicateWidgetProps } from '@/types/dashboard';

export function PredicateWidget({
  predicates,
  loading = false,
  error,
  onSearchPredicates,
  onSelectPredicate,
  onRefresh
}: PredicateWidgetProps) {
  const [activeTab, setActiveTab] = useState('overview');

  const selectedPredicates = predicates.filter(p => p.isSelected);
  const topMatches = predicates
    .sort((a, b) => b.confidenceScore - a.confidenceScore)
    .slice(0, 5);

  const averageConfidence = predicates.length > 0 
    ? predicates.reduce((sum, p) => sum + p.confidenceScore, 0) / predicates.length
    : 0;

  const getConfidenceColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getConfidenceBadgeVariant = (score: number) => {
    if (score >= 0.8) return 'default';
    if (score >= 0.6) return 'secondary';
    return 'destructive';
  };

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-red-500" />
            Predicate Devices
            <Badge variant="destructive">Error</Badge>
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
            <Button onClick={onSearchPredicates} disabled={loading}>
              Search Predicates
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (predicates.length === 0 && !loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-400" />
            Predicate Devices
            <Badge variant="outline">Pending</Badge>
          </CardTitle>
          <CardDescription>
            Search for 510(k) predicate devices for substantial equivalence
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <Search className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              No predicate devices have been identified yet. Start by searching the FDA database.
            </p>
            <Button onClick={onSearchPredicates} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search Predicates
                </>
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
            <Loader2 className="h-4 w-4 animate-spin" />
            Predicate Devices
            <Badge variant="outline">Searching...</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-2 bg-gray-200 rounded w-full"></div>
              </div>
            ))}
            <p className="text-sm text-gray-600 text-center">
              Searching FDA 510(k) database for similar devices...
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
          <CheckCircle className="h-4 w-4 text-green-500" />
          Predicate Devices
          <Badge variant="default">
            {predicates.length} Found
          </Badge>
        </CardTitle>
        <CardDescription>
          510(k) predicate devices for substantial equivalence comparison
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="top-matches">Top Matches</TabsTrigger>
            <TabsTrigger value="selected">Selected ({selectedPredicates.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4 space-y-4">
            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{predicates.length}</div>
                <div className="text-sm text-gray-600">Total Found</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{selectedPredicates.length}</div>
                <div className="text-sm text-gray-600">Selected</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${getConfidenceColor(averageConfidence)}`}>
                  {Math.round(averageConfidence * 100)}%
                </div>
                <div className="text-sm text-gray-600">Avg. Confidence</div>
              </div>
            </div>

            {/* Average Confidence Bar */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-600">Average Confidence</label>
                <span className={`text-sm font-semibold ${getConfidenceColor(averageConfidence)}`}>
                  {Math.round(averageConfidence * 100)}%
                </span>
              </div>
              <Progress value={averageConfidence * 100} className="h-2" />
            </div>

            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm" onClick={onSearchPredicates}>
                <Search className="h-4 w-4 mr-2" />
                Search More
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="top-matches" className="mt-4 space-y-3">
            {topMatches.map((predicate) => (
              <Card key={predicate.id} className="p-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs">
                        {predicate.kNumber}
                      </Badge>
                      <Badge variant={getConfidenceBadgeVariant(predicate.confidenceScore)} className="text-xs">
                        {Math.round(predicate.confidenceScore * 100)}%
                      </Badge>
                      {predicate.isSelected && (
                        <Star className="h-3 w-3 text-yellow-500 fill-current" />
                      )}
                    </div>
                    <h4 className="font-medium text-sm mb-1">{predicate.deviceName}</h4>
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {predicate.intendedUse}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-xs text-gray-500">
                        Product Code: {predicate.productCode}
                      </span>
                      <span className="text-xs text-gray-500">
                        Cleared: {new Date(predicate.clearanceDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 ml-2">
                    <Button
                      variant={predicate.isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => onSelectPredicate?.(predicate)}
                    >
                      {predicate.isSelected ? 'Selected' : 'Select'}
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <a 
                        href={`https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${predicate.kNumber}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="selected" className="mt-4 space-y-3">
            {selectedPredicates.length === 0 ? (
              <div className="text-center py-6">
                <Star className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">
                  No predicate devices selected yet. Review the top matches and select the most suitable ones.
                </p>
                <Button variant="outline" onClick={() => setActiveTab('top-matches')}>
                  View Top Matches
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Selected Predicates ({selectedPredicates.length})</h4>
                  <Badge variant="secondary">
                    Avg: {Math.round(selectedPredicates.reduce((sum, p) => sum + p.confidenceScore, 0) / selectedPredicates.length * 100)}%
                  </Badge>
                </div>
                {selectedPredicates.map((predicate) => (
                  <Card key={predicate.id} className="p-3 border-green-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">
                            {predicate.kNumber}
                          </Badge>
                          <Badge variant="default" className="text-xs">
                            {Math.round(predicate.confidenceScore * 100)}%
                          </Badge>
                          <Star className="h-3 w-3 text-yellow-500 fill-current" />
                        </div>
                        <h4 className="font-medium text-sm mb-1">{predicate.deviceName}</h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {predicate.intendedUse}
                        </p>
                      </div>
                      <div className="flex flex-col gap-1 ml-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onSelectPredicate?.(predicate)}
                        >
                          Deselect
                        </Button>
                        <Button variant="ghost" size="sm" asChild>
                          <a 
                            href={`https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=${predicate.kNumber}`}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}