import { createDatabase } from '@nebula-db/nebula-db';
import { VercelKvAdapter } from '@nebula-db/adapter-vercel-kv';

const log = {
  title: (text) => console.log(`\n=== ${text} ===`),
  info: (text) => console.log(`ℹ️ ${text}`),
  success: (text) => console.log(`✅ ${text}`),
  error: (text) => console.log(`❌ ${text}`),
  data: (obj) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50)),
};

const KV_URL = process.env.KV_REST_API_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN;

if (!KV_URL || !KV_TOKEN) {
  console.error('❌ Missing required environment variables: KV_REST_API_URL and KV_REST_API_TOKEN');
  console.error('   See README.md for setup instructions.');
  process.exit(1);
}

async function run() {
  try {
    log.title('NebulaDB Vercel KV Adapter Demo');
    log.info('Connecting to Vercel KV...');
    log.divider();

    const adapter = new VercelKvAdapter(KV_URL, KV_TOKEN, {
      namespacePrefix: 'nebula_',
    });

    const db = createDatabase({
      adapter,
      options: {},
    });

    const links = db.collection('links', {
      schema: {
        id: { type: 'string', optional: true },
        slug: { type: 'string' },
        url: { type: 'string' },
        clicks: { type: 'number' },
        active: { type: 'boolean' },
      },
    });

    // Insert
    log.title('Creating Sample Links');
    log.info('Inserting sample links into Vercel KV...');

    const sampleLinks = [
      { slug: 'gh', url: 'https://github.com', clicks: 0, active: true },
      { slug: 'docs', url: 'https://docs.example.com', clicks: 0, active: true },
      { slug: 'old', url: 'https://old.example.com', clicks: 5, active: false },
    ];

    for (const link of sampleLinks) {
      await links.insert(link);
      log.success(`Inserted: /${link.slug} → ${link.url}`);
    }

    // Find all
    log.title('Querying Links');
    log.info('Finding all links...');
    const allLinks = await links.find();
    log.success(`Found ${allLinks.length} links`);
    log.data(allLinks);

    // Filtered query
    log.info('Finding active links...');
    const activeLinks = await links.find({ active: true });
    log.success(`Found ${activeLinks.length} active links`);
    log.data(activeLinks);

    // Update
    log.title('Updating Links');
    log.info('Incrementing click count for /gh...');
    await links.update({ slug: 'gh' }, { $set: { clicks: 1 } });
    const updated = await links.findOne({ slug: 'gh' });
    log.success('Updated link:');
    log.data(updated);

    // Delete
    log.title('Deleting Links');
    log.info('Removing inactive links...');
    await links.delete({ active: false });
    const remaining = await links.find();
    log.success(`${remaining.length} links remaining`);
    log.data(remaining);

    log.divider();
    log.success('Vercel KV adapter demo completed successfully!');
  } catch (error) {
    log.error(`Demo failed: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

run();
