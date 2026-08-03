import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Limits pro Nutzer pro Stunde
const LIMITS: Record<string, number> = {
  'analysiere-police':       5,
  'nebenkostenabrechnung':   5,
  'steuercheck-immobilie':  10,
}

export interface RateLimitResult {
  ok: boolean
  userId: string | null
  ip: string
  fehler?: Response
}

export async function pruefeRateLimit(
  req: Request,
  funktion: string,
  supabase: SupabaseClient
): Promise<RateLimitResult> {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unbekannt'
  const limit = LIMITS[funktion] ?? 5

  // Nutzer aus JWT ermitteln (falls eingeloggt)
  let userId: string | null = null
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data } = await userClient.auth.getUser(token)
    userId = data.user?.id ?? null
  }

  // Nicht eingeloggte Nutzer sofort blockieren
  if (!userId) {
    return {
      ok: false, userId: null, ip,
      fehler: new Response(
        JSON.stringify({ error: 'Nicht authentifiziert' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      ),
    }
  }

  // Anfragen der letzten Stunde zählen
  const seitWann = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  const { count } = await supabase
    .from('ki_anfragen')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('funktion', funktion)
    .gte('erstellt_am', seitWann)

  if ((count ?? 0) >= limit) {
    return {
      ok: false, userId, ip,
      fehler: new Response(
        JSON.stringify({ error: `Limit erreicht: max. ${limit} Anfragen pro Stunde für ${funktion}` }),
        { status: 429, headers: { 'Content-Type': 'application/json' } }
      ),
    }
  }

  // Anfrage protokollieren
  await supabase.from('ki_anfragen').insert({ user_id: userId, ip, funktion })

  return { ok: true, userId, ip }
}
