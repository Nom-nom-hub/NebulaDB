import { createDb } from '@nebula-db/core';
import { createDenoKvAdapter } from '@nebula-db/adapter-deno-kv';

const log = {
  title: (text: string) => console.log(`\n=== ${text} ===`),
  info: (text: string) => console.log(`ℹ️  ${text}`),
  success: (text: string) => console.log(`✅ ${text}`),
  error: (text: string) => console.log(`❌ ${text}`),
  data: (obj: unknown) => console.log(JSON.stringify(obj, null, 2)),
  divider: () => console.log('-'.repeat(50))
};

const adapter = createDenoKvAdapter();
const db = createDb({ adapter });

const notes = db.collection('notes', {
  schema: {
    id: { type: 'string', optional: true },
    title: { type: 'string' },
    content: { type: 'string' },
    pinned: { type: 'boolean' }
  }
});

async function run() {
  try {
    log.title('NebulaDB Deno KV Adapter Demo');
    log.info('Using Deno KV for persistent edge storage');
    log.divider();

    // Insert
    log.title('Inserting Data');
    await notes.insert({ title: 'Welcome', content: 'Hello from NebulaDB!', pinned: true });
    await notes.insert({ title: 'Shopping List', content: 'Milk, Eggs, Bread', pinned: false });
    await notes.insert({ title: 'Ideas', content: 'Build something cool', pinned: false });
    log.success('3 notes inserted');

    // Find all
    log.title('Querying All Records');
    const all = await notes.find();
    log.success(`Found ${all.length} notes:`);
    log.data(all);

    // Filtered query
    log.title('Filtered Query');
    log.info('Finding pinned notes...');
    const pinned = await notes.find({ pinned: true });
    log.success(`Found ${pinned.length} pinned notes:`);
    log.data(pinned);

    // Update
    log.title('Updating Data');
    log.info('Pinning Shopping List...');
    await notes.update({ title: 'Shopping List' }, { $set: { pinned: true } });
    const updated = await notes.findOne({ title: 'Shopping List' });
    log.success('Note updated:');
    log.data(updated);

    // Delete
    log.title('Deleting Data');
    log.info('Removing unpinned notes...');
    await notes.delete({ pinned: false });
    const remaining = await notes.find();
    log.success(`${remaining.length} notes remaining:`);
    log.data(remaining);

    log.divider();
    log.success('All operations completed successfully!');

  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`Demo failed: ${msg}`);
  } finally {
    await adapter.close();
  }
}

run();
