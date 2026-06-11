import { monatlicherBetrag } from '../data/kategorien'
import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info, Star, Lightbulb } from 'lucide-react'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
function pct(n) {
  return `${n.toFixed(1)}%`
}

const heute = () => new Date().toISOString().slice(0, 7)
const vorMonat = () => {
  const d = new Date()
  d.setMonth(d.getMonth() - 1)
  return d.toISOString().slice(0, 7)
}

// ─── Score Berechnung ────────────────────────────────────────────────
function berechneScore({ sparquote, fixkostenquote, budgetEinhaltung, hatEinnahmen, hatFixkosten }) {
  let punkte = 0
  const details = []

  // 1. Sparquote (0–40 Punkte)
  if (!hatEinnahmen) {
    details.push({ label: 'Sparquote', punkte: 0, max: 40, info: 'Einnahmen noch nicht eingetragen' })
  } else if (sparquote >= 20) {
    punkte += 40; details.push({ label: 'Sparquote', punkte: 40, max: 40, info: `${pct(sparquote)} — Ausgezeichnet` })
  } else if (sparquote >= 15) {
    punkte += 30; details.push({ label: 'Sparquote', punkte: 30, max: 40, info: `${pct(sparquote)} — Sehr gut` })
  } else if (sparquote >= 10) {
    punkte += 20; details.push({ label: 'Sparquote', punkte: 20, max: 40, info: `${pct(sparquote)} — Gut` })
  } else if (sparquote >= 5) {
    punkte += 10; details.push({ label: 'Sparquote', punkte: 10, max: 40, info: `${pct(sparquote)} — Ausbaufähig` })
  } else {
    punkte += 0; details.push({ label: 'Sparquote', punkte: 0, max: 40, info: sparquote < 0 ? 'Ausgaben übersteigen Einnahmen!' : `${pct(sparquote)} — Kritisch` })
  }

  // 2. Fixkostenquote (0–30 Punkte)
  if (!hatEinnahmen) {
    details.push({ label: 'Fixkostenquote', punkte: 0, max: 30, info: 'Einnahmen noch nicht eingetragen' })
  } else if (fixkostenquote <= 40) {
    punkte += 30; details.push({ label: 'Fixkostenquote', punkte: 30, max: 30, info: `${pct(fixkostenquote)} — Ausgezeichnet (Ziel: max. 50%)` })
  } else if (fixkostenquote <= 50) {
    punkte += 20; details.push({ label: 'Fixkostenquote', punkte: 20, max: 30, info: `${pct(fixkostenquote)} — Im grünen Bereich` })
  } else if (fixkostenquote <= 60) {
    punkte += 10; details.push({ label: 'Fixkostenquote', punkte: 10, max: 30, info: `${pct(fixkostenquote)} — Etwas hoch (Ziel: max. 50%)` })
  } else {
    punkte += 0; details.push({ label: 'Fixkostenquote', punkte: 0, max: 30, info: `${pct(fixkostenquote)} — Zu hoch! Prüfe deine Fixkosten` })
  }

  // 3. Budget-Einhaltung (0–20 Punkte)
  if (budgetEinhaltung === null) {
    punkte += 10; details.push({ label: 'Budget-Kontrolle', punkte: 10, max: 20, info: 'Keine Budgets gesetzt (neutral)' })
  } else if (budgetEinhaltung >= 1) {
    punkte += 20; details.push({ label: 'Budget-Kontrolle', punkte: 20, max: 20, info: 'Alle Budgets eingehalten 🎉' })
  } else if (budgetEinhaltung >= 0.7) {
    punkte += 14; details.push({ label: 'Budget-Kontrolle', punkte: 14, max: 20, info: `${pct(budgetEinhaltung * 100)} der Budgets eingehalten` })
  } else {
    punkte += 5; details.push({ label: 'Budget-Kontrolle', punkte: 5, max: 20, info: `Mehrere Budgets überschritten` })
  }

  // 4. Datenvollständigkeit (0–10 Punkte)
  let datenPunkte = 0
  if (hatEinnahmen) datenPunkte += 5
  if (hatFixkosten) datenPunkte += 5
  punkte += datenPunkte
  details.push({ label: 'Daten vollständig', punkte: datenPunkte, max: 10, info: datenPunkte === 10 ? 'Einnahmen & Fixkosten eingetragen' : 'Noch nicht alle Grunddaten eingetragen' })

  return { score: Math.round(punkte), details }
}

