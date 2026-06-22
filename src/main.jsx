import React from 'react'
import ReactDOM from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import { flushPendingWrites } from './lib/supabase'
import App from './App'
import './index.css'

// Erkennt neue Versionen automatisch und lädt die Seite neu, damit Code-Änderungen
// ohne manuelles Schließen/Wiederöffnen der installierten PWA ankommen.
// Wichtig: erst warten, bis alle offenen Speichervorgänge durch sind — sonst reißt
// der Reload eine gerade laufende Ausgabe/Eingabe mitten im Speichern ab.
registerSW({
  immediate: true,
  async onNeedRefresh() {
    await flushPendingWrites()
    window.location.reload()
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
