import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';

import { ProjectContext, ChatMessage } from '@/types/copilot';

import {
  ProjectContextProvider,
  useProjectContext,
} from '../ProjectContextProvider';


const mockProject: ProjectContext = {
  id: 'test-project-1',
  name: 'Test Device',
  description: 'A test medical device',
  deviceType: 'Class II',
  intendedUse: 'For testing purposes',
  status: 'in-progress',
};

const mockMessage: ChatMessage = {
  id: 'msg-1',
  role: 'user',
  content: 'Test message',
  timestamp: new Date(),
  projectId: 'test-project-1',
};

// Test component to interact with the context
const TestComponent = () => {
  const {
    state,
    setProject,
    clearProject,
    setLoading,
    addMessage,
    clearMessages,
    setMessages,
  } = useProjectContext();

  return (
    <div>
      <div data-testid="current-project">
        {state.currentProject ? state.currentProject.name : 'No project'}
      </div>
      <div data-testid="loading-state">
        {state.isLoading ? 'Loading' : 'Not loading'}
      </div>
      <div data-testid="messages-count">{state.messages.length}</div>
      <div data-testid="commands-count">{state.availableCommands.length}</div>

      <button onClick={() => setProject(mockProject)}>Set Project</button>
      <button onClick={() => clearProject()}>Clear Project</button>
      <button onClick={() => setLoading(true)}>Set Loading</button>
      <button onClick={() => setLoading(false)}>Clear Loading</button>
      <button onClick={() => addMessage(mockMessage)}>Add Message</button>
      <button onClick={() => clearMessages()}>Clear Messages</button>
      <button onClick={() => setMessages([mockMessage])}>Set Messages</button>
    </div>
  );
}

describe('ProjectContextProvider', () => {
  it('should provide initial state correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'No project'
    );
    expect(screen.getByTestId('loading-state')).toHaveTextContent(
      'Not loading'
    );
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
    expect(screen.getByTestId('commands-count')).toHaveTextContent('4'); // Default slash commands
  });

  it('should set project correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Project'));
    });

    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'Test Device'
    );
  });

  it('should clear project correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    // First set a project
    act(() => {
      fireEvent.click(screen.getByText('Set Project'));
    });
    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'Test Device'
    );

    // Then clear it
    act(() => {
      fireEvent.click(screen.getByText('Clear Project'));
    });
    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'No project'
    );
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0'); // Messages should be cleared too
  });

  it('should set loading state correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Loading'));
    });
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');

    act(() => {
      fireEvent.click(screen.getByText('Clear Loading'));
    });
    expect(screen.getByTestId('loading-state')).toHaveTextContent(
      'Not loading'
    );
  });

  it('should add messages correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');

    act(() => {
      fireEvent.click(screen.getByText('Add Message'));
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');

    act(() => {
      fireEvent.click(screen.getByText('Add Message'));
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('2');
  });

  it('should clear messages correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    // Add a message first
    act(() => {
      fireEvent.click(screen.getByText('Add Message'));
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');

    // Then clear messages
    act(() => {
      fireEvent.click(screen.getByText('Clear Messages'));
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
  });

  it('should set messages correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    act(() => {
      fireEvent.click(screen.getByText('Set Messages'));
    });
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');
  });

  it('should provide default slash commands', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    expect(screen.getByTestId('commands-count')).toHaveTextContent('4');
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      render(<TestComponent />);
    }).toThrow(
      'useProjectContext must be used within a ProjectContextProvider'
    );

    consoleSpy.mockRestore();
  });
});

describe('ProjectContextProvider Integration', () => {
  it('should maintain state across multiple components', () => {
    const FirstComponent = () => {
      const { setProject } = useProjectContext();
      return (
        <button onClick={() => setProject(mockProject)}>Set Project</button>
      );
    }

    const SecondComponent = () => {
      const { state } = useProjectContext();
      return (
        <div data-testid="project-name">
          {state.currentProject?.name || 'No project'}
        </div>
      );
    }

    render(
      <ProjectContextProvider>
        <FirstComponent />
        <SecondComponent />
      </ProjectContextProvider>
    );

    expect(screen.getByTestId('project-name')).toHaveTextContent('No project');

    act(() => {
      fireEvent.click(screen.getByText('Set Project'));
    });

    expect(screen.getByTestId('project-name')).toHaveTextContent('Test Device');
  });

  it('should handle complex state updates correctly', () => {
    render(
      <ProjectContextProvider>
        <TestComponent />
      </ProjectContextProvider>
    );

    // Set project and add messages
    act(() => {
      fireEvent.click(screen.getByText('Set Project'));
      fireEvent.click(screen.getByText('Add Message'));
      fireEvent.click(screen.getByText('Set Loading'));
    });

    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'Test Device'
    );
    expect(screen.getByTestId('messages-count')).toHaveTextContent('1');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading');

    // Clear project should also clear messages
    act(() => {
      fireEvent.click(screen.getByText('Clear Project'));
    });

    expect(screen.getByTestId('current-project')).toHaveTextContent(
      'No project'
    );
    expect(screen.getByTestId('messages-count')).toHaveTextContent('0');
    expect(screen.getByTestId('loading-state')).toHaveTextContent('Loading'); // Should remain unchanged
  });
});
