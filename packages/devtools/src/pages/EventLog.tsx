import { useState } from 'react';
import { Event, EventType } from '../types';
import ReactJson from 'react-json-view';

interface EventLogProps {
  events: Event[];
}

export function EventLog({ events }: EventLogProps) {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Get unique event types
  const eventTypes = Array.from(new Set(events.map(e => e.type)));
  
  // Filter events
  const filteredEvents = events.filter(event => {
    // Filter by type
    if (filter !== 'all' && event.type !== filter) {
      return false;
    }
    
    // Filter by search term
    if (searchTerm) {
      const eventString = JSON.stringify(event).toLowerCase();
      return eventString.includes(searchTerm.toLowerCase());
    }
    
    return true;
  });
  
  // Get event color based on type
  const getEventColor = (type: EventType): string => {
    switch (type) {
      case EventType.INSERT:
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:bg-opacity-20 dark:text-green-400';
      case EventType.UPDATE:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:bg-opacity-20 dark:text-blue-400';
      case EventType.DELETE:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400';
      case EventType.QUERY:
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:bg-opacity-20 dark:text-purple-400';
      case EventType.ERROR:
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-nebula-900 dark:text-white mb-6">Event Log</h1>
      
      <div className="bg-white dark:bg-nebula-800 rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-nebula-700 dark:text-nebula-300">
                Filter by Type:
              </label>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
              >
                <option value="all">All Events</option>
                {eventTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-nebula-700 dark:text-nebula-300">
                Search:
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search events..."
                className="px-3 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        <div className="overflow-auto max-h-screen">
          {filteredEvents.length === 0 ? (
            <div className="p-8 text-center text-nebula-500 dark:text-nebula-400">
              No events found
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-nebula-700">
              {filteredEvents.map((event, index) => (
                <div key={index} className="p-4 hover:bg-gray-50 dark:hover:bg-nebula-700">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center">
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-md ${getEventColor(event.type)}`}>
                        {event.type}
                      </span>
                      
                      {'collection' in event && (
                        <span className="ml-2 text-sm text-nebula-600 dark:text-nebula-400">
                          Collection: <span className="font-medium">{event.collection}</span>
                        </span>
                      )}
                    </div>
                    
                    <span className="text-xs text-nebula-500 dark:text-nebula-400">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="mt-2">
                    <ReactJson
                      src={event}
                      name={null}
                      theme={document.documentElement.classList.contains('dark') ? 'monokai' : 'rjv-default'}
                      displayDataTypes={false}
                      enableClipboard={true}
                      collapsed={2}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
