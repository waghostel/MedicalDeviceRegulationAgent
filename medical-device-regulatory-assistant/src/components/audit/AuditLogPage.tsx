'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Search, 
  Filter, 
  Download, 
  ChevronDown, 
  ChevronRight,
  Clock,
  User,
  Activity
} from 'lucide-react';
import { AgentInteraction, AuditLogFilter } from '@/types/audit';
import { AuditLogFilters } from './AuditLogFilters';
import { AgentInteractionCard } from './AgentInteractionCard';
import { AuditLogExport } from './AuditLogExport';

interface AuditLogPageProps {
  projectId?: string;
}

export function AuditLogPage({ projectId }: AuditLogPageProps) {
  const [interactions, setInteractions] = useState<AgentInteraction[]>([]);
  const [filteredInteractions, setFilteredInteractions] = useState<AgentInteraction[]>([]);
  const [filters, setFilters] = useState<AuditLogFilter>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // Mock data for development - replace with actual API calls
  useEffect(() => {
    const mockInteractions: AgentInteraction[] = [
      {
        id: '1',
        projectId: projectId || 'project-1',
        userId: 'user-1',
        agentAction: 'predicate-search',
        inputData: {
          deviceDescription: 'Cardiac monitoring device',
          intendedUse: 'Continuous ECG monitoring for arrhythmia detection'
        },
        outputData: {
          predicates: [
            { kNumber: 'K123456', deviceName: 'CardioWatch Pro', confidenceScore: 0.89 }
          ]
        },
        confidenceScore: 0.89,
        sources: [
          {
            url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpmn/pmn.cfm?ID=K123456',
            title: 'CardioWatch Pro 510(k) Summary',
            effectiveDate: '2023-01-15',
            documentType: 'FDA_510K',
            accessedDate: '2024-01-20'
          }
        ],
        reasoning: 'Device shows high similarity in intended use and technological characteristics. Both devices use similar ECG sensor technology and arrhythmia detection algorithms.',
        executionTimeMs: 2340,
        createdAt: new Date('2024-01-20T10:30:00Z'),
        status: 'completed'
      },
      {
        id: '2',
        projectId: projectId || 'project-1',
        userId: 'user-1',
        agentAction: 'classify-device',
        inputData: {
          deviceDescription: 'Cardiac monitoring device with AI-powered analysis',
          intendedUse: 'Real-time arrhythmia detection and alert system'
        },
        outputData: {
          deviceClass: 'II',
          productCode: 'DPS',
          regulatoryPathway: '510k'
        },
        confidenceScore: 0.92,
        sources: [
          {
            url: 'https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfcfr/CFRSearch.cfm?fr=870.2300',
            title: 'CFR 870.2300 - Electrocardiograph',
            effectiveDate: '2023-03-01',
            documentType: 'CFR_SECTION',
            accessedDate: '2024-01-20'
          }
        ],
        reasoning: 'Based on intended use for arrhythmia detection, device falls under Class II medical device category with product code DPS (Arrhythmia Detector and Alarm).',
        executionTimeMs: 1850,
        createdAt: new Date('2024-01-20T09:15:00Z'),
        status: 'completed'
      }
    ];

    setTimeout(() => {
      setInteractions(mockInteractions);
      setFilteredInteractions(mockInteractions);
      setIsLoading(false);
    }, 1000);
  }, [projectId]);

  // Filter interactions based on search term and filters
  useEffect(() => {
    let filtered = interactions;

    // Apply search term
    if (searchTerm) {
      filtered = filtered.filter(interaction =>
        interaction.agentAction.toLowerCase().includes(searchTerm.toLowerCase()) ||
        interaction.reasoning.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(interaction.inputData).toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply filters
    if (filters.agentAction) {
      filtered = filtered.filter(interaction => interaction.agentAction === filters.agentAction);
    }

    if (filters.status) {
      filtered = filtered.filter(interaction => interaction.status === filters.status);
    }

    if (filters.confidenceRange) {
      filtered = filtered.filter(interaction => 
        interaction.confidenceScore >= filters.confidenceRange!.min &&
        interaction.confidenceScore <= filters.confidenceRange!.max
      );
    }

    if (filters.dateRange) {
      filtered = filtered.filter(interaction => 
        interaction.createdAt >= filters.dateRange!.start &&
        interaction.createdAt <= filters.dateRange!.end
      );
    }

    setFilteredInteractions(filtered);
  }, [interactions, searchTerm, filters]);

  const handleFilterChange = (newFilters: AuditLogFilter) => {
    setFilters(newFilters);
  };

  const getStatusBadgeVariant = (status: AgentInteraction['status']) => {
    switch (status) {
      case 'completed': return 'default';
      case 'pending': return 'secondary';
      case 'failed': return 'destructive';
      case 'cancelled': return 'outline';
      default: return 'secondary';
    }
  };

  const formatActionName = (action: string) => {
    return action
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading audit trail...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Trail</h1>
          <p className="text-muted-foreground">
            Complete history of agent interactions and regulatory decisions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search interactions, reasoning, or input data..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              Filters
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t">
              <AuditLogFilters
                filters={filters}
                onFiltersChange={handleFilterChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-500" />
              <div>
                <p className="text-sm font-medium">Total Interactions</p>
                <p className="text-2xl font-bold">{interactions.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <div>
                <p className="text-sm font-medium">Avg Response Time</p>
                <p className="text-2xl font-bold">
                  {Math.round(interactions.reduce((acc, i) => acc + i.executionTimeMs, 0) / interactions.length / 1000)}s
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-purple-500" />
              <div>
                <p className="text-sm font-medium">Avg Confidence</p>
                <p className="text-2xl font-bold">
                  {Math.round(interactions.reduce((acc, i) => acc + i.confidenceScore, 0) / interactions.length * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="h-4 w-4 rounded-full p-0" />
              <div>
                <p className="text-sm font-medium">Success Rate</p>
                <p className="text-2xl font-bold">
                  {Math.round(interactions.filter(i => i.status === 'completed').length / interactions.length * 100)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Interactions List */}
      <div className="space-y-4">
        {filteredInteractions.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">No interactions found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredInteractions.map((interaction) => (
            <AgentInteractionCard
              key={interaction.id}
              interaction={interaction}
            />
          ))
        )}
      </div>

      {/* Export Modal */}
      {showExport && (
        <AuditLogExport
          interactions={filteredInteractions}
          onClose={() => setShowExport(false)}
        />
      )}
    </div>
  );
}