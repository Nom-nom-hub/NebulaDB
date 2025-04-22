import { useState } from 'react';
import { Socket } from 'socket.io-client';

interface SettingsProps {
  socket: Socket | null;
}

export function Settings({ socket }: SettingsProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>(
    document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(5);
  const [maxEvents, setMaxEvents] = useState<number>(1000);
  
  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Save to localStorage
    localStorage.setItem('theme', newTheme);
  };
  
  // Handle save database
  const handleSaveDatabase = () => {
    socket?.emit('command', 'save_database');
    
    // Show success message
    alert('Database saved successfully!');
  };
  
  // Handle export database
  const handleExportDatabase = () => {
    socket?.emit('command', 'get_snapshot');
    
    // Listen for snapshot
    socket?.once('snapshot', (data) => {
      // Create a download link
      const dataStr = JSON.stringify(data, null, 2);
      const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
      
      const exportName = `nebula-export-${new Date().toISOString().slice(0, 10)}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportName);
      linkElement.click();
    });
  };
  
  // Handle clear events
  const handleClearEvents = () => {
    if (window.confirm('Are you sure you want to clear all events?')) {
      socket?.emit('command', 'clear_events');
    }
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-nebula-900 dark:text-white mb-6">Settings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Appearance Settings */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Appearance</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
                Theme
              </label>
              <div className="flex space-x-4">
                <button
                  onClick={() => handleThemeChange('light')}
                  className={`px-4 py-2 rounded-md ${
                    theme === 'light'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-nebula-700 dark:text-nebula-300'
                  }`}
                >
                  Light
                </button>
                <button
                  onClick={() => handleThemeChange('dark')}
                  className={`px-4 py-2 rounded-md ${
                    theme === 'dark'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-800 dark:bg-nebula-700 dark:text-nebula-300'
                  }`}
                >
                  Dark
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
                Auto Refresh
              </label>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-nebula-600 dark:text-nebula-400">
                  Enable auto refresh
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
                Refresh Interval (seconds)
              </label>
              <input
                type="number"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                min={1}
                max={60}
                disabled={!autoRefresh}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-nebula-700 dark:text-nebula-300 mb-1">
                Maximum Events
              </label>
              <input
                type="number"
                value={maxEvents}
                onChange={(e) => setMaxEvents(Number(e.target.value))}
                min={100}
                max={10000}
                step={100}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-nebula-700 dark:border-nebula-600 dark:text-white"
              />
            </div>
          </div>
        </div>
        
        {/* Database Actions */}
        <div className="bg-white dark:bg-nebula-800 rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold text-nebula-900 dark:text-white mb-4">Database Actions</h2>
          
          <div className="space-y-4">
            <div>
              <button
                onClick={handleSaveDatabase}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Save Database
              </button>
              <p className="mt-1 text-xs text-nebula-500 dark:text-nebula-400">
                Save the current database state to persistent storage
              </p>
            </div>
            
            <div>
              <button
                onClick={handleExportDatabase}
                className="w-full px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                Export Database
              </button>
              <p className="mt-1 text-xs text-nebula-500 dark:text-nebula-400">
                Export the database as a JSON file
              </p>
            </div>
            
            <div>
              <button
                onClick={handleClearEvents}
                className="w-full px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Clear Events
              </button>
              <p className="mt-1 text-xs text-nebula-500 dark:text-nebula-400">
                Clear all recorded events
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
