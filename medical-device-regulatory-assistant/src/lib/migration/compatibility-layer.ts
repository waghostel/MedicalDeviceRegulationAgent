/**
 * Backward Compatibility Layer
 * Provides seamless transition between mock and real data implementations
 */

import { FeatureFlagManager, FlagEvaluationContext } from './feature-flags';
import { 
  Project, 
  DeviceClassification, 
  PredicateDevice, 
  AgentInteraction 
} from '@/types/project';

export interface CompatibilityConfig {
  enableFeatureFlags: boolean;
  fallbackToMock: boolean;
  errorHandling: ErrorHandlingStrategy;
  performanceMonitoring: boolean;
  debugMode: boolean;
}

export enum ErrorHandlingStrategy {
  FAIL_FAST = 'fail_fast',
  FALLBACK_TO_MOCK = 'fallback_to_mock',
  RETRY_WITH_BACKOFF = 'retry_with_backoff',
  GRACEFUL_DEGRADATION = 'graceful_degradation'
}

export interface DataSource {
  type: 'mock' | 'real';
  priority: number;
  available: boolean;
  lastError?: string;
  errorCount: number;
  responseTime: number; // milliseconds
}

export interface CompatibilityMetrics {
  mockDataUsage: number;
  realDataUsage: number;
  fallbackCount: number;
  errorCount: number;
  averageResponseTime: number;
  successRate: number;
}

export interface DataAdapter<T> {
  getMockData(params?: any): Promise<T>;
  getRealData(params?: any): Promise<T>;
  transformMockToReal?(mockData: T): T;
  transformRealToMock?(realData: T): T;
  validateData?(data: T): boolean;
}

/**
 * Compatibility Layer Manager
 * Manages the transition between mock and real data sources
 */
export class CompatibilityLayerManager {
  private flagManager: FeatureFlagManager;
  private config: CompatibilityConfig;
  private dataSources: Map<string, DataSource> = new Map();
  private metrics: CompatibilityMetrics;
  private adapters: Map<string, DataAdapter<any>> = new Map();

  constructor(
    flagManager: FeatureFlagManager,
    config?: Partial<CompatibilityConfig>
  ) {
    this.flagManager = flagManager;
    this.config = {
      enableFeatureFlags: true,
      fallbackToMock: true,
      errorHandling: ErrorHandlingStrategy.FALLBACK_TO_MOCK,
      performanceMonitoring: true,
      debugMode: false,
      ...config
    };

    this.metrics = {
      mockDataUsage: 0,
      realDataUsage: 0,
      fallbackCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      successRate: 100
    };

    this.initializeDataSources();
    this.initializeAdapters();
  }

  /**
   * Initialize data sources
   */
  private initializeDataSources(): void {
    this.dataSources.set('mock', {
      type: 'mock',
      priority: 1,
      available: true,
      errorCount: 0,
      responseTime: 50 // Mock data is fast
    });

    this.dataSources.set('real', {
      type: 'real',
      priority: 2,
      available: true, // Assume available initially
      errorCount: 0,
      responseTime: 200 // Real API is slower
    });
  }

  /**
   * Initialize data adapters
   */
  private initializeAdapters(): void {
    // Project data adapter
    this.adapters.set('projects', new ProjectDataAdapter());
    
    // Classification data adapter
    this.adapters.set('classifications', new ClassificationDataAdapter());
    
    // Predicate data adapter
    this.adapters.set('predicates', new PredicateDataAdapter());
    
    // Agent interaction adapter
    this.adapters.set('interactions', new InteractionDataAdapter());
  }

  /**
   * Get data with compatibility layer
   */
  async getData<T>(
    dataType: string,
    context: FlagEvaluationContext,
    params?: any
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Determine data source based on feature flags
      const useRealData = this.shouldUseRealData(dataType, context);
      
      if (this.config.debugMode) {
        console.log(`[CompatibilityLayer] Using ${useRealData ? 'real' : 'mock'} data for ${dataType}`);
      }

      let result: T;
      
      if (useRealData) {
        result = await this.getRealDataWithFallback(dataType, params);
        this.metrics.realDataUsage++;
      } else {
        result = await this.getMockData(dataType, params);
        this.metrics.mockDataUsage++;
      }

      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, true);

