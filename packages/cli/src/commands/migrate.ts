import * as fs from 'fs-extra';
import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createDb, Database } from '@nebula-db/core';

interface Migration {
  version: string;
  name: string;
  up: (db: Database) => Promise<void>;
  down?: (db: Database) => Promise<void>;
}

interface MigrationConfig {
  database: {
    adapter: any;
    options?: any;
  };
  migrations: {
    directory: string;
    tableName?: string;
  };
}

let db: Database;

export async function runMigrations(directory: string, configPath: string): Promise<void> {
  const spinner = ora('Running migrations...').start();

  try {
    const migrationsDir = path.resolve(process.cwd(), directory);
    const dirExists = await fs.pathExists(migrationsDir);

    if (!dirExists) {
      spinner.warn(`Migrations directory ${chalk.cyan(directory)} not found. Creating it...`);
      await fs.ensureDir(migrationsDir);
    }

    const configFile = path.resolve(process.cwd(), configPath);
    const configExists = await fs.pathExists(configFile);

    if (!configExists) {
      spinner.fail(`Configuration file ${chalk.cyan(configPath)} not found.`);
      console.log(`\nCreate a configuration file with the following content:`);
      console.log(`\n// ${configPath}`);
      console.log(`module.exports = {`);
      console.log(`  database: {`);
      console.log(`    adapter: 'memory',`);
      console.log(`    options: {}`);
      console.log(`  },`);
      console.log(`  migrations: {`);
      console.log(`    directory: '${directory}',`);
      console.log(`    tableName: '_migrations'`);
      console.log(`  }`);
      console.log(`};`);
      return;
    }

    let config: MigrationConfig;
    try {
      const module = await import(configFile);
      config = module.default || module;
    } catch (error) {
      spinner.fail(`Failed to load configuration file: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return;
    }

    if (!config.database || !config.migrations) {
      spinner.fail(`Invalid configuration file. Missing 'database' or 'migrations' section.`);
      return;
    }

    db = createDb({ adapter: config.database.adapter });
    const migrationTable = config.migrations.tableName || '_migrations';
    const collection = db.collection(migrationTable);

    const migrationFiles = (await fs.readdir(migrationsDir))
      .filter(f => f.endsWith('.js') || f.endsWith('.ts'))
      .sort();

    if (migrationFiles.length === 0) {
      spinner.info(`No migration files found in ${chalk.cyan(directory)}.`);
      return;
    }

    spinner.info(`Found ${migrationFiles.length} migration files.`);

    const appliedMigrations = await collection.find({});
    const appliedVersions = new Set(appliedMigrations.map(m => m.version));

    let applied = 0;
    let skipped = 0;

    for (const file of migrationFiles) {
      const module = await import(path.join(migrationsDir, file));
      const migration: Migration = module.default || module;

      if (appliedVersions.has(migration.version)) {
        skipped++;
        continue;
      }

      try {
        spinner.text = `Applying migration: ${chalk.cyan(migration.name)} (${migration.version})`;
        await migration.up(db);
        await collection.insert({
          version: migration.version,
          name: migration.name,
          appliedAt: new Date().toISOString()
        });
        applied++;
        spinner.succeed(`Applied: ${chalk.green(migration.name)}`);
      } catch (error) {
        spinner.fail(`Migration ${migration.name} failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    if (applied === 0 && skipped === 0) {
      spinner.info('No migrations to apply.');
    } else {
      spinner.succeed(`Migrations complete. Applied: ${applied}, Skipped: ${skipped}`);
    }

  } catch (error) {
    spinner.fail(`Failed to run migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}

export async function rollbackMigrations(directory: string, configPath: string, steps: number = 1): Promise<void> {
  const spinner = ora('Rolling back migrations...').start();

  try {
    const configFile = path.resolve(process.cwd(), configPath);
    
    if (!await fs.pathExists(configFile)) {
      spinner.fail(`Configuration file ${chalk.cyan(configPath)} not found.`);
      return;
    }

    const module = await import(configFile);
    const config: MigrationConfig = module.default || module;

    db = createDb({ adapter: config.database.adapter });
    const migrationTable = config.migrations.tableName || '_migrations';
    const collection = db.collection(migrationTable);

    const appliedMigrations = await collection.find({ sort: { appliedAt: -1 } });

    if (appliedMigrations.length === 0) {
      spinner.info('No migrations to rollback.');
      return;
    }

    const toRollback = appliedMigrations.slice(0, steps);
    let rolledBack = 0;

    for (const migration of toRollback) {
      if (!migration.down) {
        spinner.warn(`Migration ${migration.version} has no down() method, skipping.`);
        continue;
      }

      try {
        spinner.text = `Rolling back: ${chalk.cyan(migration.name)}`;
        await migration.down(db);
        await collection.delete({ version: migration.version });
        rolledBack++;
      } catch (error) {
        spinner.fail(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        throw error;
      }
    }

    spinner.succeed(`Rolled back ${rolledBack} migration(s).`);

  } catch (error) {
    spinner.fail(`Failed to rollback migrations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    throw error;
  }
}