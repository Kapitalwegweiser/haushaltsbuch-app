import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { pruefeRateLimit } from '../_shared/ratelimit.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { immobilie, steuerjahr } = await req.json()

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const rl = await pruefeRateLimit(req, 'steuercheck-immobilie', supabase)
    if (!rl.ok) return rl.fehler!

    // Daten für das gewählte Steuerjahr aufbereiten
    const jahr = String(steuerjahr)
    const kaufjahr = immobilie.kaufdatum ? new Date(immobilie.kaufdatum).getFullYear() : null
    const kaufpreis = Number(immobilie.kaufpreis) || 0

    // Mieteinnahmen (aktive Mieter)
    const mieter = (immobilie.mieter || []).filter((m: any) => {
      if (!m.mietende) return true
      return new Date(m.mietende).getFullYear() >= Number(steuerjahr)
    })

    // Instandhaltungen im Steuerjahr
    const instandhaltungen = (immobilie.instandhaltung || []).filter((i: any) =>
      i.datum && i.datum.startsWith(jahr)
    )

    // Für 15%-Regel: ALLE Instandhaltungen in den ersten 3 Jahren nach Kauf (§6 Abs.1 Nr.1a EStG)
    const gebaeudeAnteil = Math.round(kaufpreis * 0.8)
    const schwelle15Prozent = Math.round(gebaeudeAnteil * 0.15)
    const dreiJahreEnde = kaufjahr ? kaufjahr + 3 : null
    const instandhaltungenDreiJahre = kaufjahr && dreiJahreEnde
      ? (immobilie.instandhaltung || []).filter((i: any) => {
          if (!i.datum) return false
          const y = parseInt(i.datum.slice(0, 4))
          return y >= kaufjahr && y < dreiJahreEnde
        })
      : []
    const summeDreiJahre = instandhaltungenDreiJahre.reduce((s: number, i: any) => s + (Number(i.betrag) || 0), 0)
    const istImDreiJahresFenster = kaufjahr ? (Number(steuerjahr) >= kaufjahr && Number(steuerjahr) < dreiJahreEnde!) : false

    // Wirtschaftsplan / Jahresabrechnung für das Steuerjahr
    const wirtschaftsplan = (immobilie.wirtschaftsplaene || []).find((w: any) => w.jahr === jahr)

    // Grundsteuer für das Steuerjahr
    const grundsteuer = (immobilie.steuern || []).find((s: any) => s.steuerjahr === jahr)

    // Finanzierung
    const fin = immobilie.finanzierung || {}

    const prompt = `Du bist ein präziser Steuerberater für deutsche Immobilienbesteuerung (Anlage V). Analysiere die Daten für Steuerjahr ${steuerjahr}. Antworte NUR mit dem JSON-Objekt — kein Text davor oder danach.

IMMOBILIE:
- Objekt: ${immobilie.name || 'Unbekannt'}, ${immobilie.adresse || ''}
- Kaufpreis gesamt: ${kaufpreis > 0 ? kaufpreis + ' €' : 'nicht angegeben'}
- Kaufdatum: ${immobilie.kaufdatum || 'nicht angegeben'}
- Wohnfläche: ${immobilie.flaeche || 'unbekannt'} m²
- Berechneter Gebäudeanteil (80% des Kaufpreises): ${gebaeudeAnteil > 0 ? gebaeudeAnteil + ' €' : 'nicht berechenbar'}

MIETER & EINNAHMEN ${steuerjahr}:
${mieter.length > 0 ? mieter.map((m: any) => {
  const kalt = Number(m.kaltmiete) || 0
  const nk = Number(m.nebenkosten) || 0
  return `- ${m.name || 'Mieter'}: Kaltmiete ${kalt} €/Monat, NK-Vorauszahlung ${nk} €/Monat (NK nicht steuerlich relevant als Einnahme wenn durchlaufend)`
}).join('\n') : '- Keine Mieter eingetragen'}

FINANZIERUNG:
- Darlehensbetrag: ${Number(fin.betrag) || 0} €
- Zinssatz: ${Number(fin.zinssatz) || 0} %
- Tilgung: ${Number(fin.tilgung) || 0} %
- Errechnete Jahreszinsen: ${Math.round(Number(fin.betrag) * Number(fin.zinssatz) / 100)} € (NUR Zinsen absetzbar, NICHT Tilgung)

INSTANDHALTUNGEN IM STEUERJAHR ${steuerjahr}:
${instandhaltungen.length > 0 ? instandhaltungen.map((i: any) =>
  `- ${i.datum}: "${i.beschreibung || 'Maßnahme'}", ${Number(i.betrag) || 0} €, Kategorie: ${i.kategorie || 'nicht angegeben'}`
).join('\n') : '- Keine Instandhaltungen im Steuerjahr'}

15%-REGEL PRÜFUNG (§6 Abs. 1 Nr. 1a EStG — anschaffungsnahe Herstellungskosten):
- Kaufjahr: ${kaufjahr || 'unbekannt'}
- 3-Jahres-Fenster: ${kaufjahr ? kaufjahr + ' bis ' + (kaufjahr + 2) : 'nicht berechenbar'} (ACHTUNG: 3 Jahre = Kaufjahr, Kaufjahr+1, Kaufjahr+2)
- Steuerjahr ${steuerjahr} liegt ${istImDreiJahresFenster ? 'IM 3-Jahres-Fenster → 15%-Regel PRÜFEN' : 'AUSSERHALB des 3-Jahres-Fensters → 15%-Regel nicht anwendbar'}
- 15%-Schwelle = 15% des Gebäudeanteils: ${schwelle15Prozent > 0 ? schwelle15Prozent + ' €' : 'nicht berechenbar'}
- KUMULATIVE Summe ALLER Instandhaltungen im 3-Jahres-Fenster (alle Jahre zusammen): ${summeDreiJahre} €
- Details aller Maßnahmen im 3-Jahres-Fenster: ${instandhaltungenDreiJahre.length > 0 ? instandhaltungenDreiJahre.map((i: any) => `${i.datum}: ${i.beschreibung} ${Number(i.betrag) || 0}€`).join(', ') : 'keine'}
- Ergebnis 15%-Prüfung: ${istImDreiJahresFenster ? (summeDreiJahre > schwelle15Prozent ? `SCHWELLE ÜBERSCHRITTEN (${summeDreiJahre}€ > ${schwelle15Prozent}€) → ALLE Maßnahmen im Fenster werden anschaffungsnahe Herstellungskosten → zur AfA-Basis addieren, KEINE separate Abschreibung` : `Schwelle NICHT überschritten (${summeDreiJahre}€ ≤ ${schwelle15Prozent}€) → normale Klassifizierung als Erhaltungsaufwand oder Herstellungsaufwand`) : 'nicht anwendbar'}

WIRTSCHAFTSPLAN ${steuerjahr}:
${wirtschaftsplan ? `- Hausgeld gesamt: ${Number(wirtschaftsplan.betrag) || 0} €
- Beschreibung: ${wirtschaftsplan.beschreibung || '—'}
- Hinweis: Vom Hausgeld absetzbar: Verwaltungskosten, Versicherungen, lfd. Betriebskosten. NICHT sofort absetzbar: Zuführung zur Instandhaltungsrücklage (erst bei Verwendung durch WEG).` : '- Kein Wirtschaftsplan eingetragen'}

GRUNDSTEUER ${steuerjahr}:
${grundsteuer ? `- Betrag: ${Number(grundsteuer.betrag) || 0} € (vollständig absetzbar als Werbungskosten)` : '- Nicht eingetragen'}

STEUERLICHE REGELN — EXAKT ANZUWENDEN:

AfA (§7 Abs. 4 EStG):
- Gebäude Baujahr nach 1924: AfA-Satz 2% pro Jahr
- Kaufdatum ab 01.10.2023: AfA-Satz 3% pro Jahr (§7 Abs. 4 Satz 1 Nr. 2a EStG n.F.)
- Bemessungsgrundlage = Gebäudeanteil (NICHT Grundstück) = ca. 80% des Kaufpreises
- Falls anschaffungsnahe Herstellungskosten (15%-Regel greift): Diese zur AfA-Basis addieren, dann neuer AfA-Betrag auf erhöhte Basis mit demselben AfA-Satz — KEINE separate Nutzungsdauer für die Einzelmaßnahmen

Instandhaltungsklassifizierung (NUR wenn 15%-Regel NICHT greift oder außerhalb 3-Jahres-Fenster):
- Erhaltungsaufwand (sofort absetzbar): Reparaturen, Austausch gleichwertiger Bauteile, Wartung
- Herstellungsaufwand (über Nutzungsdauer): Modernisierung die Gebäudestandard erhöht, neue Bauteile die vorher nicht vorhanden waren
- Grenzfälle: Heizungstausch = Erhaltungsaufwand wenn Ersatz; Badmodernisierung mit gleichem Standard = Erhaltungsaufwand; Anbau/Aufstockung = immer Herstellungsaufwand

KRITISCHE FEHLER DIE DU VERMEIDEN MUSST:
1. Niemals einzelne Positionen als "anschaffungsnah" einstufen wenn die KUMULATIVE SUMME die Schwelle nicht überschreitet
2. Wenn 15%-Regel greift: ALLE betroffenen Maßnahmen laufen über erhöhte AfA-Basis — KEINE separaten 20-Jahres-Abschreibungen für einzelne Maßnahmen
3. Schuldzinsen sind nur der Zinsanteil, nie die Tilgung

Antworte AUSSCHLIESSLICH mit diesem JSON (keine Beispielwerte, echte Zahlen):
{
  "steuerjahr": ${steuerjahr},
  "einnahmen": {
    "mieteinnahmen_kalt": 0,
    "nebenkosten": 0,
    "gesamt": 0
  },
  "werbungskosten": [
    {"kategorie": "AfA (Gebäudeabschreibung)", "betrag": 0, "erklaerung": "X% von Y€ Bemessungsgrundlage (Gebäudeanteil 80% des Kaufpreises)"},
    {"kategorie": "Schuldzinsen", "betrag": 0, "erklaerung": "Zinsanteil aus Darlehen X€ × Y% = Z€; Tilgung nicht absetzbar"},
    {"kategorie": "Grundsteuer", "betrag": 0, "erklaerung": "Vollständig absetzbar gemäß Bescheid"},
    {"kategorie": "Hausgeld / Betriebskosten", "betrag": 0, "erklaerung": "Absetzbarer Anteil aus Wirtschaftsplan (ohne Rücklage)"}
  ],
  "instandhaltung_sofort": [
    {"beschreibung": "Name der Maßnahme", "betrag": 0, "begruendung": "Erhaltungsaufwand weil …"}
  ],
  "instandhaltung_verteilt": [
    {"beschreibung": "Name der Maßnahme", "betrag": 0, "nutzungsdauer_jahre": 0, "absetzbar_pro_jahr": 0, "begruendung": "Herstellungsaufwand weil … (NUR wenn 15%-Regel nicht greift)"}
  ],
  "anschaffungsnahe_hk": {
    "greift": false,
    "summe_massnahmen": 0,
    "schwelle": 0,
    "erklaerung": "Summe X€ überschreitet/unterschreitet Schwelle Y€ (15% von Z€ Gebäudeanteil). Betroffene Maßnahmen: …",
    "neue_afa_basis": 0,
    "neuer_afa_betrag": 0
  },
  "ergebnis": {
    "einnahmen": 0,
    "werbungskosten_gesamt": 0,
    "ueberschuss_verlust": 0,
    "bewertung": "Überschuss von X€ ist als Einkünfte aus V+V zu versteuern ODER Verlust von X€ ist mit anderen Einkünften verrechenbar (negatives Einkommen)"
  },
  "empfehlungen": [
    "Konkrete steuerliche Empfehlung mit Bezug auf die tatsächlichen Daten"
  ],
  "disclaimer": "Diese KI-Analyse dient als Orientierung und ersetzt keine individuelle Steuerberatung. Bitte mit einem Steuerberater abstimmen."
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API Fehler: ${err}`)
    }

    const result = await response.json()
    const textBlock = result.content?.find((c: any) => c.type === 'text')
    if (!textBlock?.text) throw new Error(`Keine Antwort von Claude: ${JSON.stringify(result)}`)
    let text = textBlock.text.trim()
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const analyse = JSON.parse(text)

    return new Response(JSON.stringify({ analyse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
