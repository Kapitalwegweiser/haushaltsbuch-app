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
const updateSW = registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    // Der Browser prüft sonst nur beim Laden der Seite auf Updates — bei einer
    // dauerhaft offenen App/Tab würde ein neues Deployment sonst erst nach einem
    // kompletten Schließen/Neuöffnen ankommen. Deshalb zusätzlich regelmäßig
    // selbst nachfragen, auch während die Seite geöffnet bleibt.
    if (!registration) return
    setInterval(() => { registration.update() }, 15 * 60 * 1000)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') registration.update()
    })
  },
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
