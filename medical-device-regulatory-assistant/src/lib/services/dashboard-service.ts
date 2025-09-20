/**
 * Dashboard API Service
 * Handles dashboard-specific API calls for classification and predicate data
 */

import { apiClient, ApiResponse } from '@/lib/api-client';
import { DeviceClassification, PredicateDevice } from '@/types/dashboard';

export class DashboardService {
  private cache = new Map<
    string,
    { data: any; timestamp: number; ttl: number }
  >();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutes for dashboard data

  /**
   * Get cached data if available and not expired
   */
  private getCached<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  /**
   * Set data in cache
   */
  private setCache<T>(
    key: string,
    data: T,
    ttl: number = this.CACHE_TTL
  ): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  /**
   * Get device classification for a project
   */
  async getClassification(
    projectId: number
  ): Promise<DeviceClassification | null> {
    const cacheKey = `classification-${projectId}`;

    // Check cache first
    const cached = this.getCached<DeviceClassification>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<DeviceClassification>(
        `/api/projects/${projectId}/classification`
      );

      // Cache the result
      this.setCache(cacheKey, response.data);

      return response.data;
    } catch (error: any) {
      // Return null if classification doesn't exist yet (404)
      if (error.status === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get predicate devices for a project
   */
  async getPredicateDevices(projectId: number): Promise<PredicateDevice[]> {
    const cacheKey = `predicates-${projectId}`;

    // Check cache first
    const cached = this.getCached<PredicateDevice[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await apiClient.get<PredicateDevice[]>(
        `/api/projects/${projectId}/predicates`
      );

      // Cache the result
      this.setCache(cacheKey, response.data);

      return response.data;
    } catch (error: any) {
      // Return empty array if no predicates exist yet (404)
      if (error.status === 404) {
        return [];
      }
      throw error;
    }
  }

  /**
   * Start device classification analysis
   */
  async startClassification(
    projectId: number
  ): Promise<{ message: string; taskId?: string }> {
    const response = await apiClient.post<{ message: string; taskId?: string }>(
      `/api/projects/${projectId}/classification/start`
    );

    // Invalidate cache
    this.cache.delete(`classification-${projectId}`);

    return response.data;
  }

  /**
   * Start predicate search
   */
  async startPredicateSearch(
    projectId: number
  ): Promise<{ message: string; taskId?: string }> {
    const response = await apiClient.post<{ message: string; taskId?: string }>(
      `/api/projects/${projectId}/predicates/search`
    );

    // Invalidate cache
    this.cache.delete(`predicates-${projectId}`);

    return response.data;
  }

  /**
   * Update predicate selection status
   */
  async updatePredicateSelection(
    projectId: number,
    predicateId: string,
    isSelected: boolean
  ): Promise<PredicateDevice> {
    const response = await apiClient.patch<PredicateDevice>(
      `/api/projects/${projectId}/predicates/${predicateId}`,
      { is_selected: isSelected }
    );

    // Invalidate cache
    this.cache.delete(`predicates-${projectId}`);

    return response.data;
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clear cache for specific project
   */
  clearProjectCache(projectId: number): void {
    this.cache.delete(`classification-${projectId}`);
    this.cache.delete(`predicates-${projectId}`);
  }
}

// Export singleton instance
export const dashboardService = new DashboardService();
