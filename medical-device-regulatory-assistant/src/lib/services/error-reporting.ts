/**
 * Error Reporting Service for the Medical Device Regulatory Assistant
 * Handles error logging, reporting, and analytics
 */

import { APIError, ErrorReport } from '@/types/error';

interface ErrorReportingConfig {
  enabled: boolean;
  endpoint?: string;
  apiKey?: string;
  environment: 'development' | 'staging' | 'production';
  maxBreadcrumbs: number;
  enableConsoleLogging: boolean;
  enableLocalStorage: boolean;
}

interface Breadcrumb {
  timestamp: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  data?: any;
}

class ErrorReportingService {
  private config: ErrorReportingConfig;
  private breadcrumbs: Breadcrumb[] = [];
  private sessionId: string;
  private userId?: string;

  constructor(config: Partial<ErrorReportingConfig> = {}) {
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      environment: (process.env.NODE_ENV as any) || 'development',
      maxBreadcrumbs: 50,
      enableConsoleLogging: true,
      enableLocalStorage: true,
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.initializeService();
  }

  /**
   * Initialize the error reporting service
   */
  private initializeService() {
    // Set up global error handlers
    if (typeof window !== 'undefined') {
      window.addEventListener('error', this.handleGlobalError);
      window.addEventListener('unhandledrejection', this.handleUnhandledRejection);
      
      // Add navigation breadcrumb
      this.addBreadcrumb('Navigation', 'info', {
        url: window.location.href,
        userAgent: navigator.userAgent,
      });
    }
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Set user context
   */
  setUser(userId: string, userData?: Record<string, any>) {
    this.userId = userId;
    this.addBreadcrumb('User identified', 'info', { userId, ...userData });
  }

  /**
   * Add breadcrumb for tracking user actions
   */
  addBreadcrumb(message: string, level: Breadcrumb['level'] = 'info', data?: any) {
    const breadcrumb: Breadcrumb = {
      timestamp: new Date().toISOString(),
      message,
      level,
      data,
    };

    this.breadcrumbs.push(breadcrumb);

    // Keep only the most recent breadcrumbs
    if (this.breadcrumbs.length > this.config.maxBreadcrumbs) {
      this.breadcrumbs = this.breadcrumbs.slice(-this.config.maxBreadcrumbs);
    }

    // Log to console in development
    if (this.config.enableConsoleLogging && this.config.environment === 'development') {
      console.log(`[Breadcrumb] ${level.toUpperCase()}: ${message}`, data);
    }
  }

  /**
   * Report an error
   */
  async reportError(error: APIError | Error, context?: Record<string, any>): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    const apiError = error instanceof APIError ? error : APIError.fromError(error);
    
    const errorReport: ErrorReport = {
      error: apiError,
      context: {
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
        userId: this.userId,
        sessionId: this.sessionId,
        ...context,
      },
      breadcrumbs: [...this.breadcrumbs],
    };

    // Add error breadcrumb
    this.addBreadcrumb(`Error: ${apiError.message}`, 'error', {
      type: apiError.type,
      code: apiError.code,
      retryable: apiError.retryable,
    });

    // Log to console
    if (this.config.enableConsoleLogging) {
      console.error('[Error Report]', errorReport);
    }

    // Store locally for debugging
    if (this.config.enableLocalStorage && typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('error_reports') || '[]';
        const reports = JSON.parse(stored);
        reports.push(errorReport);
        
        // Keep only last 10 reports
        const recentReports = reports.slice(-10);
        localStorage.setItem('error_reports', JSON.stringify(recentReports));
      } catch (e) {
        console.warn('Failed to store error report locally:', e);
      }
    }

