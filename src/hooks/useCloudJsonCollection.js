import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase, trackWrite, reportSyncError } from '../lib/supabase'

// Speichert komplexe Objekte (mit Arrays, verschachtelten Daten) als JSONB in Supabase
// Tabellen-Schema: { id text PK, user_id uuid, data jsonb }

// Dokumente werden seit der Umstellung auf Supabase Storage als leichte
// Referenz { name, pfad, typ } gehalten — die bleiben unverändert in der Cloud.
// Nur echte File-Objekte (sollten nicht mehr vorkommen) oder alte Base64-Reste
// werden vor dem Sync entfernt/auf Metadaten reduziert.
function cleanDokument(d) {
  if (!d) return d
  if (d instanceof File) return null
  if (d.pfad) return d
  if (d.data) return { name: d.name, typ: d.typ }
  return d
}

function stripFiles(item) {
  const clean = { ...item }
  if (clean.police)      clean.police       = cleanDokument(clean.police)
  if (clean.mieter)       clean.mieter       = (clean.mieter       || []).map(m => ({ ...m, dokument: cleanDokument(m.dokument) }))
  if (clean.instandhaltung) clean.instandhaltung = (clean.instandhaltung || []).map(i => ({ ...i, dokument: cleanDokument(i.dokument) }))
  if (clean.dokumente)    clean.dokumente    = (clean.dokumente    || []).map(d => ({ ...d, datei: cleanDokument(d.datei) }))
  if (clean.wirtschaftsplaene) clean.wirtschaftsplaene = (clean.wirtschaftsplaene || []).map(w => ({ ...w, dokument: cleanDokument(w.dokument) }))
  if (clean.steuern)      clean.steuern      = (clean.steuern      || []).map(s => ({ ...s, dokument: cleanDokument(s.dokument) }))
  if (clean.eigentuemerversammlungen) clean.eigentuemerversammlungen = (clean.eigentuemerversammlungen || []).map(p => ({ ...p, dokument: cleanDokument(p.dokument) }))
  return clean
}

function diff(oldData, newData) {
  const inserted = newData.filter(n => !oldData.find(o => o.id === n.id))
  const deleted  = oldData.filter(o => !newData.find(n => n.id === o.id))
  const updated  = newData.filter(n => {
    const old = oldData.find(o => o.id === n.id)
    return old && JSON.stringify(old) !== JSON.stringify(n)
  })
  return { inserted, deleted, updated }
}

export function useCloudJsonCollection(tableName, userId) {
  const [data, setDataLocal] = useState([])
  const [loading, setLoading]   = useState(true)
  const dataRef      = useRef([])

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    supabase
      .from(tableName)
      .select('id, data')
      .then(({ data: rows, error }) => {
        if (error) reportSyncError(tableName, error)
        const items = (rows || []).map(r => ({ id: r.id, ...r.data }))
        setDataLocal(items)
        dataRef.current = items
        setLoading(false)
      })

    const channel = supabase
      .channel(`${tableName}_json_${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          setDataLocal(prev => {
            let next
            if (payload.eventType === 'INSERT') {
              const item = { id: payload.new.id, ...payload.new.data }
              next = prev.find(i => i.id === item.id) ? prev : [...prev, item]
            } else if (payload.eventType === 'UPDATE') {
              const item = { id: payload.new.id, ...payload.new.data }
              next = prev.map(i => i.id === item.id ? item : i)
            } else if (payload.eventType === 'DELETE') {
              next = prev.filter(i => i.id !== payload.old.id)
            } else {
              next = prev
            }
            dataRef.current = next
            return next
          })
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tableName, userId])

  const setData = useCallback(async (newDataOrFn) => {
    const oldData = dataRef.current
    const newData = typeof newDataOrFn === 'function' ? newDataOrFn(oldData) : newDataOrFn

    setDataLocal(newData)
    dataRef.current = newData

    if (!userId) return

    const { inserted, deleted, updated } = diff(oldData, newData)

    for (const item of [...inserted, ...updated]) {
      const { id, ...rest } = stripFiles(item)
      trackWrite(
        supabase.from(tableName).upsert({ id, user_id: userId, data: rest }).then(({ error }) => {
          if (error) reportSyncError(tableName, error)
        })
      )
    }
    for (const item of deleted) {
      trackWrite(
        supabase.from(tableName).delete().eq('id', item.id).then(({ error }) => {
          if (error) reportSyncError(tableName, error)
        })
      )
    }
  }, [tableName, userId])

  return [data, setData, loading]
}
