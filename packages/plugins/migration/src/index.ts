import { Plugin, Database, Document } from '@nebula-db/core';

/**
 * Migration definition
 */
export interface Migration {
  /**
   * Migration version number
   */
  version: number;
  
  /**
   * Migration name
   */
  name: string;
  
  /**
   * Collection name this migration applies to
   */
  collection: string;
  
  /**
   * Function to apply the migration
   */
  up(db: Database): Promise<void>;
  
  /**
   * Optional function to revert the migration
   */
  down?(db: Database): Promise<void>;
}

/**
 * Options for the migration plugin
 */
export interface MigrationPluginOptions {
  /**
   * List of migrations to apply
   */
  migrations: Migration[];
  
  /**
   * Name of the collection to store migration history
   */
  migrationCollection?: string;
  
  /**
   * Whether to automatically apply migrations on initialization
   */
  autoApply?: boolean;
  
  /**
   * Whether to throw an error if a migration fails
   */
  throwOnError?: boolean;
  
  /**
   * Logger function
   */
  logger?: (message: string) => void;
}

/**
 * Create a schema migration plugin for NebulaDB
 */
export function createMigrationPlugin(options: MigrationPluginOptions): Plugin {
  const {
    migrations,
    migrationCollection = '_migrations',
    autoApply = true,
    throwOnError = true,
    logger = console.log
  } = options;
  
  let db: Database;
  
  /**
   * Get applied migrations
   */
  async function getAppliedMigrations(collectionName: string): Promise<Document[]> {
    const collection = db.collection(migrationCollection);
    return await collection.find({ collection: collectionName });
  }
  
  /**
   * Mark a migration as applied
   */
  async function markMigrationApplied(migration: Migration): Promise<void> {
    const collection = db.collection(migrationCollection);
    await collection.insert({
      collection: migration.collection,
      version: migration.version,
      name: migration.name,
      appliedAt: new Date().toISOString()
    });
  }
  
  /**
   * Mark a migration as reverted
   */
  async function markMigrationReverted(migration: Migration): Promise<void> {
    const collection = db.collection(migrationCollection);
    await collection.delete({ collection: migration.collection, version: migration.version });
  }
  
  /**
   * Apply pending migrations
   */
  async function applyMigrations(): Promise<void> {
    // Get applied migrations for each migration's collection
    for (const migration of migrations) {
      const appliedMigrations = await getAppliedMigrations(migration.collection);
      const appliedVersions = new Set(appliedMigrations.map((m: Document) => m.version));
      if (!appliedVersions.has(migration.version)) {
        try {
          logger(`Applying migration: ${migration.name} (${migration.version})`);
          await migration.up(db);
          await markMigrationApplied(migration);
          logger(`Migration applied: ${migration.name}`);
        } catch (error) {
          logger(`Migration failed: ${migration.name}`);
          logger(`Error: ${error}`);
          if (throwOnError) {
            throw error;
          }
        }
      }
    }
    logger(`Migrations completed.`);
  }
  
  /**
   * Revert migrations
   */
  async function revertMigrations(): Promise<void> {
    // Revert migrations for each collection
    for (const migration of migrations) {
      const appliedMigrations = await getAppliedMigrations(migration.collection);
      const appliedVersions = new Set(appliedMigrations.map((m: Document) => m.version));
      if (appliedVersions.has(migration.version) && migration.down) {
        try {
          logger(`Reverting migration: ${migration.name} (${migration.version})`);
          await migration.down(db);
          await markMigrationReverted(migration);
          logger(`Migration reverted: ${migration.name}`);
        } catch (error) {
          logger(`Migration revert failed: ${migration.name}`);
          logger(`Error: ${error}`);
          if (throwOnError) {
            throw error;
          }
        }
      }
    }
    logger(`Migration revert completed.`);
  }
  
  /**
   * Get the current schema version for a collection
   */
  async function getSchemaVersion(db: Database, collectionName: string): Promise<number> {
    const migrationCollection = db.collection('_migrations');
    const migrations = await migrationCollection.find({ collection: collectionName });
    if (!migrations.length) return 0;
    return Math.max(...migrations.map((m: Document) => m.version));
  }
  
  /**
   * Set the current schema version for a collection (forcibly, e.g. after manual migration)
   */
  async function setSchemaVersion(db: Database, collectionName: string, version: number): Promise<void> {
    const migrationCollection = db.collection('_migrations');
    await migrationCollection.insert({ collection: collectionName, version, appliedAt: new Date().toISOString() });
  }
  
  const plugin = {
    name: 'migration',
    
    onInit(database: Database): void {
      db = database;
      
      // Apply migrations automatically if enabled
      if (autoApply) {
        applyMigrations().catch(error => {
          logger(`Error applying migrations: ${error}`);
          if (throwOnError) {
            throw error;
          }
        });
      }
    },
    
    // Expose migration functions on the plugin
    applyMigrations,
    revertMigrations,
    getAppliedMigrations,
    getSchemaVersion,
    setSchemaVersion
  };
  
  return plugin as Plugin;
}