// ─── Einblicke generieren ────────────────────────────────────────────
function generiereEinblicke({ einnahmen, fixkosten, variableKosten, budgets, sparquote, fixkostenquote }) {
  const einblicke = []
  const monat = heute()
  const letzterMonat = vorMonat()

  const varAktuell = variableKosten.filter(v => v.datum.startsWith(monat)).reduce((s, v) => s + v.betrag, 0)
  const varVormonat = variableKosten.filter(v => v.datum.startsWith(letzterMonat)).reduce((s, v) => s + v.betrag, 0)
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const verfuegbar = einnahmenSumme - fixSumme - varAktuell

  // Sparquote Einblick
  if (einnahmenSumme > 0) {
    if (sparquote >= 20) {
      einblicke.push({ typ: 'positiv', icon: Star, titel: 'Starke Sparquote!', text: `Du sparst ${pct(sparquote)} deines Einkommens. Das ist ausgezeichnet — die 20%-Regel gilt als Goldstandard für den Vermögensaufbau.` })
    } else if (sparquote > 0 && sparquote < 10) {
      const fehlend = einnahmenSumme * 0.10 - (einnahmenSumme - fixSumme - varAktuell)
      einblicke.push({ typ: 'warnung', icon: TrendingUp, titel: 'Sparquote unter 10%', text: `Du sparst aktuell ${pct(sparquote)}. Um auf 10% zu kommen, müsstest du deine Ausgaben um ca. ${euro(Math.abs(fehlend))} senken. Schau, wo du am meisten ausgibst.` })
    } else if (sparquote < 0) {
      einblicke.push({ typ: 'kritisch', icon: AlertTriangle, titel: 'Ausgaben übersteigen Einnahmen!', text: `Du gibst aktuell ${euro(Math.abs(verfuegbar))} mehr aus als du einnimmst. Das ist nicht nachhaltig. Prüfe sofort deine größten Kostenpositionen.` })
    }
  }

  // Fixkostenquote Einblick
  if (einnahmenSumme > 0 && fixkostenquote > 50) {
    const zuviel = fixSumme - einnahmenSumme * 0.5
    einblicke.push({ typ: 'warnung', icon: AlertTriangle, titel: `Fixkostenquote zu hoch (${pct(fixkostenquote)})`, text: `Empfohlen: max. 50% des Nettoeinkommens für Fixkosten. Du liegst ${euro(zuviel)} darüber. Prüfe welche Fixkosten du reduzieren oder kündigen kannst.` })
  } else if (einnahmenSumme > 0 && fixkostenquote <= 40) {
    einblicke.push({ typ: 'positiv', icon: CheckCircle, titel: 'Fixkostenquote im grünen Bereich', text: `Nur ${pct(fixkostenquote)} deines Einkommens gehen für Fixkosten drauf. Das gibt dir Flexibilität — nutze den Spielraum für Sparziele.` })
  }

  // Vormonats-Vergleich Variable Kosten
  if (varVormonat > 0 && varAktuell > 0) {
    const diff = varAktuell - varVormonat
    const diffPct = (diff / varVormonat) * 100
    if (diffPct > 20) {
      einblicke.push({ typ: 'warnung', icon: TrendingUp, titel: `Variable Kosten +${pct(diffPct)} gegenüber Vormonat`, text: `Im Vergleich zum Vormonat (${euro(varVormonat)}) gibst du diesen Monat ${euro(Math.abs(diff))} mehr aus. Schau welche Kategorie den Ausschlag gibt.` })
    } else if (diffPct < -10) {
      einblicke.push({ typ: 'positiv', icon: TrendingDown, titel: `Variable Kosten gesunken (${pct(Math.abs(diffPct))})`, text: `Gut gemacht! Du hast ${euro(Math.abs(diff))} weniger ausgegeben als letzten Monat.` })
    }
  }

  // Kategorie-Analyse: Welche Kategorie ist am teuersten?
  const katSummen = {}
  variableKosten.filter(v => v.datum.startsWith(monat)).forEach(v => {
    katSummen[v.kategorie || 'Sonstiges'] = (katSummen[v.kategorie || 'Sonstiges'] || 0) + v.betrag
  })
  const topKat = Object.entries(katSummen).sort((a, b) => b[1] - a[1])[0]
  if (topKat && einnahmenSumme > 0 && (topKat[1] / einnahmenSumme) > 0.15) {
    einblicke.push({ typ: 'info', icon: Info, titel: `Größter variabler Posten: ${topKat[0]}`, text: `${euro(topKat[1])} oder ${pct((topKat[1] / einnahmenSumme) * 100)} deines Einkommens gehen für "${topKat[0]}" drauf. Lohnt es sich, hier ein Budget-Limit zu setzen?` })
  }

  // Budget überschritten
  const ueberschrittene = budgets.filter(b => {
    const ist = variableKosten.filter(v => v.datum.startsWith(monat) && v.kategorie === b.kategorie).reduce((s, v) => s + v.betrag, 0)
    return ist > b.betrag
  })
  if (ueberschrittene.length > 0) {
    einblicke.push({ typ: 'kritisch', icon: AlertTriangle, titel: `${ueberschrittene.length} Budget${ueberschrittene.length > 1 ? 's' : ''} überschritten`, text: `Folgende Kategorien haben ihr Budget gesprengt: ${ueberschrittene.map(b => b.kategorie).join(', ')}. Behalte sie im Blick.` })
  }

  // Keine Einnahmen eingetragen
  if (einnahmen.length === 0) {
    einblicke.push({ typ: 'info', icon: Lightbulb, titel: 'Tipp: Einnahmen eintragen', text: 'Trag dein Nettoeinkommen ein, um deinen Finanz-Score zu aktivieren und persönliche Einblicke zu erhalten.' })
  }

  // Keine Fixkosten
  if (fixkosten.length === 0) {
    einblicke.push({ typ: 'info', icon: Lightbulb, titel: 'Tipp: Fixkosten eintragen', text: 'Trag deine monatlichen Fixkosten ein, um ein vollständiges Bild deiner Finanzen zu bekommen.' })
  }

  // Alles super
  if (einblicke.filter(e => e.typ !== 'positiv').length === 0 && einnahmenSumme > 0) {
    einblicke.push({ typ: 'positiv', icon: Star, titel: 'Alles im grünen Bereich!', text: 'Deine Finanzen sehen sehr gut aus. Bleib dran — Konstanz ist der Schlüssel zu finanzieller Freiheit.' })
  }

  return einblicke.slice(0, 5)
}

