import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import './index.css'

// Erkennt neue Versionen automatisch und lädt die Seite neu, damit Code-Änderungen
// ohne manuelles Schließen/Wiederöffnen der installierten PWA ankommen.
registerSW({
  immediate: true,
  onNeedRefresh() {
    window.location.reload()
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
