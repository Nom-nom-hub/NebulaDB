# @nebula-db/plugin-auth

Authentication and authorization plugin for NebulaDB. Provides user registration, session management, and role-based access control (RBAC).

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 👤 **User Registration** — Register users with PBKDF2 password hashing
- 🔐 **Login / Logout** — Credential verification and session lifecycle management
- 🎫 **Session Management** — In-memory sessions with configurable expiry (default: 7 days)
- 🛡️ **Role-Based Access Control** — Built-in roles: `admin`, `editor`, `viewer`
- 🔑 **Permission System** — Granular permission checks per collection and access level
- ⚙️ **Configurable Hashing** — Adjustable PBKDF2 iterations and key length

## Installation

```bash
npm install @nebula-db/plugin-auth
```

## Quick Start

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createAuthPlugin } from '@nebula-db/plugin-auth';

const auth = createAuthPlugin({
  iterations: 100000,
  keyLength: 64,
});

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [auth],
});

// Register a user
const user = await auth.register('alice', 'alice@example.com', 'securepassword', ['editor']);

// Login
const result = await auth.login('alice@example.com', 'securepassword');
if (result) {
  console.log('Session ID:', result.session.id);
}

// Validate session
const validUser = await auth.validateSession(result.session.id);
console.log('Authenticated as:', validUser?.username);

// Logout
await auth.logout(result.session.id);
```

## Configuration

| Option               | Type       | Default       | Description                           |
| -------------------- | ---------- | ------------- | ------------------------------------- |
| `algorithm`          | `'pbkdf2'` | `'pbkdf2'`    | Hashing algorithm                     |
| `iterations`         | `number`   | `100000`      | PBKDF2 iteration count                |
| `keyLength`          | `number`   | `64`          | Derived key length in bytes           |
| `sessionsCollection` | `string`   | `'_sessions'` | Internal collection name for sessions |

## Built-in Roles

| Role     | Permissions                         |
| -------- | ----------------------------------- |
| `admin`  | All permissions (`*`)               |
| `editor` | `read`, `write`, `create`, `delete` |
| `viewer` | `read`                              |

## API Reference

| Method                                        | Description                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| `register(username, email, password, roles?)` | Register a new user; returns the created `User` document     |
| `login(email, password)`                      | Verify credentials; returns `{ user, session }` or `null`    |
| `logout(sessionId)`                           | Invalidate a session                                         |
| `validateSession(sessionId)`                  | Return the authenticated `User` or `null` if expired/invalid |
| `canAccess(user, collection, level)`          | Check if a user can access a collection at a given level     |
| `defineAccess(acl)`                           | Define an access control rule for a collection               |
| `requireAuth(collection, level?)`             | Shorthand to require authentication for a collection         |

## Example: Access Control

```typescript
const auth = createAuthPlugin();
const db = createDb({ adapter: new MemoryAdapter(), plugins: [auth] });

// Require write access for the 'posts' collection
auth.requireAuth('posts', 'write');

const { user, session } = await auth.login('alice@example.com', 'password');

// Check before performing an operation
if (auth.canAccess(user, 'posts', 'write')) {
  const posts = db.collection('posts');
  await posts.insert({ title: 'Hello World', author: user.id });
}
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

Apache-2.0
