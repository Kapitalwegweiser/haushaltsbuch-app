import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ygcmfrwgailmjanoyozm.supabase.co'
const SUPABASE_KEY = 'sb_publishable_8Ini9YYjVwGFRsvVkgL6Bg_NupdTOXh'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Alle offenen Schreibvorgänge (Einnahmen, Fixkosten, Immobilien, Versicherungen, ...)
// werden hier erfasst, damit wir vor dem Abmelden sicher darauf warten können —
// sonst könnte ein Logout mitten in einem laufenden Speichervorgang Daten verlieren.
const pendingWrites = new Set()

export function trackWrite(promise) {
  const tracked = promise
    .catch(err => { console.error('Supabase-Schreibvorgang fehlgeschlagen:', err) })
    .finally(() => pendingWrites.delete(tracked))
  pendingWrites.add(tracked)
  return tracked
}

export async function flushPendingWrites() {
  while (pendingWrites.size > 0) {
    await Promise.all(Array.from(pendingWrites))
  }
}

// Warnt den Nutzer, falls er den Tab/die App schließt, während noch gespeichert wird —
// schließende Tabs brechen laufende Netzwerk-Requests sonst ohne Vorwarnung ab.
window.addEventListener('beforeunload', e => {
  if (pendingWrites.size > 0) {
    e.preventDefault()
    e.returnValue = ''
  }
})
