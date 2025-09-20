/**
 * Efficient Caching Strategies
 *
 * Provides various caching mechanisms for improving application performance
 * including memory cache, localStorage cache, and API response caching.
 */

import { performanceMonitor } from './optimization';

// Generic cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hits: number;
}

interface CacheOptions {
  ttl?: number; // Time to live in milliseconds
  maxSize?: number; // Maximum number of entries
  serialize?: boolean; // Whether to serialize data for storage
}

// In-memory cache implementation
export class MemoryCache<T = any> {
  private cache = new Map<string, CacheEntry<T>>();
  private maxSize: number;
  private defaultTTL: number;

  constructor(options: CacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.defaultTTL = options.ttl || 5 * 60 * 1000; // 5 minutes default
  }

  set(key: string, data: T, ttl?: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
      hits: 0,
    };

    this.cache.set(key, entry);

    // Record cache operation
    performanceMonitor?.recordMetric('cache_set', 1, {
      cache_type: 'memory',
      key,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      performanceMonitor?.recordMetric('cache_miss', 1, {
        cache_type: 'memory',
        key,
      });
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      performanceMonitor?.recordMetric('cache_expired', 1, {
        cache_type: 'memory',
        key,
      });
      return null;
    }

    // Update hit count
    entry.hits++;

    performanceMonitor?.recordMetric('cache_hit', 1, {
      cache_type: 'memory',
      key,
      hits: entry.hits,
    });

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    entries: Array<{ key: string; hits: number; age: number }>;
  } {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      hits: entry.hits,
      age: Date.now() - entry.timestamp,
    }));

    const totalHits = entries.reduce((sum, entry) => sum + entry.hits, 0);
    const hitRate =
      totalHits > 0 ? totalHits / (totalHits + entries.length) : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate,
      entries,
    };
  }
}

// Persistent cache using localStorage
export class PersistentCache<T = any> {
  private prefix: string;
  private defaultTTL: number;
  private maxSize: number;

  constructor(prefix: string = 'app_cache', options: CacheOptions = {}) {
    this.prefix = prefix;
    this.defaultTTL = options.ttl || 30 * 60 * 1000; // 30 minutes default
    this.maxSize = options.maxSize || 50;
  }

  private getStorageKey(key: string): string {
    return `${this.prefix}_${key}`;
  }

  private isStorageAvailable(): boolean {
    try {
      return typeof localStorage !== 'undefined';
    } catch {
      return false;
    }
  }

  set(key: string, data: T, ttl?: number): void {
    if (!this.isStorageAvailable()) return;

    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl: ttl || this.defaultTTL,
        hits: 0,
      };

      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));

      // Clean up old entries if we're at max size
      this.cleanup();

      performanceMonitor?.recordMetric('cache_set', 1, {
        cache_type: 'persistent',
        key,
      });
    } catch (error) {
      console.warn('Failed to set persistent cache:', error);
    }
  }

  get(key: string): T | null {
    if (!this.isStorageAvailable()) return null;

    try {
      const stored = localStorage.getItem(this.getStorageKey(key));
      if (!stored) {
        performanceMonitor?.recordMetric('cache_miss', 1, {
          cache_type: 'persistent',
          key,
        });
        return null;
      }

      const entry: CacheEntry<T> = JSON.parse(stored);

      // Check if expired
      if (Date.now() - entry.timestamp > entry.ttl) {
        localStorage.removeItem(this.getStorageKey(key));
        performanceMonitor?.recordMetric('cache_expired', 1, {
          cache_type: 'persistent',
          key,
        });
        return null;
      }

      // Update hit count
      entry.hits++;
      localStorage.setItem(this.getStorageKey(key), JSON.stringify(entry));

      performanceMonitor?.recordMetric('cache_hit', 1, {
        cache_type: 'persistent',
        key,
        hits: entry.hits,
      });

      return entry.data;
    } catch (error) {
      console.warn('Failed to get persistent cache:', error);
      return null;
    }
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    if (!this.isStorageAvailable()) return false;

    try {
      localStorage.removeItem(this.getStorageKey(key));
      return true;
    } catch {
      return false;
    }
  }

  clear(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );
      keys.forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.warn('Failed to clear persistent cache:', error);
    }
  }

  private cleanup(): void {
    if (!this.isStorageAvailable()) return;

    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith(this.prefix)
      );

      if (keys.length <= this.maxSize) return;

      // Get all entries with timestamps
      const entries = keys
        .map((key) => {
          try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;

            const entry = JSON.parse(stored);
            return { key, timestamp: entry.timestamp, hits: entry.hits };
          } catch {
            return null;
          }
        })
        .filter(Boolean);

      // Sort by least recently used (oldest timestamp, fewest hits)
      entries.sort((a, b) => {
        if (a!.hits !== b!.hits) return a!.hits - b!.hits;
        return a!.timestamp - b!.timestamp;
      });

      // Remove oldest entries
      const toRemove = entries.slice(0, entries.length - this.maxSize);
      toRemove.forEach((entry) => {
        if (entry) localStorage.removeItem(entry.key);
      });
    } catch (error) {
      console.warn('Failed to cleanup persistent cache:', error);
    }
  }
}

// API response cache with automatic invalidation
export class APICache {
  private memoryCache: MemoryCache<any>;
  private persistentCache: PersistentCache<any>;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor() {
    this.memoryCache = new MemoryCache({ maxSize: 50, ttl: 5 * 60 * 1000 });
    this.persistentCache = new PersistentCache('api_cache', {
      maxSize: 100,
      ttl: 30 * 60 * 1000,
    });
  }

