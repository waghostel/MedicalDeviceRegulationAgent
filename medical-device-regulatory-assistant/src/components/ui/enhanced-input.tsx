import * as React from 'react';

import { cn } from '@/lib/utils';

export interface EnhancedInputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  isFirstField?: boolean;
  announceValue?: boolean;
  errorMessage?: string;
}

const EnhancedInput = React.forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    { className, type, isFirstField, announceValue, errorMessage, ...props },
    ref
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);
    const [isFocused, setIsFocused] = React.useState(false);

    // Combine refs
    React.useImperativeHandle(ref, () => inputRef.current!);

    // Auto-focus first field when component mounts
    React.useEffect(() => {
      if (isFirstField && inputRef.current) {
        inputRef.current.focus();
      }
    }, [isFirstField]);

    const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(event);
    };

    const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      props.onBlur?.(event);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
      // Enhanced keyboard navigation
      if (event.key === 'Escape') {
        inputRef.current?.blur();
      }

      props.onKeyDown?.(event);
    };

    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'file:border-0 file:bg-transparent file:text-sm file:font-medium',
          'placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          // Enhanced focus styles
          isFocused && 'ring-2 ring-ring ring-offset-2',
          // Error styles
          errorMessage && 'border-destructive focus-visible:ring-destructive',
          className
        )}
        ref={inputRef}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        aria-invalid={!!errorMessage}
        aria-describedby={
          errorMessage ? `${props.id}-error` : props['aria-describedby']
        }
        {...props}
      />
    );
  }
);
EnhancedInput.displayName = 'EnhancedInput';

export { EnhancedInput };
