import { createDatabase } from '@nebula-db/nebula-db';
import { MongoDBAdapter } from '@nebula-db/adapter-mongodb';

const log = {
  title: (text) => console.log(`\n=== ${text} ===`),
  info: (text) => console.log(`ℹ️ ${text}`),
  success: (text) => console.log(`✅ ${text}`),
  error: (text) => console.log(`❌ ${text}`),
  data: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50))
};

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DATABASE_NAME = process.env.MONGO_DB || 'nebula_db_demo';
const COLLECTION_NAME = process.env.MONGO_COLLECTION || 'products';

async function run() {
  try {
    log.title('NebulaDB MongoDB Adapter Demo');
    log.info(`Connecting to MongoDB at: ${MONGO_URI}`);
    log.info(`Database: ${DATABASE_NAME}`);
    log.divider();

    const adapter = new MongoDBAdapter({
      uri: MONGO_URI,
      database: DATABASE_NAME,
      collection: COLLECTION_NAME
    });

    const db = createDatabase({
      adapter,
      options: {}
    });

    const products = db.collection('products', {
      schema: {
        id: { type: 'string', optional: true },
        name: { type: 'string' },
        price: { type: 'number' },
        category: { type: 'string' },
        inStock: { type: 'boolean' },
        tags: { type: 'array', optional: true },
        createdAt: { type: 'date' }
      }
    });

    log.title('Creating Sample Products');
    log.info('Inserting sample products into MongoDB...');

    const sampleProducts = [
      {
        name: 'Laptop Pro',
        price: 1299.99,
        category: 'Electronics',
        inStock: true,
        tags: ['computer', 'electronics', 'sale'],
        createdAt: new Date()
      },
      {
        name: 'Wireless Mouse',
        price: 29.99,
        category: 'Electronics',
        inStock: true,
        tags: ['accessories', 'electronics'],
        createdAt: new Date()
      },
      {
        name: 'Desk Chair',
        price: 249.99,
        category: 'Furniture',
        inStock: false,
        tags: ['furniture', 'office'],
        createdAt: new Date()
      },
      {
        name: 'LED Monitor',
        price: 399.99,
        category: 'Electronics',
        inStock: true,
        tags: ['electronics', 'display'],
        createdAt: new Date()
      }
    ];

    for (const product of sampleProducts) {
      const result = await products.insert(product);
      log.success(`Inserted: ${product.name} (ID: ${result.id})`);
    }

    log.title('Querying Products');
    log.info('Finding all products...');
    const allProducts = await products.find();
    log.success(`Found ${allProducts.length} products`);
    log.data(allProducts);

    log.info('Finding electronics products...');
    const electronics = await products.find({ category: 'Electronics' });
    log.success(`Found ${electronics.length} electronics products`);
    log.data(electronics);

    log.info('Finding products in stock...');
    const inStock = await products.find({ inStock: true });
    log.success(`Found ${inStock.length} products in stock`);
    log.data(inStock);

    log.info('Finding products with "sale" tag...');
    const saleItems = await products.find({ tags: { $contains: 'sale' } });
    log.success(`Found ${saleItems.length} sale items`);
    log.data(saleItems);

    log.title('Updating Products');
    log.info('Updating LED Monitor price...');
    await products.update(
      { name: 'LED Monitor' },
      { $set: { price: 349.99 } }
    );

    const updated = await products.findOne({ name: 'LED Monitor' });
    log.success('Updated product:');
    log.data(updated);

    log.info('Marking Desk Chair as in stock...');
    await products.update(
      { name: 'Desk Chair' },
      { $set: { inStock: true } }
    );

    log.title('Deleting Products');
    log.info('Deleting Wireless Mouse...');
    await products.delete({ name: 'Wireless Mouse' });
    log.success('Product deleted');

    const remaining = await products.find();
    log.success(`${remaining.length} products remaining`);
    log.data(remaining);

    log.divider();
    log.success('MongoDB adapter demo completed successfully!');

  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();