import { useEffect, useState } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { onSyncError } from '../lib/supabase'

// Macht fehlgeschlagene Speicher-/Ladevorgänge sichtbar, statt sie nur in der
// Browser-Konsole zu protokollieren — sonst merkt niemand, warum ein Eintrag
// nicht ankommt oder nach einem Reload wieder verschwindet.
export default function SyncErrorBanner() {
  const [fehler, setFehler] = useState(null)

  useEffect(() => {
    return onSyncError(({ context, message }) => {
      setFehler({ context, message, zeit: new Date() })
    })
  }, [])

  if (!fehler) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-2rem)] max-w-md">
      <div className="rounded-xl shadow-lg px-4 py-3 flex items-start gap-3" style={{ background: '#fdecea', border: '1px solid #f5b8b8' }}>
        <AlertTriangle size={18} style={{ color: '#7a1e1e' }} className="shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold" style={{ color: '#7a1e1e' }}>Speichern fehlgeschlagen ({fehler.context})</p>
          <p className="text-xs mt-0.5 break-words" style={{ color: '#7a1e1e', opacity: 0.85 }}>{fehler.message}</p>
        </div>
        <button onClick={() => setFehler(null)} className="shrink-0" style={{ color: '#7a1e1e' }}>
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
