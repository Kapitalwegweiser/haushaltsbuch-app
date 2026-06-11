import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'

function diff(oldData, newData) {
  const inserted = newData.filter(n => !oldData.find(o => o.id === n.id))
  const deleted  = oldData.filter(o => !newData.find(n => n.id === o.id))
  const updated  = newData.filter(n => {
    const old = oldData.find(o => o.id === n.id)
    return old && JSON.stringify(old) !== JSON.stringify(n)
  })
  return { inserted, deleted, updated }
}

// Felder die nur in der DB existieren, aus dem Objekt entfernen
function stripMeta(item) {
  const { user_id, created_at, ...rest } = item
  return rest
}

export function useCloudCollection(tableName, userId) {
  const [data, setDataLocal] = useState([])
  const [loading, setLoading] = useState(true)
  const dataRef = useRef([])
  const remoteUpdate = useRef(false)

  useEffect(() => {
    if (!userId) { setLoading(false); return }

    // Initiale Daten laden
    supabase
      .from(tableName)
      .select('*')
      .then(({ data: rows }) => {
        const clean = (rows || []).map(stripMeta)
        setDataLocal(clean)
        dataRef.current = clean
        setLoading(false)
      })

    // Echtzeit-Abo
    const channel = supabase
      .channel(`${tableName}_${userId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: tableName },
        (payload) => {
          remoteUpdate.current = true
          setDataLocal(prev => {
            let next
            if (payload.eventType === 'INSERT') {
              const item = stripMeta(payload.new)
              next = prev.find(i => i.id === item.id) ? prev : [...prev, item]
            } else if (payload.eventType === 'UPDATE') {
              const item = stripMeta(payload.new)
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

    // Sofort lokal aktualisieren
    setDataLocal(newData)
    dataRef.current = newData

    if (remoteUpdate.current || !userId) return

    const { inserted, deleted, updated } = diff(oldData, newData)

    for (const item of inserted) {
      await supabase.from(tableName).upsert({ ...item, user_id: userId })
    }
    for (const item of updated) {
      await supabase.from(tableName).upsert({ ...item, user_id: userId })
    }
    for (const item of deleted) {
      await supabase.from(tableName).delete().eq('id', item.id)
    }
  }, [tableName, userId])

  return [data, setData, loading]
}
