import { Adapter, Document } from '@nebula/core';
import Database from 'better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

/**
 * SQLite adapter for NebulaDB
 * This adapter persists data to a SQLite database
 */
export class SQLiteAdapter implements Adapter {
  private db: Database.Database;
  private initialized: boolean = false;

  /**
   * Create a new SQLiteAdapter
   * @param dbPath The path to the SQLite database file
   * @param options Options for better-sqlite3
   */
  constructor(dbPath: string, options: Database.Options = {}) {
    // Ensure directory exists
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    this.db = new Database(dbPath, options);
  }

  /**
   * Initialize the database schema
   */
  private initialize(): void {
    if (this.initialized) return;

    // Create collections table to track all collections
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS collections (
        name TEXT PRIMARY KEY
      )
    `);

    // Create documents table to store all documents
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS documents (
        id TEXT NOT NULL,
        collection TEXT NOT NULL,
        data TEXT NOT NULL,
        PRIMARY KEY (id, collection),
        FOREIGN KEY (collection) REFERENCES collections(name)
      )
    `);

    // Create indexes for faster queries
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection)
    `);

    this.initialized = true;
  }

  /**
   * Load data from SQLite
   */
  async load(): Promise<Record<string, Document[]>> {
    this.initialize();

    try {
      // Begin transaction
      const result: Record<string, Document[]> = {};

      // Get all collections
      const collections = this.db.prepare('SELECT name FROM collections').all() as { name: string }[];

      // For each collection, get all documents
      for (const { name } of collections) {
        const documents = this.db.prepare('SELECT id, data FROM documents WHERE collection = ?').all(name) as { id: string, data: string }[];
        result[name] = documents.map(doc => {
          try {
            const parsedDoc = JSON.parse(doc.data);
            // Ensure the id is set correctly
            parsedDoc.id = doc.id;
            return parsedDoc;
          } catch (e) {
            console.error(`Failed to parse document ${doc.id}:`, e);
            return { id: doc.id };
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Failed to load data from SQLite:', error);
      return {};
    }
  }

  /**
   * Save data to SQLite
   */
  async save(data: Record<string, Document[]>): Promise<void> {
    this.initialize();

    try {
      // Begin transaction
      const transaction = this.db.transaction((collections: Record<string, Document[]>) => {
        // Clear existing data
        this.db.prepare('DELETE FROM documents').run();
        this.db.prepare('DELETE FROM collections').run();

        // Insert collections and documents
        const insertCollection = this.db.prepare('INSERT INTO collections (name) VALUES (?)');
        const insertDocument = this.db.prepare('INSERT INTO documents (id, collection, data) VALUES (?, ?, ?)');

        for (const [collectionName, documents] of Object.entries(collections)) {
          if (documents && documents.length > 0) {
            // Insert collection
            insertCollection.run(collectionName);

            // Insert documents
            for (const doc of documents) {
              if (doc && doc.id) {
                // Make a copy of the document to avoid modifying the original
                const docCopy = { ...doc };
                insertDocument.run(docCopy.id, collectionName, JSON.stringify(docCopy));
              }
            }
          }
        }
      });

      // Execute transaction
      transaction(data);
    } catch (error) {
      console.error('Failed to save data to SQLite:', error);
      throw error;
    }
  }

  /**
   * Close the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
    }
  }
}
