'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  HelpCircle,
  Info,
  Lightbulb,
  X,
  ExternalLink,
  BookOpen,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  content: React.ReactNode;
  title?: string;
  type?: 'info' | 'help' | 'warning' | 'tip';
  position?: 'top' | 'bottom' | 'left' | 'right' | 'auto';
  trigger?: 'hover' | 'click' | 'focus';
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}

const tooltipIcons = {
  info: Info,
  help: HelpCircle,
  warning: AlertTriangle,
  tip: Lightbulb,
};

const tooltipColors = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  help: 'border-purple-200 bg-purple-50 text-purple-900',
  warning: 'border-orange-200 bg-orange-50 text-orange-900',
  tip: 'border-green-200 bg-green-50 text-green-900',
};

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  title,
  type = 'info',
  position = 'auto',
  trigger = 'hover',
  disabled = false,
  className,
  children,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [actualPosition, setActualPosition] = useState(position);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const Icon = tooltipIcons[type];

  useEffect(() => {
    if (
      isVisible &&
      position === 'auto' &&
      triggerRef.current &&
      tooltipRef.current
    ) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
      };

      let bestPosition = 'bottom';

      // Check if tooltip fits below
      if (triggerRect.bottom + tooltipRect.height + 8 > viewport.height) {
        // Check if it fits above
        if (triggerRect.top - tooltipRect.height - 8 > 0) {
          bestPosition = 'top';
        } else {
          // Check sides
          if (triggerRect.right + tooltipRect.width + 8 < viewport.width) {
            bestPosition = 'right';
          } else if (triggerRect.left - tooltipRect.width - 8 > 0) {
            bestPosition = 'left';
          }
        }
      }

      setActualPosition(bestPosition);
    }
  }, [isVisible, position]);

  const handleMouseEnter = () => {
    if (trigger === 'hover' && !disabled) {
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    if (trigger === 'hover') {
      setIsVisible(false);
    }
  };

  const handleClick = () => {
    if (trigger === 'click' && !disabled) {
      setIsVisible(!isVisible);
    }
  };

  const handleFocus = () => {
    if (trigger === 'focus' && !disabled) {
      setIsVisible(true);
    }
  };

  const handleBlur = () => {
    if (trigger === 'focus') {
      setIsVisible(false);
    }
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <div className="relative inline-block">
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={className}
      >
        {children}
      </div>

      {isVisible && (
        <>
          <div
            ref={tooltipRef}
            className={cn(
              'absolute z-50 w-80 p-3 rounded-lg border shadow-lg',
              tooltipColors[type],
              actualPosition === 'top' &&
                'bottom-full mb-2 left-1/2 -translate-x-1/2',
              actualPosition === 'bottom' &&
                'top-full mt-2 left-1/2 -translate-x-1/2',
              actualPosition === 'left' &&
                'right-full mr-2 top-1/2 -translate-y-1/2',
              actualPosition === 'right' &&
                'left-full ml-2 top-1/2 -translate-y-1/2'
            )}
          >
            <div className="space-y-2">
              {title && (
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4" />
                  <h4 className="font-medium text-sm">{title}</h4>
                  {trigger === 'click' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="ml-auto h-6 w-6 p-0"
                      onClick={() => setIsVisible(false)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              )}
              <div className="text-sm">{content}</div>
            </div>

            {/* Arrow */}
            <div
              className={cn(
                'absolute w-2 h-2 rotate-45 border',
                tooltipColors[type].split(' ')[0], // Extract border color
                tooltipColors[type].split(' ')[1], // Extract background color
                actualPosition === 'top' &&
                  'top-full left-1/2 -translate-x-1/2 -mt-1 border-b-0 border-r-0',
                actualPosition === 'bottom' &&
                  'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-t-0 border-l-0',
                actualPosition === 'left' &&
                  'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-0 border-r-0',
                actualPosition === 'right' &&
                  'right-full top-1/2 -translate-y-1/2 -mr-1 border-b-0 border-l-0'
              )}
            />
          </div>

          {trigger === 'click' && (
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsVisible(false)}
            />
          )}
        </>
      )}
    </div>
  );
};

// Specialized tooltip components
export const HelpTooltip: React.FC<{
  content: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ content, title, className }) => (
  <Tooltip
    content={content}
    title={title}
    type="help"
    trigger="hover"
    className={className}
  >
    <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
  </Tooltip>
);

