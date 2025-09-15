/**
 * UI Components Index
 * Central export file for all UI components
 * This ensures all components are properly exported and can be imported consistently
 */

// Core UI Components
export { Button, buttonVariants } from './button';
export { Input } from './input';
export { Label } from './label';
export { Textarea } from './textarea';

// Form Components
export {
  Form,
  FormItem,
  FormLabel,
  FormControl,
  FormDescription,
  FormMessage,
  FormField,
  useFormField,
} from './form';

// Layout Components
export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
} from './card';

// Navigation Components
export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
} from './select';

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
} from './dropdown-menu';

// Dialog Components
export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from './dialog';

// Feedback Components
export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  type ToastProps,
  type ToastActionElement,
} from './toast';

export { Toaster } from './toaster';

export { Alert, AlertDescription, AlertTitle } from './alert';
export { Badge, badgeVariants } from './badge';
export { Progress } from './progress';
export { Skeleton } from './skeleton';

// Interactive Components
export { Checkbox } from './checkbox';
export { Switch } from './switch';
export { Slider } from './slider';
export { Calendar } from './calendar';

// Layout & Structure
export { Separator } from './separator';
export { ScrollArea, ScrollBar } from './scroll-area';
export { Collapsible, CollapsibleTrigger, CollapsibleContent } from './collapsible';
export { Tabs, TabsList, TabsTrigger, TabsContent } from './tabs';

// Overlay Components
export { Popover, PopoverTrigger, PopoverContent } from './popover';
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from './tooltip';

// Custom Components
export { LazyImage } from './lazy-image';
export { SlashCommandCard } from './slash-command-card';

// Real-time Components
export { ConnectionStatus, DetailedConnectionStatus } from './connection-status';
export { 
  TypingIndicators, 
  TypingAnimation, 
  UserTypingIndicator, 
  AgentTypingIndicator 
} from './typing-indicators';
export { 
  StreamingResponse, 
  CompactStreamingResponse, 
  MarkdownStreamingResponse 
} from './streaming-response';
export { 
  EnhancedStreamingResponse, 
  CompactStreamingResponse as CompactEnhancedStreamingResponse,
  useEnhancedStreamingResponse 
} from './enhanced-streaming-response';

// Type definitions
export type * from './types';