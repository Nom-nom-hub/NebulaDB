#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { generateAdapter } from './commands/generate-adapter';
import { generatePlugin } from './commands/generate-plugin';
import { initProject } from './commands/init';
import { launchDevtools } from './commands/devtools';
import { runMigrations } from './commands/migrate';

// Create CLI program
const program = new Command();

// Set version and description
program
  .name('nebula')
  .description('CLI tools for NebulaDB')
  .version('0.1.0');

// Generate adapter command
program
  .command('generate:adapter <name>')
  .description('Generate a new adapter')
  .option('-d, --directory <directory>', 'Directory to create the adapter in', './adapters')
  .action((name, options) => {
    generateAdapter(name, options.directory)
      .then(() => {
        console.log(chalk.green(`Adapter ${name} generated successfully!`));
      })
      .catch(err => {
        console.error(chalk.red(`Error generating adapter: ${err.message}`));
        process.exit(1);
      });
  });

// Generate plugin command
program
  .command('generate:plugin <name>')
  .description('Generate a new plugin')
  .option('-d, --directory <directory>', 'Directory to create the plugin in', './plugins')
  .action((name, options) => {
    generatePlugin(name, options.directory)
      .then(() => {
        console.log(chalk.green(`Plugin ${name} generated successfully!`));
      })
      .catch(err => {
        console.error(chalk.red(`Error generating plugin: ${err.message}`));
        process.exit(1);
      });
  });

// Init command
program
  .command('init')
  .description('Initialize a new NebulaDB project')
  .option('-d, --directory <directory>', 'Directory to initialize the project in', '.')
  .action((options) => {
    initProject(options.directory)
      .then(() => {
        console.log(chalk.green('NebulaDB project initialized successfully!'));
      })
      .catch(err => {
        console.error(chalk.red(`Error initializing project: ${err.message}`));
        process.exit(1);
      });
  });

// Devtools command
program
  .command('devtools')
  .description('Launch NebulaDB devtools')
  .option('-p, --port <port>', 'Port to run the devtools on', '3000')
  .action((options) => {
    launchDevtools(parseInt(options.port))
      .then(() => {
        console.log(chalk.green('NebulaDB devtools launched successfully!'));
      })
      .catch(err => {
        console.error(chalk.red(`Error launching devtools: ${err.message}`));
        process.exit(1);
      });
  });

// Migrate command
program
  .command('migrate')
  .description('Run database migrations')
  .option('-d, --directory <directory>', 'Directory containing migration files', './migrations')
  .option('-c, --config <config>', 'Path to configuration file', './nebula.config.js')
  .action((options) => {
    runMigrations(options.directory, options.config)
      .then(() => {
        console.log(chalk.green('Migrations completed successfully!'));
      })
      .catch(err => {
        console.error(chalk.red(`Error running migrations: ${err.message}`));
        process.exit(1);
      });
  });

// Parse command line arguments
program.parse(process.argv);

// If no arguments, show help
if (!process.argv.slice(2).length) {
  program.outputHelp();
}
