import { Document, Query } from './types';

/**
 * Cache entry with expiration
 */
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Query cache configuration
 */
export interface QueryCacheOptions {
  maxSize?: number;
  ttlMs?: number;
}

/**
 * Query cache for storing and retrieving query results
 */
export class QueryCache {
  private cache: Map<string, CacheEntry<Document[]>> = new Map();
  private maxSize: number;
  private ttlMs: number;
  private hits = 0;
  private misses = 0;
  
  constructor(options: QueryCacheOptions = {}) {
    this.maxSize = options.maxSize || 100;
    this.ttlMs = options.ttlMs || 60000; // Default: 1 minute
  }
  
  /**
   * Get a cached query result
   */
  get(query: Query): Document[] | null {
    const key = this.getQueryKey(query);
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.misses++;
      return null;
    }
    
    // Check if the entry has expired
    if (entry.expiresAt < Date.now()) {
      this.cache.delete(key);
      this.misses++;
      return null;
    }
    
    this.hits++;
    return entry.value;
  }
  
  /**
   * Set a query result in the cache
   */
  set(query: Query, results: Document[]): void {
    // Don't cache empty queries
    if (Object.keys(query).length === 0) {
      return;
    }
    
    const key = this.getQueryKey(query);
    
    // Evict entries if cache is full
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }
    
    this.cache.set(key, {
      value: [...results], // Clone the results to avoid reference issues
      expiresAt: Date.now() + this.ttlMs
    });
  }
  
  /**
   * Invalidate cache entries that match a collection
   */
  invalidate(): void {
    this.cache.clear();
  }
  
  /**
   * Invalidate cache entries for documents that match a query
   */
  invalidateQuery(query: Query): void {
    const key = this.getQueryKey(query);
    this.cache.delete(key);
  }
  
  /**
   * Get cache statistics
   */
  getStats(): { size: number, hits: number, misses: number, hitRate: number } {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? this.hits / total : 0;
    
    return {
      size: this.cache.size,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }
  
  /**
   * Reset cache statistics
   */
  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
  
  /**
   * Generate a cache key for a query
   */
  private getQueryKey(query: Query): string {
    // Sort keys to ensure consistent key generation
    const sortedQuery = this.sortObject(query);
    return JSON.stringify(sortedQuery);
  }
  
  /**
   * Sort object keys recursively
   */
  private sortObject(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObject(item));
    }
    
    return Object.keys(obj)
      .sort()
      .reduce((result: any, key) => {
        result[key] = this.sortObject(obj[key]);
        return result;
      }, {});
  }
  
  /**
   * Evict the oldest entry from the cache
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt < oldestTime) {
        oldestKey = key;
        oldestTime = entry.expiresAt;
      }
    }
    
    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }
}
