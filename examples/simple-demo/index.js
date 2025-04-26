// Import NebulaDB
const { createDatabase, MemoryAdapter } = require('@nebula-db/nebula-db');

// Create a database instance with memory adapter
const db = createDatabase({
  adapter: new MemoryAdapter(),
  options: {}
});

// Define a users collection
const users = db.collection('users', {
  schema: {
    id: { type: 'string', optional: true },
    name: { type: 'string' },
    email: { type: 'string' },
    age: { type: 'number' },
    roles: { type: 'array' },
    isActive: { type: 'boolean' }
  }
});

// Define a posts collection
const posts = db.collection('posts', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    content: { type: 'string' },
    authorId: { type: 'string' },
    tags: { type: 'array' },
    createdAt: { type: 'date' },
    updatedAt: { type: 'date', optional: true }
  }
});

// Sample data
const sampleUsers = [
  { name: 'John Doe', email: 'john@example.com', age: 32, roles: ['admin', 'user'], isActive: true },
  { name: 'Jane Smith', email: 'jane@example.com', age: 28, roles: ['user'], isActive: true },
  { name: 'Bob Johnson', email: 'bob@example.com', age: 45, roles: ['user'], isActive: false },
  { name: 'Alice Brown', email: 'alice@example.com', age: 24, roles: ['editor', 'user'], isActive: true },
  { name: 'Charlie Wilson', email: 'charlie@example.com', age: 37, roles: ['user'], isActive: true }
];

const samplePosts = [
  {
    title: 'Getting Started with NebulaDB',
    content: 'NebulaDB is a powerful embedded database...',
    tags: ['tutorial', 'database'],
    createdAt: new Date('2024-01-15')
  },
  {
    title: 'Advanced Queries in NebulaDB',
    content: 'Learn how to use complex queries...',
    tags: ['advanced', 'queries'],
    createdAt: new Date('2024-02-20')
  },
  {
    title: 'Reactive Data with NebulaDB',
    content: 'Real-time updates made easy...',
    tags: ['reactive', 'real-time'],
    createdAt: new Date('2024-03-10')
  }
];

// Function to run the demo
async function runDemo() {
  console.log('🚀 NebulaDB Demo Starting...\n');

  // Step 1: Insert users
  console.log('Step 1: Inserting users...');
  for (const user of sampleUsers) {
    const result = await users.insert(user);
    console.log(`  ✅ Inserted user: ${user.name} with ID: ${result.id}`);

    // Store the user ID for posts
    if (user.name === 'John Doe') {
      johnId = result.id;
    } else if (user.name === 'Jane Smith') {
      janeId = result.id;
    }
  }
  console.log('');

  // Step 2: Insert posts with author IDs
  console.log('Step 2: Inserting posts...');
  let i = 0;
  for (const post of samplePosts) {
    // Assign posts to different authors
    post.authorId = i % 2 === 0 ? johnId : janeId;
    i++;

    const result = await posts.insert(post);
    console.log(`  ✅ Inserted post: "${post.title}" with ID: ${result.id}`);
  }
  console.log('');

  // Step 3: Basic queries
  console.log('Step 3: Basic queries...');
  const activeUsers = await users.find({ isActive: true });
  console.log(`  📊 Found ${activeUsers.length} active users:`);
  activeUsers.forEach(user => console.log(`    - ${user.name} (${user.email})`));
  console.log('');

  // Step 4: Complex queries
  console.log('Step 4: Complex queries...');
  const youngAdmins = await users.find({
    age: { $lt: 35 },
    roles: { $contains: 'admin' }
  });
  console.log(`  📊 Found ${youngAdmins.length} young admins (age < 35):`);
  youngAdmins.forEach(user => console.log(`    - ${user.name}, age: ${user.age}`));
  console.log('');

  // Step 5: Updating data
  console.log('Step 5: Updating data...');
  const updateResult = await users.update(
    { name: 'Bob Johnson' },
    { $set: { isActive: true, roles: ['user', 'moderator'] } }
  );
  console.log(`  ✅ Updated ${updateResult.modifiedCount} user(s)`);

  const updatedBob = await users.findOne({ name: 'Bob Johnson' });
  console.log(`  📊 Bob's new data: isActive=${updatedBob.isActive}, roles=${updatedBob.roles.join(', ')}`);
  console.log('');

  // Step 6: Joining data (manually since NebulaDB doesn't have built-in joins)
  console.log('Step 6: Joining data (author + posts)...');
  const john = await users.findOne({ name: 'John Doe' });
  const johnsPosts = await posts.find({ authorId: john.id });

  console.log(`  📊 Posts by ${john.name}:`);
  johnsPosts.forEach(post => console.log(`    - "${post.title}" (${new Date(post.createdAt).toLocaleDateString()})`));
  console.log('');

  // Step 7: Advanced features
  console.log('Step 7: Advanced features...');
  console.log('  🔄 Making changes to demonstrate advanced features...');

  // Make a change to a user
  await users.update(
    { name: 'Charlie Wilson' },
    { $set: { isActive: false } }
  );

  console.log('  ✅ Updated Charlie Wilson to inactive');

  // Check the results
  const activeUsersAfterUpdate = await users.find({ isActive: true });
  console.log(`  📊 Now there are ${activeUsersAfterUpdate.length} active users`);
  console.log('');

  // Step 8: Performance demonstration
  console.log('Step 8: Performance demonstration...');
  console.log('  🔄 Inserting 1000 records and measuring performance...');

  const startTime = Date.now();
  const bulkUsers = [];

  for (let i = 0; i < 1000; i++) {
    bulkUsers.push({
      name: `User ${i}`,
      email: `user${i}@example.com`,
      age: 20 + (i % 50),
      roles: ['user'],
      isActive: i % 10 !== 0 // 90% active
    });
  }

  // Perform bulk insert
  for (const user of bulkUsers) {
    await users.insert(user);
  }

  const endTime = Date.now();
  const duration = (endTime - startTime) / 1000;

  console.log(`  ⏱️ Inserted 1000 records in ${duration.toFixed(2)} seconds`);
  console.log(`  ⏱️ Average: ${(1000 / duration).toFixed(2)} records per second`);

  // Query performance
  console.log('  🔄 Testing query performance...');

  const queryStart = Date.now();
  const queryResults = await users.find({ age: { $gt: 30 }, isActive: true });
  const queryEnd = Date.now();
  const queryDuration = (queryEnd - queryStart) / 1000;

  console.log(`  ⏱️ Query returned ${queryResults.length} results in ${queryDuration.toFixed(4)} seconds`);
  console.log('');

  // Final stats
  const totalUsers = (await users.find({})).length;
  const totalPosts = (await posts.find({})).length;
  const activeUsersCount = (await users.find({ isActive: true })).length;
  const inactiveUsersCount = (await users.find({ isActive: false })).length;
  const usersOver30 = (await users.find({ age: { $gt: 30 } })).length;

  console.log('📊 Final Database Stats:');
  console.log(`  - Total Users: ${totalUsers}`);
  console.log(`  - Total Posts: ${totalPosts}`);
  console.log(`  - Active Users: ${activeUsersCount}`);
  console.log(`  - Inactive Users: ${inactiveUsersCount}`);
  console.log(`  - Users over 30: ${usersOver30}`);
  console.log('');

  console.log('🎉 NebulaDB Demo Completed Successfully!');
}

// Global variables for user IDs
let johnId, janeId;

// Run the demo
runDemo().catch(error => {
  console.error('❌ Error running demo:', error);
});
