import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import '@xyflow/react/dist/style.css'
import { runHealthCheck } from '@/api/healthCheck'

// Fire-and-forget TMDB reachability probe. If it fails (timeout / DNS / TLS
// reset — typical Jio/ISP blocking), the fallback flag lands in localStorage
// so subsequent API calls use Trakt+Fanart+OMDb instead.
runHealthCheck()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
