import { Plugin, Document, Query, UpdateOperation, IDatabase } from '@nebula/core';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Sync plugin options
 */
export interface SyncPluginOptions {
  /**
   * Server URL
   */
  serverUrl: string;
  
  /**
   * Authentication token
   */
  authToken?: string;
  
  /**
   * Collections to sync
   */
  collections?: string[];
  
  /**
   * Sync interval in milliseconds
   */
  syncInterval?: number;
  
  /**
   * Whether to sync automatically
   */
  autoSync?: boolean;
  
  /**
   * Whether to use WebSockets for real-time sync
   */
  useWebSockets?: boolean;
  
  /**
   * Conflict resolution strategy
   */
  conflictResolution?: 'server-wins' | 'client-wins' | 'last-write-wins';
  
  /**
   * Retry options
   */
  retry?: {
    /**
     * Maximum number of retries
     */
    maxRetries?: number;
    
    /**
     * Retry delay in milliseconds
     */
    retryDelay?: number;
    
    /**
     * Whether to use exponential backoff
     */
    useExponentialBackoff?: boolean;
  };
  
  /**
   * Logging options
   */
  logging?: {
    /**
     * Whether to enable logging
     */
    enabled?: boolean;
    
    /**
     * Log level
     */
    level?: 'debug' | 'info' | 'warn' | 'error';
  };
}

/**
 * Sync event
 */
export interface SyncEvent {
  /**
   * Event ID
   */
  id: string;
  
  /**
   * Event type
   */
  type: 'insert' | 'update' | 'delete';
  
  /**
   * Collection name
   */
  collection: string;
  
  /**
   * Document ID
   */
  documentId: string;
  
  /**
   * Document data (for insert/update)
   */
  data?: Document;
  
  /**
   * Query (for update/delete)
   */
  query?: Query;
  
  /**
   * Update operation (for update)
   */
  update?: UpdateOperation;
  
  /**
   * Timestamp
   */
  timestamp: number;
  
  /**
   * Client ID
   */
  clientId: string;
}

/**
 * Sync status
 */
export interface SyncStatus {
  /**
   * Whether sync is enabled
   */
  enabled: boolean;
  
  /**
   * Whether sync is connected
   */
  connected: boolean;
  
  /**
   * Last sync time
   */
  lastSyncTime: number | null;
  
  /**
   * Pending events count
   */
  pendingEvents: number;
  
  /**
   * Sync error
   */
  error: Error | null;
}

/**
 * Create a sync plugin
 */
