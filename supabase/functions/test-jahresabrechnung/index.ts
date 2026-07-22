import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { pfad, mieter_name, mieter_adresse, wohnflaeche_mieter } = await req.json()
    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await supabase.storage.from('dokumente').download(pfad)
    if (error) throw new Error(`Storage: ${error.message}`)
    const bytes = new Uint8Array(await data.arrayBuffer())
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: `Analysiere diese WEG-Jahresabrechnung. Extrahiere NUR die wichtigsten Zahlen.
Antworte mit kurzem JSON, max 10 Kostenpositionen:
{
  "objekt": "Adresse",
  "zeitraum": "2021",
  "gesamtkosten": 0,
  "anteil_diese_einheit": 0,
  "anteil_prozent": 0,
  "vorauszahlungen": 0,
  "saldo": 0,
  "ist_nachzahlung": true,
  "positionen": [
    {"name": "Hausmeister", "gesamt": 0, "anteil": 0, "umlagefaehig": true}
  ],
  "hinweis": "kurzer Hinweis"
}` }
        ]}]
      })
    })
    if (!res.ok) throw new Error(await res.text())
    const result = await res.json()
    let text = result.content?.find((c: any) => c.type === 'text')?.text?.trim() || ''
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    return new Response(JSON.stringify({ analyse: JSON.parse(text) }), { headers: { ...cors, 'Content-Type': 'application/json' } })
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } })
  }
})
