import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

// Simple test component to verify React 19 compatibility
const React19TestComponent: React.FC<{ children?: React.ReactNode }> = ({
  children,
}) => {
  const [count, setCount] = React.useState(0);
  const [message, setMessage] = React.useState('');

  return (
    <div data-testid="react19-test-component">
      <h1>React 19 Compatibility Test</h1>
      <p data-testid="count">Count: {count}</p>
      <button
        data-testid="increment-button"
        onClick={() => setCount((prev) => prev + 1)}
      >
        Increment
      </button>
      <input
        data-testid="message-input"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        placeholder="Enter message"
      />
      <p data-testid="message-display">{message}</p>
      {children}
    </div>
  );
};

describe('React 19 Compatibility Tests', () => {
  it('renders React components without AggregateError', () => {
    render(<React19TestComponent />);

    expect(screen.getByTestId('react19-test-component')).toBeInTheDocument();
    expect(screen.getByText('React 19 Compatibility Test')).toBeInTheDocument();
    expect(screen.getByTestId('count')).toHaveTextContent('Count: 0');
  });

  it('handles state updates correctly with React 19', async () => {
    const user = userEvent.setup();

    render(<React19TestComponent />);

    const incrementButton = screen.getByTestId('increment-button');
    const countDisplay = screen.getByTestId('count');

    // Initial state
    expect(countDisplay).toHaveTextContent('Count: 0');

    // Click button to update state
    await user.click(incrementButton);
    expect(countDisplay).toHaveTextContent('Count: 1');

    // Click multiple times
    await user.click(incrementButton);
    await user.click(incrementButton);
    expect(countDisplay).toHaveTextContent('Count: 3');
  });

  it('handles controlled input components with React 19', async () => {
    const user = userEvent.setup();

    render(<React19TestComponent />);

    const messageInput = screen.getByTestId('message-input');
    const messageDisplay = screen.getByTestId('message-display');

    // Initial state
    expect(messageInput).toHaveValue('');
    expect(messageDisplay).toHaveTextContent('');

    // Type in input
    await user.type(messageInput, 'Hello React 19!');

    expect(messageInput).toHaveValue('Hello React 19!');
    expect(messageDisplay).toHaveTextContent('Hello React 19!');
  });

  it('renders nested components without issues', () => {
    const NestedComponent = () => (
      <div data-testid="nested-component">
        <span>Nested content</span>
      </div>
    );

    render(
      <React19TestComponent>
        <NestedComponent />
      </React19TestComponent>
    );

    expect(screen.getByTestId('nested-component')).toBeInTheDocument();
    expect(screen.getByText('Nested content')).toBeInTheDocument();
  });

  it('handles event handlers correctly with React 19', () => {
    const mockHandler = jest.fn();

    const EventTestComponent = () => (
      <button data-testid="event-button" onClick={mockHandler}>
        Click me
      </button>
    );

    render(<EventTestComponent />);

    const button = screen.getByTestId('event-button');
    fireEvent.click(button);

    expect(mockHandler).toHaveBeenCalledTimes(1);
  });

  it('supports React 19 features without errors', () => {
    // Test that React 19 specific features don't cause issues
    const React19FeaturesComponent = () => {
      const [isVisible, setIsVisible] = React.useState(true);

      return (
        <div data-testid="features-component">
          {isVisible && (
            <p data-testid="conditional-content">Visible content</p>
          )}
          <button
            data-testid="toggle-button"
            onClick={() => setIsVisible(!isVisible)}
          >
            Toggle
          </button>
        </div>
      );
    };

    render(<React19FeaturesComponent />);

    expect(screen.getByTestId('features-component')).toBeInTheDocument();
    expect(screen.getByTestId('conditional-content')).toBeInTheDocument();

    // Toggle visibility
    fireEvent.click(screen.getByTestId('toggle-button'));
    expect(screen.queryByTestId('conditional-content')).not.toBeInTheDocument();
  });
});
