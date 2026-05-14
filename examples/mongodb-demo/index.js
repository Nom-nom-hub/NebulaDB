import pkg1 from '@nebula-db/nebula-db';
const { createDatabase } = pkg1;

import { createMongoDBAdapter } from '@nebula-db/adapter-mongodb';
import chalk from 'chalk';

const log = {
  title: (text) => console.log(chalk.bold.blue(`\n=== ${text} ===`)),
  info: (text) => console.log(chalk.cyan(`ℹ️  ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2))),
  divider: () => console.log(chalk.gray('-'.repeat(50)))
};

const adapter = createMongoDBAdapter({
  uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
  database: process.env.MONGODB_DB || 'nebuladb'
});

const db = createDatabase({ adapter });

const products = db.collection('products', {
  schema: {
    id: { type: 'string', optional: true },
    name: { type: 'string' },
    category: { type: 'string' },
    price: { type: 'number' },
    inStock: { type: 'boolean' }
  }
});

async function run() {
  try {
    log.title('NebulaDB MongoDB Adapter Demo');
    log.info('Connecting to MongoDB and demonstrating CRUD operations');
    log.divider();

    // Insert
    log.title('Inserting Data');
    await products.insert({ name: 'Laptop', category: 'Electronics', price: 1299, inStock: true });
    await products.insert({ name: 'Desk Chair', category: 'Furniture', price: 349, inStock: true });
    await products.insert({ name: 'Monitor', category: 'Electronics', price: 499, inStock: false });
    log.success('3 products inserted');

    // Find all
    log.title('Querying All Records');
    const all = await products.find();
    log.success(`Found ${all.length} products:`);
    log.data(all);

    // Filtered query
    log.title('Filtered Query');
    log.info('Finding Electronics in stock...');
    const available = await products.find({ category: 'Electronics', inStock: true });
    log.success(`Found ${available.length} Electronics in stock:`);
    log.data(available);

    // Update
    log.title('Updating Data');
    log.info('Restocking Monitor...');
    await products.update({ name: 'Monitor' }, { $set: { inStock: true } });
    const monitor = await products.findOne({ name: 'Monitor' });
    log.success('Monitor updated:');
    log.data(monitor);

    // Delete
    log.title('Deleting Data');
    log.info('Removing Furniture category...');
    await products.delete({ category: 'Furniture' });
    const remaining = await products.find();
    log.success(`${remaining.length} products remaining:`);
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
