import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { pfad } = await req.json()

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // PDF aus Supabase Storage laden
    const { data, error } = await supabase.storage.from('dokumente').download(pfad)
    if (error) throw new Error(`Storage-Fehler: ${error.message}`)

    // In Base64 konvertieren
    const arrayBuffer = await data.arrayBuffer()
    const bytes = new Uint8Array(arrayBuffer)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
    const base64 = btoa(binary)

    // Claude API aufrufen (Haiku — schnell und günstig)
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY')!,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Analysiere diese Versicherungspolice und antworte NUR mit diesem JSON-Objekt, kein Text davor oder danach.

Regeln:
- Bei mehreren Deckungen (z.B. Hausrat + Haftpflicht): summen und selbstbehalte als Array mit je {label, wert}
- ausschluesse: max. 4 Punkte, jeder max. 6 Wörter, nur das Wesentliche
- faelligkeit, kuendigung, hinweis: jeweils ein kurzer Satz oder leer

{
  "deckung": "Ein Satz: was ist versichert",
  "summen": [{"label": "Hausrat", "wert": "67.000 CHF"}, {"label": "Haftpflicht", "wert": "5 Mio. CHF"}],
  "praemie": "406.61 CHF / Jahr",
  "selbstbehalte": [{"label": "Hausrat", "wert": "CHF 200"}, {"label": "Haftpflicht", "wert": "CHF 200"}],
  "ausschluesse": ["Vorsätzliche Schäden", "Krieg und Kernenergie", "Betriebs- und Berufshaftpflicht"],
  "faelligkeit": "Jährlich, Fälligkeit 01.01.",
  "kuendigung": "3 Monate vor Ende des Versicherungsjahres",
  "hinweis": "Sonstiger wichtiger Hinweis oder leer"
}`,
            },
          ],
        }],
      }),
    })

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Claude API Fehler: ${err}`)
    }

    const result = await response.json()
    let text = result.content[0].text.trim()
    // Markdown-Codeblöcke entfernen falls Claude ```json ... ``` zurückgibt
    text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const zusammenfassung = JSON.parse(text)

    return new Response(JSON.stringify({ zusammenfassung }), {
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
