import { createContext, useContext, useEffect, useState } from 'react'
import { supabase, flushPendingWrites } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [meldetSichAb, setMeldetSichAb] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function abmelden() {
    setMeldetSichAb(true)
    // Erst sicherstellen, dass wirklich alle offenen Speichervorgänge durch sind,
    // bevor die Sitzung beendet wird — sonst können laufende Schreibvorgänge verloren gehen.
    await flushPendingWrites()
    await supabase.auth.signOut()
    setMeldetSichAb(false)
  }

  return (
    <AuthContext.Provider value={{ user, loading, abmelden, meldetSichAb }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
