import type { Adapter, Document } from '@nebula-db/core';

export type FallbackMode = 'local-first' | 'cloud-first';

export interface HybridAdapterOptions {
  localAdapter: Adapter;
  cloudAdapter: Adapter;
  mode?: FallbackMode;
  syncOnConnect?: boolean;
  syncInterval?: number;
}

/**
 * Hybrid Adapter for NebulaDB
 * Provides local storage with automatic cloud fallback and synchronization
 * 
 * @example
 * ```typescript
 * import { HybridAdapter } from '@nebula-db/adapter-hybrid';
 * import { MemoryAdapter } from '@nebula-db/adapter-memory';
 * import { CloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';
 * import { createDb } from '@nebula-db/core';
 * 
 * const db = createDb({
 *   adapter: new HybridAdapter({
 *     localAdapter: new MemoryAdapter(),
 *     cloudAdapter: new CloudflareD1Adapter(env.DB),
 *     mode: 'local-first',
 *     syncOnConnect: true
 *   })
 * });
 * ```
 */
export class HybridAdapter implements Adapter {
  private localAdapter: Adapter;
  private cloudAdapter: Adapter;
  private mode: FallbackMode;
  private syncOnConnect: boolean;
  private syncInterval?: number;
  private syncTimer?: ReturnType<typeof setInterval>;
  private isCloudAvailable: boolean = false;
  private isSyncing: boolean = false;

  constructor(options: HybridAdapterOptions) {
    if (!options.localAdapter || !options.cloudAdapter) {
      throw new Error('Both local and cloud adapters are required');
    }

    this.localAdapter = options.localAdapter;
    this.cloudAdapter = options.cloudAdapter;
    this.mode = options.mode || 'local-first';
    this.syncOnConnect = options.syncOnConnect ?? true;
    this.syncInterval = options.syncInterval;
  }

  /**
   * Initialize and check cloud availability
   */
  async connect(): Promise<void> {
    // Always connect local adapter
    if (this.localAdapter.connect) {
      await this.localAdapter.connect();
    }

    // Try to connect cloud adapter
    try {
      if (this.cloudAdapter.connect) {
        await this.cloudAdapter.connect();
      }
      this.isCloudAvailable = true;
    } catch {
      this.isCloudAvailable = false;
      console.warn('HybridAdapter: Cloud adapter unavailable, using local only');
    }

    // Initial sync if enabled
    if (this.syncOnConnect && this.isCloudAvailable) {
      await this.syncFromCloud();
    }

    // Start periodic sync if interval is set
    if (this.syncInterval && this.isCloudAvailable) {
      this.startPeriodicSync();
    }
  }

  /**
   * Load data from local adapter (primary source)
   */
  async load(): Promise<Record<string, Document[]>> {
    const localData = await this.localAdapter.load();
    
    // If cloud is available and mode is cloud-first, try to merge
    if (this.isCloudAvailable && this.mode === 'cloud-first') {
      try {
        const cloudData = await this.cloudAdapter.load();
        return this.mergeData(localData, cloudData);
      } catch {
        // Fall back to local data
      }
    }

    return localData;
  }

  /**
   * Save data to local adapter (always), optionally sync to cloud
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    // Always save to local first
    await this.localAdapter.save(data);

    // Try to sync to cloud if available
    if (this.isCloudAvailable && !this.isSyncing) {
      this.syncToCloud(data).catch(err => {
        console.warn('HybridAdapter: Cloud sync failed:', err);
      });
    }
  }

  /**
   * Sync data from cloud to local
   */
  private async syncFromCloud(): Promise<void> {
    if (!this.isCloudAvailable || this.isSyncing) return;

    this.isSyncing = true;
    try {
      const cloudData = await this.cloudAdapter.load();
      await this.localAdapter.save(cloudData);
    } catch (error) {
      console.warn('HybridAdapter: Failed to sync from cloud:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync data from local to cloud
   */
  private async syncToCloud(data: Record<string, Document[]>): Promise<void> {
    if (!this.isCloudAvailable || this.isSyncing) return;

    this.isSyncing = true;
    try {
      await this.cloudAdapter.save(data);
    } catch (error) {
      console.warn('HybridAdapter: Failed to sync to cloud:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Merge local and cloud data based on mode
   */
  private mergeData(
    local: Record<string, Document[]>, 
    cloud: Record<string, Document[]>
  ): Record<string, Document[]> {
    const result: Record<string, Document[]> = {};
    const allCollections = new Set([...Object.keys(local), ...Object.keys(cloud)]);

    for (const collectionName of allCollections) {
      const localDocs = local[collectionName] || [];
      const cloudDocs = cloud[collectionName] || [];

      if (this.mode === 'cloud-first') {
        // Cloud takes precedence, but merge any unique local docs
        const cloudIds = new Set(cloudDocs.map(d => d.id));
        const newLocalDocs = localDocs.filter(d => !cloudIds.has(d.id));
        result[collectionName] = [...cloudDocs, ...newLocalDocs];
      } else {
        // Local-first: cloud is backup, merge unique cloud docs
        const localIds = new Set(localDocs.map(d => d.id));
        const newCloudDocs = cloudDocs.filter(d => !localIds.has(d.id));
        result[collectionName] = [...localDocs, ...newCloudDocs];
      }
    }

    return result;
  }

  /**
   * Start periodic synchronization
   */
  private startPeriodicSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(async () => {
      if (this.isCloudAvailable && !this.isSyncing) {
        const localData = await this.localAdapter.load();
        await this.syncToCloud(localData);
      }
    }, this.syncInterval);
  }

  /**
   * Force sync now
   */
  async sync(): Promise<void> {
    if (!this.isCloudAvailable) {
      throw new Error('Cloud adapter not available');
    }

    const localData = await this.localAdapter.load();
    await this.syncToCloud(localData);
    await this.syncFromCloud();
  }

  /**
   * Check if cloud is available
   */
  isCloudConnected(): boolean {
    return this.isCloudAvailable;
  }

  /**
   * Get local adapter
   */
  getLocalAdapter(): Adapter {
    return this.localAdapter;
  }

  /**
   * Get cloud adapter
   */
  getCloudAdapter(): Adapter {
    return this.cloudAdapter;
  }

  /**
   * Close connections and stop sync
   */
  async close(): Promise<void> {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }

    if (this.localAdapter.close) {
      await this.localAdapter.close();
    }

    if (this.cloudAdapter.close && this.isCloudAvailable) {
      await this.cloudAdapter.close();
    }
  }
}

/**
 * Create a Hybrid adapter instance
 */
export function createHybridAdapter(options: HybridAdapterOptions): HybridAdapter {
  return new HybridAdapter(options);
}