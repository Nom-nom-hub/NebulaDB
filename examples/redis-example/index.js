import { createDatabase } from '@nebula-db/nebula-db';
import { RedisAdapter } from '@nebula-db/adapter-redis';

const log = {
  title: (text) => console.log(`\n=== ${text} ===`),
  info: (text) => console.log(`ℹ️ ${text}`),
  success: (text) => console.log(`✅ ${text}`),
  error: (text) => console.log(`❌ ${text}`),
  data: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50))
};

const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

async function run() {
  try {
    log.title('NebulaDB Redis Adapter Demo');
    log.info(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}`);
    log.divider();

    const adapter = new RedisAdapter({
      host: REDIS_HOST,
      port: parseInt(REDIS_PORT),
      password: REDIS_PASSWORD
    });

    const db = createDatabase({
      adapter,
      options: {}
    });

    const sessions = db.collection('sessions', {
      schema: {
        id: { type: 'string', optional: true },
        userId: { type: 'string' },
        token: { type: 'string' },
        expiresAt: { type: 'date' },
        metadata: { type: 'object', optional: true }
      }
    });

    log.title('Creating Sample Sessions');
    log.info('Inserting sample sessions into Redis...');

    const sampleSessions = [
      {
        userId: 'user_001',
        token: 'tok_abc123xyz',
        expiresAt: new Date(Date.now() + 3600000),
        metadata: { ip: '192.168.1.1', device: 'desktop' }
      },
      {
        userId: 'user_002',
        token: 'tok_def456uvw',
        expiresAt: new Date(Date.now() + 7200000),
        metadata: { ip: '192.168.1.2', device: 'mobile' }
      },
      {
        userId: 'user_003',
        token: 'tok_ghi789rst',
        expiresAt: new Date(Date.now() + 1800000),
        metadata: { ip: '10.0.0.5', device: 'tablet' }
      }
    ];

    for (const session of sampleSessions) {
      const result = await sessions.insert(session);
      log.success(`Inserted: Session for user ${session.userId}`);
    }

    log.title('Querying Sessions');
    log.info('Finding all sessions...');
    const allSessions = await sessions.find();
    log.success(`Found ${allSessions.length} sessions`);
    log.data(allSessions);

    log.info('Finding sessions for user_001...');
    const user1Sessions = await sessions.find({ userId: 'user_001' });
    log.success(`Found ${user1Sessions.length} sessions for user_001`);
    log.data(user1Sessions);

    log.title('Updating Sessions');
    log.info('Updating user_002 session token...');
    await sessions.update(
      { userId: 'user_002' },
      { $set: { token: 'tok_newtoken123' } }
    );

    const updated = await sessions.findOne({ userId: 'user_002' });
    log.success('Updated session:');
    log.data(updated);

    log.title('Deleting Sessions');
    log.info('Deleting user_003 session...');
    await sessions.delete({ userId: 'user_003' });
    log.success('Session deleted');

    const remaining = await sessions.find();
    log.success(`${remaining.length} sessions remaining`);
    log.data(remaining);

    log.divider();
    log.success('Redis adapter demo completed successfully!');

  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();