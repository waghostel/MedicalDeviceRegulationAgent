/**
 * Enhanced form field components with real-time validation, accessibility, and auto-save
 */

import React, { forwardRef, useId, useState, useEffect } from 'react';
import { FieldError, FieldPath, FieldValues } from 'react-hook-form';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  CheckCircle,
  AlertCircle,
  Info,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
} from 'lucide-react';

export interface BaseFieldProps {
  label: string;
  name: string;
  description?: string;
  required?: boolean;
  error?: FieldError;
  disabled?: boolean;
  className?: string;
  'aria-describedby'?: string;
  'aria-invalid'?: boolean;
  'aria-required'?: boolean;
}

export interface ValidationState {
  isValid?: boolean;
  isValidating?: boolean;
  hasBeenTouched?: boolean;
  message?: string;
}

export interface EnhancedInputProps extends BaseFieldProps {
  type?: 'text' | 'email' | 'password' | 'tel' | 'url' | 'search';
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  maxLength?: number;
  showCharacterCount?: boolean;
  validation?: ValidationState;
  autoComplete?: string;
  autoFocus?: boolean;
}

export interface EnhancedTextareaProps extends BaseFieldProps {
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  rows?: number;
  maxLength?: number;
  showCharacterCount?: boolean;
  validation?: ValidationState;
  resize?: boolean;
  autoFocus?: boolean;
}

