# Design Document - Frontend Error Resolution and Feature Implementation

## Overview

This design document outlines the comprehensive architecture and implementation approach for resolving frontend errors and implementing missing features in the Medical Device Regulatory Assistant application. The design follows a three-phase approach prioritizing foundational fixes, real-time features, and advanced optimizations.

The solution leverages modern React patterns, TypeScript best practices, and established design systems to create a robust, accessible, and performant user interface that serves regulatory affairs professionals in their FDA submission workflows.

## Architecture

### High-Level Architecture

```mermaid
graph TB
    subgraph "Frontend Application"
        A[Next.js App Router] --> B[React Components]
        B --> C[Shadcn UI System]
        C --> D[Tailwind CSS]
        
        E[State Management] --> F[React Context]
        F --> G[Custom Hooks]
        
        H[Real-time Layer] --> I[WebSocket Service]
        I --> J[Message Router]
        
        K[Testing Layer] --> L[Jest + RTL]
        L --> M[Playwright E2E]
        M --> N[MSW Mocking]
    end
    
    subgraph "External Services"
        O[FastAPI Backend]
        P[Authentication Service]
        Q[WebSocket Server]
    end
    
    A --> O
    H --> Q
    E --> P
```

### Component Architecture

```mermaid
graph LR
    subgraph "UI Layer"
        A[Pages] --> B[Layout Components]
        B --> C[Feature Components]
        C --> D[UI Components]
    end
    
    subgraph "Logic Layer"
        E[Custom Hooks] --> F[Service Layer]
        F --> G[API Clients]
        G --> H[WebSocket Client]
    end
    
    subgraph "State Layer"
        I[Context Providers] --> J[Reducers]
        J --> K[Local State]
    end
    
    A --> E
    C --> I
    F --> I
```

## Components and Interfaces

### Core Component System

#### 1. Testing Infrastructure Components

**MSW Integration Service**
```typescript
interface MSWService {
  setupHandlers(): void;
  resetHandlers(): void;
  restoreHandlers(): void;
  addHandler(handler: RestHandler): void;
}

interface TestSetupConfig {
  enableMSW: boolean;
  mockAuthentication: boolean;
  mockWebSocket: boolean;
  seedData?: any;
}
```

**Centralized Test Setup**
```typescript
interface TestEnvironment {
  setup(config: TestSetupConfig): Promise<void>;
  teardown(): Promise<void>;
  mockAPI(endpoints: APIEndpoint[]): void;
  mockWebSocket(events: WebSocketEvent[]): void;
}
```

#### 2. Component Export System

**Component Registry**
```typescript
interface ComponentRegistry {
  register<T>(name: string, component: React.ComponentType<T>): void;
  get<T>(name: string): React.ComponentType<T> | undefined;
  getAll(): Map<string, React.ComponentType<any>>;
}

interface UIComponentExports {
  Button: typeof Button;
  Select: typeof Select;
  Dialog: typeof Dialog;
  Toast: typeof Toast;
  // ... all UI components
}
```

#### 3. Form System Architecture

**Enhanced Form Hook**
```typescript
interface EnhancedFormConfig<T> {
  schema: ZodSchema<T>;
  defaultValues?: Partial<T>;
  mode: 'onChange' | 'onBlur' | 'onSubmit';
  autoSave?: {
    enabled: boolean;
    interval: number;
    key: string;
  };
}

interface FormState<T> {
  data: T;
  errors: FieldErrors<T>;
  isValid: boolean;
  isDirty: boolean;
  isSubmitting: boolean;
  touchedFields: Partial<Record<keyof T, boolean>>;
}
```

