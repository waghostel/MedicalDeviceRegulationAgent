/**
 * Mock implementations for Radix UI components to work better in test environments
 * These mocks provide the essential functionality needed for testing while avoiding
 * complex DOM manipulation that doesn't work well in JSDOM
 */

const React = require('react');

const { useState, forwardRef } = React;

// Context for Select state management
const SelectContext = React.createContext({
  isOpen: false,
  setIsOpen: () => {},
});

const MockSelectRoot = ({
  children,
  value,
  onValueChange,
  defaultValue,
  disabled = false,
  name,
  required = false,
}) => {
  const [internalValue, setInternalValue] = useState(
    value || defaultValue || ''
  );
  const [isOpen, setIsOpen] = useState(false);

  const handleValueChange = (newValue) => {
    setInternalValue(newValue);
    onValueChange?.(newValue);
    setIsOpen(false);
  };

  const contextValue = {
    value: value || internalValue,
    onValueChange: handleValueChange,
    isOpen,
    setIsOpen,
  };

  return React.createElement(
    SelectContext.Provider,
    { value: contextValue },
    React.createElement(
      'div',
      { 'data-testid': 'select-root', 'data-disabled': disabled },
      name &&
        React.createElement('input', {
          type: 'hidden',
          name,
          value: value || internalValue,
          required,
        }),
      children
    )
  );
};

const MockSelectTrigger = forwardRef(
  ({ children, className, disabled, ...props }, ref) => {
    const { isOpen, setIsOpen } = React.useContext(SelectContext);

    const handleClick = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
      }
    };

    return React.createElement(
      'button',
      {
        ref,
        type: 'button',
        role: 'combobox',
        'aria-expanded': isOpen,
        'aria-haspopup': 'listbox',
        className,
        disabled,
        onClick: handleClick,
        'data-testid': 'select-trigger',
        'data-state': isOpen ? 'open' : 'closed',
        ...props,
      },
      children
    );
  }
);

MockSelectTrigger.displayName = 'MockSelectTrigger';

const MockSelectContent = ({ children, className, ...props }) => {
  const { isOpen } = React.useContext(SelectContext);

  if (!isOpen) {
    return null;
  }

  return React.createElement(
    'div',
    {
      role: 'listbox',
      className,
      'data-testid': 'select-content',
      'data-state': 'open',
      ...props,
    },
    children
  );
};

const MockSelectItem = ({ children, value, className, disabled = false }) => {
  const { onValueChange } = React.useContext(SelectContext);

  const handleClick = () => {
    if (!disabled) {
      onValueChange?.(value);
    }
  };

  return React.createElement(
    'div',
    {
      role: 'option',
      'aria-selected': false,
      'data-value': value,
      className,
      'data-disabled': disabled,
      onClick: handleClick,
      'data-testid': `select-item-${value}`,
    },
    children
  );
};

const MockSelectValue = ({
  placeholder = 'Select an option...',
  className,
}) => {
  const { value } = React.useContext(SelectContext);

  return React.createElement(
    'span',
    { className, 'data-testid': 'select-value' },
    value || placeholder
  );
};

// Mock Dialog components
const DialogContext = React.createContext({
  isOpen: false,
  setIsOpen: () => {},
});

const MockDialogRoot = ({
  children,
  open,
  onOpenChange,
  defaultOpen = false,
}) => {
  const [internalOpen, setInternalOpen] = useState(open ?? defaultOpen);

  const handleOpenChange = (newOpen) => {
    setInternalOpen(newOpen);
    onOpenChange?.(newOpen);
  };

  const contextValue = {
    isOpen: open ?? internalOpen,
    setIsOpen: handleOpenChange,
  };

  return React.createElement(
    DialogContext.Provider,
    { value: contextValue },
    React.createElement('div', { 'data-testid': 'dialog-root' }, children)
  );
};

const MockDialogTrigger = ({ children, asChild = false, className }) => {
  const { setIsOpen } = React.useContext(DialogContext);

  const handleClick = () => {
    setIsOpen(true);
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      onClick: handleClick,
      'data-testid': 'dialog-trigger',
    });
  }

  return React.createElement(
    'button',
    {
      type: 'button',
      className,
      onClick: handleClick,
      'data-testid': 'dialog-trigger',
    },
    children
  );
};

const MockDialogOverlay = ({ className }) => {
  const { isOpen } = React.useContext(DialogContext);

  if (!isOpen) {
    return null;
  }

  return React.createElement('div', {
    className,
    'data-testid': 'dialog-overlay',
    'data-state': 'open',
  });
};

const MockDialogContent = ({
  children,
  className,
  onEscapeKeyDown,
  onPointerDownOutside,
}) => {
  const { isOpen, setIsOpen } = React.useContext(DialogContext);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onEscapeKeyDown?.(event);
        if (!event.defaultPrevented) {
          setIsOpen(false);
        }
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onEscapeKeyDown, setIsOpen]);

  if (!isOpen) {
    return null;
  }

  return React.createElement(
    'div',
    {
      role: 'dialog',
      'aria-modal': 'true',
      className,
      'data-testid': 'dialog-content',
      'data-state': 'open',
    },
    children
  );
};

