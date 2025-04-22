import { IDatabase } from '@nebula/core';
import { createDevtoolsConnection } from './connection';
import { DevtoolsOptions } from './types';

/**
 * Initialize NebulaDB DevTools
 */
export function initDevtools(db: IDatabase, options: DevtoolsOptions = {}) {
  const { port = 3333, autoOpen = true } = options;
  
  // Create connection to DevTools
  const connection = createDevtoolsConnection(db, { port });
  
  // Auto-open DevTools in browser if enabled
  if (autoOpen && typeof window !== 'undefined') {
    window.open(`http://localhost:${port}`, '_blank');
  }
  
  return {
    connection,
    close: () => connection.close()
  };
}

// Export types
export * from './types';

// Export standalone UI components
export { CollectionViewer } from './components/CollectionViewer';
export { QueryBuilder } from './components/QueryBuilder';
export { DocumentViewer } from './components/DocumentViewer';
export { PluginMonitor } from './components/PluginMonitor';
