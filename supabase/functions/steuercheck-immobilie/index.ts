const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { immobilie, steuerjahr } = await req.json()

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

    // Wirtschaftsplan / Jahresabrechnung für das Steuerjahr
    const wirtschaftsplan = (immobilie.wirtschaftsplaene || []).find((w: any) => w.jahr === jahr)

    // Grundsteuer für das Steuerjahr
    const grundsteuer = (immobilie.steuern || []).find((s: any) => s.steuerjahr === jahr)

    // Finanzierung
    const fin = immobilie.finanzierung || {}

    const prompt = `Du bist ein deutschsprachiger Steuerexperte für Immobilien. Analysiere die folgenden Daten für das Steuerjahr ${steuerjahr} und antworte NUR mit dem JSON-Objekt unten — kein Text davor oder danach.

IMMOBILIENDATEN:
- Objekt: ${immobilie.name || 'Unbekannt'}, ${immobilie.adresse || ''}
- Kaufpreis: ${kaufpreis > 0 ? kaufpreis + ' €' : 'nicht angegeben'}
- Kaufdatum: ${immobilie.kaufdatum || 'nicht angegeben'} (Kaufjahr: ${kaufjahr || 'unbekannt'})
- Wohnfläche: ${immobilie.flaeche || 'unbekannt'} m²

MIETER & EINNAHMEN ${steuerjahr}:
${mieter.length > 0 ? mieter.map((m: any) => {
  const kalt = Number(m.kaltmiete) || 0
  const nk = Number(m.nebenkosten) || 0
  return `- ${m.name || 'Mieter'}: Kaltmiete ${kalt}€/Monat, Nebenkosten ${nk}€/Monat`
}).join('\n') : '- Keine Mieter eingetragen'}

FINANZIERUNG:
- Darlehensbetrag: ${Number(fin.betrag) || 0} €
- Zinssatz: ${Number(fin.zinssatz) || 0} %
- Tilgung: ${Number(fin.tilgung) || 0} %
- Geschätzte Jahreszinsen: ${Math.round(Number(fin.betrag) * Number(fin.zinssatz) / 100)} €

INSTANDHALTUNGEN ${steuerjahr}:
${instandhaltungen.length > 0 ? instandhaltungen.map((i: any) =>
  `- ${i.datum}: ${i.beschreibung || 'Maßnahme'}, ${Number(i.kosten) || 0} €, Kategorie: ${i.kategorie || 'nicht angegeben'}`
).join('\n') : '- Keine Instandhaltungen eingetragen'}

WIRTSCHAFTSPLAN / JAHRESABRECHNUNG ${steuerjahr}:
${wirtschaftsplan ? `- Gesamtbetrag Hausgeld: ${Number(wirtschaftsplan.betrag) || 0} €
- Beschreibung: ${wirtschaftsplan.beschreibung || '—'}` : '- Kein Wirtschaftsplan eingetragen'}

GRUNDSTEUER ${steuerjahr}:
${grundsteuer ? `- Betrag: ${Number(grundsteuer.betrag) || 0} €` : '- Nicht eingetragen'}

AUFGABE:
1. Berechne die steuerlichen Einnahmen (Kaltmiete × 12 pro aktivem Mieter)
2. Ermittle die Werbungskosten:
   - AfA: Bei Gebäuden nach 1924 = 2% der Anschaffungskosten (nur Gebäudeanteil, ca. 70-80% des Kaufpreises, nicht Grundstück). Falls Kaufdatum nach 01.09.2023: AfA = 3%.
   - Schuldzinsen: Jahreszinsen komplett absetzbar, Tilgung NICHT
   - Grundsteuer: komplett absetzbar
   - Hausgeld: Verwaltungskosten + Versicherungen absetzbar; Instandhaltungsrücklage erst bei tatsächlicher Verwendung (im Wirtschaftsplan prüfen)
3. Instandhaltungen klassifizieren:
   - Erhaltungsaufwand (sofort absetzbar): Reparaturen, Wartungen, Ersatz gleichwertiger Teile
   - Herstellungsaufwand (aktivierungspflichtig, über Nutzungsdauer verteilen): Modernisierungen, Verbesserungen, neue Bauteile die den Standard erhöhen
   - 15%-Regel beachten: Instandsetzungen in den ersten 3 Jahren nach Kauf, die 15% des Gebäudekaufpreises übersteigen = anschaffungsnahe Herstellungskosten → zur AfA-Basis addieren

Antworte AUSSCHLIESSLICH mit diesem JSON:
{
  "steuerjahr": ${steuerjahr},
  "einnahmen": {
    "mieteinnahmen_kalt": 0,
    "nebenkosten": 0,
    "gesamt": 0
  },
  "werbungskosten": [
    {"kategorie": "AfA (Gebäudeabschreibung)", "betrag": 0, "erklaerung": "2% von X€ Bemessungsgrundlage (80% des Kaufpreises)", "absetzbar": true},
    {"kategorie": "Schuldzinsen", "betrag": 0, "erklaerung": "Zinsen aus Darlehen, Tilgung nicht absetzbar", "absetzbar": true},
    {"kategorie": "Grundsteuer", "betrag": 0, "erklaerung": "Vollständig absetzbar", "absetzbar": true},
    {"kategorie": "Hausgeld / Betriebskosten", "betrag": 0, "erklaerung": "Verwaltung und Versicherungen absetzbar, Rücklage nur bei Verwendung", "absetzbar": true}
  ],
  "instandhaltung_sofort": [
    {"beschreibung": "Beispiel Reparatur", "betrag": 0, "begruendung": "Erhaltungsaufwand – gleichwertiger Ersatz"}
  ],
  "instandhaltung_verteilt": [
    {"beschreibung": "Beispiel Modernisierung", "betrag": 0, "nutzungsdauer_jahre": 0, "absetzbar_pro_jahr": 0, "begruendung": "Herstellungsaufwand – Verbesserung des Standards"}
  ],
  "ergebnis": {
    "einnahmen": 0,
    "werbungskosten_gesamt": 0,
    "ueberschuss_verlust": 0,
    "bewertung": "Überschuss von X€ zu versteuern ODER Verlust von X€ verrechenbar mit anderen Einkünften"
  },
  "empfehlungen": [
    "Konkrete Empfehlung 1",
    "Konkrete Empfehlung 2"
  ],
  "disclaimer": "Diese KI-Analyse dient als Orientierung und ersetzt keine Steuerberatung. Bitte mit einem Steuerberater abstimmen."
}`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API Fehler: ${err}`)
    }

    const result = await response.json()
    let text = result.content[0].text.trim()
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