    // Send to external service
    if (this.config.endpoint && this.config.apiKey) {
      try {
        await this.sendToExternalService(errorReport);
      } catch (e) {
        console.warn('Failed to send error report to external service:', e);
      }
    }
  }

  /**
   * Send error report to external service (e.g., Sentry, LogRocket)
   */
  private async sendToExternalService(errorReport: ErrorReport): Promise<void> {
    if (!this.config.endpoint || !this.config.apiKey) {
      return;
    }

    const response = await fetch(this.config.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify(errorReport),
    });

    if (!response.ok) {
      throw new Error(`Failed to send error report: ${response.statusText}`);
    }
  }

  /**
   * Handle global JavaScript errors
   */
  private handleGlobalError = (event: ErrorEvent) => {
    const error = APIError.fromError(event.error || new Error(event.message), {
      type: 'server',
      code: 'GLOBAL_ERROR',
    });

    this.reportError(error, {
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  /**
   * Handle unhandled promise rejections
   */
  private handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = APIError.fromError(event.reason, {
      type: 'server',
      code: 'UNHANDLED_REJECTION',
    });

    this.reportError(error, {
      type: 'unhandledRejection',
    });
  };

  /**
   * Track user actions for better error context
   */
  trackAction(action: string, data?: Record<string, any>) {
    this.addBreadcrumb(`Action: ${action}`, 'info', data);
  }

  /**
   * Track API calls
   */
  trackAPICall(method: string, endpoint: string, status?: number, duration?: number) {
    this.addBreadcrumb(`API: ${method} ${endpoint}`, status && status >= 400 ? 'error' : 'info', {
      method,
      endpoint,
      status,
      duration,
    });
  }

  /**
   * Track navigation
   */
  trackNavigation(from: string, to: string) {
    this.addBreadcrumb(`Navigation: ${from} → ${to}`, 'info', { from, to });
  }

  /**
   * Track project operations
   */
  trackProjectOperation(operation: string, projectId?: number, success?: boolean) {
    this.addBreadcrumb(
      `Project ${operation}${projectId ? ` (ID: ${projectId})` : ''}`,
      success === false ? 'error' : 'info',
      { operation, projectId, success }
    );
  }

  /**
   * Track agent interactions
   */
  trackAgentInteraction(agentType: string, action: string, success?: boolean) {
    this.addBreadcrumb(
      `Agent: ${agentType} - ${action}`,
      success === false ? 'error' : 'info',
      { agentType, action, success }
    );
  }

  /**
   * Get recent error reports from local storage
   */
  getRecentErrors(): ErrorReport[] {
    if (typeof window === 'undefined' || !this.config.enableLocalStorage) {
      return [];
    }

    try {
      const stored = localStorage.getItem('error_reports') || '[]';
      return JSON.parse(stored);
    } catch (e) {
      console.warn('Failed to retrieve error reports from local storage:', e);
      return [];
    }
  }

  /**
   * Clear stored error reports
   */
  clearStoredErrors(): void {
    if (typeof window !== 'undefined' && this.config.enableLocalStorage) {
      localStorage.removeItem('error_reports');
    }
  }

  /**
   * Get current breadcrumbs
   */
  getBreadcrumbs(): Breadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ErrorReportingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Cleanup service
   */
  destroy(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('error', this.handleGlobalError);
      window.removeEventListener('unhandledrejection', this.handleUnhandledRejection);
    }
  }
}

// Create singleton instance
export const errorReporting = new ErrorReportingService({
  endpoint: process.env.NEXT_PUBLIC_ERROR_REPORTING_ENDPOINT,
  apiKey: process.env.NEXT_PUBLIC_ERROR_REPORTING_API_KEY,
});

// Export class for testing
export { ErrorReportingService };

// Convenience functions
export const reportError = (error: APIError | Error, context?: Record<string, any>) => {
  return errorReporting.reportError(error, context);
};

export const trackAction = (action: string, data?: Record<string, any>) => {
  errorReporting.trackAction(action, data);
};

export const trackAPICall = (method: string, endpoint: string, status?: number, duration?: number) => {
  errorReporting.trackAPICall(method, endpoint, status, duration);
};

export const trackProjectOperation = (operation: string, projectId?: number, success?: boolean) => {
  errorReporting.trackProjectOperation(operation, projectId, success);
};

export const addBreadcrumb = (message: string, level?: 'info' | 'warning' | 'error', data?: any) => {
  errorReporting.addBreadcrumb(message, level, data);
};