export const InfoTooltip: React.FC<{
  content: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ content, title, className }) => (
  <Tooltip
    content={content}
    title={title}
    type="info"
    trigger="hover"
    className={className}
  >
    <Info className="w-4 h-4 text-blue-500 cursor-help" />
  </Tooltip>
);

export const WarningTooltip: React.FC<{
  content: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ content, title, className }) => (
  <Tooltip
    content={content}
    title={title}
    type="warning"
    trigger="hover"
    className={className}
  >
    <AlertTriangle className="w-4 h-4 text-orange-500 cursor-help" />
  </Tooltip>
);

export const TipTooltip: React.FC<{
  content: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ content, title, className }) => (
  <Tooltip
    content={content}
    title={title}
    type="tip"
    trigger="hover"
    className={className}
  >
    <Lightbulb className="w-4 h-4 text-green-500 cursor-help" />
  </Tooltip>
);

// Regulatory-specific tooltips
export const RegulatoryTooltip: React.FC<{
  term: string;
  definition: string;
  regulation?: string;
  link?: string;
  className?: string;
}> = ({ term, definition, regulation, link, className }) => {
  const content = (
    <div className="space-y-2">
      <p>{definition}</p>
      {regulation && (
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">
            {regulation}
          </Badge>
        </div>
      )}
      {link && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs p-1"
          onClick={() => window.open(link, '_blank')}
        >
          <ExternalLink className="w-3 h-3 mr-1" />
          View Regulation
        </Button>
      )}
    </div>
  );

  return (
    <Tooltip
      content={content}
      title={term}
      type="help"
      trigger="hover"
      className={className}
    >
      <span className="underline decoration-dotted cursor-help text-blue-600">
        {term}
      </span>
    </Tooltip>
  );
};

// FDA guidance tooltip
export const FDAGuidanceTooltip: React.FC<{
  title: string;
  summary: string;
  effectiveDate?: string;
  link?: string;
  className?: string;
}> = ({ title, summary, effectiveDate, link, className }) => {
  const content = (
    <div className="space-y-2">
      <p className="text-sm">{summary}</p>
      {effectiveDate && (
        <p className="text-xs text-muted-foreground">
          Effective: {effectiveDate}
        </p>
      )}
      {link && (
        <Button
          variant="ghost"
          size="sm"
          className="h-6 text-xs p-1"
          onClick={() => window.open(link, '_blank')}
        >
          <BookOpen className="w-3 h-3 mr-1" />
          Read Guidance
        </Button>
      )}
    </div>
  );

  return (
    <Tooltip
      content={content}
      title={title}
      type="info"
      trigger="hover"
      className={className}
    >
      <Info className="w-4 h-4 text-blue-500 cursor-help" />
    </Tooltip>
  );
};

// Confidence score tooltip
export const ConfidenceTooltip: React.FC<{
  score: number;
  reasoning?: string;
  factors?: string[];
  className?: string;
}> = ({ score, reasoning, factors, className }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'text-green-600';
    if (score >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 0.8) return 'High Confidence';
    if (score >= 0.6) return 'Medium Confidence';
    return 'Low Confidence';
  };

  const content = (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Confidence Score</span>
        <Badge variant="outline" className={getScoreColor(score)}>
          {Math.round(score * 100)}%
        </Badge>
      </div>

      <p className="text-sm">{getScoreLabel(score)}</p>

      {reasoning && (
        <div>
          <p className="text-xs font-medium mb-1">Reasoning:</p>
          <p className="text-xs text-muted-foreground">{reasoning}</p>
        </div>
      )}

      {factors && factors.length > 0 && (
        <div>
          <p className="text-xs font-medium mb-1">Key Factors:</p>
          <ul className="text-xs text-muted-foreground space-y-0.5">
            {factors.map((factor, index) => (
              <li key={index}>• {factor}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <Tooltip
      content={content}
      type="info"
      trigger="hover"
      className={className}
    >
      <div className="flex items-center gap-1 cursor-help">
        <span className={cn('text-sm font-medium', getScoreColor(score))}>
          {Math.round(score * 100)}%
        </span>
        <Info className="w-3 h-3 text-muted-foreground" />
      </div>
    </Tooltip>
  );
};
