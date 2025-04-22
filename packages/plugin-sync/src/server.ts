import { Server as HttpServer } from 'http';
import { Server as SocketServer, Socket } from 'socket.io';
import { SyncEvent } from './index';

/**
 * Sync server options
 */
export interface SyncServerOptions {
  /**
   * HTTP server
   */
  httpServer?: HttpServer;
  
  /**
   * Socket.io server options
   */
  socketOptions?: any;
  
  /**
   * Authentication function
   */
  authenticate?: (socket: Socket, token: string) => Promise<boolean>;
  
  /**
   * Event storage
   */
  storage?: SyncStorage;
  
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
 * Sync storage interface
 */
export interface SyncStorage {
  /**
   * Save events
   */
  saveEvents(events: SyncEvent[]): Promise<void>;
  
  /**
   * Get events after timestamp
   */
  getEventsAfter(timestamp: number): Promise<SyncEvent[]>;
  
  /**
   * Get events for client
   */
  getEventsForClient(clientId: string, collections: string[]): Promise<SyncEvent[]>;
  
  /**
   * Clear events before timestamp
   */
  clearEventsBefore(timestamp: number): Promise<number>;
}

/**
 * In-memory sync storage
 */
export class MemorySyncStorage implements SyncStorage {
  private events: SyncEvent[] = [];
  
  /**
   * Save events
   */
  async saveEvents(events: SyncEvent[]): Promise<void> {
    this.events.push(...events);
  }
  
  /**
   * Get events after timestamp
   */
  async getEventsAfter(timestamp: number): Promise<SyncEvent[]> {
    return this.events.filter(event => event.timestamp > timestamp);
  }
  
  /**
   * Get events for client
   */
  async getEventsForClient(clientId: string, collections: string[]): Promise<SyncEvent[]> {
    return this.events.filter(event => 
      event.clientId !== clientId && 
      collections.includes(event.collection)
    );
  }
  
  /**
   * Clear events before timestamp
   */
  async clearEventsBefore(timestamp: number): Promise<number> {
    const initialCount = this.events.length;
    this.events = this.events.filter(event => event.timestamp >= timestamp);
    return initialCount - this.events.length;
  }
}

/**
 * Client information
 */
interface ClientInfo {
  /**
   * Client ID
   */
  clientId: string;
  
  /**
   * Collections to sync
   */
  collections: string[];
  