// Enhanced Input Component
export const EnhancedInput = forwardRef<HTMLInputElement, EnhancedInputProps>(
  (
    {
      label,
      name,
      type = 'text',
      placeholder,
      description,
      required,
      error,
      value = '',
      onChange,
      onBlur,
      onFocus,
      disabled,
      className,
      maxLength,
      showCharacterCount,
      validation,
      autoComplete,
      autoFocus,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const fieldId = useId();
    const descriptionId = useId();
    const errorId = useId();

    const hasError = !!error;
    const isValid = validation?.isValid && !hasError && value.length > 0;
    const isValidating = validation?.isValidating;
    const showValidation = validation?.hasBeenTouched || isFocused;

    const inputType = type === 'password' && showPassword ? 'text' : type;

    // Auto-focus handling
    useEffect(() => {
      if (autoFocus && ref && 'current' in ref && ref.current) {
        ref.current.focus();
      }
    }, [autoFocus, ref]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      onBlur?.();
    };

    const describedBy = [
      description ? descriptionId : null,
      hasError ? errorId : null,
      validation?.message && showValidation ? `${fieldId}-validation` : null,
      props['aria-describedby'],
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={cn('space-y-2', className)}>
        {/* Label and Help */}
        <div className="flex items-center justify-between">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </Label>
          {description && (
            <div className="group relative">
              <HelpCircle
                className="w-4 h-4 text-muted-foreground cursor-help"
                aria-label="Help information"
              />
              <div
                id={descriptionId}
                className="absolute right-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
                role="tooltip"
              >
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Input Field */}
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            name={name}
            type={inputType}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            autoComplete={autoComplete}
            className={cn(
              'pr-10',
              hasError && 'border-destructive focus-visible:ring-destructive',
              isValid &&
                showValidation &&
                'border-green-500 focus-visible:ring-green-500',
              isValidating && 'border-blue-500'
            )}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError}
            aria-required={required}
            {...props}
          />

          {/* Status Icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
            {type === 'password' && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-muted-foreground hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            )}

            {isValidating && (
              <Loader2
                className="w-4 h-4 animate-spin text-blue-500"
                aria-label="Validating"
              />
            )}

            {isValid && showValidation && (
              <CheckCircle
                className="w-4 h-4 text-green-500"
                aria-label="Valid input"
              />
            )}

            {hasError && (
              <AlertCircle
                className="w-4 h-4 text-destructive"
                aria-label="Invalid input"
              />
            )}
          </div>
        </div>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                'text-xs',
                value.length > maxLength * 0.9
                  ? 'text-orange-500'
                  : 'text-muted-foreground',
                value.length >= maxLength && 'text-destructive'
              )}
              aria-label={`${value.length} of ${maxLength} characters used`}
            >
              {value.length}/{maxLength}
            </span>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <Alert variant="destructive" className="py-2" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription id={errorId} className="text-sm">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Message */}
        {validation?.message && !hasError && showValidation && (
          <Alert className="py-2" role="status">
            <Info className="h-4 w-4" />
            <AlertDescription id={`${fieldId}-validation`} className="text-sm">
              {validation.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
);

EnhancedInput.displayName = 'EnhancedInput';

// Enhanced Textarea Component
export const EnhancedTextarea = forwardRef<
  HTMLTextAreaElement,
  EnhancedTextareaProps
>(
  (
    {
      label,
      name,
      placeholder,
      description,
      required,
      error,
      value = '',
      onChange,
      onBlur,
      onFocus,
      disabled,
      className,
      rows = 4,
      maxLength,
      showCharacterCount,
      validation,
      resize = true,
      autoFocus,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);
    const fieldId = useId();
    const descriptionId = useId();
    const errorId = useId();

    const hasError = !!error;
    const isValid = validation?.isValid && !hasError && value.length > 0;
    const isValidating = validation?.isValidating;
    const showValidation = validation?.hasBeenTouched || isFocused;

    // Auto-focus handling
    useEffect(() => {
      if (autoFocus && ref && 'current' in ref && ref.current) {
        ref.current.focus();
      }
    }, [autoFocus, ref]);

    const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(true);
      onFocus?.();
    };

    const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
      setIsFocused(false);
      onBlur?.();
    };

    const describedBy = [
      description ? descriptionId : null,
      hasError ? errorId : null,
      validation?.message && showValidation ? `${fieldId}-validation` : null,
      props['aria-describedby'],
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div className={cn('space-y-2', className)}>
        {/* Label and Help */}
        <div className="flex items-center justify-between">
          <Label htmlFor={fieldId} className="text-sm font-medium">
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </Label>
          {description && (
            <div className="group relative">
              <HelpCircle
                className="w-4 h-4 text-muted-foreground cursor-help"
                aria-label="Help information"
              />
              <div
                id={descriptionId}
                className="absolute right-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-md opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity z-10"
                role="tooltip"
              >
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>
          )}
        </div>

        {/* Textarea Field */}
        <div className="relative">
          <Textarea
            ref={ref}
            id={fieldId}
            name={name}
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange?.(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            disabled={disabled}
            maxLength={maxLength}
            rows={rows}
            className={cn(
              hasError && 'border-destructive focus-visible:ring-destructive',
              isValid &&
                showValidation &&
                'border-green-500 focus-visible:ring-green-500',
              isValidating && 'border-blue-500',
              !resize && 'resize-none'
            )}
            aria-describedby={describedBy || undefined}
            aria-invalid={hasError}
            aria-required={required}
            {...props}
          />

          {/* Status Icon */}
          <div className="absolute right-3 top-3 flex items-center space-x-1">
            {isValidating && (
              <Loader2
                className="w-4 h-4 animate-spin text-blue-500"
                aria-label="Validating"
              />
            )}

            {isValid && showValidation && (
              <CheckCircle
                className="w-4 h-4 text-green-500"
                aria-label="Valid input"
              />
            )}

            {hasError && (
              <AlertCircle
                className="w-4 h-4 text-destructive"
                aria-label="Invalid input"
              />
            )}
          </div>
        </div>

        {/* Character Count */}
        {showCharacterCount && maxLength && (
          <div className="flex justify-end">
            <span
              className={cn(
                'text-xs',
                value.length > maxLength * 0.9
                  ? 'text-orange-500'
                  : 'text-muted-foreground',
                value.length >= maxLength && 'text-destructive'
              )}
              aria-label={`${value.length} of ${maxLength} characters used`}
            >
              {value.length}/{maxLength}
            </span>
          </div>
        )}

        {/* Error Message */}
        {hasError && (
          <Alert variant="destructive" className="py-2" role="alert">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription id={errorId} className="text-sm">
              {error.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Validation Message */}
        {validation?.message && !hasError && showValidation && (
          <Alert className="py-2" role="status">
            <Info className="h-4 w-4" />
            <AlertDescription id={`${fieldId}-validation`} className="text-sm">
              {validation.message}
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }
);

EnhancedTextarea.displayName = 'EnhancedTextarea';

// Auto-save indicator component
export const AutoSaveIndicator: React.FC<{
  isSaving: boolean;
  lastSaved?: Date;
  className?: string;
}> = ({ isSaving, lastSaved, className }) => {
  const formatLastSaved = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {
      // Less than 1 minute
      return 'Just now';
    } else if (diff < 3600000) {
      // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleTimeString();
    }
  };

  if (isSaving) {
    return (
      <div
        className={cn(
          'flex items-center text-sm text-muted-foreground',
          className
        )}
      >
        <Loader2 className="w-3 h-3 animate-spin mr-1" />
        Saving...
      </div>
    );
  }

  if (lastSaved) {
    return (
      <div
        className={cn(
          'flex items-center text-sm text-muted-foreground',
          className
        )}
      >
        <CheckCircle className="w-3 h-3 mr-1 text-green-500" />
        Saved {formatLastSaved(lastSaved)}
      </div>
    );
  }

  return null;
};
