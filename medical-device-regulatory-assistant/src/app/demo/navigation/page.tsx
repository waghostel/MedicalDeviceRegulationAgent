'use client';

import React, { useState } from 'react';
import { AppLayout, FileExplorer, type BreadcrumbItem, type FileNode } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const mockFiles: FileNode[] = [
  {
    id: '1',
    name: 'Project Documents',
    type: 'folder',
    children: [
      {
        id: '2',
        name: 'Device Specifications',
        type: 'file',
        description: 'Technical specifications document',
      },
      {
        id: '3',
        name: 'Predicate Analysis',
        type: 'file',
        description: 'Comparison with K123456',
      },
      {
        id: '4',
        name: 'FDA Submissions',
        type: 'folder',
        children: [
          {
            id: '5',
            name: '510k_draft_v1.md',
            type: 'file',
            description: 'Draft 510(k) submission',
          },
        ],
      },
    ],
  },
  {
    id: '6',
    name: 'Research',
    type: 'folder',
    children: [
      {
        id: '7',
        name: 'FDA Guidance Documents',
        type: 'file',
        description: 'Relevant guidance collection',
      },
    ],
  },
];

export default function NavigationDemoPage() {
  const [selectedFile, setSelectedFile] = useState<FileNode | null>(null);
  const [files, setFiles] = useState<FileNode[]>(mockFiles);
  const [actionLog, setActionLog] = useState<string[]>([]);

  const breadcrumbItems: BreadcrumbItem[] = [
    { label: 'Demo', href: '/demo' },
    { label: 'Navigation & Quick Actions', current: true },
  ];

  const handleQuickAction = (action: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] Quick Action: ${action}`, ...prev.slice(0, 9)]);
  };

  const handleFileSelect = (file: FileNode) => {
    setSelectedFile(file);
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] File selected: ${file.name}`, ...prev.slice(0, 9)]);
  };

  const handleFileCreate = (parentId: string | null, type: 'file' | 'folder') => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] Create ${type} in ${parentId || 'root'}`, ...prev.slice(0, 9)]);
  };

  const handleFileRename = (fileId: string, newName: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] Rename file ${fileId} to ${newName}`, ...prev.slice(0, 9)]);
  };

  const handleFileDelete = (fileId: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActionLog(prev => [`[${timestamp}] Delete file ${fileId}`, ...prev.slice(0, 9)]);
  };

  const handleFileUpload = (files: FileList, parentId: string | null) => {
    const timestamp = new Date().toLocaleTimeString();
    const fileNames = Array.from(files).map(f => f.name).join(', ');
    setActionLog(prev => [`[${timestamp}] Upload files: ${fileNames}`, ...prev.slice(0, 9)]);
  };

  return (
    <AppLayout
      showSidebar={true}
      showQuickActions={false}
      showBreadcrumb={true}
      breadcrumbItems={breadcrumbItems}
      onQuickAction={handleQuickAction}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Navigation & Quick Actions Demo</h1>
          <p className="text-muted-foreground mt-2">
            Test the navigation components, keyboard shortcuts, and file explorer functionality.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Keyboard Shortcuts Info */}
          <Card>
            <CardHeader>
              <CardTitle>Keyboard Shortcuts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Command Palette</span>
                  <Badge variant="secondary">Ctrl+K</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Find Predicates</span>
                  <Badge variant="secondary">Ctrl+P</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Check Classification</span>
                  <Badge variant="secondary">Ctrl+C</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Generate Checklist</span>
                  <Badge variant="secondary">Ctrl+L</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Export Report</span>
                  <Badge variant="secondary">Ctrl+E</Badge>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Try pressing these keyboard shortcuts to test the functionality!
              </p>
            </CardContent>
          </Card>

          {/* Action Log */}
          <Card>
            <CardHeader>
              <CardTitle>Action Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {actionLog.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No actions yet. Try using the quick actions or keyboard shortcuts!
                  </p>
                ) : (
                  actionLog.map((log, index) => (
                    <div key={index} className="text-xs font-mono bg-muted p-2 rounded">
                      {log}
                    </div>
                  ))
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => setActionLog([])}
              >
                Clear Log
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* File Explorer Demo */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>File Explorer</CardTitle>
              </CardHeader>
              <CardContent>
                <FileExplorer
                  files={files}
                  onFileSelect={handleFileSelect}
                  onFileCreate={handleFileCreate}
                  onFileRename={handleFileRename}
                  onFileDelete={handleFileDelete}
                  onFileUpload={handleFileUpload}
                />
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle>Selected File</CardTitle>
              </CardHeader>
              <CardContent>
                {selectedFile ? (
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-medium">Name:</span>
                      <p className="text-sm text-muted-foreground">{selectedFile.name}</p>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Type:</span>
                      <p className="text-sm text-muted-foreground">{selectedFile.type}</p>
                    </div>
                    {selectedFile.description && (
                      <div>
                        <span className="text-sm font-medium">Description:</span>
                        <p className="text-sm text-muted-foreground">{selectedFile.description}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a file from the explorer to see details
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Quick Actions Test */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button onClick={() => handleQuickAction('find-predicates')}>
                Find Predicates
              </Button>
              <Button onClick={() => handleQuickAction('check-classification')}>
                Check Classification
              </Button>
              <Button onClick={() => handleQuickAction('generate-checklist')}>
                Generate Checklist
              </Button>
              <Button onClick={() => handleQuickAction('export-report')}>
                Export Report
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-4">
              These buttons simulate the same actions as the quick actions toolbar and keyboard shortcuts.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}