import { MongoClient, Db, Collection as MongoCollection, Filter as MongoFilter, UpdateFilter, Document as MongoDocument } from 'mongodb';
import { Adapter, Document } from '@nebula-db/core';

export interface MongoDBOptions {
  uri: string;
  database: string;
  collection?: string;
}

export class MongoDBAdapter implements Adapter {
  private client: MongoClient;
  private db: Db | null = null;
  private options: MongoDBOptions;

  constructor(options: MongoDBOptions) {
    this.options = options;
    this.client = new MongoClient(options.uri);
  }

  async connect(): Promise<void> {
    if (!this.db) {
      await this.client.connect();
      this.db = this.client.db(this.options.database);
    }
  }

  private getCollection(): MongoCollection<MongoDocument> {
    if (!this.db) throw new Error('Not connected');
    return this.db.collection(this.options.collection || 'nebula_documents');
  }

  async load(): Promise<Record<string, Document[]>> {
    await this.connect();
    const collections: Record<string, Document[]> = {};

    const collectionNames = await this.db!.listCollections().toArray();

    for (const collInfo of collectionNames) {
      const name = collInfo.name;
      if (name.startsWith('system_')) continue;

      const docs = await this.getCollection().find({}).toArray();
      if (docs.length > 0) {
        collections[name] = docs.map((doc: any) => ({
          id: doc._id?.toString() || doc.id,
          ...doc
        }));
      }
    }

    return collections;
  }

  async save(data: Record<string, Document[]>): Promise<void> {
    await this.connect();

    for (const [collectionName, docs] of Object.entries(data)) {
      const coll = this.db!.collection(collectionName);

      await coll.deleteMany({});

      if (docs.length > 0) {
        const toInsert = docs.map((doc) => {
          const { id, ...rest } = doc;
          return { ...rest, _id: id };
        });

        await coll.insertMany(toInsert);
      }
    }
  }

  async close(): Promise<void> {
    await this.client.close();
    this.db = null;
  }

  async query<T = any>(filter: MongoFilter<MongoDocument>): Promise<T[]> {
    await this.connect();
    return await this.getCollection().find(filter).toArray() as T[];
  }

  async insertOne(doc: MongoDocument): Promise<void> {
    await this.connect();
    await this.getCollection().insertOne(doc);
  }

  async updateOne(
    filter: MongoFilter<MongoDocument>,
    update: UpdateFilter<MongoDocument>
  ): Promise<void> {
    await this.connect();
    await this.getCollection().updateOne(filter, update);
  }

  async deleteOne(filter: MongoFilter<MongoDocument>): Promise<void> {
    await this.connect();
    await this.getCollection().deleteOne(filter);
  }
}

export function createMongoDBAdapter(options: MongoDBOptions): MongoDBAdapter {
  return new MongoDBAdapter(options);
}