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
        max_tokens: 400,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'document',
              source: { type: 'base64', media_type: 'application/pdf', data: base64 },
            },
            {
              type: 'text',
              text: `Analysiere diese Versicherungspolice und antworte NUR mit einem JSON-Objekt, kein Text davor oder danach:
{
  "deckung": "Was genau ist versichert – ein kurzer Satz",
  "summe": "Versicherungssumme z.B. '5 Mio. CHF' oder leer",
  "selbstbehalt": "Selbstbehalt z.B. '200 CHF' oder leer",
  "hinweis": "Wichtigster Hinweis oder Ausschluss in einem kurzen Satz, oder leer"
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
    const text = result.content[0].text.trim()
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
