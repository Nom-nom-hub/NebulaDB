import { Database, Document, AdapterChange } from '@nebula-db/core';

export interface CouchDBConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
  apikey?: string;
}

interface CouchDBDocument extends Document {
  _rev?: string;
  _deleted?: boolean;
}

export class CouchDBSyncAdapter {
  private config: CouchDBConfig;
  private db: Database;
  private lastSeq: string = '0';
  private changesFeed: EventSource | null = null;

  constructor(config: CouchDBConfig, db: Database) {
    this.config = config;
    this.db = db;
  }

  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };

    if (this.config.username && this.config.password) {
      const credentials = btoa(`${this.config.username}:${this.config.password}`);
      headers['Authorization'] = `Basic ${credentials}`;
    } else if (this.config.apikey) {
      headers['Authorization'] = `Bearer ${this.config.apikey}`;
    }

    return headers;
  }

  async sync(): Promise<{ uploaded: number; downloaded: number }> {
    const uploaded = await this.pushChanges();
    const downloaded = await this.pullChanges();
    return { uploaded, downloaded };
  }

  async pushChanges(): Promise<number> {
    const response = await fetch(
      `${this.config.url}/${this.config.database}/_changes?since=${this.lastSeq}`,
      { headers: this.getAuthHeaders() }
    );

    const data = await response.json();
    let pushed = 0;

    for (const change of data.results || []) {
      if (change.deleted) continue;

      const doc = await this.getDoc(change.id);
      if (doc) {
        await this.db.collection(this.config.database).insert(doc);
        pushed++;
      }
    }

    return pushed;
  }

  async pullChanges(): Promise<number> {
    const localCollections = await this.getLocalDocuments();
    let pulled = 0;

    for (const [collectionName, localDocs] of Object.entries(localCollections)) {
      for (const localDoc of localDocs) {
        const remoteDoc = await this.getDoc(localDoc.id as string);
        
        if (!remoteDoc) {
          await this.createDoc(collectionName, localDoc);
          pulled++;
        } else {
          const localRev = (localDoc as any)._rev || 0;
          const remoteRev = (remoteDoc as any)._rev || 0;
          
          if (remoteRev > localRev) {
            await this.db.collection(collectionName).insert(remoteDoc);
            pulled++;
          }
        }
      }
    }

    return pulled;
  }

  async getDoc(id: string): Promise<CouchDBDocument | null> {
    try {
      const response = await fetch(
        `${this.config.url}/${this.config.database}/${encodeURIComponent(id)}`,
        { headers: this.getAuthHeaders() }
      );

      if (!response.ok) return null;
      return await response.json();
    } catch {
      return null;
    }
  }

  async createDoc(collection: string, doc: Document): Promise<string> {
    const { id, ...rest } = doc;
    const couchDoc = { ...rest };

    const response = await fetch(
      `${this.config.url}/${this.config.database}/${id}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(couchDoc)
      }
    );

    const result = await response.json();
    return result.rev;
  }

  async updateDoc(collection: string, doc: Document): Promise<string> {
    const existing = await this.getDoc(doc.id as string);
    const { id, ...rest } = doc;

    const couchDoc = {
      ...rest,
      _rev: existing?._rev
    };

    const response = await fetch(
      `${this.config.url}/${this.config.database}/${id}`,
      {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(couchDoc)
      }
    );

    const result = await response.json();
    return result.rev;
  }

  async deleteDoc(id: string): Promise<void> {
    const existing = await this.getDoc(id);
    if (!existing) return;

    await fetch(
      `${this.config.url}/${this.config.database}/${encodeURIComponent(id)}?rev=${existing._rev}`,
      {
        method: 'DELETE',
        headers: this.getAuthHeaders() }
    );
  }

  async watchChanges(onChange: (change: AdapterChange) => void): Promise<void> {
    const url = `${this.config.url}/${this.config.database}/_changes?feed=eventsource&since=${this.lastSeq}`;
    
    this.changesFeed = new EventSource(url, {
      headers: this.getAuthHeaders() as any
    });

    this.changesFeed.onmessage = async (event) => {
      const change = JSON.parse(event.data);
      this.lastSeq = change.seq;

      if (change.deleted) {
        onChange({ type: 'delete', id: change.id });
      } else {
        const doc = await this.getDoc(change.id);
        if (doc) {
          onChange({ type: 'insert', doc });
        }
      }
    };
  }

  stopWatching(): void {
    this.changesFeed?.close();
    this.changesFeed = null;
  }

  private async getLocalDocuments(): Promise<Record<string, Document[]>> {
    const collections: Record<string, Document[]> = {};
    
    for (const collection of this.db.getCollectionNames()) {
      const docs = await this.db.collection(collection).find({});
      if (docs.length > 0) {
        collections[collection] = docs;
      }
    }
    
    return collections;
  }
}

export function createCouchDBSyncAdapter(
  config: CouchDBConfig,
  db: Database
): CouchDBSyncAdapter {
  return new CouchDBSyncAdapter(config, db);
}