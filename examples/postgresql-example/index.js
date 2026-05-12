import { createDatabase } from '@nebula-db/nebula-db';
import { PostgreSQLAdapter } from '@nebula-db/adapter-postgresql';

const log = {
  title: (text) => console.log(`\n=== ${text} ===`),
  info: (text) => console.log(`ℹ️ ${text}`),
  success: (text) => console.log(`✅ ${text}`),
  error: (text) => console.log(`❌ ${text}`),
  data: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50))
};

const PG_HOST = process.env.PG_HOST || 'localhost';
const PG_PORT = process.env.PG_PORT || 5432;
const PG_USER = process.env.PG_USER || 'postgres';
const PG_PASSWORD = process.env.PG_PASSWORD || '';
const PG_DATABASE = process.env.PG_DATABASE || 'nebula_db_demo';

async function run() {
  try {
    log.title('NebulaDB PostgreSQL Adapter Demo');
    log.info(`Connecting to PostgreSQL at ${PG_HOST}:${PG_PORT}`);
    log.info(`Database: ${PG_DATABASE}`);
    log.divider();

    const adapter = new PostgreSQLAdapter({
      host: PG_HOST,
      port: parseInt(PG_PORT),
      user: PG_USER,
      password: PG_PASSWORD,
      database: PG_DATABASE
    });

    const db = createDatabase({
      adapter,
      options: {}
    });

    const orders = db.collection('orders', {
      schema: {
        id: { type: 'string', optional: true },
        customerName: { type: 'string' },
        total: { type: 'number' },
        status: { type: 'string' },
        items: { type: 'array' },
        createdAt: { type: 'date' }
      }
    });

    log.title('Creating Sample Orders');
    log.info('Inserting sample orders into PostgreSQL...');

    const sampleOrders = [
      {
        customerName: 'John Doe',
        total: 150.00,
        status: 'pending',
        items: ['Laptop', 'Mouse'],
        createdAt: new Date()
      },
      {
        customerName: 'Jane Smith',
        total: 89.99,
        status: 'completed',
        items: ['Keyboard', 'Headphones'],
        createdAt: new Date()
      },
      {
        customerName: 'Bob Wilson',
        total: 299.99,
        status: 'processing',
        items: ['Monitor', 'Webcam', 'Light'],
        createdAt: new Date()
      },
      {
        customerName: 'Alice Brown',
        total: 45.50,
        status: 'completed',
        items: ['USB Hub'],
        createdAt: new Date()
      }
    ];

    for (const order of sampleOrders) {
      const result = await orders.insert(order);
      log.success(`Inserted: Order #${result.id}`);
    }

    log.title('Querying Orders');
    log.info('Finding all orders...');
    const allOrders = await orders.find();
    log.success(`Found ${allOrders.length} orders`);
    log.data(allOrders);

    log.info('Finding completed orders...');
    const completed = await orders.find({ status: 'completed' });
    log.success(`Found ${completed.length} completed orders`);
    log.data(completed);

    log.info('Finding high-value orders (>$100)...');
    const highValue = await orders.find({ total: { $gt: 100 } });
    log.success(`Found ${highValue.length} high-value orders`);
    log.data(highValue);

    log.title('Updating Orders');
    log.info('Updating John Doe order to processing...');
    await orders.update(
      { customerName: 'John Doe' },
      { $set: { status: 'processing' } }
    );

    const updated = await orders.findOne({ customerName: 'John Doe' });
    log.success('Updated order:');
    log.data(updated);

    log.title('Deleting Orders');
    log.info('Deleting Alice Brown order...');
    await orders.delete({ customerName: 'Alice Brown' });
    log.success('Order deleted');

    const remaining = await orders.find();
    log.success(`${remaining.length} orders remaining`);
    log.data(remaining);

    log.divider();
    log.success('PostgreSQL adapter demo completed successfully!');

  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();