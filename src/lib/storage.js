import { supabase } from './supabase'

const BUCKET = 'dokumente'

// Lädt eine Datei in den privaten Storage-Bereich des eingeloggten Nutzers hoch.
// Gibt nur Metadaten zurück (kein Base64) — die liegen sicher in der Cloud,
// geräteübergreifend abrufbar, statt nur lokal im Browser.
export async function hochladenDatei(file) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht eingeloggt')

  const sichererName = file.name.replace(/[^\w.\-]/g, '_')
  const pfad = `${user.id}/${Date.now()}-${sichererName}`

  const { error } = await supabase.storage.from(BUCKET).upload(pfad, file)
  if (error) throw error

  return { name: file.name, pfad, typ: file.type }
}

// Öffnet eine hochgeladene Datei über eine zeitlich begrenzte, signierte URL.
export async function oeffneDatei(pfad) {
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(pfad, 300)
  if (error) throw error
  window.open(data.signedUrl, '_blank')
}

export async function loescheDatei(pfad) {
  if (!pfad) return
  await supabase.storage.from(BUCKET).remove([pfad])
}
