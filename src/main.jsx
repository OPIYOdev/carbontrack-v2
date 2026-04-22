import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { FleetProvider } from './FleetContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FleetProvider>
      <App />
    </FleetProvider>
  </React.StrictMode>
)