**Toast Integration Custom Hook (Built on Radix UI Toast)**
```typescript
// Custom hook that wraps Radix UI Toast with application-specific logic
interface UseToastOptions {
  defaultDuration?: number;
  maxToasts?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

interface UseToastReturn {
  toast: {
    success: (title: string, description?: string, options?: ToastOptions) => void;
    error: (title: string, description?: string, options?: ToastOptions) => void;
    warning: (title: string, description?: string, options?: ToastOptions) => void;
    info: (title: string, description?: string, options?: ToastOptions) => void;
    authExpired: (onRetry: () => void) => void;
    networkError: (onRetry: () => void) => void;
    validationError: (message: string, field?: string) => void;
  };
  toasts: Toast[];
  dismiss: (toastId: string) => void;
  dismissAll: () => void;
}

function useToast(options?: UseToastOptions): UseToastReturn;

// Specialized hook for form-specific toasts
interface UseFormToastReturn {
  showValidationError: (field: string, message: string) => void;
  showSubmissionSuccess: (message: string) => void;
  showSubmissionError: (error: Error) => void;
  clearFormToasts: () => void;
}

function useFormToast(): UseFormToastReturn;
```

#### 4. Real-time Communication System (Custom Hooks Pattern)

**WebSocket Custom Hook**
```typescript
// Primary hook for WebSocket functionality
interface UseWebSocketOptions {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
  heartbeatInterval?: number;
}

interface UseWebSocketReturn {
  connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'error';
  send: <T>(message: WebSocketMessage<T>) => void;
  lastMessage: WebSocketMessage | null;
  error: Error | null;
  reconnect: () => void;
}

function useWebSocket(options: UseWebSocketOptions): UseWebSocketReturn;

// Specialized hook for real-time messaging
interface UseRealtimeMessagingReturn {
  messages: WebSocketMessage[];
  sendMessage: (type: string, data: any) => void;
  subscribe: (type: string, handler: MessageHandler) => () => void;
  connectionStatus: ConnectionStatus;
}

function useRealtimeMessaging(): UseRealtimeMessagingReturn;
```

**Streaming Response Custom Hook**
```typescript
// Hook for managing streaming AI responses
interface UseStreamingResponseOptions {
  streamId: string;
  onStreamStart?: () => void;
  onStreamEnd?: () => void;
  onError?: (error: Error) => void;
}

interface UseStreamingResponseReturn {
  content: string;
  isStreaming: boolean;
  error: Error | null;
  interrupt: () => void;
  restart: () => void;
}

function useStreamingResponse(options: UseStreamingResponseOptions): UseStreamingResponseReturn;

// Hook for typing indicators
interface UseTypingIndicatorsReturn {
  typingUsers: TypingIndicator[];
  startTyping: () => void;
  stopTyping: () => void;
  isUserTyping: (userId: string) => boolean;
}

function useTypingIndicators(): UseTypingIndicatorsReturn;
```

#### 5. Accessibility System (Leveraging Radix UI Primitives)

**Focus Management Hook (Built on Radix UI)**
```typescript
// Leverage Radix UI's built-in accessibility features
interface UseFocusManagementOptions {
  trapFocus?: boolean;
  restoreFocus?: boolean;
  autoFocus?: boolean;
}

interface UseFocusManagementReturn {
  focusProps: React.HTMLAttributes<HTMLElement>;
  trapRef: React.RefObject<HTMLElement>;
  restoreFocus: () => void;
}

// Custom hook that wraps Radix UI accessibility patterns
function useFocusManagement(options: UseFocusManagementOptions): UseFocusManagementReturn;

// Accessibility announcements hook
interface UseAccessibilityAnnouncementsReturn {
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  liveRegionProps: React.HTMLAttributes<HTMLElement>;
}

function useAccessibilityAnnouncements(): UseAccessibilityAnnouncementsReturn;
```

**Radix UI Component Enhancement**
```typescript
// Extend existing Radix UI components with additional accessibility
interface EnhancedDialogProps extends React.ComponentProps<typeof Dialog> {
  announceOnOpen?: string;
  announceOnClose?: string;
  customFocusTarget?: React.RefObject<HTMLElement>;
}

// Leverage Radix UI's built-in focus trapping and ARIA attributes
const EnhancedDialog: React.FC<EnhancedDialogProps>;
```

### Data Models

#### Form Data Models

