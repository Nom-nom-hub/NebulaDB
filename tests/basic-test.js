const { createDb } = require('@nebula/core');
const { MemoryAdapter } = require('@nebula/adapter-memory');

async function runBasicTests() {
  console.log('Starting basic NebulaDB tests...');
  
  try {
    // Create database with memory adapter
    console.log('Creating database...');
    const db = createDb({ adapter: new MemoryAdapter() });
    
    // Create collection
    console.log('Creating collection...');
    const users = db.collection('users');
    
    // Test insert
    console.log('Testing insert...');
    const user = await users.insert({
      name: 'Test User',
      email: 'test@example.com',
      age: 30
    });
    console.log('Inserted user:', user);
    
    // Test find
    console.log('Testing find...');
    const allUsers = await users.find();
    console.log('Found users:', allUsers);
    
    // Test findOne
    console.log('Testing findOne...');
    const foundUser = await users.findOne({ name: 'Test User' });
    console.log('Found user:', foundUser);
    
    // Test update
    console.log('Testing update...');
    await users.update(
      { id: user.id },
      { $set: { age: 31 } }
    );
    
    // Verify update
    const updatedUser = await users.findOne({ id: user.id });
    console.log('Updated user:', updatedUser);
    
    // Test delete
    console.log('Testing delete...');
    await users.delete({ id: user.id });
    
    // Verify delete
    const remainingUsers = await users.find();
    console.log('Remaining users:', remainingUsers);
    
    console.log('All tests completed successfully!');
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the tests
runBasicTests().catch(console.error);