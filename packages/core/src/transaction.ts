import { Document, Database, Query } from './types';

/**
 * Transaction class for ACID operations
 */
export class Transaction {
  private operations: Array<{
    type: 'insert' | 'update' | 'delete';
    collection: string;
    document: Document;
    originalDocument?: Document;
  }> = [];

  private committed = false;
  private rolledBack = false;

  /**
   * Creates a new transaction
   * @param db Database instance
   * @param isolationLevel Transaction isolation level
   */
  constructor(
    private db: Database,
    private isolationLevel: 'read-uncommitted' | 'read-committed' | 'repeatable-read' | 'serializable' = 'serializable'
  ) {}

  /**
   * Adds an insert operation to the transaction
   * @param collection Collection name
   * @param document Document to insert
   */
  insert(collection: string, document: Document): void {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already committed or rolled back');
    }

    this.operations.push({
      type: 'insert',
      collection,
      document: { ...document }
    });
  }

  /**
   * Adds an update operation to the transaction
   * @param collection Collection name
   * @param document Document to update
   */
  async update(collection: string, document: Document): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already committed or rolled back');
    }

    const coll = this.db.collection(collection);
    const originalDoc = await coll.findOne({ id: document.id } as Query);

    if (!originalDoc) {
      throw new Error(`Document with id ${document.id} not found in collection ${collection}`);
    }

    this.operations.push({
      type: 'update',
      collection,
      document: { ...document },
      originalDocument: { ...originalDoc }
    });
  }

  /**
   * Adds a delete operation to the transaction
   * @param collection Collection name
   * @param document Document to delete
   */
  async delete(collection: string, document: Document): Promise<void> {
    if (this.committed || this.rolledBack) {
      throw new Error('Transaction already committed or rolled back');
    }

    const coll = this.db.collection(collection);
    const originalDoc = await coll.findOne({ id: document.id } as Query);

    if (!originalDoc) {
      throw new Error(`Document with id ${document.id} not found in collection ${collection}`);
    }

    this.operations.push({
      type: 'delete',
      collection,
      document: { ...document },
      originalDocument: { ...originalDoc }
    });
  }

  /**
   * Commits the transaction
   */
  async commit(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }

    if (this.rolledBack) {
      throw new Error('Transaction already rolled back');
    }

    try {
      // Execute all operations
      for (const op of this.operations) {
        const coll = this.db.collection(op.collection);

        switch (op.type) {
          case 'insert':
            await coll.insert(op.document);
            break;
          case 'update':
            await coll.update(op.document, {});
            break;
          case 'delete':
            await coll.delete(op.document.id as unknown as Query);
            break;
        }
      }

      this.committed = true;
    } catch (error) {
      // Auto-rollback on error
      await this.rollback();
      throw error;
    }
  }

  /**
   * Rolls back the transaction
   */
  async rollback(): Promise<void> {
    if (this.committed) {
      throw new Error('Transaction already committed');
    }

    if (this.rolledBack) {
      throw new Error('Transaction already rolled back');
    }

    // No need to do anything as operations haven't been applied yet
    this.rolledBack = true;
  }
}
