import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pruefeRateLimit } from '../_shared/ratelimit.ts'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const { pfad, mieter, grundsteuer_betrag, abrechnungsjahr, wohnflaeche_mieter, gesamtflaeche } = await req.json()

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const rl = await pruefeRateLimit(req, 'nebenkostenabrechnung', supabase)
    if (!rl.ok) return rl.fehler!
    const { data, error } = await supabase.storage.from('dokumente').download(pfad)
    if (error) throw new Error(`Storage: ${error.message}`)

    const bytes = new Uint8Array(await data.arrayBuffer())
    let bin = ''; for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i])
    const b64 = btoa(bin)

    const vorauszahlungen_jahres = (Number(mieter.nebenkosten) || 0) * 12

    const prompt = `Du bist ein Experte für deutsche Betriebskostenabrechnungen (§556 BGB, BetrKV).
Analysiere diese WEG-Jahresabrechnung und erstelle eine Nebenkostenabrechnung für den Mieter.

MIETERDATEN:
- Mieter: ${mieter.name || 'Mieter'}
- Wohnfläche Mieter: ${wohnflaeche_mieter ? wohnflaeche_mieter + ' m²' : 'aus Dokument ermitteln'}
- NK-Vorauszahlung: ${mieter.nebenkosten || 0} €/Monat = ${vorauszahlungen_jahres} €/Jahr

ZUSÄTZLICHE KOSTEN (nicht in der WEG-Abrechnung enthalten, trotzdem umlagefähig):
- Grundsteuer ${abrechnungsjahr}: ${grundsteuer_betrag || 0} € (§2 Nr.1 BetrKV) → Anteil Mieter = ${grundsteuer_betrag || 0} €

AUFGABE — NUR ABLESEN, NIEMALS BERECHNEN:
Die WEG-Jahresabrechnung hat für jede Kostenposition eine Spalte mit dem bereits berechneten Eigentümeranteil in Euro (z.B. "Ihr Anteil", "Anteil Whg.", "Einheitsbetrag" o.ä.). Dieser Betrag steht schwarz auf weiß im Dokument. Übernimm ihn 1:1. Rechne gar nichts — kein Prozent, keine Umrechnung, keine eigene Anteilsberechnung. Wenn eine Position im Dokument mit 0,00 € ausgewiesen ist, lass sie weg. Berücksichtige ALLE Abrechnungsbereiche im Dokument (Altbau, Neubau, Gemeinschaftsanlagen etc.) — der Eigentümer kann aus mehreren Bereichen Anteile haben.

UMLAGEFÄHIGKEIT (BetrKV §2):
✅ Umlagefähig: Wasserversorgung, Entwässerung, Heizung/Warmwasser, Aufzug-Betrieb (nicht Reparatur), Straßenreinigung, Müll, Gebäudereinigung, Gartenpflege, Beleuchtung, Schornsteinreinigung, Gebäude-/Haftpflichtversicherung, Hausmeister (Lohnanteil, nicht Instandhaltung), Antenne/Kabel, sonstige laufende Betriebskosten
❌ Nicht umlagefähig: Verwaltungskosten, Instandhaltungsrücklage, Reparaturen/Instandsetzung, Bankgebühren, Rechtskosten, Sonderumlagen

Antworte NUR mit diesem JSON (Beträge als Dezimalzahlen, kein €):
{
  "abrechnungsjahr": ${abrechnungsjahr},
  "mieter_name": "${mieter.name || 'Mieter'}",
  "objekt": "Adresse aus Dokument",
  "anteil_prozent": 0,
  "positionen": [
    {"name": "Grundsteuer", "gesamtbetrag": ${grundsteuer_betrag || 0}, "anteil_mieter": ${grundsteuer_betrag || 0}, "umlagefaehig": true, "rechtsgrundlage": "§2 Nr.1 BetrKV"},
    {"name": "Jede weitere Position aus Dokument", "gesamtbetrag": 0, "anteil_mieter": 0, "umlagefaehig": true, "rechtsgrundlage": "§2 BetrKV"}
  ],
  "summe_umlagefaehig_gesamt": 0,
  "anteil_mieter_gesamt": 0,
  "vorauszahlungen": ${vorauszahlungen_jahres},
  "saldo": 0,
  "ist_nachzahlung": true,
  "nicht_umlagefaehige_positionen": [
    {"name": "Verwaltungskosten", "betrag_eigentuemer": 0, "grund": "nicht umlagefähig nach BetrKV"}
  ],
  "hinweise": ["Hinweis"]
}`

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 8096,
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
    // Alles nach dem letzten } abschneiden (Claude fügt manchmal Text nach dem JSON an)
    const lastBrace = text.lastIndexOf('}')
    if (lastBrace !== -1) text = text.slice(0, lastBrace + 1)

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
