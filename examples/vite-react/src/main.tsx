import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NebulaProvider } from './context/NebulaContext.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <NebulaProvider>
      <App />
    </NebulaProvider>
  </React.StrictMode>,
)
