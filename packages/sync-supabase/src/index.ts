import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database, Document, AdapterChange } from '@nebula-db/core';

export interface SupabaseConfig {
  url: string;
  apikey: string;
  table?: string;
  schema?: string;
}

export class SupabaseSyncAdapter {
  private client: SupabaseClient;
  private config: SupabaseConfig;
  private db: Database;
  private lastSyncedAt: string = '';

  constructor(config: SupabaseConfig, db: Database) {
    this.config = config;
    this.db = db;
    this.client = createClient(config.url, config.apikey);
  }

  async sync(): Promise<{ uploaded: number; downloaded: number }> {
    const uploaded = await this.pushChanges();
    const downloaded = await this.pullChanges();
    return { uploaded, downloaded };
  }

  private escapeTableName(name: string): string {
    return `"${name.replace(/"/g, '""')}"`;
  }

  async pushChanges(): Promise<number> {
    const table = this.config.table || 'nebula_documents';
    let pushed = 0;

    for (const collectionName of this.db.getCollectionNames()) {
      const localDocs = await this.db.collection(collectionName).find({});
      const schema = this.config.schema || 'public';

      for (const doc of localDocs) {
        const { error } = await this.client
          .from(`${schema}.${table}`)
          .upsert({
            collection: collectionName,
            doc_id: doc.id,
            data: JSON.stringify(doc),
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'collection,doc_id'
          });

        if (!error) pushed++;
      }
    }

    return pushed;
  }

  async pullChanges(): Promise<number> {
    const table = this.config.table || 'nebula_documents';
    const schema = this.config.schema || 'public';

    const { data: records, error } = await this.client
      .from(`${schema}.${table}`)
      .select('collection, doc_id, data, updated_at')
      .gte('updated_at', this.lastSyncedAt)
      .order('updated_at', { ascending: true });

    if (error || !records) return 0;

    let pulled = 0;
    for (const record of records) {
      try {
        const doc = JSON.parse(record.data);

        if (record.updated_at > this.lastSyncedAt) {
          await this.db.collection(record.collection).insert(doc);
          pulled++;
        }
      } catch {
        continue;
      }
    }

    if (records.length > 0) {
      this.lastSyncedAt = records[records.length - 1].updated_at;
    }

    return pulled;
  }

  async subscribe(
    onChange: (change: AdapterChange) => void
  ): Promise<void> {
    const table = this.config.table || 'nebula_documents';

    this.client
      .channel(`nebula:${table}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: this.config.schema || 'public',
          table
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const doc = JSON.parse(payload.new.data);
            onChange({ type: 'insert', doc });
          } else if (payload.eventType === 'UPDATE') {
            const doc = JSON.parse(payload.new.data);
            onChange({ type: 'update', doc });
          } else if (payload.eventType === 'DELETE') {
            onChange({ type: 'delete', id: payload.old.doc_id });
          }
        }
      )
      .subscribe();
  }

  unsubscribe(): void {
    this.client.removeAllChannels();
  }

  async realtimeEnabled(): Promise<boolean> {
    const { data } = await this.client.functions.invoke('realtime-status');
    return data?.enabled === true;
  }
}

export function createSupabaseSyncAdapter(
  config: SupabaseConfig,
  db: Database
): SupabaseSyncAdapter {
  return new SupabaseSyncAdapter(config, db);
}