// ─── Gauge SVG ───────────────────────────────────────────────────────
function ScoreGauge({ score }) {
  const r = 80
  const cx = 100
  const cy = 100
  const startAngle = 210
  const endAngle = -30
  const totalArc = 240
  const filled = (score / 100) * totalArc

  function polarToXY(angle, radius) {
    const rad = ((angle - 90) * Math.PI) / 180
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) }
  }

  function arcPath(startDeg, sweepDeg, radius) {
    const start = polarToXY(startDeg, radius)
    const end = polarToXY(startDeg + sweepDeg, radius)
    const large = sweepDeg > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const farbe = score >= 80 ? '#10b981' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  const label = score >= 80 ? 'Ausgezeichnet' : score >= 60 ? 'Gut' : score >= 40 ? 'Ausbaufähig' : 'Kritisch'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 160" className="w-56 h-44">
        {/* Hintergrund-Bogen */}
        <path d={arcPath(startAngle, totalArc, r)} fill="none" stroke="#e2eaf3" strokeWidth="14" strokeLinecap="round" />
        {/* Farbiger Bogen */}
        {score > 0 && (
          <path d={arcPath(startAngle, filled, r)} fill="none" stroke={farbe} strokeWidth="14" strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        )}
        {/* Score Zahl */}
        <text x="100" y="95" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#1e3a5f">{score}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#64748b">von 100 Punkten</text>
        {/* Label */}
        <text x="100" y="132" textAnchor="middle" fontSize="13" fontWeight="600" fill={farbe}>{label}</text>
      </svg>
    </div>
  )
}

