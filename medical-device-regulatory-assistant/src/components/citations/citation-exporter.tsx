'use client';

import React, { useState } from 'react';
import { Download, FileText, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { SourceCitation } from '@/types/copilot';
import { formatCitation, CitationFormat } from './citation-utils';

interface CitationExporterProps {
  citations: SourceCitation[];
  projectName?: string;
  className?: string;
}

export function CitationExporter({
  citations,
  projectName = 'Regulatory Project',
  className = '',
}: CitationExporterProps) {
  const [format, setFormat] = useState<CitationFormat>('APA');
  const [isOpen, setIsOpen] = useState(false);

  const generateBibliography = (
    citations: SourceCitation[],
    format: CitationFormat
  ): string => {
    const header = `# Bibliography - ${projectName}\n\n`;
    const formatLabel = `**Format:** ${format} Style\n`;
    const dateGenerated = `**Generated:** ${new Date().toLocaleDateString()}\n\n`;

    const formattedCitations = citations
      .map(
        (citation, index) => `${index + 1}. ${formatCitation(citation, format)}`
      )
      .join('\n\n');

    return header + formatLabel + dateGenerated + formattedCitations;
  };

  const bibliography = generateBibliography(citations, format);

  const handleCopyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(bibliography);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy bibliography:', error);
    }
  };

  const handleDownloadAsText = () => {
    const blob = new Blob([bibliography], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_bibliography_${format.toLowerCase()}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadAsMarkdown = () => {
    const blob = new Blob([bibliography], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${projectName.replace(/\s+/g, '_')}_bibliography_${format.toLowerCase()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (citations.length === 0) {
    return (
      <Button variant="outline" disabled className={className}>
        <Download className="h-4 w-4 mr-2" />
        Export Citations
      </Button>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={className}>
          <Download className="h-4 w-4 mr-2" />
          Export Citations ({citations.length})
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Export Citations</DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-4 min-h-0">
          {/* Format Selection */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Citation Format:</label>
            <Select
              value={format}
              onValueChange={(value: CitationFormat) => setFormat(value)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="APA">APA</SelectItem>
                <SelectItem value="MLA">MLA</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-muted-foreground">
              {citations.length} citation{citations.length !== 1 ? 's' : ''}
            </div>
          </div>

          {/* Preview */}
          <div className="flex-1 min-h-0">
            <label className="text-sm font-medium mb-2 block">Preview:</label>
            <Textarea
              value={bibliography}
              readOnly
              className="h-full min-h-[300px] font-mono text-xs resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleCopyToClipboard}
              className="flex-1"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copy to Clipboard
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadAsText}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as Text
            </Button>

            <Button
              variant="outline"
              onClick={handleDownloadAsMarkdown}
              className="flex-1"
            >
              <FileText className="h-4 w-4 mr-2" />
              Download as Markdown
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