  async get<T>(
    key: string,
    fetchFn: () => Promise<T>,
    options: {
      ttl?: number;
      forceRefresh?: boolean;
      useMemoryCache?: boolean;
      usePersistentCache?: boolean;
    } = {}
  ): Promise<T> {
    const {
      ttl,
      forceRefresh = false,
      useMemoryCache = true,
      usePersistentCache = true,
    } = options;

    // Check for pending request to avoid duplicate API calls
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key)!;
    }

    if (!forceRefresh) {
      // Try memory cache first
      if (useMemoryCache) {
        const memoryResult = this.memoryCache.get(key);
        if (memoryResult !== null) {
          return memoryResult;
        }
      }

      // Try persistent cache
      if (usePersistentCache) {
        const persistentResult = this.persistentCache.get(key);
        if (persistentResult !== null) {
          // Also store in memory cache for faster access
          if (useMemoryCache) {
            this.memoryCache.set(key, persistentResult, ttl);
          }
          return persistentResult;
        }
      }
    }

    // Fetch data
    const startTime = performance.now();
    const promise = fetchFn()
      .then((data) => {
        const duration = performance.now() - startTime;

        // Store in caches
        if (useMemoryCache) {
          this.memoryCache.set(key, data, ttl);
        }
        if (usePersistentCache) {
          this.persistentCache.set(key, data, ttl);
        }

        // Record performance
        performanceMonitor?.recordMetric('api_cache_fetch', duration, {
          key,
          cache_miss: true,
        });

        return data;
      })
      .catch((error) => {
        // Record error
        performanceMonitor?.recordMetric('api_cache_error', 1, {
          key,
          error: error.message,
        });
        throw error;
      })
      .finally(() => {
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, promise);
    return promise;
  }

  invalidate(key: string): void {
    this.memoryCache.delete(key);
    this.persistentCache.delete(key);
    this.pendingRequests.delete(key);
  }

  invalidatePattern(pattern: RegExp): void {
    // This is a simplified implementation
    // In a real app, you'd want to track keys more efficiently
    const memoryStats = this.memoryCache.getStats();
    memoryStats.entries.forEach((entry) => {
      if (pattern.test(entry.key)) {
        this.invalidate(entry.key);
      }
    });
  }

  clear(): void {
    this.memoryCache.clear();
    this.persistentCache.clear();
    this.pendingRequests.clear();
  }

  getStats() {
    return {
      memory: this.memoryCache.getStats(),
      pendingRequests: this.pendingRequests.size,
    };
  }
}

// Global cache instances
export const memoryCache = new MemoryCache();
export const persistentCache = new PersistentCache();
export const apiCache = new APICache();

// React hooks for caching
export function useCachedData<T>(
  key: string,
  fetchFn: () => Promise<T>,
  options: {
    ttl?: number;
    enabled?: boolean;
    forceRefresh?: boolean;
  } = {}
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ttl, enabled = true, forceRefresh = false } = options;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const result = await apiCache.get(key, fetchFn, { ttl, forceRefresh });
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      cancelled = true;
    };
  }, [key, ttl, enabled, forceRefresh]);

  const invalidate = useCallback(() => {
    apiCache.invalidate(key);
  }, [key]);

  const refresh = useCallback(() => {
    apiCache
      .get(key, fetchFn, { ttl, forceRefresh: true })
      .then(setData)
      .catch(setError);
  }, [key, fetchFn, ttl]);

  return { data, loading, error, invalidate, refresh };
}

// Cache warming utilities
export class CacheWarmer {
  private static instance: CacheWarmer;
  private warmupTasks: Array<() => Promise<void>> = [];

  static getInstance(): CacheWarmer {
    if (!CacheWarmer.instance) {
      CacheWarmer.instance = new CacheWarmer();
    }
    return CacheWarmer.instance;
  }

  addWarmupTask(task: () => Promise<void>): void {
    this.warmupTasks.push(task);
  }

  async warmup(): Promise<void> {
    const startTime = performance.now();

    try {
      await Promise.allSettled(this.warmupTasks.map((task) => task()));

      const duration = performance.now() - startTime;
      performanceMonitor?.recordMetric('cache_warmup', duration, {
        tasks_count: this.warmupTasks.length,
      });

      console.log(`Cache warmup completed in ${duration.toFixed(2)}ms`);
    } catch (error) {
      console.error('Cache warmup failed:', error);
    }
  }

  clear(): void {
    this.warmupTasks = [];
  }
}

// Export cache warmer instance
export const cacheWarmer = CacheWarmer.getInstance();

// Utility functions
export function createCacheKey(
  ...parts: (string | number | boolean)[]
): string {
  return parts.map((part) => String(part)).join(':');
}

export function getCacheSize(): { memory: number; persistent: number } {
  const memoryStats = memoryCache.getStats();

  let persistentSize = 0;
  if (typeof localStorage !== 'undefined') {
    try {
      const keys = Object.keys(localStorage).filter((key) =>
        key.startsWith('app_cache_')
      );
      persistentSize = keys.length;
    } catch {
      // Ignore errors
    }
  }

  return {
    memory: memoryStats.size,
    persistent: persistentSize,
  };
}

import { useState, useEffect, useCallback } from 'react';
