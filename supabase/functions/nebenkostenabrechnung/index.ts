import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { pfad, mieter, grundsteuer_betrag, abrechnungsjahr, wohnflaeche_mieter, gesamtflaeche } = await req.json()

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const { data, error } = await supabase.storage.from('dokumente').download(pfad)
    if (error) throw new Error(`Storage: ${error.message}`)

    const bytes = new Uint8Array(await data.arrayBuffer())
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)

    const vorauszahlungen_jahres = (Number(mieter.nebenkosten) || 0) * 12

    const prompt = `Du bist ein Experte für deutsche Betriebskostenabrechnungen (§556 BGB, BetrKV).
Analysiere diese WEG-Jahresabrechnung für das Jahr ${abrechnungsjahr} und erstelle daraus eine Nebenkostenabrechnung für den Mieter.

MIETERDATEN:
- Mieter: ${mieter.name || 'Mieter'}
- Wohnfläche Mieter: ${wohnflaeche_mieter || '?'} m²
- Gesamtfläche Gebäude: ${gesamtflaeche || 'aus Dokument ermitteln'} m²
- NK-Vorauszahlung: ${mieter.nebenkosten || 0} €/Monat = ${vorauszahlungen_jahres} €/Jahr

ZUSÄTZLICHE KOSTEN (nicht in WEG-Abrechnung):
- Grundsteuer ${abrechnungsjahr}: ${grundsteuer_betrag || 0} € (vollständig umlagefähig gemäß §2 Nr.1 BetrKV)

REGELN FÜR UMLAGEFÄHIGKEIT (BetrKV §2):
Umlagefähig: Grundsteuer, Wasserversorgung, Entwässerung, Heizung/Warmwasser, Aufzug-BETRIEB (nicht Reparatur), Straßenreinigung/Müll, Gebäudereinigung, Gartenpflege, Beleuchtung, Schornsteinreinigung, Sach-/Haftpflichtversicherung, Hausmeister (Lohnanteil, kein Instandhaltungsanteil), Gemeinschaftsantenne/Internet, Waschraum, sonstige Betriebskosten.
NICHT umlagefähig: Verwaltungskosten, Instandhaltung/Reparaturen, Rücklagen, Bankgebühren, Anschaffungen, Rechtskosten.

Antworte NUR mit diesem JSON:
{
  "abrechnungsjahr": ${abrechnungsjahr},
  "mieter_name": "${mieter.name || 'Mieter'}",
  "objekt": "Adresse aus Dokument",
  "gesamtflaeche": 0,
  "wohnflaeche_mieter": ${wohnflaeche_mieter || 0},
  "anteil_prozent": 0,
  "positionen": [
    {"name": "Grundsteuer", "gesamtbetrag": ${grundsteuer_betrag || 0}, "anteil_mieter": 0, "umlagefaehig": true, "hinweis": ""},
    {"name": "Weitere Position", "gesamtbetrag": 0, "anteil_mieter": 0, "umlagefaehig": true, "hinweis": ""}
  ],
  "summe_umlagefaehig_gesamt": 0,
  "anteil_mieter_gesamt": 0,
  "vorauszahlungen": ${vorauszahlungen_jahres},
  "saldo": 0,
  "ist_nachzahlung": true,
  "nicht_umlagefaehige_positionen": ["Position 1 (Begründung)"],
  "hinweise": ["Hinweis 1"]
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 3000,
        messages: [{ role: 'user', content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: b64 } },
          { type: 'text', text: prompt },
        ]}],
      }),
    })

    if (!res.ok) throw new Error(`Claude: ${await res.text()}`)
    const result = await res.json()
    let text = result.content?.find((c: any) => c.type === 'text')?.text?.trim() || ''
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()

    return new Response(JSON.stringify({ abrechnung: JSON.parse(text) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
