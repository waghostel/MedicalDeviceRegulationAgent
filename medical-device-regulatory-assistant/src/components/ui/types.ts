/**
 * TypeScript definitions for UI components
 * Ensures proper type checking and IntelliSense support
 */

import * as React from 'react';
import { VariantProps } from 'class-variance-authority';

// Button component types
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<any> {
  asChild?: boolean;
}

// Input component types
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

// Select component types
export interface SelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  children: React.ReactNode;
}

export interface SelectTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

export interface SelectContentProps {
  children: React.ReactNode;
}

export interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

// Dialog component types
export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface DialogContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

// Form component types
export interface FormProps {
  children: React.ReactNode;
}

export interface FormFieldProps {
  name: string;
  control?: any;
  render: (props: any) => React.ReactElement;
}

export interface FormItemProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface FormLabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export interface FormControlProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface FormDescriptionProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

export interface FormMessageProps
  extends React.HTMLAttributes<HTMLParagraphElement> {}

// Card component types
export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardTitleProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardContentProps
  extends React.HTMLAttributes<HTMLDivElement> {}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {}

// Toast component types
export interface ToastProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | 'default'
    | 'destructive'
    | 'success'
    | 'warning'
    | 'info'
    | 'progress';
  onRetry?: () => void;
  retryLabel?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionUrl?: string;
  progress?: number;
  showProgress?: boolean;
}

export interface ToastActionElement extends React.ReactElement {}

// Badge component types
export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<any> {
  asChild?: boolean;
}

// Progress component types
export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number;
}

// Alert component types
export interface AlertProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<any> {}

export interface AlertTitleProps
  extends React.HTMLAttributes<HTMLHeadingElement> {}

export interface AlertDescriptionProps
  extends React.HTMLAttributes<HTMLDivElement> {}

// Skeleton component types
export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

// Checkbox component types
export interface CheckboxProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

// Switch component types
export interface SwitchProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

// Slider component types
export interface SliderProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number[];
  onValueChange?: (value: number[]) => void;
  min?: number;
  max?: number;
  step?: number;
}

// Calendar component types
export interface CalendarProps {
  mode?: 'single' | 'multiple' | 'range';
  selected?: Date | Date[] | { from: Date; to: Date };
  onSelect?: (
    date: Date | Date[] | { from: Date; to: Date } | undefined
  ) => void;
  disabled?: (date: Date) => boolean;
  className?: string;
}

// Separator component types
export interface SeparatorProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'horizontal' | 'vertical';
  decorative?: boolean;
}

// ScrollArea component types
export interface ScrollAreaProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export interface ScrollBarProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: 'vertical' | 'horizontal';
}

// Collapsible component types
export interface CollapsibleProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

// Tabs component types
export interface TabsProps {
  value?: string;
  onValueChange?: (value: string) => void;
  children: React.ReactNode;
}

export interface TabsListProps extends React.HTMLAttributes<HTMLDivElement> {}

export interface TabsTriggerProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export interface TabsContentProps extends React.HTMLAttributes<HTMLDivElement> {
  value: string;
}

// Popover component types
export interface PopoverProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

export interface PopoverContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
}

// Tooltip component types
export interface TooltipProps {
  children: React.ReactNode;
}

export interface TooltipContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
}

// Dropdown Menu component types
export interface DropdownMenuProps {
  children: React.ReactNode;
}

export interface DropdownMenuContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  sideOffset?: number;
}

export interface DropdownMenuItemProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

export interface DropdownMenuLabelProps
  extends React.HTMLAttributes<HTMLDivElement> {
  inset?: boolean;
}

// Custom component types
export interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  width?: number;
  height?: number;
  loading?: 'lazy' | 'eager';
  onLoad?: () => void;
  onError?: () => void;
}

export interface SlashCommandCardProps {
  command: {
    command: string;
    description: string;
    icon: string;
    category: 'search' | 'analysis' | 'classification' | 'guidance';
  };
  onExecute?: (command: string) => void;
  disabled?: boolean;
}

// Re-export common React types for convenience
export type ComponentProps<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>,
> = React.ComponentProps<T>;

export type ComponentPropsWithoutRef<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>,
> = React.ComponentPropsWithoutRef<T>;

export type ComponentPropsWithRef<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>,
> = React.ComponentPropsWithRef<T>;

export type ElementRef<
  T extends keyof JSX.IntrinsicElements | React.JSXElementConstructor<any>,
> = React.ElementRef<T>;
