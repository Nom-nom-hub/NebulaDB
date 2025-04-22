import { Plugin, Document, Query } from '@nebula/core';

/**
 * Options for the cache plugin
 */
export interface CachePluginOptions {
  /**
   * Maximum number of cached queries per collection
   */
  maxCacheSize?: number;
  
  /**
   * Time-to-live for cached queries in milliseconds
   */
  ttl?: number;
  
  /**
   * Collections to exclude from caching
   */
  excludeCollections?: string[];
  
  /**
   * Whether to cache empty results
   */
  cacheEmptyResults?: boolean;
}

/**
 * Cache entry
 */
interface CacheEntry {
  /**
   * Cached query results
   */
  results: Document[];
  
  /**
   * Timestamp when the cache entry was created
   */
  timestamp: number;
  
  /**
   * Query string representation for debugging
   */
  queryString: string;
}

/**
 * Create a query caching plugin for NebulaDB
 */
export function createCachePlugin(options: CachePluginOptions = {}): Plugin {
  const {
    maxCacheSize = 100,
    ttl = 60000, // 1 minute default TTL
    excludeCollections = [],
    cacheEmptyResults = true
  } = options;
  
  // Cache storage: collection name -> query hash -> cache entry
  const cache: Map<string, Map<string, CacheEntry>> = new Map();
  
  // LRU tracking: collection name -> query hash -> timestamp
  const lruMap: Map<string, Map<string, number>> = new Map();
  
  /**
   * Generate a hash for a query object
   */
  function hashQuery(query: Query): string {
    return JSON.stringify(query);
  }
  
  /**
   * Get cache for a collection
   */
  function getCollectionCache(collection: string): Map<string, CacheEntry> {
    if (!cache.has(collection)) {
      cache.set(collection, new Map());
    }
    return cache.get(collection)!;
  }
  
  /**
   * Get LRU map for a collection
   */
  function getCollectionLRU(collection: string): Map<string, number> {
    if (!lruMap.has(collection)) {
      lruMap.set(collection, new Map());
    }
    return lruMap.get(collection)!;
  }
  
  /**
   * Update LRU for a query
   */
  function updateLRU(collection: string, queryHash: string): void {
    const lru = getCollectionLRU(collection);
    lru.set(queryHash, Date.now());
  }
  
  /**
   * Evict least recently used cache entries if cache size exceeds limit
   */
  function evictLRU(collection: string): void {
    const collectionCache = getCollectionCache(collection);
    const lru = getCollectionLRU(collection);
    
    if (collectionCache.size <= maxCacheSize) {
      return;
    }
    
    // Sort entries by timestamp (oldest first)
    const entries = Array.from(lru.entries())
      .sort((a, b) => a[1] - b[1]);
    
    // Remove oldest entries until we're under the limit
    const entriesToRemove = entries.slice(0, collectionCache.size - maxCacheSize);
    
    for (const [queryHash] of entriesToRemove) {
      collectionCache.delete(queryHash);
      lru.delete(queryHash);
    }
  }
  
  /**
   * Clear expired cache entries
   */
  function clearExpired(collection: string): void {
    const collectionCache = getCollectionCache(collection);
    const lru = getCollectionLRU(collection);
    const now = Date.now();
    
    for (const [queryHash, entry] of collectionCache.entries()) {
      if (now - entry.timestamp > ttl) {
        collectionCache.delete(queryHash);
        lru.delete(queryHash);
      }
    }
  }
  
  /**
   * Invalidate cache for a collection
   */
  function invalidateCache(collection: string): void {
    cache.delete(collection);
    lruMap.delete(collection);
  }
  
  return {
    name: 'cache',
    
    // Clear cache when data changes
    onAfterInsert(collection: string): void {
      if (!excludeCollections.includes(collection)) {
        invalidateCache(collection);
      }
    },
    
    onAfterUpdate(collection: string): void {
      if (!excludeCollections.includes(collection)) {
        invalidateCache(collection);
      }
    },
    
    onAfterDelete(collection: string): void {
      if (!excludeCollections.includes(collection)) {
        invalidateCache(collection);
      }
    },
    
    // Cache query results
    async onAfterQuery(collection: string, query: Query, results: Document[]): Promise<Document[]> {
      // Skip caching if collection is excluded or results are empty and we don't cache empty results
      if (
        excludeCollections.includes(collection) ||
        (results.length === 0 && !cacheEmptyResults)
      ) {
        return results;
      }
      
      // Clear expired entries
      clearExpired(collection);
      
      // Store in cache
      const queryHash = hashQuery(query);
      const collectionCache = getCollectionCache(collection);
      
      collectionCache.set(queryHash, {
        results: [...results], // Clone to prevent mutations
        timestamp: Date.now(),
        queryString: JSON.stringify(query)
      });
      
      // Update LRU
      updateLRU(collection, queryHash);
      
      // Evict LRU if needed
      evictLRU(collection);
      
      return results;
    },
    
    // Use cached results if available
    async onBeforeQuery(collection: string, query: Query): Promise<Query> {
      if (excludeCollections.includes(collection)) {
        return query;
      }
      
      const queryHash = hashQuery(query);
      const collectionCache = getCollectionCache(collection);
      
      // Check if query is cached and not expired
      const cachedEntry = collectionCache.get(queryHash);
      const now = Date.now();
      
      if (cachedEntry && now - cachedEntry.timestamp <= ttl) {
        // Update LRU
        updateLRU(collection, queryHash);
        
        // Add a special flag to the query to indicate we have a cache hit
        // This will be checked in onAfterQuery
        return {
          ...query,
          __cache_hit__: {
            results: cachedEntry.results,
            queryHash
          }
        };
      }
      
      return query;
    },
    
    // Return cached results if we have a cache hit
    async onAfterQuery(collection: string, query: any, results: Document[]): Promise<Document[]> {
      if (query.__cache_hit__) {
        // Return the cached results
        return query.__cache_hit__.results;
      }
      
      return results;
    }
  };
}