// ─── Hauptkomponente ─────────────────────────────────────────────────
const EINBLICK_STILE = {
  positiv:  { bg: 'bg-emerald-50 border-emerald-200', icon: 'text-emerald-600', titel: 'text-emerald-800' },
  warnung:  { bg: 'bg-amber-50 border-amber-200',     icon: 'text-amber-600',   titel: 'text-amber-800' },
  kritisch: { bg: 'bg-red-50 border-red-200',          icon: 'text-red-600',     titel: 'text-red-800' },
  info:     { bg: 'bg-navy-50 border-navy-200',         icon: 'text-navy-500',    titel: 'text-navy-700' },
}

export default function FinanzScore({ fixkosten, variableKosten, einnahmen, budgets }) {
  const monat = heute()
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const varSumme = variableKosten.filter(v => v.datum.startsWith(monat)).reduce((s, v) => s + v.betrag, 0)
  const gesamtAusgaben = fixSumme + varSumme
  const sparquote = einnahmenSumme > 0 ? ((einnahmenSumme - gesamtAusgaben) / einnahmenSumme) * 100 : 0
  const fixkostenquote = einnahmenSumme > 0 ? (fixSumme / einnahmenSumme) * 100 : 0

  // Budget-Einhaltung
  let budgetEinhaltung = null
  if (budgets.length > 0) {
    const eingehalten = budgets.filter(b => {
      const ist = variableKosten.filter(v => v.datum.startsWith(monat) && v.kategorie === b.kategorie).reduce((s, v) => s + v.betrag, 0)
      return ist <= b.betrag
    }).length
    budgetEinhaltung = eingehalten / budgets.length
  }

  const { score, details } = berechneScore({
    sparquote, fixkostenquote, budgetEinhaltung,
    hatEinnahmen: einnahmen.length > 0,
    hatFixkosten: fixkosten.length > 0,
  })

  const einblicke = generiereEinblicke({ einnahmen, fixkosten, variableKosten, budgets, sparquote, fixkostenquote })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-1">Mein Finanz-Score</h2>
        <p className="text-sm text-navy-500">Wie weit bist du auf dem Weg zur finanziellen Freiheit?</p>
      </div>

      {/* Score Card */}
      <div className="card flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={score} />
        <div className="flex-1 w-full space-y-3">
          {details.map((d, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-navy-700 font-medium">{d.label}</span>
                <span className="text-navy-500">{d.punkte}/{d.max} Pkt · {d.info}</span>
              </div>
              <div className="w-full bg-navy-100 rounded-full h-1.5">
                <div
                  className="h-1.5 rounded-full bg-navy-500 transition-all duration-500"
                  style={{ width: `${(d.punkte / d.max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Persönliche Einblicke */}
      <div>
        <h3 className="font-semibold text-navy-800 mb-3 flex items-center gap-2">
          <Lightbulb size={17} className="text-gold" /> Persönliche Einblicke
        </h3>
        <div className="space-y-3">
          {einblicke.map((e, i) => {
            const stil = EINBLICK_STILE[e.typ]
            return (
              <div key={i} className={`rounded-xl border p-4 ${stil.bg}`}>
                <div className="flex items-start gap-3">
                  <e.icon size={18} className={`shrink-0 mt-0.5 ${stil.icon}`} />
                  <div>
                    <p className={`font-semibold text-sm ${stil.titel}`}>{e.titel}</p>
                    <p className="text-sm text-navy-600 mt-0.5">{e.text}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Legende */}
      <div className="card bg-navy-50 text-xs text-navy-500">
        <p className="font-semibold text-navy-700 mb-2">Wie wird der Score berechnet?</p>
        <div className="grid grid-cols-2 gap-1">
          <span>• Sparquote (≥20% = max. Punkte)</span>
          <span>• Fixkostenquote (≤40% = max. Punkte)</span>
          <span>• Budget-Einhaltung</span>
          <span>• Vollständigkeit der Daten</span>
        </div>
        <p className="mt-2">Der Score basiert auf deinen eingetragenen Daten und wird täglich aktualisiert.</p>
      </div>
    </div>
  )
}