```typescript
interface ProjectFormData {
  name: string;
  description: string;
  deviceType: DeviceType;
  intendedUse: string;
  regulatoryPathway: RegulatoryPathway;
  targetMarket: Market[];
}

interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

interface ValidationError {
  field: string;
  message: string;
  code: string;
}
```

#### Real-time Data Models

```typescript
interface TypingIndicator {
  userId: string;
  userName: string;
  timestamp: number;
  location?: string; // which field/area they're typing in
}

interface UserPresence {
  userId: string;
  userName: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  currentPage?: string;
}

interface AgentResponse {
  id: string;
  type: 'stream_start' | 'stream_chunk' | 'stream_end' | 'error';
  content?: string;
  metadata?: {
    confidence?: number;
    sources?: string[];
    reasoning?: string;
  };
}
```

#### Performance Data Models

```typescript
interface PerformanceMetrics {
  pageLoadTime: number;
  timeToInteractive: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  cumulativeLayoutShift: number;
  firstInputDelay: number;
}

interface VirtualScrollConfig {
  itemHeight: number;
  containerHeight: number;
  overscan: number;
  threshold: number;
}
```

## Error Handling

### Error Classification System

```typescript
enum ErrorType {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NETWORK = 'network',
  SERVER = 'server',
  CLIENT = 'client',
  WEBSOCKET = 'websocket',
  PERFORMANCE = 'performance'
}

interface ErrorContext {
  type: ErrorType;
  code: string;
  message: string;
  details?: any;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
}
```

### Error Handling Strategies

#### 1. Form Error Handling

```typescript
class FormErrorHandler {
  handleValidationError(error: ValidationError): void {
    // Show field-specific error messages
    // Focus on first error field
    // Update form state
  }

  handleSubmissionError(error: SubmissionError): void {
    // Show appropriate toast notification
    // Retry logic for network errors
    // Auth redirect for auth errors
  }

  handleNetworkError(error: NetworkError): void {
    // Show network error toast with retry
    // Implement exponential backoff
    // Cache form data for recovery
  }
}
```

#### 2. WebSocket Error Handling

```typescript
class WebSocketErrorHandler {
  handleConnectionError(error: ConnectionError): void {
    // Attempt reconnection with backoff
    // Show connection status indicator
    // Queue messages for retry
  }

  handleMessageError(error: MessageError): void {
    // Log error for debugging
    // Show user-friendly error message
    // Attempt message recovery
  }
}
```

#### 3. Component Error Boundaries

```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ComponentErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to monitoring service
    // Show fallback UI
    // Provide recovery options
  }
}
```

## Testing Strategy

### Testing Architecture

```mermaid
graph TB
    subgraph "Testing Layers"
        A[Unit Tests] --> B[Component Tests]
        B --> C[Integration Tests]
        C --> D[E2E Tests]
        D --> E[Visual Tests]
        E --> F[Accessibility Tests]
        F --> G[Performance Tests]
    end
    
    subgraph "Testing Tools"
        H[Jest] --> I[React Testing Library]
        I --> J[MSW]
        J --> K[Playwright]
        K --> L[Axe-core]
        L --> M[Lighthouse]
    end
    
    A --> H
    C --> J
    D --> K
    F --> L
    G --> M
```

### Test Implementation Strategy

#### 1. MSW Integration Testing

```typescript
interface MSWTestSetup {
  setupServer(): SetupServerApi;
  createHandlers(endpoints: APIEndpoint[]): RestHandler[];
  mockWebSocket(events: WebSocketEvent[]): void;
  resetMocks(): void;
}

// Centralized test setup
export const testSetup = {
  beforeAll: () => {
    server.listen({ onUnhandledRequest: 'error' });
  },
  afterEach: () => {
    server.resetHandlers();
  },
  afterAll: () => {
    server.close();
  }
};
```

#### 2. Component Testing Strategy

