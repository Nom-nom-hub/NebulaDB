import { Plugin, Document, IDatabase } from '@nebula/core';

/**
 * Options for the versioning plugin
 */
export interface VersioningPluginOptions {
  versionField?: string;
  timestampField?: string;
  historyCollectionSuffix?: string;
  maxVersions?: number;
}

/**
 * Create a versioning plugin for NebulaDB
 * This plugin adds version tracking to documents and maintains a history of changes
 */
export function createVersioningPlugin(options: VersioningPluginOptions = {}): Plugin {
  const {
    versionField = '_version',
    timestampField = '_updatedAt',
    historyCollectionSuffix = '_history',
    maxVersions = 0 // 0 means unlimited
  } = options;
  
  let db: IDatabase;
  
  return {
    name: 'versioning',
    
    onInit(database: IDatabase): void {
      db = database;
    },
    
    async onBeforeInsert(collection: string, doc: Document): Promise<Document> {
      // Add initial version and timestamp
      return {
        ...doc,
        [versionField]: 1,
        [timestampField]: new Date().toISOString()
      };
    },
    
    async onBeforeUpdate(collection: string, query: any, update: any): Promise<[any, any]> {
      // Find documents that will be updated
      const docsToUpdate = await db.collection(collection).find(query);
      
      if (docsToUpdate.length === 0) {
        return [query, update];
      }
      
      // Store the current versions in history
      const historyCollection = db.collection(`${collection}${historyCollectionSuffix}`);
      
      for (const doc of docsToUpdate) {
        await historyCollection.insert({
          ...doc,
          _originalId: doc.id,
          id: `${doc.id}_v${doc[versionField] || 1}`
        });
        
        // Prune history if maxVersions is set
        if (maxVersions > 0) {
          const history = await historyCollection.find({ _originalId: doc.id });
          if (history.length > maxVersions) {
            // Sort by version (descending) and delete oldest versions
            history.sort((a, b) => (b[versionField] || 0) - (a[versionField] || 0));
            for (let i = maxVersions; i < history.length; i++) {
              await historyCollection.delete({ id: history[i].id });
            }
          }
        }
      }
      
      // Modify the update operation to increment version and update timestamp
      const newUpdate = { ...update };
      
      if (!newUpdate.$set) {
        newUpdate.$set = {};
      }
      
      // Use $inc for version if it exists, otherwise set to next version
      if (!newUpdate.$inc) {
        newUpdate.$inc = {};
      }
      newUpdate.$inc[versionField] = 1;
      
      // Set the updated timestamp
      newUpdate.$set[timestampField] = new Date().toISOString();
      
      return [query, newUpdate];
    }
  };
}