export function createSyncPlugin(options: SyncPluginOptions): Plugin {
  // Default options
  const {
    serverUrl,
    authToken,
    collections = [],
    syncInterval = 30000,
    autoSync = true,
    useWebSockets = true,
    conflictResolution = 'last-write-wins',
    retry = {
      maxRetries: 5,
      retryDelay: 1000,
      useExponentialBackoff: true
    },
    logging = {
      enabled: true,
      level: 'info'
    }
  } = options;
  
  // Generate client ID
  const clientId = uuidv4();
  
  // Socket.io connection
  let socket: Socket | null = null;
  
  // Database reference
  let db: IDatabase | null = null;
  
  // Sync state
  let syncEnabled = autoSync;
  let lastSyncTime: number | null = null;
  let syncError: Error | null = null;
  let pendingEvents: SyncEvent[] = [];
  let syncInterval_id: any = null;
  
  // Collection subscriptions
  const subscriptions: (() => void)[] = [];
  
  /**
   * Log message
   */
  function log(level: 'debug' | 'info' | 'warn' | 'error', message: string, data?: any) {
    if (!logging.enabled) return;
    
    const levels = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    if (levels[level] >= levels[logging.level]) {
      const logMessage = `[NebulaSync] ${message}`;
      
      switch (level) {
        case 'debug':
          console.debug(logMessage, data);
          break;
        case 'info':
          console.info(logMessage, data);
          break;
        case 'warn':
          console.warn(logMessage, data);
          break;
        case 'error':
          console.error(logMessage, data);
          break;
      }
    }
  }
  
  /**
   * Connect to sync server
   */
  function connect() {
    if (socket) return;
    
    log('info', 'Connecting to sync server...');
    
    socket = io(serverUrl, {
      auth: authToken ? { token: authToken } : undefined,
      reconnection: true,
      reconnectionAttempts: retry.maxRetries,
      reconnectionDelay: retry.retryDelay,
      reconnectionDelayMax: retry.useExponentialBackoff ? retry.retryDelay * 10 : retry.retryDelay
    });
    
    // Handle connection events
    socket.on('connect', () => {
      log('info', 'Connected to sync server');
      
      // Send client info
      socket.emit('client:info', {
        clientId,
        collections
      });
      
      // Sync pending events
      syncPendingEvents();
    });
    
    socket.on('disconnect', () => {
      log('warn', 'Disconnected from sync server');
    });
    
    socket.on('error', (err) => {
      log('error', 'Socket error', err);
      syncError = new Error(err.message || 'Socket error');
    });
    
    // Handle sync events
    socket.on('server:sync', async (events: SyncEvent[]) => {
      log('debug', `Received ${events.length} events from server`);
      
      for (const event of events) {
        await processServerEvent(event);
      }
    });
  }
  
  /**
   * Disconnect from sync server
   */
  function disconnect() {
    if (!socket) return;
    
    log('info', 'Disconnecting from sync server...');
    
    socket.disconnect();
    socket = null;
  }
  
  /**
   * Start sync interval
   */
  function startSyncInterval() {
    if (syncInterval_id) return;
    
    log('debug', `Starting sync interval (${syncInterval}ms)`);
    
    syncInterval_id = setInterval(() => {
      if (syncEnabled) {
        syncPendingEvents();
      }
    }, syncInterval);
  }
  
  /**
   * Stop sync interval
   */
  function stopSyncInterval() {
    if (!syncInterval_id) return;
    
    log('debug', 'Stopping sync interval');
    
    clearInterval(syncInterval_id);
    syncInterval_id = null;
  }
  
  /**
   * Sync pending events
   */
  async function syncPendingEvents() {
    if (!socket || !socket.connected || pendingEvents.length === 0) return;
    
    log('debug', `Syncing ${pendingEvents.length} pending events`);
    
    try {
      // Send events to server
      socket.emit('client:sync', pendingEvents, (response: any) => {
        if (response.success) {
          log('debug', `Successfully synced ${pendingEvents.length} events`);
          
          // Clear pending events
          pendingEvents = [];
          
          // Update last sync time
          lastSyncTime = Date.now();
          syncError = null;
        } else {
          log('error', 'Failed to sync events', response.error);
          syncError = new Error(response.error || 'Failed to sync events');
        }
      });
    } catch (error) {
      log('error', 'Error syncing events', error);
      syncError = error instanceof Error ? error : new Error('Unknown error');
    }
  }
  
  /**
   * Process server event
   */
  async function processServerEvent(event: SyncEvent) {
    if (!db) return;
    
    // Skip events from this client
    if (event.clientId === clientId) return;
    
    log('debug', `Processing server event: ${event.type} ${event.collection} ${event.documentId}`);
    
    try {
      const collection = db.collection(event.collection);
      
      switch (event.type) {
        case 'insert':
          if (event.data) {
            await collection.insert(event.data);
          }
          break;
          
        case 'update':
          if (event.query && event.update) {
            await collection.update(event.query, event.update);
          }
          break;
          
        case 'delete':
          if (event.query) {
            await collection.delete(event.query);
          }
          break;
      }
    } catch (error) {
      log('error', `Error processing server event: ${event.type} ${event.collection} ${event.documentId}`, error);
    }
  }
  
  /**
   * Add event to pending events
   */
  function addPendingEvent(event: SyncEvent) {
    pendingEvents.push(event);
    
    // Sync immediately if connected
    if (syncEnabled && socket && socket.connected) {
      syncPendingEvents();
    }
  }
  
  /**
   * Subscribe to collection changes
   */
  function subscribeToCollection(collectionName: string) {
    if (!db) return;
    
    const collection = db.collection(collectionName);
    
    // Subscribe to all documents
    const unsubscribe = collection.subscribe({}, (docs) => {
      // This is just to keep the subscription active
      log('debug', `Collection ${collectionName} changed: ${docs.length} documents`);
    });
    
    subscriptions.push(unsubscribe);
  }
  
  return {
    name: 'sync',
    
    onInit: (database) => {
      db = database;
      
      log('info', 'Initializing sync plugin');
      
      // Connect to server if WebSockets are enabled
      if (useWebSockets) {
        connect();
      }
      
      // Start sync interval if auto-sync is enabled
      if (autoSync) {
        startSyncInterval();
      }
      
      // Subscribe to collections
      for (const collectionName of collections) {
        subscribeToCollection(collectionName);
      }
    },
    
    onBeforeInsert: (collectionName, doc) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return doc;
      }
      
      log('debug', `Before insert: ${collectionName} ${doc.id}`);
      
      return doc;
    },
    
    onAfterInsert: (collectionName, doc) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return;
      }
      
      log('debug', `After insert: ${collectionName} ${doc.id}`);
      
      // Add event to pending events
      addPendingEvent({
        id: uuidv4(),
        type: 'insert',
        collection: collectionName,
        documentId: doc.id,
        data: doc,
        timestamp: Date.now(),
        clientId
      });
    },
    
    onBeforeUpdate: (collectionName, query, update) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return update;
      }
      
      log('debug', `Before update: ${collectionName}`, { query, update });
      
      return update;
    },
    
    onAfterUpdate: (collectionName, query, update, affectedCount) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return;
      }
      
      log('debug', `After update: ${collectionName} (${affectedCount} affected)`, { query, update });
      
      // Add event to pending events
      addPendingEvent({
        id: uuidv4(),
        type: 'update',
        collection: collectionName,
        documentId: 'query-based', // This is a query-based update
        query,
        update,
        timestamp: Date.now(),
        clientId
      });
    },
    
    onBeforeDelete: (collectionName, query) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return query;
      }
      
      log('debug', `Before delete: ${collectionName}`, query);
      
      return query;
    },
    
    onAfterDelete: (collectionName, query, deletedCount) => {
      // Check if collection should be synced
      if (!collections.includes(collectionName)) {
        return;
      }
      
      log('debug', `After delete: ${collectionName} (${deletedCount} deleted)`, query);
      
      // Add event to pending events
      addPendingEvent({
        id: uuidv4(),
        type: 'delete',
        collection: collectionName,
        documentId: 'query-based', // This is a query-based delete
        query,
        timestamp: Date.now(),
        clientId
      });
    },
    
    onDestroy: () => {
      log('info', 'Destroying sync plugin');
      
      // Disconnect from server
      disconnect();
      
      // Stop sync interval
      stopSyncInterval();
      
      // Unsubscribe from collections
      for (const unsubscribe of subscriptions) {
        unsubscribe();
      }
    },
    
    // Public API
    api: {
      /**
       * Get sync status
       */
      getStatus: (): SyncStatus => {
        return {
          enabled: syncEnabled,
          connected: !!(socket && socket.connected),
          lastSyncTime,
          pendingEvents: pendingEvents.length,
          error: syncError
        };
      },
      
      /**
       * Enable sync
       */
      enable: () => {
        syncEnabled = true;
        
        // Connect to server if WebSockets are enabled
        if (useWebSockets) {
          connect();
        }
        
        // Start sync interval
        startSyncInterval();
        
        log('info', 'Sync enabled');
      },
      
      /**
       * Disable sync
       */
      disable: () => {
        syncEnabled = false;
        
        // Disconnect from server
        disconnect();
        
        // Stop sync interval
        stopSyncInterval();
        
        log('info', 'Sync disabled');
      },
      
      /**
       * Sync now
       */
      syncNow: async () => {
        log('info', 'Manual sync triggered');
        
        // Connect to server if not connected
        if (useWebSockets && (!socket || !socket.connected)) {
          connect();
        }
        
        // Sync pending events
        await syncPendingEvents();
        
        return {
          success: !syncError,
          error: syncError,
          syncedEvents: pendingEvents.length
        };
      },
      
      /**
       * Clear pending events
       */
      clearPendingEvents: () => {
        const count = pendingEvents.length;
        pendingEvents = [];
        
        log('info', `Cleared ${count} pending events`);
        
        return count;
      },
      
      /**
       * Add collection to sync
       */
      addCollection: (collectionName: string) => {
        if (collections.includes(collectionName)) {
          return false;
        }
        
        collections.push(collectionName);
        subscribeToCollection(collectionName);
        
        log('info', `Added collection to sync: ${collectionName}`);
        
        return true;
      },
      
      /**
       * Remove collection from sync
       */
      removeCollection: (collectionName: string) => {
        const index = collections.indexOf(collectionName);
        
        if (index === -1) {
          return false;
        }
        
        collections.splice(index, 1);
        
        log('info', `Removed collection from sync: ${collectionName}`);
        
        return true;
      },
      
      /**
       * Get synced collections
       */
      getCollections: () => {
        return [...collections];
      }
    }
  };
}
