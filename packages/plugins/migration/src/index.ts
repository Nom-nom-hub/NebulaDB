import { Plugin, IDatabase, Document } from '@nebula/core';

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
   * Function to apply the migration
   */
  up(db: IDatabase): Promise<void>;
  
  /**
   * Optional function to revert the migration
   */
  down?(db: IDatabase): Promise<void>;
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
  
  let db: IDatabase;
  
  /**
   * Get applied migrations
   */
  async function getAppliedMigrations(): Promise<Document[]> {
    const collection = db.collection(migrationCollection);
    return await collection.find({});
  }
  
  /**
   * Mark a migration as applied
   */
  async function markMigrationApplied(migration: Migration): Promise<void> {
    const collection = db.collection(migrationCollection);
    await collection.insert({
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
    await collection.delete({ version: migration.version });
  }
  
  /**
   * Apply pending migrations
   */
  async function applyMigrations(): Promise<void> {
    // Get applied migrations
    // const appliedMigrations = await getAppliedMigrations();
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));
    
    // Sort migrations by version
    const pendingMigrations = migrations
      .filter(m => !appliedVersions.has(m.version))
      .sort((a, b) => a.version - b.version);
    
    if (pendingMigrations.length === 0) {
      logger(`No pending migrations to apply.`);
      return;
    }
    
    logger(`Applying ${pendingMigrations.length} pending migrations...`);
    
    // Apply each migration
    for (const migration of pendingMigrations) {
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
    
    logger(`Migrations completed.`);
  }
  
  /**
   * Revert migrations
   */
  async function revertMigrations(targetVersion?: number): Promise<void> {
    // Get applied migrations
    // const appliedMigrations = await getAppliedMigrations();
    
    // Sort migrations by version in descending order
    const migrationsToRevert = migrations
      .filter(m => {
        // If targetVersion is specified, only revert migrations with version > targetVersion
        if (targetVersion !== undefined) {
          return m.version > targetVersion;
        }
        // Otherwise, revert all migrations
        return true;
      })
      .sort((a, b) => b.version - a.version); // Descending order
    
    if (migrationsToRevert.length === 0) {
      logger(`No migrations to revert.`);
      return;
    }
    
    logger(`Reverting ${migrationsToRevert.length} migrations...`);
    
    // Revert each migration
    for (const migration of migrationsToRevert) {
      if (!migration.down) {
        logger(`Skipping migration ${migration.name} (${migration.version}): No down function`);
        continue;
      }
      
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
    
    logger(`Migration revert completed.`);
  }
  
  return {
    name: 'migration',
    
    onInit(database: IDatabase): void {
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
    getAppliedMigrations
  };
}
