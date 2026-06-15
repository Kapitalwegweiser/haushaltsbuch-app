import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

// Speichert komplexe Objekte (mit Arrays, verschachtelten Daten) als JSONB in Supabase
// Tabellen-Schema: { id text PK, user_id uuid, data jsonb }

function stripFiles(item) {
  // Datei-Objekte (base64) nicht in die Cloud — nur Metadaten behalten
  const clean = { ...item }
  if (clean.police?.data) clean.police = { name: clean.police.name, typ: clean.police.typ }
  if (clean.mieter)       clean.mieter       = (clean.mieter       || []).map(m => ({ ...m, dokument: m.dokument instanceof File ? { _fileName: m.dokument.name } : (m.dokument?._fileName ? m.dokument : null) }))
  if (clean.instandhaltung) clean.instandhaltung = (clean.instandhaltung || []).map(i => ({ ...i, dokument: i.dokument instanceof File ? { _fileName: i.dokument.name } : (i.dokument?._fileName ? i.dokument : null) }))
  if (clean.dokumente)    clean.dokumente    = (clean.dokumente    || []).map(d => ({ ...d, datei: d.datei instanceof File ? { _fileName: d.datei.name } : (d.datei?._fileName ? d.datei : null) }))
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
  const remoteUpdate = useRef(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    supabase
      .from(tableName)
      .select('id, data')
      .then(({ data: rows }) => {
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
          remoteUpdate.current = true
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
          setTimeout(() => { remoteUpdate.current = false }, 200)
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

    if (remoteUpdate.current || !userId) return

    const { inserted, deleted, updated } = diff(oldData, newData)

    for (const item of inserted) {
      const { id, ...rest } = stripFiles(item)
      await supabase.from(tableName).upsert({ id, user_id: userId, data: rest })
    }
    for (const item of updated) {
      const { id, ...rest } = stripFiles(item)
      await supabase.from(tableName).upsert({ id, user_id: userId, data: rest })
    }
    for (const item of deleted) {
      await supabase.from(tableName).delete().eq('id', item.id)
    }
  }, [tableName, userId])

  return [data, setData, loading]
}