```typescript
interface ComponentTestUtils {
  renderWithProviders<T>(
    component: React.ComponentType<T>,
    options?: RenderOptions
  ): RenderResult;
  
  mockToastService(): MockToastService;
  mockWebSocketService(): MockWebSocketService;
  mockFormValidation(): MockValidationService;
}

// Example test structure
describe('ProjectForm', () => {
  it('should display success toast on successful submission', async () => {
    const mockToast = mockToastService();
    const { user } = renderWithProviders(<ProjectForm />);
    
    await user.type(screen.getByLabelText('Project Name'), 'Test Project');
    await user.click(screen.getByRole('button', { name: 'Create Project' }));
    
    expect(mockToast.success).toHaveBeenCalledWith(
      'Project Created',
      'Project "Test Project" created successfully'
    );
  });
});
```

#### 3. Real-time Feature Testing

```typescript
interface WebSocketTestUtils {
  mockWebSocketConnection(): MockWebSocket;
  simulateMessage<T>(message: WebSocketMessage<T>): void;
  simulateDisconnection(): void;
  simulateReconnection(): void;
}

// Example WebSocket test
describe('Real-time Features', () => {
  it('should display typing indicators for multiple users', async () => {
    const mockWS = mockWebSocketConnection();
    renderWithProviders(<CollaborativeEditor />);
    
    mockWS.simulateMessage({
      type: 'user_typing_start',
      data: { userId: 'user1', userName: 'John Doe' }
    });
    
    expect(screen.getByText('John Doe is typing...')).toBeInTheDocument();
  });
});
```

### Performance Testing Strategy

#### 1. Performance Testing (Data-Driven Approach)

```typescript
// First, measure existing performance to identify bottlenecks
interface PerformanceProfiler {
  measureComponentRender(component: React.ComponentType): RenderMetrics;
  identifySlowComponents(): ComponentPerformanceReport[];
  measureScrollPerformance(container: HTMLElement): ScrollMetrics;
  generatePerformanceReport(): PerformanceReport;
}

// Performance testing with baseline measurements
describe('Performance Optimization', () => {
  it('should identify performance bottlenecks before optimization', async () => {
    const profiler = new PerformanceProfiler();
    const baseline = await profiler.measureComponentRender(ProjectList);
    
    // Only implement virtual scrolling if render time exceeds threshold
    if (baseline.renderTime > 100) { // 100ms threshold
      const optimizedComponent = withVirtualScrolling(ProjectList);
      const optimized = await profiler.measureComponentRender(optimizedComponent);
      
      expect(optimized.renderTime).toBeLessThan(baseline.renderTime * 0.5);
    }
  });

  it('should use React.memo for simple performance gains first', async () => {
    const MemoizedComponent = React.memo(ExpensiveComponent);
    const renderCount = measureRerenders(MemoizedComponent);
    
    // Verify memo prevents unnecessary re-renders
    expect(renderCount.unnecessaryRenders).toBe(0);
  });
});
```

#### 2. Bundle Size Testing

```typescript
interface BundleSizeConfig {
  maxSize: number;
  chunks: string[];
  compressionType: 'gzip' | 'brotli';
}

describe('Bundle Size', () => {
  it('should maintain optimal bundle sizes', async () => {
    const bundleStats = await analyzeBundleSize();
    
    expect(bundleStats.mainBundle.gzipSize).toBeLessThan(250 * 1024); // 250KB
    expect(bundleStats.vendorBundle.gzipSize).toBeLessThan(500 * 1024); // 500KB
  });
});
```

## Implementation Phases

### Phase 1: Foundation (Weeks 1-2)

#### Testing Infrastructure Stabilization

1. **MSW Integration Consolidation**
   - Create unified `src/lib/testing/test-setup.ts`
   - Consolidate MSW utilities into single module
   - Update Jest configuration for proper module handling
   - Implement centralized mock data management

2. **Component Export System**
   - Audit all component exports in `src/components/ui/`
   - Create comprehensive index files
   - Add TypeScript type definitions
   - Implement component registry system

3. **Form System Enhancement**
   - Integrate toast notifications with form submissions
   - Implement comprehensive error handling
   - Add real-time validation feedback
   - Create auto-save functionality

