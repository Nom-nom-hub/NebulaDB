# @nebula-db/plugin-encryption

Encryption plugin for NebulaDB providing AES-256-GCM encryption at rest and field-level encryption.

Part of the [NebulaDB](https://github.com/Nom-nom-hub/NebulaDB) project.

## Features

- 🔐 **AES-256-GCM Encryption** - Industry-standard symmetric encryption
- 📦 **Encryption at Rest** - Transparent database encryption via adapter wrapper
- 🔑 **Field-Level Encryption** - Encrypt specific document fields
- 🔍 **Searchable Encryption** - Hash fields for searchable encryption
- 🛡️ **PBKDF2 Key Derivation** - Secure password-based key generation
- ✅ **AEAD Authentication** - Authenticated encryption prevents tampering

## Installation

```bash
npm install @nebula-db/plugin-encryption
```

## Quick Start

### Encryption at Rest

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createEncryptedAdapter } from '@nebula-db/plugin-encryption';

// Create encrypted adapter
const encryptedAdapter = createEncryptedAdapter({
  adapter: new MemoryAdapter(),
  password: 'my-secure-password'
});

// Use with database
const db = createDb({
  adapter: encryptedAdapter
});

// All data is automatically encrypted/decrypted
const users = db.collection('users');
await users.insert({ id: '1', name: 'Alice' });
```

### Field-Level Encryption

```typescript
import { createDb } from '@nebula-db/core';
import { MemoryAdapter } from '@nebula-db/adapter-memory';
import { createFieldEncryptionPlugin } from '@nebula-db/plugin-encryption';

const db = createDb({
  adapter: new MemoryAdapter(),
  plugins: [
    createFieldEncryptionPlugin({
      password: 'field-encryption-password',
      fields: [
        { field: 'ssn' },           // Encrypt SSN
        { field: 'email', searchable: true }, // Hash email for search
        { field: 'address.street' } // Encrypt nested field
      ]
    })
  ]
});

const users = db.collection('users');
await users.insert({
  id: '1',
  name: 'Alice',
  ssn: '123-45-6789',      // Will be encrypted
  email: 'alice@example.com', // Will be hashed
  address: {
    street: '123 Main St'    // Will be encrypted
  }
});
```

## Documentation

For full documentation, visit the [NebulaDB GitHub repository](https://github.com/Nom-nom-hub/NebulaDB).

## License

MIT
