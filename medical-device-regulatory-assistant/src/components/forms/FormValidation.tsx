'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller, FieldError } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  AlertCircle, 
  Info, 
  Eye, 
  EyeOff,
  HelpCircle 
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Validation schemas for different forms
export const projectFormSchema = z.object({
  name: z.string()
    .min(1, 'Project name is required')
    .min(3, 'Project name must be at least 3 characters')
    .max(100, 'Project name must be less than 100 characters')
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Project name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  description: z.string()
    .min(1, 'Description is required')
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description must be less than 500 characters'),
  
  deviceType: z.string()
    .min(1, 'Device type is required')
    .max(100, 'Device type must be less than 100 characters'),
  
  intendedUse: z.string()
    .min(1, 'Intended use is required')
    .min(20, 'Intended use must be at least 20 characters')
    .max(1000, 'Intended use must be less than 1000 characters')
});

export const deviceSearchSchema = z.object({
  deviceDescription: z.string()
    .min(1, 'Device description is required')
    .min(10, 'Device description must be at least 10 characters')
    .max(500, 'Device description must be less than 500 characters'),
  
  intendedUse: z.string()
    .min(1, 'Intended use is required')
    .min(20, 'Intended use must be at least 20 characters')
    .max(1000, 'Intended use must be less than 1000 characters'),
  
  productCode: z.string()
    .optional()
    .refine(val => !val || /^[A-Z]{3}$/.test(val), 'Product code must be 3 uppercase letters'),
  
  deviceClass: z.enum(['I', 'II', 'III']).optional()
});

// Enhanced input component with validation
interface ValidatedInputProps {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  description?: string;
  required?: boolean;
  error?: FieldError;
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  className?: string;
  showCharacterCount?: boolean;
  maxLength?: number;
  validation?: {
    isValid?: boolean;
    isValidating?: boolean;
    message?: string;
  };
}

export const ValidatedInput: React.FC<ValidatedInputProps> = ({
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
  disabled,
  className,
  showCharacterCount,
  maxLength,
  validation
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  
  const hasError = !!error;
  const isValid = validation?.isValid && !hasError && value.length > 0;
  const isValidating = validation?.isValidating;
  
  const inputType = type === 'password' && showPassword ? 'text' : type;
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
            <div className="absolute right-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative">
        <Input
          id={name}
          name={name}
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          onFocus={() => setIsFocused(true)}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'pr-10',
            hasError && 'border-destructive focus-visible:ring-destructive',
            isValid && 'border-green-500 focus-visible:ring-green-500',
            isValidating && 'border-blue-500'
          )}
        />
        
        {/* Status icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center space-x-1">
          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          )}
          
          {isValidating && (
            <div className="animate-spin">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          
          {isValid && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          
          {hasError && (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
      </div>
      
      {/* Character count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-end">
          <span className={cn(
            'text-xs',
            value.length > maxLength * 0.9 ? 'text-orange-500' : 'text-muted-foreground',
            value.length >= maxLength && 'text-destructive'
          )}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}
      
      {/* Error message */}
      {hasError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Validation message */}
      {validation?.message && !hasError && (
        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {validation.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Enhanced textarea with validation
interface ValidatedTextareaProps extends Omit<ValidatedInputProps, 'type'> {
  rows?: number;
  resize?: boolean;
}

export const ValidatedTextarea: React.FC<ValidatedTextareaProps> = ({
  label,
  name,
  placeholder,
  description,
  required,
  error,
  value = '',
  onChange,
  onBlur,
  disabled,
  className,
  showCharacterCount,
  maxLength,
  validation,
  rows = 4,
  resize = true
}) => {
  const hasError = !!error;
  const isValid = validation?.isValid && !hasError && value.length > 0;
  const isValidating = validation?.isValidating;
  
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <Label htmlFor={name} className="text-sm font-medium">
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </Label>
        {description && (
          <div className="group relative">
            <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
            <div className="absolute right-0 top-6 w-64 p-2 bg-popover border rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <p className="text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
        )}
      </div>
      
      <div className="relative">
        <Textarea
          id={name}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          onBlur={onBlur}
          disabled={disabled}
          maxLength={maxLength}
          rows={rows}
          className={cn(
            hasError && 'border-destructive focus-visible:ring-destructive',
            isValid && 'border-green-500 focus-visible:ring-green-500',
            isValidating && 'border-blue-500',
            !resize && 'resize-none'
          )}
        />
        
        {/* Status icon */}
        <div className="absolute right-3 top-3 flex items-center space-x-1">
          {isValidating && (
            <div className="animate-spin">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
          )}
          
          {isValid && (
            <CheckCircle className="w-4 h-4 text-green-500" />
          )}
          
          {hasError && (
            <AlertCircle className="w-4 h-4 text-destructive" />
          )}
        </div>
      </div>
      
      {/* Character count */}
      {showCharacterCount && maxLength && (
        <div className="flex justify-end">
          <span className={cn(
            'text-xs',
            value.length > maxLength * 0.9 ? 'text-orange-500' : 'text-muted-foreground',
            value.length >= maxLength && 'text-destructive'
          )}>
            {value.length}/{maxLength}
          </span>
        </div>
      )}
      
      {/* Error message */}
      {hasError && (
        <Alert variant="destructive" className="py-2">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {error.message}
          </AlertDescription>
        </Alert>
      )}
      
      {/* Validation message */}
      {validation?.message && !hasError && (
        <Alert className="py-2">
          <Info className="h-4 w-4" />
          <AlertDescription className="text-sm">
            {validation.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

// Real-time validation hook
export const useRealTimeValidation = (
  schema: z.ZodSchema,
  debounceMs: number = 300
) => {
  const [validationState, setValidationState] = useState<Record<string, {
    isValid: boolean;
    isValidating: boolean;
    message?: string;
  }>>({});
  
  const validateField = async (fieldName: string, value: any) => {
    setValidationState(prev => ({
      ...prev,
      [fieldName]: { ...prev[fieldName], isValidating: true }
    }));
    
    try {
      await schema.parseAsync({ [fieldName]: value });
      setValidationState(prev => ({
        ...prev,
        [fieldName]: { isValid: true, isValidating: false }
      }));
    } catch (error) {
      if (error instanceof z.ZodError) {
        const fieldError = error.errors.find(e => e.path[0] === fieldName);
        setValidationState(prev => ({
          ...prev,
          [fieldName]: { 
            isValid: false, 
            isValidating: false,
            message: fieldError?.message 
          }
        }));
      }
    }
  };
  
  return { validationState, validateField };
};