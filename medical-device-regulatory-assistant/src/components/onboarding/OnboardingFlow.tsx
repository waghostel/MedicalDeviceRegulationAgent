'use client';

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  ChevronRight, 
  ChevronLeft, 
  Check, 
  Play, 
  FileText, 
  Search, 
  Brain, 
  Shield,
  Lightbulb,
  Target,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  content: React.ReactNode;
  icon: React.ComponentType<{ className?: string }>;
  optional?: boolean;
}

interface OnboardingFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  userType?: 'new' | 'returning';
}

const onboardingSteps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Regulatory Assistant',
    description: 'Your AI-powered companion for medical device regulatory pathways',
    icon: Shield,
    content: (
      <div className="space-y-4 text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
          <Shield className="w-8 h-8 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Streamline Your 510(k) Process</h3>
          <p className="text-muted-foreground">
            Our AI assistant helps regulatory affairs managers find predicate devices, 
            analyze substantial equivalence, and navigate FDA requirements efficiently.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-xs text-muted-foreground">Smart Predicate Search</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Brain className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-xs text-muted-foreground">AI-Powered Analysis</p>
          </div>
          <div className="text-center space-y-2">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mx-auto">
              <FileText className="w-4 h-4 text-purple-600" />
            </div>
            <p className="text-xs text-muted-foreground">Compliance Reports</p>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'projects',
    title: 'Organize by Projects',
    description: 'Create separate projects for each medical device',
    icon: Target,
    content: (
      <div className="space-y-4">
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium">Cardiac Monitoring Device</h4>
              <p className="text-sm text-muted-foreground">Class II ECG Monitor</p>
            </div>
            <Badge variant="secondary">In Progress</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Intended Use: Continuous monitoring of cardiac rhythm for hospitalized patients...
          </p>
          <div className="flex gap-2 mt-3">
            <Badge variant="outline" className="text-xs">Classification: Complete</Badge>
            <Badge variant="outline" className="text-xs">Predicates: 3 Found</Badge>
          </div>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Each project includes:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Device classification and product code determination
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Predicate device search and analysis
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Substantial equivalence comparison tables
            </li>
            <li className="flex items-center gap-2">
              <Check className="w-4 h-4 text-green-500" />
              Regulatory pathway recommendations
            </li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'agent-workflow',
    title: 'AI Agent Workflow',
    description: 'Interact with specialized regulatory AI agents',
    icon: Brain,
    content: (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border rounded-lg p-4">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <Brain className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <h4 className="font-medium">Regulatory AI Assistant</h4>
              <p className="text-xs text-muted-foreground">Specialized in FDA 510(k) pathways</p>
            </div>
          </div>
          <div className="bg-white/50 rounded p-3 text-sm">
            <p className="text-muted-foreground mb-2">Try these commands:</p>
            <div className="space-y-1 font-mono text-xs">
              <div><span className="text-blue-600">/predicate-search</span> Find similar devices</div>
              <div><span className="text-green-600">/classify-device</span> Determine device class</div>
              <div><span className="text-purple-600">/compare-predicate</span> Analyze differences</div>
              <div><span className="text-orange-600">/find-guidance</span> Search FDA guidance</div>
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Key Features:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li>• Real-time FDA database integration</li>
            <li>• Confidence scores for all recommendations</li>
            <li>• Complete audit trails for compliance</li>
            <li>• Source citations with direct links</li>
          </ul>
        </div>
      </div>
    )
  },
  {
    id: 'quick-actions',
    title: 'Quick Actions Toolbar',
    description: 'Access common tasks with one click',
    icon: Zap,
    content: (
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-sm">Quick Actions</h4>
            <Badge variant="outline">Always Available</Badge>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" size="sm" className="justify-start">
              <Search className="w-4 h-4 mr-2" />
              Find Predicates
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <FileText className="w-4 h-4 mr-2" />
              Check Classification
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Brain className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" size="sm" className="justify-start">
              <Shield className="w-4 h-4 mr-2" />
              Export Audit
            </Button>
          </div>
        </div>
        
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Keyboard Shortcuts:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Open command palette</span>
              <Badge variant="outline" className="font-mono text-xs">Ctrl+K</Badge>
            </div>
            <div className="flex justify-between">
              <span>New project</span>
              <Badge variant="outline" className="font-mono text-xs">Ctrl+N</Badge>
            </div>
            <div className="flex justify-between">
              <span>Show shortcuts</span>
              <Badge variant="outline" className="font-mono text-xs">?</Badge>
            </div>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'compliance',
    title: 'Compliance & Audit Trails',
    description: 'Maintain complete regulatory compliance',
    icon: Shield,
    content: (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-green-600" />
            <h4 className="font-medium text-green-800">Regulatory Compliance Built-In</h4>
          </div>
          <p className="text-sm text-green-700">
            Every AI action is logged with complete reasoning traces and source citations 
            for regulatory inspections.
          </p>
        </div>
        
        <div className="space-y-3">
          <h4 className="font-medium text-sm">What we track:</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <strong>AI Decision Reasoning:</strong> Complete explanation of how conclusions were reached
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <strong>Source Citations:</strong> Direct links to FDA documents with effective dates
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <strong>Confidence Scores:</strong> Numerical confidence for all recommendations
              </div>
            </li>
            <li className="flex items-start gap-2">
              <Check className="w-4 h-4 text-green-500 mt-0.5" />
              <div>
                <strong>Human Oversight:</strong> Required approval for critical regulatory decisions
              </div>
            </li>
          </ul>
        </div>
      </div>
    )
  }
];

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({
  isOpen,
  onClose,
  onComplete,
  userType = 'new'
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const progress = ((currentStep + 1) / onboardingSteps.length) * 100;
  const isLastStep = currentStep === onboardingSteps.length - 1;
  const isFirstStep = currentStep === 0;

  const handleNext = () => {
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    
    if (isLastStep) {
      onComplete();
      onClose();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  const currentStepData = onboardingSteps[currentStep];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <currentStepData.icon className="w-5 h-5" />
              {currentStepData.title}
            </DialogTitle>
            <Badge variant="outline">
              {currentStep + 1} of {onboardingSteps.length}
            </Badge>
          </div>
          <Progress value={progress} className="w-full" />
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="text-center">
            <p className="text-muted-foreground">{currentStepData.description}</p>
          </div>
          
          <div className="min-h-[300px]">
            {currentStepData.content}
          </div>
          
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="flex items-center gap-2">
              {!isFirstStep && (
                <Button variant="outline" onClick={handlePrevious}>
                  <ChevronLeft className="w-4 h-4 mr-2" />
                  Previous
                </Button>
              )}
              {!isLastStep && (
                <Button variant="ghost" onClick={handleSkip}>
                  Skip Tour
                </Button>
              )}
            </div>
            
            <Button onClick={handleNext}>
              {isLastStep ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Get Started
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Onboarding trigger component
export const OnboardingTrigger: React.FC<{
  children: React.ReactNode;
  onStart: () => void;
}> = ({ children, onStart }) => (
  <div onClick={onStart} className="cursor-pointer">
    {children}
  </div>
);

// Feature highlight component for guided tours
export const FeatureHighlight: React.FC<{
  isActive: boolean;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  onNext?: () => void;
  onSkip?: () => void;
  children: React.ReactNode;
}> = ({ 
  isActive, 
  title, 
  description, 
  position = 'bottom',
  onNext,
  onSkip,
  children 
}) => {
  if (!isActive) return <>{children}</>;

  return (
    <div className="relative">
      <div className="relative z-10 ring-2 ring-primary ring-offset-2 rounded-lg">
        {children}
      </div>
      
      <div className={cn(
        'absolute z-20 w-80 p-4 bg-popover border rounded-lg shadow-lg',
        position === 'top' && 'bottom-full mb-2 left-1/2 -translate-x-1/2',
        position === 'bottom' && 'top-full mt-2 left-1/2 -translate-x-1/2',
        position === 'left' && 'right-full mr-2 top-1/2 -translate-y-1/2',
        position === 'right' && 'left-full ml-2 top-1/2 -translate-y-1/2'
      )}>
        <div className="space-y-3">
          <div>
            <h4 className="font-medium">{title}</h4>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
          
          <div className="flex justify-between">
            {onSkip && (
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip
              </Button>
            )}
            {onNext && (
              <Button size="sm" onClick={onNext}>
                Next
              </Button>
            )}
          </div>
        </div>
        
        {/* Arrow pointer */}
        <div className={cn(
          'absolute w-2 h-2 bg-popover border rotate-45',
          position === 'top' && 'top-full left-1/2 -translate-x-1/2 -mt-1 border-b-0 border-r-0',
          position === 'bottom' && 'bottom-full left-1/2 -translate-x-1/2 -mb-1 border-t-0 border-l-0',
          position === 'left' && 'left-full top-1/2 -translate-y-1/2 -ml-1 border-t-0 border-r-0',
          position === 'right' && 'right-full top-1/2 -translate-y-1/2 -mr-1 border-b-0 border-l-0'
        )} />
      </div>
      
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 z-0" />
    </div>
  );
};