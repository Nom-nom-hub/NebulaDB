/**
 * Example Deno application using NebulaDB with Deno KV adapter
 * 
 * Run with:
 * deno run --allow-kv examples/deno-kv-app.ts
 */

import { createDb } from '../packages/core/src/index.ts';
import { DenoKvAdapter } from '../packages/adapter-deno-kv/src/index.ts';

// Initialize database
const adapter = new DenoKvAdapter();
const db = createDb({ adapter });

// Get or create collections
const users = db.collection('users');
const posts = db.collection('posts');

async function main() {
  console.log('🚀 NebulaDB with Deno KV Adapter Example\n');

  try {
    // Example 1: Insert users
    console.log('📝 Inserting users...');
    const alice = await users.insert({
      id: 'user-1',
      name: 'Alice',
      email: 'alice@example.com',
      age: 30,
      joinedAt: new Date().toISOString()
    });

    const bob = await users.insert({
      id: 'user-2',
      name: 'Bob',
      email: 'bob@example.com',
      age: 25,
      joinedAt: new Date().toISOString()
    });

    console.log(`✓ Created user: ${alice.name}`);
    console.log(`✓ Created user: ${bob.name}\n`);

    // Example 2: Query users
    console.log('🔍 Querying all users...');
    const allUsers = await users.find({});
    console.log(`Found ${allUsers.length} users`);
    allUsers.forEach(user => {
      console.log(`  - ${user.name} (${user.email})`);
    });
    console.log();

    // Example 3: Find specific user
    console.log('🔎 Finding Alice...');
    const found = await users.findOne({ id: 'user-1' });
    if (found) {
      console.log(`✓ Found: ${found.name}, Age: ${found.age}\n`);
    }

    // Example 4: Update user
    console.log('✏️  Updating Alice\'s age...');
    const updated = await users.updateOne(
      { id: 'user-1' },
      { $set: { age: 31 } }
    );
    if (updated) {
      const updatedUser = await users.findOne({ id: 'user-1' });
      console.log(`✓ Updated age to: ${updatedUser?.age}\n`);
    }

    // Example 5: Insert posts
    console.log('📝 Inserting posts...');
    const post1 = await posts.insert({
      id: 'post-1',
      userId: 'user-1',
      title: 'My First Post',
      content: 'This is my first post on NebulaDB!',
      likes: 0,
      createdAt: new Date().toISOString()
    });

    const post2 = await posts.insert({
      id: 'post-2',
      userId: 'user-2',
      title: 'Hello World',
      content: 'Greetings from Bob!',
      likes: 5,
      createdAt: new Date().toISOString()
    });

    console.log(`✓ Created post: "${post1.title}"`);
    console.log(`✓ Created post: "${post2.title}"\n`);

    // Example 6: Count documents
    console.log('📊 Statistics...');
    const userCount = await users.count();
    const postCount = await posts.count();
    console.log(`Total users: ${userCount}`);
    console.log(`Total posts: ${postCount}\n`);

    // Example 7: Delete and verify
    console.log('🗑️  Deleting Bob...');
    const deleted = await users.deleteOne({ id: 'user-2' });
    if (deleted) {
      const remainingUsers = await users.count();
      console.log(`✓ Deleted. Remaining users: ${remainingUsers}\n`);
    }

    // Example 8: Subscription (real-time updates)
    console.log('🔔 Subscribing to user changes...');
    const unsubscribe = users.subscribe({}, (docs) => {
      console.log(`  Users collection changed, now has ${docs.length} documents`);
    });

    // Trigger a change
    await users.insert({
      id: 'user-3',
      name: 'Charlie',
      email: 'charlie@example.com',
      age: 28,
      joinedAt: new Date().toISOString()
    });

    console.log();

    // Example 9: Batch operations
    console.log('⚡ Batch inserting multiple users...');
    const batchUsers = await users.insertBatch([
      { id: 'user-4', name: 'Diana', email: 'diana@example.com', age: 27 },
      { id: 'user-5', name: 'Eve', email: 'eve@example.com', age: 29 },
      { id: 'user-6', name: 'Frank', email: 'frank@example.com', age: 32 }
    ]);
    console.log(`✓ Inserted ${batchUsers.length} users in batch\n`);

    // Final stats
    const finalUserCount = await users.count();
    const finalPostCount = await posts.count();
    console.log('═══════════════════════════════════');
    console.log('📈 Final Statistics');
    console.log('═══════════════════════════════════');
    console.log(`Users: ${finalUserCount}`);
    console.log(`Posts: ${finalPostCount}`);
    console.log('═══════════════════════════════════\n');

    // Cleanup
    unsubscribe();
    await adapter.close();
    console.log('✓ Database closed successfully');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the example
main().catch(console.error);
