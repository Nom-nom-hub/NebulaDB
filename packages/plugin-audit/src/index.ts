import type { Plugin, Document, PluginHookContext } from '@nebula-db/core';

export type AuditAction = 'create' | 'read' | 'update' | 'delete' | 'bulk';

export interface AuditEntry {
  id: string;
  timestamp: number;
  collection: string;
  action: AuditAction;
  documentId?: string;
  document?: Document;
  previousDocument?: Document;
  userId?: string;
  metadata?: Record<string, any>;
}

export interface AuditOptions {
  collectionName?: string;
  trackReads?: boolean;
  maxEntries?: number;
  onAudit?: (entry: AuditEntry) => void;
}

interface AuditState {
  entries: AuditEntry[];
  options: Required<AuditOptions>;
  bypassAudit: boolean;
}

/**
 * Audit Logging Plugin for NebulaDB
 * Tracks all database operations for compliance and debugging
 * 
 * @example
 * ```typescript
 * import { createAuditPlugin } from '@nebula-db/plugin-audit';
 * 
 * const audit = createAuditPlugin({ 
 *   collectionName: 'audit_logs',
 *   trackReads: false 
 * });
 * 
 * const db = createDb({ plugins: [audit] });
 * ```
 */
export function createAuditPlugin(options: AuditOptions = {}): Plugin {
  const state: AuditState = {
    entries: [],
    options: {
      collectionName: options.collectionName || '_audit',
      trackReads: options.trackReads ?? false,
      maxEntries: options.maxEntries || 10000,
      onAudit: options.onAudit || (() => {})
    },
    bypassAudit: false
  };

  const generateId = () => `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const addEntry = (entry: Omit<AuditEntry, 'id' | 'timestamp'>) => {
    const fullEntry: AuditEntry = {
      ...entry,
      id: generateId(),
      timestamp: Date.now()
    };
    
    state.entries.push(fullEntry);
    
    // Trim old entries if max reached
    if (state.entries.length > state.options.maxEntries) {
      state.entries = state.entries.slice(-state.options.maxEntries);
    }
    
    state.options.onAudit(fullEntry);
  };

  return {
    name: 'audit',
    
    onInsert: async ({ collection, documents }: PluginHookContext) => {
      if (state.bypassAudit) return;
      
      for (const doc of (documents || [])) {
        addEntry({
          collection: collection.name,
          action: 'create',
          documentId: doc.id,
          document: doc
        });
      }
    },

    onUpdate: async ({ collection, filter, update }: PluginHookContext) => {
      if (state.bypassAudit) return;
      
      // Use bypass flag to prevent recursion when finding previous docs
      state.bypassAudit = true;
      const docs = await collection.find(filter || {});
      state.bypassAudit = false;
      
      for (const doc of docs) {
        addEntry({
          collection: collection.name,
          action: 'update',
          documentId: doc.id,
          previousDocument: doc
        });
      }
    },

    onDelete: async ({ collection, filter }: PluginHookContext) => {
      if (state.bypassAudit) return;
      
      // Use bypass flag to prevent recursion when finding docs to delete
      state.bypassAudit = true;
      const docs = await collection.find(filter || {});
      state.bypassAudit = false;
      
      for (const doc of docs) {
        addEntry({
          collection: collection.name,
          action: 'delete',
          documentId: doc.id,
          document: doc
        });
      }
    },

    onBulk: async ({ collection, operations }: PluginHookContext) => {
      for (const op of (operations || [])) {
        addEntry({
          collection: collection.name,
          action: 'bulk',
          metadata: { operation: op.type }
        });
      }
    },

    // Optional: track reads if enabled
    ...(state.options.trackReads ? {
      onFind: async ({ collection }: PluginHookContext) => {
        addEntry({
          collection: collection.name,
          action: 'read'
        });
      }
    } : {}),

    // API exposed to users
    getApi: () => ({
      getEntries: (filter?: Partial<AuditEntry>) => {
        if (!filter) return state.entries;
        
        return state.entries.filter(entry => {
          if (filter.collection && entry.collection !== filter.collection) return false;
          if (filter.action && entry.action !== filter.action) return false;
          if (filter.documentId && entry.documentId !== filter.documentId) return false;
          if (filter.userId && entry.userId !== filter.userId) return false;
          return true;
        });
      },

      getEntriesByCollection: (collection: string) => 
        state.entries.filter(e => e.collection === collection),

      getEntriesByAction: (action: AuditAction) =>
        state.entries.filter(e => e.action === action),

      getEntriesByUser: (userId: string) =>
        state.entries.filter(e => e.userId === userId),

      getEntriesInRange: (startTime: number, endTime: number) =>
        state.entries.filter(e => e.timestamp >= startTime && e.timestamp <= endTime),

      clear: () => {
        state.entries = [];
      },

      export: () => JSON.stringify(state.entries, null, 2),

      count: () => state.entries.length
    })
  };
}

/**
 * Get the audit API from a database instance
 */
export function getAuditApi(db: any): ReturnType<Exclude<ReturnType<typeof createAuditPlugin>['getApi'], undefined>> | null {
  const plugin = db.plugins?.find((p: any) => p.name === 'audit');
  return plugin?.getApi?.() || null;
}