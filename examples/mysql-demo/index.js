import pkg1 from '@nebula-db/nebula-db';
const { createDatabase } = pkg1;

import { createMySQLAdapter } from '@nebula-db/adapter-mysql';
import chalk from 'chalk';

const log = {
  title: (text) => console.log(chalk.bold.blue(`\n=== ${text} ===`)),
  info: (text) => console.log(chalk.cyan(`ℹ️  ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2))),
  divider: () => console.log(chalk.gray('-'.repeat(50)))
};

const adapter = createMySQLAdapter({
  host: process.env.MYSQL_HOST || 'localhost',
  port: parseInt(process.env.MYSQL_PORT || '3306'),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'nebuladb'
});

const db = createDatabase({ adapter });

const orders = db.collection('orders', {
  schema: {
    id: { type: 'string', optional: true },
    customer: { type: 'string' },
    product: { type: 'string' },
    quantity: { type: 'number' },
    fulfilled: { type: 'boolean' }
  }
});

async function run() {
  try {
    log.title('NebulaDB MySQL Adapter Demo');
    log.info('Connecting to MySQL and demonstrating CRUD operations');
    log.divider();

    // Insert
    log.title('Inserting Data');
    await orders.insert({ customer: 'Alice', product: 'Laptop', quantity: 1, fulfilled: false });
    await orders.insert({ customer: 'Bob', product: 'Mouse', quantity: 2, fulfilled: true });
    await orders.insert({ customer: 'Carol', product: 'Keyboard', quantity: 1, fulfilled: false });
    log.success('3 orders inserted');

    // Find all
    log.title('Querying All Records');
    const all = await orders.find();
    log.success(`Found ${all.length} orders:`);
    log.data(all);

    // Filtered query
    log.title('Filtered Query');
    log.info('Finding unfulfilled orders...');
    const pending = await orders.find({ fulfilled: false });
    log.success(`Found ${pending.length} pending orders:`);
    log.data(pending);

    // Update
    log.title('Updating Data');
    log.info('Fulfilling Alice\'s order...');
    await orders.update({ customer: 'Alice' }, { $set: { fulfilled: true } });
    const alice = await orders.findOne({ customer: 'Alice' });
    log.success('Order updated:');
    log.data(alice);

    // Delete
    log.title('Deleting Data');
    log.info('Removing fulfilled orders...');
    await orders.delete({ fulfilled: true });
    const remaining = await orders.find();
    log.success(`${remaining.length} orders remaining:`);
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