// Export all mocks
const RadixUIMocks = {
  Select: {
    Root: MockSelectRoot,
    Trigger: MockSelectTrigger,
    Content: MockSelectContent,
    Item: MockSelectItem,
    Value: MockSelectValue,
  },
  Dialog: {
    Root: MockDialogRoot,
    Trigger: MockDialogTrigger,
    Overlay: MockDialogOverlay,
    Content: MockDialogContent,
  },
};

// Helper function to setup Radix UI mocks in tests
const setupRadixUIMocks = () => {
  // Mock @radix-ui/react-select
  jest.doMock('@radix-ui/react-select', () => ({
    Root: RadixUIMocks.Select.Root,
    Trigger: RadixUIMocks.Select.Trigger,
    Content: RadixUIMocks.Select.Content,
    Item: RadixUIMocks.Select.Item,
    Value: RadixUIMocks.Select.Value,
    Portal: ({ children }) => children,
    Viewport: ({ children }) =>
      React.createElement(
        'div',
        { 'data-testid': 'select-viewport' },
        children
      ),
    Group: ({ children }) =>
      React.createElement('div', { 'data-testid': 'select-group' }, children),
    Label: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'select-label', ...props },
        children
      ),
    Separator: () =>
      React.createElement('div', { 'data-testid': 'select-separator' }),
    Arrow: () => React.createElement('div', { 'data-testid': 'select-arrow' }),
    Icon: ({ children }) =>
      React.createElement('span', { 'data-testid': 'select-icon' }, children),
    ScrollUpButton: () =>
      React.createElement('button', { 'data-testid': 'select-scroll-up' }),
    ScrollDownButton: () =>
      React.createElement('button', { 'data-testid': 'select-scroll-down' }),
  }));

  // Mock @radix-ui/react-dialog
  jest.doMock('@radix-ui/react-dialog', () => ({
    Root: RadixUIMocks.Dialog.Root,
    Trigger: RadixUIMocks.Dialog.Trigger,
    Overlay: RadixUIMocks.Dialog.Overlay,
    Content: RadixUIMocks.Dialog.Content,
    Portal: ({ children }) => children,
    Title: ({ children, ...props }) =>
      React.createElement(
        'h2',
        { 'data-testid': 'dialog-title', ...props },
        children
      ),
    Description: ({ children, ...props }) =>
      React.createElement(
        'p',
        { 'data-testid': 'dialog-description', ...props },
        children
      ),
    Close: ({ children, ...props }) =>
      React.createElement(
        'button',
        { 'data-testid': 'dialog-close', ...props },
        children
      ),
  }));

  // Mock other commonly used Radix UI components
  jest.doMock('@radix-ui/react-dropdown-menu', () => ({
    Root: ({ children }) =>
      React.createElement('div', { 'data-testid': 'dropdown-root' }, children),
    Trigger: ({ children, asChild, ...props }) => {
      if (asChild && React.isValidElement(children)) {
        return React.cloneElement(children, {
          'data-testid': 'dropdown-trigger',
          ...props,
        });
      }
      return React.createElement(
        'button',
        { 'data-testid': 'dropdown-trigger', ...props },
        children
      );
    },
    Content: ({ children }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-content' },
        children
      ),
    Item: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-item', ...props },
        children
      ),
    Portal: ({ children }) => children,
    Sub: ({ children }) =>
      React.createElement('div', { 'data-testid': 'dropdown-sub' }, children),
    SubTrigger: Object.assign(
      ({ children, ...props }) =>
        React.createElement(
          'button',
          { 'data-testid': 'dropdown-sub-trigger', ...props },
          children
        ),
      { displayName: 'DropdownMenuSubTrigger' }
    ),
    SubContent: ({ children }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-sub-content' },
        children
      ),
    Group: ({ children }) =>
      React.createElement('div', { 'data-testid': 'dropdown-group' }, children),
    Label: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-label', ...props },
        children
      ),
    Separator: () =>
      React.createElement('div', { 'data-testid': 'dropdown-separator' }),
    CheckboxItem: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-checkbox-item', ...props },
        children
      ),
    RadioGroup: ({ children }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-radio-group' },
        children
      ),
    RadioItem: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'dropdown-radio-item', ...props },
        children
      ),
    ItemIndicator: ({ children }) =>
      React.createElement(
        'span',
        { 'data-testid': 'dropdown-item-indicator' },
        children
      ),
    Arrow: () =>
      React.createElement('div', { 'data-testid': 'dropdown-arrow' }),
  }));

  jest.doMock('@radix-ui/react-tooltip', () => ({
    Provider: ({ children }) => children,
    Root: ({ children }) =>
      React.createElement('div', { 'data-testid': 'tooltip-root' }, children),
    Trigger: ({ children, ...props }) =>
      React.createElement(
        'div',
        { 'data-testid': 'tooltip-trigger', ...props },
        children
      ),
    Content: ({ children }) =>
      React.createElement(
        'div',
        { 'data-testid': 'tooltip-content' },
        children
      ),
    Portal: ({ children }) => children,
  }));
};

module.exports = {
  RadixUIMocks,
  setupRadixUIMocks,
};
