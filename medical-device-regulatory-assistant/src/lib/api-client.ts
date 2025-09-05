/**
 * API Client with automatic retry, error recovery, and request/response interceptors
 * for the Medical Device Regulatory Assistant frontend
 */

import { toast } from '@/hooks/use-toast';

// Types for API responses and errors
export interface ApiResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
  suggestions?: string[];
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryCondition?: (error: ApiError) => boolean;
}

export interface RequestConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  timeout?: number;
  retry?: Partial<RetryConfig>;
  skipErrorToast?: boolean;
}

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private defaultRetryConfig: RetryConfig;

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000') {
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
    this.defaultRetryConfig = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      retryCondition: (error) => {
        // Retry on network errors and 5xx server errors
        return !error.status || error.status >= 500;
      },
    };
  }

  /**
   * Set authentication token for all requests
   */
  setAuthToken(token: string | null) {
    if (token) {
      this.defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      delete this.defaultHeaders['Authorization'];
    }
  }

  /**
   * Make an HTTP request with retry logic and error handling
   */
  async request<T = any>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const retryConfig = { ...this.defaultRetryConfig, ...config.retry };
    
    let lastError: ApiError;
    
    for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
      try {
        const response = await this.makeRequest<T>(url, config);
        return response;
      } catch (error) {
        lastError = this.normalizeError(error);
        
        // Don't retry if it's the last attempt or retry condition is not met
        if (
          attempt === retryConfig.maxRetries ||
          !retryConfig.retryCondition?.(lastError)
        ) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          retryConfig.baseDelay * Math.pow(2, attempt),
          retryConfig.maxDelay
        );
        
        console.warn(`API request failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}), retrying in ${delay}ms:`, lastError);
        await this.sleep(delay);
      }
    }
    
    // Show error toast unless explicitly disabled
    if (!config.skipErrorToast) {
      this.showErrorToast(lastError);
    }
    
    throw lastError;
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest<T>(
    url: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const controller = new AbortController();
    const timeout = config.timeout || 30000; // 30 second default timeout
    
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
      const headers = { ...this.defaultHeaders, ...config.headers };
      
      const fetchConfig: RequestInit = {
        method: config.method || 'GET',
        headers,
        signal: controller.signal,
      };
      
      // Add body for non-GET requests
      if (config.body && config.method !== 'GET') {
        if (headers['Content-Type'] === 'application/json') {
          fetchConfig.body = JSON.stringify(config.body);
        } else {
          fetchConfig.body = config.body;
        }
      }
      
      const response = await fetch(url, fetchConfig);
      
      clearTimeout(timeoutId);
      
      // Parse response
      let data: T;
      const contentType = response.headers.get('content-type');
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = (await response.text()) as unknown as T;
      }
      
      // Handle HTTP errors
      if (!response.ok) {
        throw {
          message: (data as any)?.message || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: (data as any)?.code,
          details: data,
          suggestions: (data as any)?.suggestions,
        };
      }
      
      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw {
          message: 'Request timeout',
          code: 'TIMEOUT',
        };
      }
      
      throw error;
    }
  }

  /**
   * Normalize different error types into a consistent ApiError format
   */
  private normalizeError(error: any): ApiError {
    if (error.message && typeof error.status === 'number') {
      return error as ApiError;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        message: 'Network error - please check your internet connection',
        code: 'NETWORK_ERROR',
      };
    }
    
    return {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  /**
   * Show user-friendly error toast
   */
  private showErrorToast(error: ApiError) {
    let title = 'Request Failed';
    let description = error.message;
    
    // Customize messages for common error types
    switch (error.code) {
      case 'NETWORK_ERROR':
        title = 'Connection Error';
        description = 'Unable to connect to the server. Please check your internet connection.';
        break;
      case 'TIMEOUT':
        title = 'Request Timeout';
        description = 'The request took too long to complete. Please try again.';
        break;
      case 'UNAUTHORIZED':
        title = 'Authentication Required';
        description = 'Please sign in to continue.';
        break;
      case 'FORBIDDEN':
        title = 'Access Denied';
        description = 'You do not have permission to perform this action.';
        break;
    }
    
    toast({
      title,
      description,
      variant: 'destructive',
    });
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Convenience methods for common HTTP verbs
  async get<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any, config?: Omit<RequestConfig, 'method'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }
}

// Create and export singleton instance
export const apiClient = new ApiClient();

// Export class for testing
export { ApiClient };