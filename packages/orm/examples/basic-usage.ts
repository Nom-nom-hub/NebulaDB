import { createDb, MemoryAdapter } from '@nebula/core';
import { Model, Field, Index, Relation, RelationType, ModelManager, IndexType } from '../src';

// Create a database
const db = createDb({ adapter: new MemoryAdapter() });

// Create a model manager
const modelManager = new ModelManager(db);

// Define User model
@Model({ timestamps: true })
class User {
  @Field()
  id: string;
  
  @Field({ required: true })
  @Index({ type: IndexType.UNIQUE })
  email: string;
  
  @Field({ required: true })
  name: string;
  
  @Field()
  age: number;
  
  @Relation({
    type: RelationType.ONE_TO_MANY,
    target: () => Post,
    foreignKey: 'authorId'
  })
  posts: Post[];
  
  @Field()
  createdAt: string;
  
  @Field()
  updatedAt: string;
}

// Define Post model
@Model({ timestamps: true })
class Post {
  @Field()
  id: string;
  
  @Field({ required: true })
  title: string;
  
  @Field()
  content: string;
  
  @Field()
  authorId: string;
  
  @Relation({
    type: RelationType.MANY_TO_ONE,
    target: () => User,
    foreignKey: 'authorId'
  })
  author: User;
  
  @Field()
  createdAt: string;
  
  @Field()
  updatedAt: string;
}

// Register models
modelManager.register(User);
modelManager.register(Post);

// Usage example
async function main() {
  // Create a user
  const user = new User();
  user.email = 'alice@example.com';
  user.name = 'Alice';
  user.age = 30;
  
  // Save the user
  const savedUser = await user.save();
  console.log('User saved:', savedUser);
  
  // Create a post
  const post = new Post();
  post.title = 'Hello World';
  post.content = 'This is my first post';
  post.authorId = savedUser.id;
  
  // Save the post
  const savedPost = await post.save();
  console.log('Post saved:', savedPost);
  
  // Find users
  const users = await User.find({ age: { $gt: 25 } });
  console.log('Users over 25:', users);
  
  // Find a user by ID
  const foundUser = await User.findById(savedUser.id);
  console.log('Found user:', foundUser);
  
  // Find posts by a user
  const posts = await Post.find({ authorId: savedUser.id });
  console.log('Posts by user:', posts);
  
  // Update a user
  savedUser.age = 31;
  await savedUser.save();
  console.log('Updated user:', savedUser);
  
  // Delete a post
  await savedPost.remove();
  console.log('Post deleted');
}

main().catch(console.error);
