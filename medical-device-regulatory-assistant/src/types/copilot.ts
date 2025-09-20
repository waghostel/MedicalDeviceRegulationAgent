/**
 * CopilotKit and Agent Workflow Types
 */

export interface SlashCommand {
  command: string;
  description: string;
  icon?: string;
  category: 'search' | 'analysis' | 'classification' | 'guidance';
}

export interface ProjectContext {
  id: string;
  name: string;
  description: string;
  deviceType: string;
  intendedUse: string;
  status: 'draft' | 'in-progress' | 'completed';
}

export interface AgentResponse {
  content: string;
  confidence?: number;
  sources?: SourceCitation[];
  reasoning?: string;
  nextSteps?: string[];
}

export interface SourceCitation {
  url: string;
  title: string;
  effectiveDate: string;
  documentType: 'FDA_510K' | 'FDA_GUIDANCE' | 'CFR_SECTION' | 'FDA_DATABASE';
  accessedDate: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  projectId?: string;
  confidence?: number;
  sources?: SourceCitation[];
}

export interface AgentWorkflowState {
  currentProject: ProjectContext | null;
  isLoading: boolean;
  messages: ChatMessage[];
  availableCommands: SlashCommand[];
}
