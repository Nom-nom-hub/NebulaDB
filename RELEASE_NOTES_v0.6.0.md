# NebulaDB v0.6.0 "Cumulus" — Cloud & Edge Integration ☁️

**Released:** May 2026

NebulaDB v0.6.0 "Cumulus" brings first-class cloud and edge computing support, making NebulaDB a truly universal database that runs everywhere — in the browser, on the server, at the edge, and in serverless environments.

---

## 🆕 New Adapters

Six new storage adapters for cloud and edge platforms:

| Adapter | Platform | Description |
|---|---|---|
| `@nebula-db/adapter-cloudflare-d1` | Cloudflare D1 | Serverless SQL database on Cloudflare Workers |
| `@nebula-db/adapter-deno-kv` | Deno KV | Built-in key-value store for Deno runtime |
| `@nebula-db/adapter-vercel-kv` | Vercel KV | Serverless Redis-compatible store on Vercel Edge |
| `@nebula-db/adapter-aws-lambda` | AWS Lambda | Persistent storage adapter for Lambda functions |
| `@nebula-db/adapter-hybrid` | Multi-platform | Local-first with automatic cloud fallback |
| `@nebula-db/adapter-filesystem` | Node.js | File-based persistence for local development |

---

## 🐛 Browser Compatibility

Major improvements for browser environments:

- **Crypto polyfills** — Full Web Crypto API polyfills for non-Node.js environments
- **Removed Node.js dependencies** — Core package is now fully browser-compatible
- **Removed SQLiteAdapter export** — No more Node.js-only exports breaking browser bundles
- **DOMException for quota errors** — Proper browser-native error handling
- **ArrayBufferView support** — Broader typed array compatibility
- **Centralized RNG** — Uses target's native crypto when available

---

## 🔧 CI & Build Fixes

- **Fixed `npm install`** — Replaced pnpm-only `workspace:*` protocol with npm-compatible `*` across all 40+ `package.json` files
- **Missing tsconfig.json** — Added missing TypeScript configs for all packages
- **PrepublishOnly scripts** — Added proper build scripts to ensure packages build before publishing
- **Improved CI workflow** — Build matrix testing against Node.js 18.x and 20.x

---

## 📚 Documentation

- **Enhanced example READMEs** — MongoDB, MySQL, PostgreSQL, and Redis examples now include Docker setup instructions, code walkthroughs, and expected terminal output (thanks @HirenGajjar, PR #36)
- **New examples** — Added Cloudflare D1 worker and Deno KV app examples
- **CONTRIBUTORS.md** — New file acknowledging community contributors
- **README Contributors section** — Public recognition for contributors on the project homepage
- **GitHub Discussions** — Enabled community discussions with Announcements, Ideas, Q&A, and Show & Tell categories

---

## 📦 Installation

```bash
npm install @nebula-db/nebula-db
```

Or install specific adapters:

```bash
npm install @nebula-db/adapter-cloudflare-d1  # Cloudflare Workers
npm install @nebula-db/adapter-deno-kv         # Deno runtime
npm install @nebula-db/adapter-vercel-kv       # Vercel Edge
npm install @nebula-db/adapter-postgresql      # PostgreSQL
npm install @nebula-db/adapter-mongodb         # MongoDB
```

---

## 🚀 Quick Start

```typescript
import { createDatabase } from '@nebula-db/nebula-db';
import { MemoryAdapter } from '@nebula-db/nebula-db';

const db = createDatabase({ adapter: new MemoryAdapter() });
const collection = await db.collection('users');

await collection.insert({ name: 'Alice', email: 'alice@example.com' });
const results = await collection.find({ name: 'Alice' });
console.log(results); // [{ id: '...', name: 'Alice', email: 'alice@example.com' }]
```

**Edge example (Cloudflare Workers):**

```typescript
import { createDatabase } from '@nebula-db/nebula-db';
import { CloudflareD1Adapter } from '@nebula-db/adapter-cloudflare-d1';

export default {
  async fetch(request, env) {
    const db = createDatabase({
      adapter: new CloudflareD1Adapter(env.DB)
    });
    const users = await db.collection('users');
    const all = await users.find();
    return new Response(JSON.stringify(all));
  }
};
```

---

## 📖 Docs & Resources

- **GitHub:** [github.com/Nom-nom-hub/NebulaDB](https://github.com/Nom-nom-hub/NebulaDB)
- **Docs:** [github.com/Nom-nom-hub/NebulaDB/tree/main/docs](https://github.com/Nom-nom-hub/NebulaDB/tree/main/docs)
- **Changelog:** [CHANGELOG.md](https://github.com/Nom-nom-hub/NebulaDB/blob/main/CHANGELOG.md)
- **Discussions:** [github.com/Nom-nom-hub/NebulaDB/discussions](https://github.com/Nom-nom-hub/NebulaDB/discussions)

---

## 🙏 Feedback

Found a bug? Have a feature idea? We'd love to hear from you!

- 📝 [Open an issue](https://github.com/Nom-nom-hub/NebulaDB/issues/new)
- 💬 [Start a discussion](https://github.com/Nom-nom-hub/NebulaDB/discussions/new)
- 🤝 [Contribute](https://github.com/Nom-nom-hub/NebulaDB/blob/main/CONTRIBUTING.md)