4. **Accessibility Foundation (Leveraging Radix UI)**
   - Audit existing Radix UI component usage for built-in accessibility
   - Create custom hooks that extend Radix UI accessibility patterns
   - Implement `useFocusManagement` and `useAccessibilityAnnouncements` hooks
   - Establish accessibility testing with existing Radix UI features

### Phase 2: Real-time Features (Weeks 2-3)

#### WebSocket Communication System (Custom Hooks Pattern)

1. **Core WebSocket Hook Implementation**
   - Create `useWebSocket` hook in `src/hooks/useWebSocket.ts`
   - Implement `useRealtimeMessaging` for message handling
   - Add connection status management within hooks
   - Create error handling and recovery logic

2. **Specialized Real-time Hooks**
   - Build `useStreamingResponse` hook for AI agent responses
   - Implement `useTypingIndicators` for collaborative features
   - Add `useUserPresence` for user status tracking
   - Create `useCollaboration` for conflict resolution

3. **Component Integration Pattern**
   ```typescript
   // Components consume real-time features through hooks
   const CollaborativeEditor = () => {
     const { messages, sendMessage } = useRealtimeMessaging();
     const { typingUsers } = useTypingIndicators();
     const { connectionStatus } = useWebSocket({ url: WS_URL });
     
     // Component logic uses hook data without managing connection
   };
   ```

4. **Enhanced User Feedback**
   - Complete toast notification system
   - Add contextual error messages
   - Implement loading state management
   - Create accessibility announcements

### Phase 3: Advanced Features (Weeks 3-4)

#### Performance Optimization (Data-Driven Approach)

1. **Performance Measurement and Analysis**
   - Use React DevTools Profiler to identify slow components
   - Run `pnpm lighthouse` to establish performance baselines
   - Implement performance monitoring hooks
   - Create performance regression detection

2. **Simple Optimizations First**
   - Apply `React.memo` to prevent unnecessary re-renders
   - Optimize component prop drilling with context
   - Implement efficient state management patterns
   - Use `useMemo` and `useCallback` strategically

3. **Advanced Optimizations (Only When Needed)**
   - Implement virtual scrolling for lists with >1000 items
   - Add component lazy loading for route-level code splitting
   - Create intelligent caching strategies based on usage patterns
   - Optimize bundle splitting based on actual usage data

4. **Performance Monitoring Custom Hooks**
   ```typescript
   // Hook to measure and report component performance
   function usePerformanceMonitor(componentName: string): PerformanceMetrics;
   
   // Hook to detect performance regressions
   function usePerformanceRegression(): RegressionDetector;
   ```

#### Advanced User Experience

1. **Mobile Responsiveness**
   - Optimize layouts for mobile devices
   - Implement touch-friendly interactions
   - Add mobile-specific navigation
   - Create progressive web app features

2. **Advanced Search System**
   - Build comprehensive search UI
   - Implement filter combinations
   - Add search history and suggestions
   - Create saved search functionality

3. **Accessibility Compliance**
   - Complete WCAG 2.1 AA implementation
   - Add high contrast mode support
   - Implement screen reader optimization
   - Create accessibility testing automation

## Monitoring and Maintenance

### Performance Monitoring

```typescript
interface PerformanceMonitor {
  trackPageLoad(page: string, metrics: PerformanceMetrics): void;
  trackUserInteraction(interaction: string, duration: number): void;
  trackError(error: ErrorContext): void;
  generateReport(): PerformanceReport;
}
```

### Error Tracking

```typescript
interface ErrorTracker {
  captureError(error: Error, context: ErrorContext): void;
  captureMessage(message: string, level: 'info' | 'warning' | 'error'): void;
  setUserContext(user: UserContext): void;
  addBreadcrumb(breadcrumb: Breadcrumb): void;
}
```

### Quality Assurance

```typescript
interface QualityMetrics {
  testCoverage: number;
  performanceScore: number;
  accessibilityScore: number;
  bundleSize: number;
  errorRate: number;
}
```

This comprehensive design provides a solid foundation for implementing all the requirements while maintaining code quality, performance, and accessibility standards. The phased approach ensures steady progress and allows for iterative improvements based on testing and user feedback.