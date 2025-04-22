import { Adapter, Document } from '@nebula/core';
import Redis from 'ioredis';

/**
 * Redis adapter for NebulaDB
 * This adapter persists data to a Redis database
 */
export class RedisAdapter implements Adapter {
  private redis: Redis;
  private prefix: string;
  private collectionListKey: string;

  /**
   * Create a new RedisAdapter
   * @param options Redis connection options
   * @param prefix Prefix for Redis keys
   */
  constructor(options: Redis.RedisOptions = {}, prefix: string = 'nebula:') {
    this.redis = new Redis(options);
    this.prefix = prefix;
    this.collectionListKey = `${this.prefix}collections`;
  }

  /**
   * Get the Redis key for a collection
   */
  private getCollectionKey(collectionName: string): string {
    return `${this.prefix}collection:${collectionName}`;
  }

  /**
   * Load data from Redis
   */
  async load(): Promise<Record<string, Document[]>> {
    try {
      const result: Record<string, Document[]> = {};
      
      // Get all collection names
      const collections = await this.redis.smembers(this.collectionListKey);
      
      // For each collection, get all documents
      for (const collectionName of collections) {
        const collectionKey = this.getCollectionKey(collectionName);
        const documentIds = await this.redis.smembers(collectionKey);
        
        if (documentIds.length > 0) {
          // Get all documents in a single pipeline
          const pipeline = this.redis.pipeline();
          for (const id of documentIds) {
            pipeline.get(`${collectionKey}:${id}`);
          }
          
          const documents = await pipeline.exec();
          result[collectionName] = documents
            .filter(([err, data]) => !err && data)
            .map(([, data]) => JSON.parse(data as string));
        } else {
          result[collectionName] = [];
        }
      }
      
      return result;
    } catch (error) {
      console.error('Failed to load data from Redis:', error);
      return {};
    }
  }

  /**
   * Save data to Redis
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      // Begin pipeline
      const pipeline = this.redis.pipeline();
      
      // Clear existing collections list
      pipeline.del(this.collectionListKey);
      
      // For each collection
      for (const [collectionName, documents] of Object.entries(data)) {
        const collectionKey = this.getCollectionKey(collectionName);
        
        // Add collection to collections list
        pipeline.sadd(this.collectionListKey, collectionName);
        
        // Clear existing collection
        pipeline.del(collectionKey);
        
        // Add document IDs to collection set
        if (documents.length > 0) {
          pipeline.sadd(collectionKey, ...documents.map(doc => doc.id));
        }
        
        // Store each document
        for (const doc of documents) {
          pipeline.set(`${collectionKey}:${doc.id}`, JSON.stringify(doc));
        }
      }
      
      // Execute pipeline
      await pipeline.exec();
    } catch (error) {
      console.error('Failed to save data to Redis:', error);
      throw error;
    }
  }

  /**
   * Close the Redis connection
   */
  async close(): Promise<void> {
    await this.redis.quit();
  }
}
