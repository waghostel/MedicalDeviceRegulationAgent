'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ProjectContext, AgentWorkflowState, ChatMessage, SlashCommand } from '@/types/copilot';

// Available slash commands for the regulatory assistant
const DEFAULT_SLASH_COMMANDS: SlashCommand[] = [
  {
    command: '/predicate-search',
    description: 'Find similar predicate devices for 510(k) submissions',
    icon: '🔍',
    category: 'search'
  },
  {
    command: '/classify-device',
    description: 'Determine device classification and product code',
    icon: '📋',
    category: 'classification'
  },
  {
    command: '/compare-predicate',
    description: 'Compare your device with a specific predicate',
    icon: '⚖️',
    category: 'analysis'
  },
  {
    command: '/find-guidance',
    description: 'Search FDA guidance documents',
    icon: '📚',
    category: 'guidance'
  }
];

type ProjectAction =
  | { type: 'SET_PROJECT'; payload: ProjectContext }
  | { type: 'CLEAR_PROJECT' }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'ADD_MESSAGE'; payload: ChatMessage }
  | { type: 'CLEAR_MESSAGES' }
  | { type: 'SET_MESSAGES'; payload: ChatMessage[] };

const initialState: AgentWorkflowState = {
  currentProject: null,
  isLoading: false,
  messages: [],
  availableCommands: DEFAULT_SLASH_COMMANDS
};

function projectReducer(state: AgentWorkflowState, action: ProjectAction): AgentWorkflowState {
  switch (action.type) {
    case 'SET_PROJECT':
      return {
        ...state,
        currentProject: action.payload
      };
    case 'CLEAR_PROJECT':
      return {
        ...state,
        currentProject: null,
        messages: []
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };
    case 'CLEAR_MESSAGES':
      return {
        ...state,
        messages: []
      };
    case 'SET_MESSAGES':
      return {
        ...state,
        messages: action.payload
      };
    default:
      return state;
  }
}

interface ProjectContextType {
  state: AgentWorkflowState;
  setProject: (project: ProjectContext) => void;
  clearProject: () => void;
  setLoading: (loading: boolean) => void;
  addMessage: (message: ChatMessage) => void;
  clearMessages: () => void;
  setMessages: (messages: ChatMessage[]) => void;
}

const ProjectContextContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectContextProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(projectReducer, initialState);

  const setProject = (project: ProjectContext) => {
    dispatch({ type: 'SET_PROJECT', payload: project });
  };

  const clearProject = () => {
    dispatch({ type: 'CLEAR_PROJECT' });
  };

  const setLoading = (loading: boolean) => {
    dispatch({ type: 'SET_LOADING', payload: loading });
  };

  const addMessage = (message: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', payload: message });
  };

  const clearMessages = () => {
    dispatch({ type: 'CLEAR_MESSAGES' });
  };

  const setMessages = (messages: ChatMessage[]) => {
    dispatch({ type: 'SET_MESSAGES', payload: messages });
  };

  const value: ProjectContextType = {
    state,
    setProject,
    clearProject,
    setLoading,
    addMessage,
    clearMessages,
    setMessages
  };

  return (
    <ProjectContextContext.Provider value={value}>
      {children}
    </ProjectContextContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContextContext);
  if (context === undefined) {
    throw new Error('useProjectContext must be used within a ProjectContextProvider');
  }
  return context;
}