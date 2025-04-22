import { useEffect, useState } from 'react';
import { Socket } from 'socket.io-client';
import { Link } from 'react-router-dom';
import { Event, DatabaseSnapshot, CollectionStats, DatabaseStats } from '../types';

interface DashboardProps {
  socket: Socket | null;
  snapshot: DatabaseSnapshot | null;
  events: Event[];
}

export function Dashboard({ socket, snapshot, events }: DashboardProps) {
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  
  // Calculate database stats
  useEffect(() => {
    if (!snapshot) return;
    
    const collectionStats: CollectionStats[] = [];
    let totalDocuments = 0;
    let totalSize = 0;
    
    // Calculate stats for each collection
    for (const [name, documents] of Object.entries(snapshot.collections)) {
      const documentCount = documents.length;
      totalDocuments += documentCount;
      
      // Calculate average document size
      const totalDocumentSize = documents.reduce((size, doc) => {
        return size + JSON.stringify(doc).length;
      }, 0);
      
      const averageDocumentSize = documentCount > 0 
        ? totalDocumentSize / documentCount 
        : 0;
      
      totalSize += totalDocumentSize;
      
      // Get indexes (simulated for now)
      const indexes = ['id']; // In a real implementation, we would get actual indexes
      
      collectionStats.push({
        name,
        documentCount,
        averageDocumentSize,
        indexes
      });
    }
    
    setStats({
      collections: collectionStats,
      totalDocuments,
      totalSize,
      lastSaved: snapshot.timestamp
    });
  }, [snapshot]);
  
  // Calculate event stats
  const eventCounts = events.reduce((counts, event) => {
    const type = event.type;
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {} as Record<string, number>);
  
  // Get recent events (last 5)
  const recentEvents = events.slice(0, 5);
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-nebula-900 dark:text-white mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Database Stats */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Database Stats</h2>
          
          {stats ? (
            <div className="space-y-2">
              <p className="text-nebula-600 dark:text-nebula-300">
                Collections: <span className="font-medium">{stats.collections.length}</span>
              </p>
              <p className="text-nebula-600 dark:text-nebula-300">
                Total Documents: <span className="font-medium">{stats.totalDocuments}</span>
              </p>
              <p className="text-nebula-600 dark:text-nebula-300">
                Total Size: <span className="font-medium">{(stats.totalSize / 1024).toFixed(2)} KB</span>
              </p>
              <p className="text-nebula-600 dark:text-nebula-300">
                Last Saved: <span className="font-medium">
                  {stats.lastSaved ? new Date(stats.lastSaved).toLocaleString() : 'Never'}
                </span>
              </p>
            </div>
          ) : (
            <p className="text-nebula-500 dark:text-nebula-400">Loading stats...</p>
          )}
        </div>
        
        {/* Event Stats */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Event Stats</h2>
          
          {Object.keys(eventCounts).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(eventCounts).map(([type, count]) => (
                <p key={type} className="text-nebula-600 dark:text-nebula-300">
                  {type}: <span className="font-medium">{count}</span>
                </p>
              ))}
            </div>
          ) : (
            <p className="text-nebula-500 dark:text-nebula-400">No events recorded yet</p>
          )}
        </div>
        
        {/* Connection Status */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Connection Status</h2>
          
          <div className="space-y-2">
            <p className="text-nebula-600 dark:text-nebula-300">
              Status: <span className={`font-medium ${socket?.connected ? 'text-green-500' : 'text-red-500'}`}>
                {socket?.connected ? 'Connected' : 'Disconnected'}
              </span>
            </p>
            <p className="text-nebula-600 dark:text-nebula-300">
              Socket ID: <span className="font-medium">{socket?.id || 'N/A'}</span>
            </p>
            <p className="text-nebula-600 dark:text-nebula-300">
              Transport: <span className="font-medium">{socket?.io.engine?.transport?.name || 'N/A'}</span>
            </p>
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Collections */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Collections</h2>
          
          {stats?.collections.length ? (
            <div className="overflow-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-nebula-700">
                <thead className="bg-gray-50 dark:bg-nebula-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Name
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Documents
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Avg Size
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-nebula-800 dark:divide-nebula-700">
                  {stats.collections.map(collection => (
                    <tr key={collection.name} className="hover:bg-gray-100 dark:hover:bg-nebula-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 dark:text-blue-400">
                        <Link to={`/collections/${collection.name}`}>
                          {collection.name}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {collection.documentCount}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {(collection.averageDocumentSize / 1024).toFixed(2)} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-nebula-500 dark:text-nebula-400">No collections found</p>
          )}
        </div>
        
        {/* Recent Events */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Recent Events</h2>
          
          {recentEvents.length > 0 ? (
            <div className="overflow-auto max-h-64">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-nebula-700">
                <thead className="bg-gray-50 dark:bg-nebula-700">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Type
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Collection
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 dark:bg-nebula-800 dark:divide-nebula-700">
                  {recentEvents.map((event, index) => (
                    <tr key={index} className="hover:bg-gray-100 dark:hover:bg-nebula-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {event.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {'collection' in event ? event.collection : '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-nebula-500 dark:text-nebula-400">No events recorded yet</p>
          )}
          
          <div className="mt-4">
            <Link
              to="/events"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              View all events →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
