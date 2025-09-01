'use client';

import React, { useState, useEffect } from 'react';
import { CopilotKit, CopilotChat } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SlashCommandGrid } from '@/components/ui/slash-command-card';
import { useProjectContext } from '@/components/providers/ProjectContextProvider';
import { ProjectContext } from '@/types/copilot';

interface AgentWorkflowPageProps {
  projectId?: string;
  initialProject?: ProjectContext;
}

export function AgentWorkflowPage({ projectId, initialProject }: AgentWorkflowPageProps) {
  const { state, setProject, setLoading, addMessage } = useProjectContext();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Initialize project context if provided
  useEffect(() => {
    if (initialProject) {
      setProject(initialProject);
    }
  }, [initialProject, setProject]);

  const handleExecuteCommand = async (command: string) => {
    if (!state.currentProject) {
      // Show error or prompt to select project
      console.warn('No project selected for command execution');
      return;
    }

    setLoading(true);
    
    // Add user message
    const userMessage = {
      id: `msg-${Date.now()}-user`,
      role: 'user' as const,
      content: command,
      timestamp: new Date(),
      projectId: state.currentProject.id
    };
    
    addMessage(userMessage);

    try {
      // This will be handled by CopilotKit's chat interface
      // For now, we'll simulate the command execution
      await simulateCommandExecution(command);
    } catch (error) {
      console.error('Command execution failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const simulateCommandExecution = async (command: string) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Add assistant response
    const assistantMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: 'assistant' as const,
      content: `Executing ${command} for project: ${state.currentProject?.name}`,
      timestamp: new Date(),
      projectId: state.currentProject?.id,
      confidence: 0.85
    };
    
    addMessage(assistantMessage);
  };

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      <div className="flex h-screen bg-background">
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex h-16 items-center px-6">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">Regulatory Assistant</h1>
                {state.currentProject && (
                  <Badge variant="outline" className="text-sm">
                    {state.currentProject.name}
                  </Badge>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                >
                  {sidebarOpen ? 'Hide Chat' : 'Show Chat'}
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-auto p-6">
            {state.currentProject ? (
              <div className="space-y-6">
                {/* Project Info Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      Current Project
                      <Badge 
                        variant={state.currentProject.status === 'completed' ? 'default' : 'secondary'}
                      >
                        {state.currentProject.status}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <strong>Device Type:</strong> {state.currentProject.deviceType}
                    </div>
                    <div>
                      <strong>Intended Use:</strong> {state.currentProject.intendedUse}
                    </div>
                    <div>
                      <strong>Description:</strong> {state.currentProject.description}
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div>
                  <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                  <SlashCommandGrid
                    commands={state.availableCommands}
                    onExecuteCommand={handleExecuteCommand}
                    disabled={state.isLoading}
                  />
                </div>

                {/* Instructions */}
                <Card>
                  <CardHeader>
                    <CardTitle>How to Use the Regulatory Assistant</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Chat Interface</h4>
                      <p className="text-sm text-muted-foreground">
                        Use the chat sidebar to interact with the AI assistant. You can type naturally 
                        or use slash commands for specific actions.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Slash Commands</h4>
                      <p className="text-sm text-muted-foreground">
                        Click on the command cards above or type them directly in the chat:
                      </p>
                      <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                        {state.availableCommands.map((cmd) => (
                          <li key={cmd.command} className="flex items-center gap-2">
                            <code className="bg-muted px-1 rounded text-xs">{cmd.command}</code>
                            - {cmd.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Card className="w-full max-w-md">
                  <CardHeader>
                    <CardTitle>No Project Selected</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      Please select a project to start using the regulatory assistant.
                    </p>
                    <Button className="w-full">
                      Select Project
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>
        </div>

        {/* CopilotKit Sidebar */}
        {sidebarOpen && (
          <div className="w-96 border-l bg-background">
            <CopilotSidebar
              instructions={`You are a specialized FDA regulatory assistant for medical device companies. 
              
Current project context: ${state.currentProject ? `
- Device: ${state.currentProject.name}
- Type: ${state.currentProject.deviceType}
- Intended Use: ${state.currentProject.intendedUse}
- Status: ${state.currentProject.status}
` : 'No project selected'}

Your role is to help regulatory affairs professionals navigate the 510(k) submission process efficiently and accurately.

Core Principles:
- Always cite sources with URLs and effective dates
- Provide confidence scores (0-1) for all recommendations
- Maintain complete reasoning traces
- Suggest, but humans decide - never make final regulatory decisions
- Focus on US FDA regulations only

Available Commands:
- /predicate-search: Find similar predicate devices for 510(k) submissions
- /classify-device: Determine device classification and product code
- /compare-predicate: Compare device with a specific predicate
- /find-guidance: Search FDA guidance documents

Always provide structured responses with confidence scores, source citations, and clear next steps.`}
              defaultOpen={true}
              clickOutsideToClose={false}
            />
          </div>
        )}
      </div>
    </CopilotKit>
  );
}