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

// Fehler beim Speichern/Löschen wurden bisher nur in der Browser-Konsole protokolliert
// und sind dadurch nie aufgefallen. reportSyncError macht sie zusätzlich für die UI
// sichtbar (siehe SyncErrorBanner), damit ein fehlgeschlagener Schreibvorgang nicht
// unbemerkt zu "verschwundenen" Einträgen führt.
const syncErrorListeners = new Set()

export function reportSyncError(context, error) {
  console.error(`Supabase-Fehler (${context}):`, error)
  const message = error?.message || error?.error_description || String(error)
  syncErrorListeners.forEach(fn => fn({ context, message }))
}

export function onSyncError(fn) {
  syncErrorListeners.add(fn)
  return () => syncErrorListeners.delete(fn)
}
