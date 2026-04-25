import Redis from 'ioredis';
import type { Adapter, Document } from '@nebula-db/core';

export class RedisAdapter implements Adapter {
  private redis: Redis;
  private prefix: string;

  constructor(options: Redis.RedisOptions | string = {}, prefix = 'nebula-db:') {
    this.prefix = prefix;
    this.redis = typeof options === 'string' 
      ? new Redis(options) 
      : new Redis(options);
  }

  private getKey(collection: string, docId?: string): string {
    if (docId) {
      return `${this.prefix}${collection}:${docId}`;
    }
    return `${this.prefix}${collection}:*`;
  }

  async load(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};

    try {
      const keys = await this.redis.keys(this.getKey('*'));
      const docsByCollection: Record<string, Document[]> = {};

      for (const key of keys) {
        const parts = key.split(':');
        if (parts.length < 3) continue;

        const collectionName = parts[1];
        const docId = parts[2];
        const data = await this.redis.get(key);

        if (data) {
          if (!docsByCollection[collectionName]) {
            docsByCollection[collectionName] = [];
          }
          docsByCollection[collectionName].push({
            id: docId,
            ...JSON.parse(data)
          });
        }
      }

      Object.assign(collections, docsByCollection);
    } catch (error) {
      throw new Error(`Failed to load from Redis: ${error}`);
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    try {
      const existingKeys = await this.redis.keys(this.getKey('*'));
      if (existingKeys.length > 0) {
        await this.redis.del(...existingKeys);
      }

      for (const [collectionName, docs] of Object.entries(data)) {
        for (const doc of docs) {
          const { id, ...rest } = doc;
          const key = this.getKey(collectionName, id);
          await this.redis.set(key, JSON.stringify(rest));
        }
      }
    } catch (error) {
      throw new Error(`Failed to save to Redis: ${error}`);
    }
  }

  async close(): Promise<void> {
    await this.redis.quit();
  }

  getClient(): Redis {
    return this.redis;
  }
}

export function createRedisAdapter(
  options?: Redis.RedisOptions | string,
  prefix?: string
): RedisAdapter {
  return new RedisAdapter(options, prefix);
}