  /**
   * Last sync time
   */
  lastSyncTime: number;
}

/**
 * Create a sync server
 */
export function createSyncServer(options: SyncServerOptions = {}) {
  // Default options
  const {
    httpServer,
    socketOptions = {},
    authenticate,
    storage = new MemorySyncStorage(),
    logging = {
      enabled: true,
      level: 'info'
    }
  } = options;
  
  // Create Socket.io server
  const io = httpServer 
    ? new SocketServer(httpServer, socketOptions)
    : new SocketServer(socketOptions);
  
  // Client info map
  const clients = new Map<string, ClientInfo>();
  
  // Cleanup interval
  let cleanupInterval: any = null;
  
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
      const logMessage = `[NebulaSyncServer] ${message}`;
      
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
   * Start the server
   */
  function start() {
    log('info', 'Starting sync server');
    
    // Set up authentication middleware
    if (authenticate) {
      io.use(async (socket, next) => {
        try {
          const token = socket.handshake.auth.token;
          
          if (!token) {
            return next(new Error('Authentication token required'));
          }
          
          const authenticated = await authenticate(socket, token);
          
          if (authenticated) {
            next();
          } else {
            next(new Error('Authentication failed'));
          }
        } catch (error) {
          next(new Error('Authentication error'));
        }
      });
    }
    
    // Handle connections
    io.on('connection', handleConnection);
    
    // Start cleanup interval
    startCleanupInterval();
    
    log('info', 'Sync server started');
  }
  
  /**
   * Stop the server
   */
  function stop() {
    log('info', 'Stopping sync server');
    
    // Stop cleanup interval
    stopCleanupInterval();
    
    // Close all connections
    io.disconnectSockets();
    
    // Close server
    io.close();
    
    log('info', 'Sync server stopped');
  }
  
  /**
   * Handle client connection
   */
  function handleConnection(socket: Socket) {
    const socketId = socket.id;
    
    log('debug', `Client connected: ${socketId}`);
    
    // Handle client info
    socket.on('client:info', async (info: { clientId: string, collections: string[] }) => {
      const { clientId, collections } = info;
      
      log('debug', `Client info received: ${clientId}`, { collections });
      
      // Store client info
      clients.set(socketId, {
        clientId,
        collections,
        lastSyncTime: Date.now()
      });
      
      // Send existing events to client
      const events = await storage.getEventsForClient(clientId, collections);
      
      if (events.length > 0) {
        log('debug', `Sending ${events.length} events to client ${clientId}`);
        socket.emit('server:sync', events);
      }
    });
    
    // Handle client sync
    socket.on('client:sync', async (events: SyncEvent[], callback) => {
      const clientInfo = clients.get(socketId);
      
      if (!clientInfo) {
        callback({ success: false, error: 'Client not registered' });
        return;
      }
      
      log('debug', `Received ${events.length} events from client ${clientInfo.clientId}`);
      
      try {
        // Save events
        await storage.saveEvents(events);
        
        // Update last sync time
        clientInfo.lastSyncTime = Date.now();
        clients.set(socketId, clientInfo);
        
        // Broadcast events to other clients
        broadcastEvents(events, socketId);
        
        callback({ success: true });
      } catch (error) {
        log('error', 'Error processing client events', error);
        callback({ success: false, error: 'Error processing events' });
      }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
      log('debug', `Client disconnected: ${socketId}`);
      
      // Remove client info
      clients.delete(socketId);
    });
  }
  
  /**
   * Broadcast events to clients
   */
  function broadcastEvents(events: SyncEvent[], excludeSocketId: string) {
    // Group events by collection
    const eventsByCollection = events.reduce((acc, event) => {
      if (!acc[event.collection]) {
        acc[event.collection] = [];
      }
      
      acc[event.collection].push(event);
      
      return acc;
    }, {} as Record<string, SyncEvent[]>);
    
    // Send events to interested clients
    for (const [socketId, clientInfo] of clients.entries()) {
      // Skip sender
      if (socketId === excludeSocketId) continue;
      
      // Get events for this client's collections
      const clientEvents = clientInfo.collections.flatMap(collection => 
        eventsByCollection[collection] || []
      );
      
      if (clientEvents.length > 0) {
        log('debug', `Broadcasting ${clientEvents.length} events to client ${clientInfo.clientId}`);
        io.to(socketId).emit('server:sync', clientEvents);
      }
    }
  }
  
  /**
   * Start cleanup interval
   */
  function startCleanupInterval() {
    if (cleanupInterval) return;
    
    // Clean up old events every hour
    cleanupInterval = setInterval(async () => {
      try {
        // Keep events from the last 7 days
        const cutoffTime = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const deletedCount = await storage.clearEventsBefore(cutoffTime);
        
        if (deletedCount > 0) {
          log('info', `Cleaned up ${deletedCount} old events`);
        }
      } catch (error) {
        log('error', 'Error cleaning up old events', error);
      }
    }, 60 * 60 * 1000);
  }
  
  /**
   * Stop cleanup interval
   */
  function stopCleanupInterval() {
    if (!cleanupInterval) return;
    
    clearInterval(cleanupInterval);
    cleanupInterval = null;
  }
  
  return {
    start,
    stop,
    
    /**
     * Get connected clients count
     */
    getClientsCount: () => clients.size,
    
    /**
     * Get storage
     */
    getStorage: () => storage,
    
    /**
     * Get Socket.io server
     */
    getIo: () => io
  };
}
