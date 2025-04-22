import { useState, useEffect } from 'react';
import { Event, EventType } from '../types';

interface PluginMonitorProps {
  events: Event[];
  plugins?: string[];
}

interface PluginEvent {
  plugin: string;
  event: Event;
  duration?: number;
}

export function PluginMonitor({ events, plugins = [] }: PluginMonitorProps) {
  const [pluginEvents, setPluginEvents] = useState<PluginEvent[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<string>('all');
  
  // Extract plugin events from all events
  useEffect(() => {
    // In a real implementation, we would extract plugin events from the event stream
    // For now, we'll simulate plugin events
    const simulatedPluginEvents: PluginEvent[] = [];
    
    events.forEach(event => {
      // Only process certain event types
      if (
        event.type === EventType.INSERT ||
        event.type === EventType.UPDATE ||
        event.type === EventType.DELETE ||
        event.type === EventType.QUERY
      ) {
        // Simulate events for each plugin
        plugins.forEach(plugin => {
          // Add before event
          simulatedPluginEvents.push({
            plugin,
            event: {
              ...event,
              type: `${plugin}:before:${event.type}` as any
            },
            duration: Math.floor(Math.random() * 5) + 1 // Random duration between 1-5ms
          });
          
          // Add after event
          simulatedPluginEvents.push({
            plugin,
            event: {
              ...event,
              type: `${plugin}:after:${event.type}` as any
            },
            duration: Math.floor(Math.random() * 5) + 1 // Random duration between 1-5ms
          });
        });
      }
    });
    
    setPluginEvents(simulatedPluginEvents);
  }, [events, plugins]);
  
  // Filter events by selected plugin
  const filteredEvents = selectedPlugin === 'all'
    ? pluginEvents
    : pluginEvents.filter(e => e.plugin === selectedPlugin);
  
  // Calculate plugin stats
  const pluginStats = plugins.map(plugin => {
    const pluginFilteredEvents = pluginEvents.filter(e => e.plugin === plugin);
    const totalDuration = pluginFilteredEvents.reduce((sum, e) => sum + (e.duration || 0), 0);
    const avgDuration = pluginFilteredEvents.length > 0 
      ? totalDuration / pluginFilteredEvents.length 
      : 0;
    
    return {
      name: plugin,
      eventCount: pluginFilteredEvents.length,
      totalDuration,
      avgDuration
    };
  });
  
  return (
    <div className="bg-white dark:bg-nebula-800 rounded-lg shadow overflow-hidden">
      <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
        <h2 className="text-lg font-semibold text-nebula-900 dark:text-white">Plugin Monitor</h2>
      </div>
      
      <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-nebula-700 dark:text-nebula-300">
            Filter by Plugin:
          </label>
          <select
            value={selectedPlugin}
            onChange={(e) => setSelectedPlugin(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
          >
            <option value="all">All Plugins</option>
            {plugins.map(plugin => (
              <option key={plugin} value={plugin}>{plugin}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
        {pluginStats.map(stat => (
          <div 
            key={stat.name}
            className="p-4 bg-gray-50 rounded-lg dark:bg-nebula-700"
          >
            <h3 className="text-md font-semibold text-nebula-900 dark:text-white mb-2">
              {stat.name}
            </h3>
            <div className="space-y-1 text-sm">
              <p className="text-nebula-600 dark:text-nebula-300">
                Events: <span className="font-medium">{stat.eventCount}</span>
              </p>
              <p className="text-nebula-600 dark:text-nebula-300">
                Total Duration: <span className="font-medium">{stat.totalDuration.toFixed(2)}ms</span>
              </p>
              <p className="text-nebula-600 dark:text-nebula-300">
                Avg Duration: <span className="font-medium">{stat.avgDuration.toFixed(2)}ms</span>
              </p>
            </div>
          </div>
        ))}
      </div>
      
      <div className="p-4">
        <h3 className="text-md font-semibold text-nebula-900 dark:text-white mb-2">
          Plugin Events
        </h3>
        
        <div className="overflow-auto max-h-96">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-nebula-700">
            <thead className="bg-gray-50 dark:bg-nebula-700">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                  Plugin
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                  Event Type
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                  Collection
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-nebula-300">
                  Timestamp
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200 dark:bg-nebula-800 dark:divide-nebula-700">
              {filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-4 text-center text-sm text-nebula-500 dark:text-nebula-400">
                    No plugin events recorded
                  </td>
                </tr>
              ) : (
                filteredEvents.map((pluginEvent, index) => {
                  const event = pluginEvent.event;
                  const eventType = String(event.type);
                  const collection = 'collection' in event ? event.collection : '';
                  
                  return (
                    <tr key={index} className="hover:bg-gray-100 dark:hover:bg-nebula-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {pluginEvent.plugin}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {eventType}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {collection}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {pluginEvent.duration}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-nebula-900 dark:text-nebula-200">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
