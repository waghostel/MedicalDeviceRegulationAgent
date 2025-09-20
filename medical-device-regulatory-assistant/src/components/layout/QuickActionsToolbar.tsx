'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  BarChart3,
  FileText,
  Download,
  Zap,
  Tooltip,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickActionsToolbarProps {
  className?: string;
  onAction?: (action: string) => void;
}

const quickActions = [
  {
    id: 'find-predicates',
    label: 'Find Similar Predicates',
    icon: Search,
    shortcut: 'Ctrl+P',
    description: 'Search for predicate devices',
  },
  {
    id: 'check-classification',
    label: 'Check Classification',
    icon: BarChart3,
    shortcut: 'Ctrl+C',
    description: 'Determine device classification',
  },
  {
    id: 'generate-checklist',
    label: 'Generate Checklist',
    icon: FileText,
    shortcut: 'Ctrl+L',
    description: 'Create submission checklist',
  },
  {
    id: 'export-report',
    label: 'Export Report',
    icon: Download,
    shortcut: 'Ctrl+E',
    description: 'Export current analysis',
  },
];

export const QuickActionsToolbar: React.FC<QuickActionsToolbarProps> = ({
  className,
  onAction,
}) => {
  const handleAction = (actionId: string) => {
    onAction?.(actionId);
  };

  return (
    <div className={cn('bg-background border-b', className)}>
      <div className="container mx-auto px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Quick Actions</span>
          </div>

          <div className="flex items-center space-x-2">
            {quickActions.map((action) => (
              <div key={action.id} className="relative group">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex items-center space-x-2 hover:bg-primary/10"
                  onClick={() => handleAction(action.id)}
                >
                  <action.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{action.label}</span>
                  <Badge
                    variant="secondary"
                    className="hidden md:inline text-xs"
                  >
                    {action.shortcut}
                  </Badge>
                </Button>

                {/* Tooltip for mobile/small screens */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50 sm:hidden">
                  {action.description}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
