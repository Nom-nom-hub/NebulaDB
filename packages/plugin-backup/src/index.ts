import type { Adapter, Document } from '@nebula-db/core';

export interface BackupOptions {
  includeMetadata?: boolean;
  compression?: boolean;
}

export interface BackupMetadata {
  version: string;
  timestamp: number;
  collections: string[];
  documentCount: number;
}

export interface BackupData {
  metadata: BackupMetadata;
  collections: Record<string, Document[]>;
}

/**
 * Backup Plugin for NebulaDB
 * Provides backup and restore functionality for any adapter
 * 
 * @example
 * ```typescript
 * import { backupDatabase, restoreDatabase } from '@nebula-db/plugin-backup';
 * 
 * // Create a backup
 * const backup = await backupDatabase(db);
 * 
 * // Save to file
 * const json = JSON.stringify(backup);
 * 
 * // Restore from backup
 * await restoreDatabase(db, backup);
 * ```
 */
export class BackupManager {
  private adapter: Adapter;
  private version: string = '0.6.0';

  constructor(adapter: Adapter) {
    this.adapter = adapter;
  }

  /**
   * Create a backup of the database
   */
  async backup(options?: BackupOptions): Promise<BackupData> {
    const collections = await this.adapter.load();
    
    const metadata: BackupMetadata = {
      version: this.version,
      timestamp: Date.now(),
      collections: Object.keys(collections),
      documentCount: Object.values(collections).reduce((sum, docs) => sum + docs.length, 0)
    };

    return {
      metadata: options?.includeMetadata !== false ? metadata : {} as BackupMetadata,
      collections
    };
  }

  /**
   * Restore database from a backup
   */
  async restore(backup: BackupData): Promise<void> {
    if (!backup.collections) {
      throw new Error('Invalid backup: missing collections');
    }
    await this.adapter.save(backup.collections);
  }

  /**
   * Export backup to JSON string
   */
  async exportToJson(options?: BackupOptions): Promise<string> {
    const backup = await this.backup(options);
    return JSON.stringify(backup, null, 2);
  }

  /**
   * Import backup from JSON string
   */
  async importFromJson(json: string): Promise<void> {
    const backup = JSON.parse(json) as BackupData;
    await this.restore(backup);
  }

  /**
   * Create a timestamped backup filename
   */
  static createBackupFilename(prefix: string = 'nebula-backup'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${prefix}-${timestamp}.json`;
  }

  /**
   * Get backup info without loading all data
   */
  async getBackupInfo(backup: BackupData): Promise<BackupMetadata | null> {
    return backup.metadata;
  }
}

/**
 * Create a backup of the database
 */
export async function backupDatabase(
  dbOrAdapter: any, 
  options?: BackupOptions
): Promise<BackupData> {
  const adapter = dbOrAdapter.adapter || dbOrAdapter;
  const manager = new BackupManager(adapter);
  return manager.backup(options);
}

/**
 * Restore database from a backup
 */
export async function restoreDatabase(
  dbOrAdapter: any, 
  backup: BackupData
): Promise<void> {
  const adapter = dbOrAdapter.adapter || dbOrAdapter;
  const manager = new BackupManager(adapter);
  await manager.restore(backup);
}

/**
 * Export backup to JSON file
 */
export async function exportBackup(
  dbOrAdapter: any, 
  filename?: string,
  options?: BackupOptions
): Promise<{ filename: string; data: string }> {
  const adapter = dbOrAdapter.adapter || dbOrAdapter;
  const manager = new BackupManager(adapter);
  const data = await manager.exportToJson(options);
  const name = filename || BackupManager.createBackupFilename();
  return { filename: name, data };
}

/**
 * Import backup from JSON file
 */
export async function importBackup(
  dbOrAdapter: any, 
  json: string
): Promise<void> {
  const adapter = dbOrAdapter.adapter || dbOrAdapter;
  const manager = new BackupManager(adapter);
  await manager.importFromJson(json);
}