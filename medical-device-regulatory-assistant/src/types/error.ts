/**
 * Comprehensive error types for the Medical Device Regulatory Assistant
 */

export interface BaseError {
  message: string;
  code?: string;
  timestamp?: string;
  requestId?: string;
  userMessage?: string;
  suggestions?: string[];
}

export interface NetworkError extends BaseError {
  type: 'network';
  isOnline?: boolean;
  retryAfter?: number;
}

export interface AuthenticationError extends BaseError {
  type: 'auth';
  isTokenExpired?: boolean;
  redirectUrl?: string;
}

export interface ValidationError extends BaseError {
  type: 'validation';
  field?: string;
  validationRules?: string[];
  fieldErrors?: Record<string, string[]>;
}

export interface FDAAPIError extends BaseError {
  type: 'fda-api';
  endpoint?: string;
  isServiceDown?: boolean;
  rateLimited?: boolean;
  retryAfter?: number;
}

export interface ServerError extends BaseError {
  type: 'server';
  status: number;
  isTemporary?: boolean;
  maintenanceMode?: boolean;
}

export interface TimeoutError extends BaseError {
  type: 'timeout';
  duration: number;
  operation?: string;
}

export interface ProjectError extends BaseError {
  type: 'project';
  projectId?: number;
  operation?: 'create' | 'read' | 'update' | 'delete' | 'export';
  conflictData?: any;
}

export interface AgentError extends BaseError {
  type: 'agent';
  agentType?: string;
  step?: string;
  context?: Record<string, any>;
}

export type AppError = 
  | NetworkError 
  | AuthenticationError 
  | ValidationError 
  | FDAAPIError 
  | ServerError 
  | TimeoutError 
  | ProjectError 
  | AgentError;

/**
 * Enhanced API Error class with structured error handling
 */
export class APIError extends Error {
  public readonly type: AppError['type'];
  public readonly code?: string;
  public readonly status?: number;
  public readonly timestamp: string;
  public readonly requestId?: string;
  public readonly userMessage?: string;
  public readonly suggestions: string[];
  public readonly details?: any;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;