      return result;

    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, false);
      
      console.error(`[CompatibilityLayer] Error getting ${dataType} data:`, error);
      
      // Handle error based on strategy
      return await this.handleError(dataType, error, params);
    }
  }

  /**
   * Determine if real data should be used
   */
  private shouldUseRealData(dataType: string, context: FlagEvaluationContext): boolean {
    if (!this.config.enableFeatureFlags) {
      return false;
    }

    // Check general database flag
    const databaseFlag = this.flagManager.evaluateFlag('enable_real_database', context);
    if (!databaseFlag.enabled) {
      return false;
    }

    // Check specific component flags
    const componentFlags = this.getComponentFlags(dataType);
    for (const flagKey of componentFlags) {
      const flag = this.flagManager.evaluateFlag(flagKey, context);
      if (flag.enabled) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get component-specific flags for data type
   */
  private getComponentFlags(dataType: string): string[] {
    const flagMap: Record<string, string[]> = {
      'classifications': ['enable_real_classification_api'],
      'predicates': ['enable_real_predicate_api'],
      'projects': ['enable_real_project_api'],
      'interactions': ['enable_real_agent_api']
    };

    return flagMap[dataType] || [];
  }

  /**
   * Get real data with fallback handling
   */
  private async getRealDataWithFallback<T>(dataType: string, params?: any): Promise<T> {
    const adapter = this.adapters.get(dataType);
    if (!adapter) {
      throw new Error(`No adapter found for data type: ${dataType}`);
    }

    try {
      const realData = await adapter.getRealData(params);
      
      // Validate data if validator exists
      if (adapter.validateData && !adapter.validateData(realData)) {
        throw new Error('Real data validation failed');
      }

      // Update data source status
      this.updateDataSourceStatus('real', true);
      
      return realData;

    } catch (error) {
      // Update data source status
      this.updateDataSourceStatus('real', false, String(error));

      // Handle based on error strategy
      if (this.config.errorHandling === ErrorHandlingStrategy.FALLBACK_TO_MOCK) {
        console.warn(`[CompatibilityLayer] Falling back to mock data for ${dataType}:`, error);
        this.metrics.fallbackCount++;
        return await this.getMockData(dataType, params);
      }

      throw error;
    }
  }

  /**
   * Get mock data
   */
  private async getMockData<T>(dataType: string, params?: any): Promise<T> {
    const adapter = this.adapters.get(dataType);
    if (!adapter) {
      throw new Error(`No adapter found for data type: ${dataType}`);
    }

    try {
      const mockData = await adapter.getMockData(params);
      
      // Update data source status
      this.updateDataSourceStatus('mock', true);
      
      return mockData;

    } catch (error) {
      this.updateDataSourceStatus('mock', false, String(error));
      throw error;
    }
  }

  /**
   * Handle errors based on strategy
   */
  private async handleError<T>(dataType: string, error: any, params?: any): Promise<T> {
    this.metrics.errorCount++;

    switch (this.config.errorHandling) {
      case ErrorHandlingStrategy.FAIL_FAST:
        throw error;

      case ErrorHandlingStrategy.FALLBACK_TO_MOCK:
        if (this.config.fallbackToMock) {
          console.warn(`[CompatibilityLayer] Falling back to mock data due to error:`, error);
          this.metrics.fallbackCount++;
          return await this.getMockData(dataType, params);
        }
        throw error;

      case ErrorHandlingStrategy.RETRY_WITH_BACKOFF:
        // Implement retry logic (simplified)
        await this.delay(1000); // 1 second delay
        return await this.getMockData(dataType, params);

      case ErrorHandlingStrategy.GRACEFUL_DEGRADATION:
        // Return empty or default data
        return this.getDefaultData(dataType);

      default:
        throw error;
    }
  }

  /**
   * Get default data for graceful degradation
   */
  private getDefaultData<T>(dataType: string): T {
    const defaults: Record<string, any> = {
      'projects': [],
      'classifications': null,
      'predicates': [],
      'interactions': []
    };

    return defaults[dataType] as T;
  }

  /**
   * Update data source status
   */
  private updateDataSourceStatus(
    sourceType: 'mock' | 'real',
    success: boolean,
    error?: string
  ): void {
    const source = this.dataSources.get(sourceType);
    if (!source) return;

    if (success) {
      source.available = true;
      source.lastError = undefined;
    } else {
      source.errorCount++;
      source.lastError = error;
      
      // Mark as unavailable if too many errors
      if (source.errorCount > 5) {
        source.available = false;
      }
    }
  }

  /**
   * Update performance metrics
   */
  private updateMetrics(responseTime: number, success: boolean): void {
    // Update average response time
    const totalRequests = this.metrics.mockDataUsage + this.metrics.realDataUsage;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Update success rate
    const totalAttempts = totalRequests + this.metrics.errorCount;
    const successfulAttempts = totalRequests - this.metrics.errorCount + (success ? 1 : 0);
    this.metrics.successRate = (successfulAttempts / totalAttempts) * 100;
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get compatibility metrics
   */
  getMetrics(): CompatibilityMetrics {
    return { ...this.metrics };
  }

  /**
   * Get data source status
   */
  getDataSourceStatus(): Record<string, DataSource> {
    const status: Record<string, DataSource> = {};
    for (const [key, source] of this.dataSources) {
      status[key] = { ...source };
    }
    return status;
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      mockDataUsage: 0,
      realDataUsage: 0,
      fallbackCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      successRate: 100
    };
  }
}

/**
 * Project Data Adapter
 */
class ProjectDataAdapter implements DataAdapter<Project[]> {
  async getMockData(params?: any): Promise<Project[]> {
    // Import mock data generator
    const { generateMockProject } = await import('../mock-data/generators');
    
    const count = params?.count || 5;
    const projects: Project[] = [];
    
    for (let i = 0; i < count; i++) {
      projects.push(generateMockProject({ id: i + 1 }));
    }
    
    return projects;
  }

  async getRealData(params?: any): Promise<Project[]> {
    // Simulate API call
    const response = await fetch('/api/projects', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }

  validateData(data: Project[]): boolean {
    return Array.isArray(data) && data.every(project => 
      project.id && project.name && project.status
    );
  }
}

/**
 * Classification Data Adapter
 */
class ClassificationDataAdapter implements DataAdapter<DeviceClassification | null> {
  async getMockData(params?: any): Promise<DeviceClassification | null> {
    const { generateMockDeviceClassification } = await import('../mock-data/generators');
    
    if (params?.projectId) {
      return generateMockDeviceClassification({ project_id: params.projectId });
    }
    
    return null;
  }

  async getRealData(params?: any): Promise<DeviceClassification | null> {
    if (!params?.projectId) {
      return null;
    }

    const response = await fetch(`/api/projects/${params.projectId}/classification`);
    
    if (response.status === 404) {
      return null;
    }
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }

  validateData(data: DeviceClassification | null): boolean {
    if (data === null) return true;
    
    return !!(data.id && data.project_id && 
      ['I', 'II', 'III'].includes(data.device_class || ''));
  }
}

/**
 * Predicate Data Adapter
 */
class PredicateDataAdapter implements DataAdapter<PredicateDevice[]> {
  async getMockData(params?: any): Promise<PredicateDevice[]> {
    const { generateMockPredicateDevices } = await import('../mock-data/generators');
    
    const count = params?.count || 5;
    return generateMockPredicateDevices(count);
  }

  async getRealData(params?: any): Promise<PredicateDevice[]> {
    const queryParams = new URLSearchParams();
    if (params?.projectId) queryParams.set('projectId', params.projectId);
    if (params?.selected) queryParams.set('selected', 'true');
    
    const response = await fetch(`/api/predicate-devices?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }

  validateData(data: PredicateDevice[]): boolean {
    return Array.isArray(data) && data.every(predicate => 
      predicate.id && predicate.k_number && /^K\d{6}$/.test(predicate.k_number)
    );
  }
}

/**
 * Interaction Data Adapter
 */
class InteractionDataAdapter implements DataAdapter<AgentInteraction[]> {
  async getMockData(params?: any): Promise<AgentInteraction[]> {
    const { generateMockAgentInteraction } = await import('../mock-data/generators');
    
    const count = params?.count || 3;
    const interactions: AgentInteraction[] = [];
    
    for (let i = 0; i < count; i++) {
      interactions.push(generateMockAgentInteraction({ 
        id: i + 1,
        project_id: params?.projectId || 1
      }));
    }
    
    return interactions;
  }

  async getRealData(params?: any): Promise<AgentInteraction[]> {
    const queryParams = new URLSearchParams();
    if (params?.projectId) queryParams.set('projectId', params.projectId);
    if (params?.limit) queryParams.set('limit', params.limit);
    
    const response = await fetch(`/api/agent-interactions?${queryParams}`);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    return await response.json();
  }

  validateData(data: AgentInteraction[]): boolean {
    return Array.isArray(data) && data.every(interaction => 
      interaction.id && interaction.agent_action && interaction.created_at
    );
  }
}

/**
 * React Hook for Compatibility Layer
 */
export function useCompatibilityData<T>(
  dataType: string,
  context: FlagEvaluationContext,
  params?: any
): {
  data: T | null;
  loading: boolean;
  error: string | null;
  isUsingMockData: boolean;
  refetch: () => void;
} {
  // This would integrate with React hooks in a real implementation
  // For now, return a mock implementation
  
  return {
    data: null,
    loading: false,
    error: null,
    isUsingMockData: true,
    refetch: () => {}
  };
}

/**
 * Utility functions for compatibility layer
 */
export function createCompatibilityManager(
  flagManager: FeatureFlagManager,
  config?: Partial<CompatibilityConfig>
): CompatibilityLayerManager {
  return new CompatibilityLayerManager(flagManager, config);
}

export function createMigrationContext(
  userId: string,
  componentPath: string,
  projectId?: string
): FlagEvaluationContext {
  return {
    userId,
    componentPath,
    projectId,
    environment: process.env.NODE_ENV || 'development',
    timestamp: Date.now(),
    sessionId: `session_${userId}_${Date.now()}`
  };
}