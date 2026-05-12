import type { Adapter, Document } from '@nebula-db/core';

/**
 * Vercel KV Adapter for NebulaDB
 * Uses Vercel KV (Redis) for persistent storage in Edge and Serverless environments
 * 
 * @example
 * ```typescript
 * import { VercelKvAdapter } from '@nebula-db/adapter-vercel-kv';
 * import { createDb } from '@nebula-db/core';
 * 
 * // In Vercel Edge/Serverless function
 * const db = createDb({
 *   adapter: new VercelKvAdapter(process.env.KV_REST_API_URL, process.env.KV_REST_API_TOKEN)
 * });
 * 
 * const users = db.collection('users');
 * await users.insert({ name: 'Alice' });
 * ```
 */
export class VercelKvAdapter implements Adapter {
  private apiUrl: string;
  private apiToken: string;
  private namespacePrefix: string;
  private data: Record<string, Document[]> = {};
  private connected: boolean = false;

  /**
   * Creates a new Vercel KV adapter
   * @param apiUrl - Vercel KV REST API URL (KV_REST_API_URL)
   * @param apiToken - Vercel KV REST API Token (KV_REST_API_TOKEN)
   * @param options - Optional configuration
   */
  constructor(apiUrl: string, apiToken: string, options?: { namespacePrefix?: string }) {
    if (!apiUrl || !apiToken) {
      throw new Error('Vercel KV API URL and token are required');
    }
    this.apiUrl = apiUrl;
    this.apiToken = apiToken;
    this.namespacePrefix = options?.namespacePrefix || 'nebula_';
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${this.apiUrl}${path}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiToken}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new Error(`Vercel KV API error: ${response.status} ${response.statusText}`);
    }

    // Handle empty or non-JSON responses
    const contentType = response.headers.get('content-type');
    if (response.status === 204 || !contentType || !contentType.includes('application/json')) {
      return undefined as T;
    }

    return response.json();
  }

  /**
   * Connect to Vercel KV
   */
  async connect(): Promise<void> {
    if (this.connected) return;
    
    try {
      // Test connection by fetching keys
      await this.request<string[]>('/keys');
      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to Vercel KV: ${error}`);
    }
  }

  /**
   * Load all collections and documents from Vercel KV
   */
  async load(): Promise<Record<string, Document[]>> {
    await this.connect();
    const collections: Record<string, Document[]> = {};

    try {
      // Get all nebula keys
      const keys = await this.request<{ key: string }[]>('/keys?limit=1000');
      
      for (const { key } of keys) {
        if (!key.startsWith(this.namespacePrefix)) continue;
        
        // Parse collection name from key
        // Format: nebula_{collection}
        const match = key.match(/^nebula_(.+)$/);
        if (!match) continue;
        
        const collectionName = match[1];
        
        try {
          const result = await this.request<{ data: string }>(`/get/${key}`);
          if (result?.data) {
            collections[collectionName] = JSON.parse(result.data);
          }
        } catch {
          // Key might be empty or deleted
          collections[collectionName] = [];
        }
      }
    } catch (error) {
      throw new Error(`Failed to load from Vercel KV: ${error}`);
    }

    this.data = collections;
    return collections;
  }

  /**
   * Save all collections and documents to Vercel KV
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    await this.connect();

    try {
      for (const [collectionName, docs] of Object.entries(data)) {
        const key = `${this.namespacePrefix}${collectionName}`;
        
        // Save documents as JSON
        await this.request(`/set/${key}`, {
          method: 'POST',
          body: JSON.stringify({ value: JSON.stringify(docs) })
        });
      }
    } catch (error) {
      throw new Error(`Failed to save to Vercel KV: ${error}`);
    }
  }

  /**
   * Get a specific key from KV
   */
  async get<T = any>(key: string): Promise<T | null> {
    await this.connect();
    
    try {
      const result = await this.request<{ data: string }>(`/get/${this.namespacePrefix}${key}`);
      return result?.data ? JSON.parse(result.data) : null;
    } catch {
      return null;
    }
  }

  /**
   * Set a specific key in KV
   */
  async set(key: string, value: any): Promise<void> {
    await this.connect();
    
    await this.request(`/set/${this.namespacePrefix}${key}`, {
      method: 'POST',
      body: JSON.stringify({ value: JSON.stringify(value) })
    });
  }

  /**
   * Delete a specific key from KV
   */
  async delete(key: string): Promise<void> {
    await this.connect();
    
    await this.request(`/del/${this.namespacePrefix}${key}`, {
      method: 'DELETE'
    });
  }

  /**
   * Get the adapter's current data (for debugging)
   */
  getData(): Record<string, Document[]> {
    return this.data;
  }

  /**
   * Close connection (no-op for KV)
   */
  async close(): Promise<void> {
    this.connected = false;
  }
}

/**
 * Create a Vercel KV adapter instance
 */
export function createVercelKvAdapter(
  apiUrl: string, 
  apiToken: string, 
  options?: { namespacePrefix?: string }
): VercelKvAdapter {
  return new VercelKvAdapter(apiUrl, apiToken, options);
}