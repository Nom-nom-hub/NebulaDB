import { IDatabase, Document, Query, UpdateOperation } from '@nebula/core';
import { io, Socket } from 'socket.io-client';
import { ConnectionOptions, EventType, Event, DatabaseSnapshot } from './types';

/**
 * Create a connection to the DevTools server
 */
export function createDevtoolsConnection(db: IDatabase, options: ConnectionOptions) {
  const { port } = options;
  
  // Connect to DevTools server
  const socket = io(`http://localhost:${port}`);
  
  // Track original methods to restore on close
  const originalMethods: Record<string, any> = {};
  
  // Initialize connection
  socket.on('connect', () => {
    console.log('Connected to NebulaDB DevTools');
    
    // Send initial database state
    sendSnapshot();
  });
  
  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('Disconnected from NebulaDB DevTools');
  });
  
  // Handle commands from DevTools
  socket.on('command', handleCommand);
  
  // Patch database methods to track events
  patchDatabase();
  
  /**
   * Send database snapshot to DevTools
   */
  async function sendSnapshot() {
    try {
      const collections: Record<string, Document[]> = {};
      
      // Get all collections
      for (const [name, collection] of db.collections.entries()) {
        if (typeof collection.find === 'function') {
          collections[name] = await collection.find();
        }
      }
      
      // Create snapshot
      const snapshot: DatabaseSnapshot = {
        collections,
        timestamp: Date.now()
      };
      
      // Send snapshot to DevTools
      socket.emit('snapshot', snapshot);
      
      // Send init event
      sendEvent({
        type: EventType.INIT,
        timestamp: Date.now(),
        collections: Object.keys(collections)
      });
    } catch (error) {
      console.error('Failed to send database snapshot:', error);
    }
  }
  
  /**
   * Send event to DevTools
   */
  function sendEvent(event: Event) {
    socket.emit('event', event);
  }
  
  /**
   * Handle command from DevTools
   */
  async function handleCommand(command: string, data: any) {
    try {
      switch (command) {
        case 'get_snapshot':
          await sendSnapshot();
          break;
          
        case 'execute_query':
          if (data.collection && data.query) {
            const collection = db.collection(data.collection);
            const results = await collection.find(data.query);
            socket.emit('query_results', {
              collection: data.collection,
              query: data.query,
              results
            });
          }
          break;
          
        case 'execute_update':
          if (data.collection && data.query && data.update) {
            const collection = db.collection(data.collection);
            const count = await collection.update(data.query, data.update);
            socket.emit('update_results', {
              collection: data.collection,
              query: data.query,
              update: data.update,
              count
            });
          }
          break;
          
        case 'execute_delete':
          if (data.collection && data.query) {
            const collection = db.collection(data.collection);
            const count = await collection.delete(data.query);
            socket.emit('delete_results', {
              collection: data.collection,
              query: data.query,
              count
            });
          }
          break;
          
        case 'save_database':
          await db.save();
          socket.emit('save_results', { success: true });
          break;
          
        default:
          console.warn(`Unknown command: ${command}`);
      }
    } catch (error) {
      console.error(`Failed to execute command ${command}:`, error);
      socket.emit('command_error', {
        command,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  /**
   * Patch database methods to track events
   */
  function patchDatabase() {
    // Patch collection method
    originalMethods.collection = db.collection;
    db.collection = function(name: string, ...args: any[]) {
      const collection = originalMethods.collection.call(db, name, ...args);
      
      sendEvent({
        type: EventType.COLLECTION_CREATE,
        timestamp: Date.now(),
        collection: name
      });
      
      // Patch collection methods
      patchCollection(collection);
      
      return collection;
    };
    
    // Patch save method
    if (db.save) {
      originalMethods.save = db.save;
      db.save = async function(...args: any[]) {
        const result = await originalMethods.save.apply(db, args);
        
        sendEvent({
          type: EventType.SAVE,
          timestamp: Date.now()
        });
        
        return result;
      };
    }
    
    // Patch load method
    if (db.load) {
      originalMethods.load = db.load;
      db.load = async function(...args: any[]) {
        const result = await originalMethods.load.apply(db, args);
        
        // Get document counts
        const documentCounts: Record<string, number> = {};
        for (const [name, collection] of db.collections.entries()) {
          if (typeof collection.find === 'function') {
            const docs = await collection.find();
            documentCounts[name] = docs.length;
          }
        }
        
        sendEvent({
          type: EventType.LOAD,
          timestamp: Date.now(),
          collections: Array.from(db.collections.keys()),
          documentCounts
        });
        
        return result;
      };
    }
  }
  
  /**
   * Patch collection methods to track events
   */
  function patchCollection(collection: any) {
    // Store original methods
    const originalInsert = collection.insert;
    const originalUpdate = collection.update;
    const originalDelete = collection.delete;
    const originalFind = collection.find;
    const originalFindOne = collection.findOne;
    
    // Patch insert method
    collection.insert = async function(doc: Document, ...args: any[]) {
      try {
        const result = await originalInsert.call(collection, doc, ...args);
        
        sendEvent({
          type: EventType.INSERT,
          timestamp: Date.now(),
          collection: collection.name,
          document: result
        });
        
        return result;
      } catch (error) {
        sendEvent({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          context: {
            operation: 'insert',
            collection: collection.name,
            document: doc
          }
        });
        
        throw error;
      }
    };
    
    // Patch update method
    collection.update = async function(query: Query, update: UpdateOperation, ...args: any[]) {
      try {
        const result = await originalUpdate.call(collection, query, update, ...args);
        
        sendEvent({
          type: EventType.UPDATE,
          timestamp: Date.now(),
          collection: collection.name,
          query,
          update,
          affectedCount: result
        });
        
        return result;
      } catch (error) {
        sendEvent({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          context: {
            operation: 'update',
            collection: collection.name,
            query,
            update
          }
        });
        
        throw error;
      }
    };
    
    // Patch delete method
    collection.delete = async function(query: Query, ...args: any[]) {
      try {
        const result = await originalDelete.call(collection, query, ...args);
        
        sendEvent({
          type: EventType.DELETE,
          timestamp: Date.now(),
          collection: collection.name,
          query,
          deletedCount: result
        });
        
        return result;
      } catch (error) {
        sendEvent({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          context: {
            operation: 'delete',
            collection: collection.name,
            query
          }
        });
        
        throw error;
      }
    };
    
    // Patch find method
    collection.find = async function(query?: Query, ...args: any[]) {
      try {
        const results = await originalFind.call(collection, query, ...args);
        
        sendEvent({
          type: EventType.QUERY,
          timestamp: Date.now(),
          collection: collection.name,
          query: query || {},
          resultCount: results.length
        });
        
        return results;
      } catch (error) {
        sendEvent({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          context: {
            operation: 'find',
            collection: collection.name,
            query
          }
        });
        
        throw error;
      }
    };
    
    // Patch findOne method
    collection.findOne = async function(query: Query, ...args: any[]) {
      try {
        const result = await originalFindOne.call(collection, query, ...args);
        
        sendEvent({
          type: EventType.QUERY,
          timestamp: Date.now(),
          collection: collection.name,
          query,
          resultCount: result ? 1 : 0
        });
        
        return result;
      } catch (error) {
        sendEvent({
          type: EventType.ERROR,
          timestamp: Date.now(),
          error: error instanceof Error ? error.message : String(error),
          context: {
            operation: 'findOne',
            collection: collection.name,
            query
          }
        });
        
        throw error;
      }
    };
  }
  
  /**
   * Close the connection and restore original methods
   */
  function close() {
    // Disconnect from DevTools server
    socket.disconnect();
    
    // Restore original methods
    for (const [key, method] of Object.entries(originalMethods)) {
      if (db[key]) {
        db[key] = method;
      }
    }
  }
  
  return {
    socket,
    sendSnapshot,
    close
  };
}
