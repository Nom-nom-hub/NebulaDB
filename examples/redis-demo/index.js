import pkg1 from '@nebula-db/nebula-db';
const { createDatabase } = pkg1;

import { createRedisAdapter } from '@nebula-db/adapter-redis';
import chalk from 'chalk';

const log = {
  title: (text) => console.log(chalk.bold.blue(`\n=== ${text} ===`)),
  info: (text) => console.log(chalk.cyan(`ℹ️  ${text}`)),
  success: (text) => console.log(chalk.green(`✅ ${text}`)),
  error: (text) => console.log(chalk.red(`❌ ${text}`)),
  data: (obj) => console.log(chalk.gray(JSON.stringify(obj, null, 2))),
  divider: () => console.log(chalk.gray('-'.repeat(50)))
};

const adapter = createRedisAdapter(
  process.env.REDIS_URL || 'redis://localhost:6379'
);

const db = createDatabase({ adapter });

const sessions = db.collection('sessions', {
  schema: {
    id: { type: 'string', optional: true },
    userId: { type: 'string' },
    token: { type: 'string' },
    active: { type: 'boolean' }
  }
});

async function run() {
  try {
    log.title('NebulaDB Redis Adapter Demo');
    log.info('Connecting to Redis and demonstrating CRUD operations');
    log.divider();

    // Insert
    log.title('Inserting Data');
    await sessions.insert({ userId: 'user_1', token: 'tok_abc123', active: true });
    await sessions.insert({ userId: 'user_2', token: 'tok_def456', active: true });
    await sessions.insert({ userId: 'user_3', token: 'tok_ghi789', active: false });
    log.success('3 sessions inserted');

    // Find all
    log.title('Querying All Records');
    const all = await sessions.find();
    log.success(`Found ${all.length} sessions:`);
    log.data(all);

    // Filtered query
    log.title('Filtered Query');
    log.info('Finding active sessions...');
    const active = await sessions.find({ active: true });
    log.success(`Found ${active.length} active sessions:`);
    log.data(active);

    // Update
    log.title('Updating Data');
    log.info('Deactivating user_2 session...');
    await sessions.update({ userId: 'user_2' }, { $set: { active: false } });
    const user2 = await sessions.findOne({ userId: 'user_2' });
    log.success('Session updated:');
    log.data(user2);

    // Delete
    log.title('Deleting Data');
    log.info('Removing inactive sessions...');
    await sessions.delete({ active: false });
    const remaining = await sessions.find();
    log.success(`${remaining.length} sessions remaining:`);
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
