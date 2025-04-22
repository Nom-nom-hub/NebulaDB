import { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { Dashboard } from './pages/Dashboard';
import { Collections } from './pages/Collections';
import { Collection } from './pages/Collection';
import { QueryExplorer } from './pages/QueryExplorer';
import { EventLog } from './pages/EventLog';
import { Settings } from './pages/Settings';
import { Event, DatabaseSnapshot } from './types';

function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [events, setEvents] = useState<Event[]>([]);
  const [snapshot, setSnapshot] = useState<DatabaseSnapshot | null>(null);
  const location = useLocation();

  // Connect to the server
  useEffect(() => {
    const newSocket = io('http://localhost:3333');
    
    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // Request initial snapshot
      newSocket.emit('command', 'get_snapshot');
    });
    
    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
    });
    
    newSocket.on('event', (event: Event) => {
      setEvents(prev => [event, ...prev].slice(0, 1000)); // Keep last 1000 events
    });
    
    newSocket.on('snapshot', (data: DatabaseSnapshot) => {
      setSnapshot(data);
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-nebula-900">
      {/* Sidebar */}
      <div className="w-64 bg-white dark:bg-nebula-800 shadow-md">
        <div className="p-4 border-b border-gray-200 dark:border-nebula-700">
          <div className="flex items-center">
            <img src="/logo.svg" alt="NebulaDB Logo" className="w-8 h-8 mr-2" />
            <h1 className="text-xl font-semibold text-nebula-900 dark:text-white">NebulaDB DevTools</h1>
          </div>
          <div className="mt-2">
            <span className={`inline-block w-2 h-2 rounded-full mr-2 ${connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
            <span className="text-sm text-nebula-600 dark:text-nebula-400">
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
        
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <Link
                to="/"
                className={`flex items-center px-4 py-2 rounded-md ${
                  location.pathname === '/' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-400' 
                    : 'text-nebula-700 hover:bg-gray-100 dark:text-nebula-300 dark:hover:bg-nebula-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path>
                </svg>
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/collections"
                className={`flex items-center px-4 py-2 rounded-md ${
                  location.pathname === '/collections' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-400' 
                    : 'text-nebula-700 hover:bg-gray-100 dark:text-nebula-300 dark:hover:bg-nebula-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                </svg>
                Collections
              </Link>
            </li>
            <li>
              <Link
                to="/query"
                className={`flex items-center px-4 py-2 rounded-md ${
                  location.pathname === '/query' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-400' 
                    : 'text-nebula-700 hover:bg-gray-100 dark:text-nebula-300 dark:hover:bg-nebula-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
                Query Explorer
              </Link>
            </li>
            <li>
              <Link
                to="/events"
                className={`flex items-center px-4 py-2 rounded-md ${
                  location.pathname === '/events' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-400' 
                    : 'text-nebula-700 hover:bg-gray-100 dark:text-nebula-300 dark:hover:bg-nebula-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Event Log
              </Link>
            </li>
            <li>
              <Link
                to="/settings"
                className={`flex items-center px-4 py-2 rounded-md ${
                  location.pathname === '/settings' 
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:bg-opacity-30 dark:text-blue-400' 
                    : 'text-nebula-700 hover:bg-gray-100 dark:text-nebula-300 dark:hover:bg-nebula-700'
                }`}
              >
                <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Settings
              </Link>
            </li>
          </ul>
        </nav>
      </div>
      
      {/* Main content */}
      <div className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Dashboard socket={socket} snapshot={snapshot} events={events} />} />
          <Route path="/collections" element={<Collections socket={socket} snapshot={snapshot} />} />
          <Route path="/collections/:name" element={<Collection socket={socket} snapshot={snapshot} />} />
          <Route path="/query" element={<QueryExplorer socket={socket} snapshot={snapshot} />} />
          <Route path="/events" element={<EventLog events={events} />} />
          <Route path="/settings" element={<Settings socket={socket} />} />
        </Routes>
      </div>
    </div>
  );
}

export default App;