  constructor(error: AppError, originalError?: Error) {
    super(error.message);
    this.name = 'APIError';
    this.type = error.type;
    this.code = error.code;
    this.timestamp = error.timestamp || new Date().toISOString();
    this.requestId = error.requestId;
    this.userMessage = error.userMessage || this.generateUserMessage(error);
    this.suggestions = error.suggestions || this.generateSuggestions(error);
    this.details = originalError;
    
    // Determine if error is retryable
    this.retryable = this.isRetryable(error);
    this.retryAfter = this.getRetryAfter(error);
    
    // Set status for HTTP errors
    if ('status' in error) {
      this.status = error.status;
    }
    
    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, APIError);
    }
  }

  /**
   * Generate user-friendly message based on error type
   */
  private generateUserMessage(error: AppError): string {
    switch (error.type) {
      case 'network':
        return 'Unable to connect to the server. Please check your internet connection.';
      case 'auth':
        return 'Your session has expired. Please sign in again.';
      case 'validation':
        return 'Please check the information you entered and try again.';
      case 'fda-api':
        return 'FDA database is temporarily unavailable. You can continue with cached data or try again later.';
      case 'server':
        return error.status >= 500 
          ? 'Server is experiencing issues. Please try again in a few minutes.'
          : 'The request could not be completed. Please check your input and try again.';
      case 'timeout':
        return 'The operation took too long to complete. Please try again.';
      case 'project':
        return `Unable to ${error.operation || 'process'} project. Please try again.`;
      case 'agent':
        return 'The AI assistant encountered an error. Please try your request again.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Generate actionable suggestions based on error type
   */
  private generateSuggestions(error: AppError): string[] {
    switch (error.type) {
      case 'network':
        return [
          'Check your internet connection',
          'Try refreshing the page',
          'Disable VPN if using one',
          'Contact your network administrator'
        ];
      case 'auth':
        return [
          'Sign out and sign back in',
          'Clear browser cache and cookies',
          'Try using an incognito/private window',
          'Contact support if issue persists'
        ];
      case 'validation':
        return [
          'Check all required fields are filled',
          'Ensure data formats are correct',
          'Review field-specific requirements',
          'Contact support for validation rules'
        ];
      case 'fda-api':
        return [
          'Try again in a few minutes',
          'Use cached results if available',
          'Perform manual searches as backup',
          'Check FDA.gov status page'
        ];
      case 'server':
        return error.status >= 500 
          ? [
              'Wait a few minutes and try again',
              'Check system status page',
              'Contact support if issue persists',
              'Try a different browser'
            ]
          : [
              'Check your input data',
              'Ensure you have proper permissions',
              'Try refreshing the page',
              'Contact support with error details'
            ];
      case 'timeout':
        return [
          'Try the operation again',
          'Break large requests into smaller parts',
          'Check your internet connection speed',
          'Contact support for complex operations'
        ];
      case 'project':
        return [
          'Refresh the project data',
          'Check if another user modified the project',
          'Try the operation again',
          'Contact support if issue persists'
        ];
      case 'agent':
        return [
          'Try rephrasing your request',
          'Break complex requests into steps',
          'Check if FDA services are available',
          'Use manual tools as backup'
        ];
      default:
        return [
          'Try refreshing the page',
          'Clear browser cache',
          'Try again in a few minutes',
          'Contact support with error details'
        ];
    }
  }

  /**
   * Determine if error is retryable
   */
  private isRetryable(error: AppError): boolean {
    switch (error.type) {
      case 'network':
      case 'timeout':
      case 'fda-api':
        return true;
      case 'server':
        return 'status' in error && error.status >= 500;
      case 'project':
        return error.operation === 'read';
      default:
        return false;
    }
  }

  /**
   * Get retry delay in seconds
   */
  private getRetryAfter(error: AppError): number | undefined {
    if ('retryAfter' in error && error.retryAfter) {
      return error.retryAfter;
    }
    
    switch (error.type) {
      case 'network':
        return 5;
      case 'timeout':
        return 10;
      case 'fda-api':
        return 30;
      case 'server':
        return 'status' in error && error.status >= 500 ? 60 : undefined;
      default:
        return undefined;
    }
  }

  /**
   * Convert to JSON for logging/reporting
   */
  toJSON() {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      userMessage: this.userMessage,
      code: this.code,
      status: this.status,
      timestamp: this.timestamp,
      requestId: this.requestId,
      suggestions: this.suggestions,
      retryable: this.retryable,
      retryAfter: this.retryAfter,
      stack: this.stack,
    };
  }

  /**
   * Create APIError from various error sources
   */
  static fromError(error: any, context?: Partial<AppError>): APIError {
    // If already an APIError, return as-is
    if (error instanceof APIError) {
      return error;
    }

    // Handle fetch/network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError: NetworkError = {
        type: 'network',
        message: 'Network request failed',
        code: 'NETWORK_ERROR',
        ...context,
      } as NetworkError;
      return new APIError(networkError, error);
    }

    // Handle timeout errors
    if (error.name === 'AbortError' || error.code === 'TIMEOUT') {
      const timeoutError: TimeoutError = {
        type: 'timeout',
        message: 'Request timeout',
        code: 'TIMEOUT',
        duration: 30000, // Default timeout
        ...context,
      } as TimeoutError;
      return new APIError(timeoutError, error);
    }

    // Handle HTTP errors
    if (error.status) {
      if (error.status === 401) {
        const authError: AuthenticationError = {
          type: 'auth',
          message: 'Authentication failed',
          code: 'UNAUTHORIZED',
          isTokenExpired: true,
          ...context,
        } as AuthenticationError;
        return new APIError(authError, error);
      }

      if (error.status === 400) {
        const validationError: ValidationError = {
          type: 'validation',
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          fieldErrors: error.details?.fieldErrors,
          ...context,
        } as ValidationError;
        return new APIError(validationError, error);
      }

      if (error.status >= 500) {
        const serverError: ServerError = {
          type: 'server',
          message: 'Server error',
          code: 'SERVER_ERROR',
          status: error.status,
          isTemporary: true,
          ...context,
        } as ServerError;
        return new APIError(serverError, error);
      }
    }

    // Default to generic error
    const serverError: ServerError = {
      type: 'server',
      message: error.message || 'Unknown error occurred',
      code: 'UNKNOWN_ERROR',
      status: error.status || 500,
      ...context,
    } as ServerError;
    return new APIError(serverError, error);
  }

  /**
   * Create specific error types
   */
  static network(message?: string, options?: Partial<NetworkError>): APIError {
    const networkError: NetworkError = {
      type: 'network',
      message: message || 'Network error occurred',
      code: 'NETWORK_ERROR',
      ...options,
    } as NetworkError;
    return new APIError(networkError);
  }

  static auth(message?: string, options?: Partial<AuthenticationError>): APIError {
    const authError: AuthenticationError = {
      type: 'auth',
      message: message || 'Authentication failed',
      code: 'AUTH_ERROR',
      ...options,
    } as AuthenticationError;
    return new APIError(authError);
  }

  static validation(message?: string, options?: Partial<ValidationError>): APIError {
    const validationError: ValidationError = {
      type: 'validation',
      message: message || 'Validation failed',
      code: 'VALIDATION_ERROR',
      ...options,
    } as ValidationError;
    return new APIError(validationError);
  }

  static fdaAPI(message?: string, options?: Partial<FDAAPIError>): APIError {
    const fdaError: FDAAPIError = {
      type: 'fda-api',
      message: message || 'FDA API error',
      code: 'FDA_API_ERROR',
      ...options,
    } as FDAAPIError;
    return new APIError(fdaError);
  }

  static project(operation: ProjectError['operation'], message?: string, options?: Partial<ProjectError>): APIError {
    const projectError: ProjectError = {
      type: 'project',
      message: message || `Project ${operation} failed`,
      code: 'PROJECT_ERROR',
      operation,
      ...options,
    } as ProjectError;
    return new APIError(projectError);
  }

  static agent(message?: string, options?: Partial<AgentError>): APIError {
    const agentError: AgentError = {
      type: 'agent',
      message: message || 'Agent error occurred',
      code: 'AGENT_ERROR',
      ...options,
    } as AgentError;
    return new APIError(agentError);
  }
}

/**
 * Error reporting interface
 */
export interface ErrorReport {
  error: APIError;
  context: {
    url: string;
    userAgent: string;
    timestamp: string;
    userId?: string;
    sessionId?: string;
    projectId?: number;
  };
  breadcrumbs: Array<{
    timestamp: string;
    message: string;
    level: 'info' | 'warning' | 'error';
    data?: any;
  }>;
}