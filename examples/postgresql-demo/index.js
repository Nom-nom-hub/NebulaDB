import pkg1 from '@nebula-db/nebula-db';
const { createDatabase } = pkg1;

import { createPostgreSQLAdapter } from '@nebula-db/adapter-postgresql';
import chalk from 'chalk';

// Console styling functions (matching repo style)
const log = {
  title: (text) => console.log(chalk.bold.blue(`\n=== ${text} ===`)),
  info: (text) => console.log(chalk.cyan(`ℹ️  ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2))),
  divider: () => console.log(chalk.gray('-'.repeat(50)))
};

// Create adapter — reads DATABASE_URL env var or falls back to default
const adapter = createPostgreSQLAdapter(
  process.env.DATABASE_URL || 'postgres://localhost:5432/nebuladb'
);

const db = createDatabase({ adapter });

const employees = db.collection('employees', {
  schema: {
    id: { type: 'string', optional: true },
    name: { type: 'string' },
    department: { type: 'string' },
    salary: { type: 'number' },
    active: { type: 'boolean' }
  }
});

async function run() {
  try {
    log.title('NebulaDB PostgreSQL Adapter Demo');
    log.info('Connecting to PostgreSQL and demonstrating CRUD operations');
    log.divider();

    // Insert
    log.title('Inserting Data');
    await employees.insert({ name: 'Alice', department: 'Engineering', salary: 95000, active: true });
    await employees.insert({ name: 'Bob', department: 'Marketing', salary: 72000, active: true });
    await employees.insert({ name: 'Carol', department: 'Engineering', salary: 105000, active: false });
    log.success('3 employees inserted');

    // Find all
    log.title('Querying All Records');
    const all = await employees.find();
    log.success(`Found ${all.length} employees:`);
    log.data(all);

    // Filtered query
    log.title('Filtered Query');
    log.info('Finding active Engineering employees...');
    const engineers = await employees.find({ department: 'Engineering', active: true });
    log.success(`Found ${engineers.length} active engineers:`);
    log.data(engineers);

    // Update
    log.title('Updating Data');
    log.info('Giving Bob a raise...');
    await employees.update({ name: 'Bob' }, { $set: { salary: 80000 } });
    const bob = await employees.findOne({ name: 'Bob' });
    log.success('Bob updated:');
    log.data(bob);

    // Delete
    log.title('Deleting Data');
    log.info('Removing inactive employees...');
    await employees.delete({ active: false });
    const remaining = await employees.find();
    log.success(`${remaining.length} employees remaining after deletion`);
    log.data(remaining);

    log.divider();
    log.success('All operations completed successfully!');

  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
  } finally {
    await adapter.close();
  }
}

run();
