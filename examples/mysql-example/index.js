import { createDatabase } from '@nebula-db/nebula-db';
import { MySQLAdapter } from '@nebula-db/adapter-mysql';

const log = {
  title: (text) => console.log(`\n=== ${text} ===`),
  info: (text) => console.log(`ℹ️ ${text}`),
  success: (text) => console.log(`✅ ${text}`),
  error: (text) => console.log(`❌ ${text}`),
  data: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50))
};

const MYSQL_HOST = process.env.MYSQL_HOST || 'localhost';
const MYSQL_PORT = process.env.MYSQL_PORT || 3306;
const MYSQL_USER = process.env.MYSQL_USER || 'root';
const MYSQL_PASSWORD = process.env.MYSQL_PASSWORD || '';
const MYSQL_DATABASE = process.env.MYSQL_DATABASE || 'nebula_db_demo';

async function run() {
  try {
    log.title('NebulaDB MySQL Adapter Demo');
    log.info(`Connecting to MySQL at ${MYSQL_HOST}:${MYSQL_PORT}`);
    log.info(`Database: ${MYSQL_DATABASE}`);
    log.divider();

    const adapter = new MySQLAdapter({
      host: MYSQL_HOST,
      port: parseInt(MYSQL_PORT),
      user: MYSQL_USER,
      password: MYSQL_PASSWORD,
      database: MYSQL_DATABASE
    });

    const db = createDatabase({
      adapter,
      options: {}
    });

    const users = db.collection('users', {
      schema: {
        id: { type: 'string', optional: true },
        name: { type: 'string' },
        email: { type: 'string' },
        age: { type: 'number', optional: true },
        active: { type: 'boolean' },
        createdAt: { type: 'date' }
      }
    });

    log.title('Creating Sample Users');
    log.info('Inserting sample users into MySQL...');

    const sampleUsers = [
      {
        name: 'Alice Johnson',
        email: 'alice@example.com',
        age: 28,
        active: true,
        createdAt: new Date()
      },
      {
        name: 'Bob Smith',
        email: 'bob@example.com',
        age: 35,
        active: true,
        createdAt: new Date()
      },
      {
        name: 'Charlie Brown',
        email: 'charlie@example.com',
        age: 22,
        active: false,
        createdAt: new Date()
      },
      {
        name: 'Diana Prince',
        email: 'diana@example.com',
        age: 31,
        active: true,
        createdAt: new Date()
      }
    ];

    for (const user of sampleUsers) {
      const result = await users.insert(user);
      log.success(`Inserted: ${user.name} (ID: ${result.id})`);
    }

    log.title('Querying Users');
    log.info('Finding all users...');
    const allUsers = await users.find();
    log.success(`Found ${allUsers.length} users`);
    log.data(allUsers);

    log.info('Finding active users...');
    const activeUsers = await users.find({ active: true });
    log.success(`Found ${activeUsers.length} active users`);
    log.data(activeUsers);

    log.info('Finding users over 25...');
    const olderUsers = await users.find({ age: { $gt: 25 } });
    log.success(`Found ${olderUsers.length} users over 25`);
    log.data(olderUsers);

    log.title('Updating Users');
    log.info('Updating Charlie Brown to active...');
    await users.update(
      { name: 'Charlie Brown' },
      { $set: { active: true } }
    );

    const updated = await users.findOne({ name: 'Charlie Brown' });
    log.success('Updated user:');
    log.data(updated);

    log.title('Deleting Users');
    log.info('Deleting Bob Smith...');
    await users.delete({ name: 'Bob Smith' });
    log.success('User deleted');

    const remaining = await users.find();
    log.success(`${remaining.length} users remaining`);
    log.data(remaining);

    log.divider();
    log.success('MySQL adapter demo completed successfully!');

  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();