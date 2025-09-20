'use client';

import { format } from 'date-fns';
import {
  Download,
  FileText,
  Table,
  CalendarIcon,
  Loader,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import React, { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AgentInteraction, AuditLogExportOptions } from '@/types/audit';

interface AuditLogExportProps {
  interactions: AgentInteraction[];
  onClose: () => void;
}

export const AuditLogExport = ({ interactions, onClose }: AuditLogExportProps) => {
  const [exportOptions, setExportOptions] = useState<AuditLogExportOptions>({
    format: 'PDF',
    includeReasoningTraces: true,
    includeSources: true,
  });
  const [customFilename, setCustomFilename] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<
    'idle' | 'success' | 'error'
  >('idle');

  const handleExportOptionChange = (
    key: keyof AuditLogExportOptions,
    value: any
  ) => {
    setExportOptions((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleDateRangeChange = (
    field: 'start' | 'end',
    date: Date | undefined
  ) => {
    if (!date) return;

    const currentRange = exportOptions.dateRange || {
      start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      end: new Date(),
    };

    setExportOptions((prev) => ({
      ...prev,
      dateRange: {
        ...currentRange,
        [field]: date,
      },
    }));
  };

  const generateFilename = () => {
    if (customFilename.trim()) {
      return customFilename.trim();
    }

    const timestamp = format(new Date(), 'yyyy-MM-dd_HH-mm');
    const extension = exportOptions.format.toLowerCase();
    return `audit-trail_${timestamp}.${extension}`;
  };

  const exportToPDF = async (filteredInteractions: AgentInteraction[]) => {
    // In a real implementation, this would use a PDF generation library like jsPDF or Puppeteer
    // For now, we'll simulate the export process

    const content = generatePDFContent(filteredInteractions);

    // Create a blob with HTML content that could be converted to PDF
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = generateFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportToCSV = async (filteredInteractions: AgentInteraction[]) => {
    const csvContent = generateCSVContent(filteredInteractions);

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = generateFilename();
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const generatePDFContent = (interactions: AgentInteraction[]) => {
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Medical Device Regulatory Assistant - Audit Trail</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          .header { border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
          .interaction { border: 1px solid #ddd; margin-bottom: 20px; padding: 15px; }
          .interaction-header { background-color: #f5f5f5; padding: 10px; margin: -15px -15px 15px -15px; }
          .confidence-score { background-color: #e8f4fd; padding: 5px; border-radius: 3px; }
          .reasoning { background-color: #f9f9f9; padding: 10px; border-left: 3px solid #007acc; }
          .sources { margin-top: 10px; }
          .source { margin-bottom: 5px; font-size: 12px; }
          pre { white-space: pre-wrap; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Medical Device Regulatory Assistant</h1>
          <h2>Audit Trail Report</h2>
          <p>Generated on: ${format(new Date(), 'MMMM dd, yyyy at h:mm a')}</p>
          <p>Total Interactions: ${interactions.length}</p>
          ${
            exportOptions.dateRange
              ? `
            <p>Date Range: ${format(exportOptions.dateRange.start, 'MMM dd, yyyy')} - ${format(exportOptions.dateRange.end, 'MMM dd, yyyy')}</p>
          `
              : ''
          }
        </div>
        
        ${interactions
          .map(
            (interaction, index) => `
          <div class="interaction">
            <div class="interaction-header">
              <h3>Interaction ${index + 1}: ${interaction.agentAction.replace('-', ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</h3>
              <p><strong>Date:</strong> ${format(interaction.createdAt, 'MMMM dd, yyyy at h:mm a')}</p>
              <p><strong>Status:</strong> ${interaction.status}</p>
              <p><strong>Execution Time:</strong> ${(interaction.executionTimeMs / 1000).toFixed(1)}s</p>
            </div>
            
            <div class="confidence-score">
              <strong>Confidence Score:</strong> ${Math.round(interaction.confidenceScore * 100)}% (${interaction.confidenceScore.toFixed(3)})
            </div>
            
            <h4>Input Data:</h4>
            <pre>${JSON.stringify(interaction.inputData, null, 2)}</pre>
            
            <h4>Output Data:</h4>
            <pre>${JSON.stringify(interaction.outputData, null, 2)}</pre>
            
            ${
              exportOptions.includeReasoningTraces
                ? `
              <h4>Reasoning:</h4>
              <div class="reasoning">${interaction.reasoning}</div>
            `
                : ''
            }
            
            ${
              exportOptions.includeSources && interaction.sources.length > 0
                ? `
              <h4>Sources (${interaction.sources.length}):</h4>
              <div class="sources">
                ${interaction.sources
                  .map(
                    (source) => `
                  <div class="source">
                    <strong>${source.title}</strong><br>
                    Type: ${source.documentType}<br>
                    URL: <a href="${source.url}">${source.url}</a><br>
                    Effective Date: ${source.effectiveDate}<br>
                    Accessed: ${source.accessedDate}
                  </div>
                `
                  )
                  .join('')}
              </div>
            `
                : ''
            }
          </div>
        `
          )
          .join('')}
        
        <div class="footer" style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666;">
          <p><strong>Disclaimer:</strong> This audit trail is generated by an AI system and should be reviewed by qualified regulatory professionals before use in formal submissions.</p>
          <p><strong>Export Options:</strong> 
            Format: ${exportOptions.format}, 
            Reasoning Traces: ${exportOptions.includeReasoningTraces ? 'Included' : 'Excluded'}, 
            Sources: ${exportOptions.includeSources ? 'Included' : 'Excluded'}
          </p>
        </div>
      </body>
      </html>
    `;

    return html;
  };

  const generateCSVContent = (interactions: AgentInteraction[]) => {
    const headers = [
      'ID',
      'Date',
      'Agent Action',
      'Status',
      'Confidence Score',
      'Execution Time (ms)',
      'Input Data',
      'Output Data',
    ];

    if (exportOptions.includeReasoningTraces) {
      headers.push('Reasoning');
    }

    if (exportOptions.includeSources) {
      headers.push('Sources Count', 'Source URLs');
    }

    const csvRows = [headers.join(',')];

    interactions.forEach((interaction) => {
      const row = [
        interaction.id,
        format(interaction.createdAt, 'yyyy-MM-dd HH:mm:ss'),
        interaction.agentAction,
        interaction.status,
        interaction.confidenceScore.toFixed(3),
        interaction.executionTimeMs.toString(),
        `"${JSON.stringify(interaction.inputData).replace(/"/g, '""')}"`,
        `"${JSON.stringify(interaction.outputData).replace(/"/g, '""')}"`,
      ];

      if (exportOptions.includeReasoningTraces) {
        row.push(`"${interaction.reasoning.replace(/"/g, '""')}"`);
      }

      if (exportOptions.includeSources) {
        row.push(interaction.sources.length.toString());
        row.push(`"${interaction.sources.map((s) => s.url).join('; ')}"`);
      }

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportStatus('idle');

    try {
      // Filter interactions by date range if specified
      let filteredInteractions = interactions;

      if (exportOptions.dateRange) {
        filteredInteractions = interactions.filter(
          (interaction) =>
            interaction.createdAt >= exportOptions.dateRange!.start &&
            interaction.createdAt <= exportOptions.dateRange!.end
        );
      }

      if (exportOptions.format === 'PDF') {
        await exportToPDF(filteredInteractions);
      } else {
        await exportToCSV(filteredInteractions);
      }

      setExportStatus('success');

      // Auto-close after successful export
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('error');
    } finally {
      setIsExporting(false);
    }
  };

  const getFilteredCount = () => {
    if (!exportOptions.dateRange) return interactions.length;

    return interactions.filter(
      (interaction) =>
        interaction.createdAt >= exportOptions.dateRange!.start &&
        interaction.createdAt <= exportOptions.dateRange!.end
    ).length;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Audit Trail
          </DialogTitle>
          <DialogDescription>
            Export audit trail data for compliance and reporting purposes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Export Format */}
          <div className="space-y-2">
            <Label>Export Format</Label>
            <Select
              value={exportOptions.format}
              onValueChange={(value: 'PDF' | 'CSV') =>
                handleExportOptionChange('format', value)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PDF">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    PDF Report
                  </div>
                </SelectItem>
                <SelectItem value="CSV">
                  <div className="flex items-center gap-2">
                    <Table className="h-4 w-4" />
                    CSV Data
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Custom Filename */}
          <div className="space-y-2">
            <Label htmlFor="filename">Custom Filename (optional)</Label>
            <Input
              id="filename"
              placeholder={generateFilename()}
              value={customFilename}
              onChange={(e) => setCustomFilename(e.target.value)}
            />
          </div>

          {/* Date Range */}
          <div className="space-y-2">
            <Label>Date Range (optional)</Label>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportOptions.dateRange?.start
                      ? format(exportOptions.dateRange.start, 'MMM dd')
                      : 'From'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={exportOptions.dateRange?.start}
                    onSelect={(date) => handleDateRangeChange('start', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {exportOptions.dateRange?.end
                      ? format(exportOptions.dateRange.end, 'MMM dd')
                      : 'To'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={exportOptions.dateRange?.end}
                    onSelect={(date) => handleDateRangeChange('end', date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Export Options */}
          <div className="space-y-3">
            <Label>Include in Export</Label>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="reasoning"
                checked={exportOptions.includeReasoningTraces}
                onCheckedChange={(checked) =>
                  handleExportOptionChange('includeReasoningTraces', checked)
                }
              />
              <Label htmlFor="reasoning" className="text-sm">
                Reasoning traces and analysis steps
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="sources"
                checked={exportOptions.includeSources}
                onCheckedChange={(checked) =>
                  handleExportOptionChange('includeSources', checked)
                }
              />
              <Label htmlFor="sources" className="text-sm">
                Source citations and references
              </Label>
            </div>
          </div>

          {/* Export Summary */}
          <div className="bg-muted p-3 rounded-md text-sm">
            <p>
              <strong>Export Summary:</strong>
            </p>
            <p>
              • {getFilteredCount()} interaction
              {getFilteredCount() !== 1 ? 's' : ''} will be exported
            </p>
            <p>• Format: {exportOptions.format}</p>
            <p>• Filename: {generateFilename()}</p>
          </div>

          {/* Export Status */}
          {exportStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded-md">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">Export completed successfully!</span>
            </div>
          )}

          {exportStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-2 rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">Export failed. Please try again.</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isExporting}>
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || getFilteredCount() === 0}
          >
            {isExporting ? (
              <>
                <Loader className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {exportOptions.format}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
