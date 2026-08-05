import { monatlicherBetrag, monatlicheEinnahme, istSparEintrag } from '../data/kategorien'
import { TrendingUp, AlertTriangle, CheckCircle, Info, Star, Lightbulb } from 'lucide-react'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}
function pct(n) {
  return `${n.toFixed(1)}%`
}

function berechneScore({ sparquote, ausgabenquote, hatEinnahmen, hatAusgaben }) {
  let punkte = 0
  const details = []

  if (!hatEinnahmen) {
    details.push({ label: 'Sparquote', punkte: 0, max: 50, info: 'Einnahmen noch nicht eingetragen' })
  } else if (sparquote >= 20) {
    punkte += 50; details.push({ label: 'Sparquote', punkte: 50, max: 50, info: `${pct(sparquote)} — Ausgezeichnet` })
  } else if (sparquote >= 15) {
    punkte += 38; details.push({ label: 'Sparquote', punkte: 38, max: 50, info: `${pct(sparquote)} — Sehr gut` })
  } else if (sparquote >= 10) {
    punkte += 25; details.push({ label: 'Sparquote', punkte: 25, max: 50, info: `${pct(sparquote)} — Gut` })
  } else if (sparquote >= 5) {
    punkte += 13; details.push({ label: 'Sparquote', punkte: 13, max: 50, info: `${pct(sparquote)} — Ausbaufähig` })
  } else {
    punkte += 0; details.push({ label: 'Sparquote', punkte: 0, max: 50, info: sparquote < 0 ? 'Ausgaben übersteigen Einnahmen!' : `${pct(sparquote)} — Kritisch` })
  }

  if (!hatEinnahmen) {
    details.push({ label: 'Ausgabenquote', punkte: 0, max: 40, info: 'Einnahmen noch nicht eingetragen' })
  } else if (ausgabenquote <= 50) {
    punkte += 40; details.push({ label: 'Ausgabenquote', punkte: 40, max: 40, info: `${pct(ausgabenquote)} — Ausgezeichnet` })
  } else if (ausgabenquote <= 65) {
    punkte += 28; details.push({ label: 'Ausgabenquote', punkte: 28, max: 40, info: `${pct(ausgabenquote)} — Im grünen Bereich` })
  } else if (ausgabenquote <= 80) {
    punkte += 14; details.push({ label: 'Ausgabenquote', punkte: 14, max: 40, info: `${pct(ausgabenquote)} — Etwas hoch` })
  } else {
    punkte += 0; details.push({ label: 'Ausgabenquote', punkte: 0, max: 40, info: `${pct(ausgabenquote)} — Zu hoch!` })
  }

  let datenPunkte = 0
  if (hatEinnahmen) datenPunkte += 5
  if (hatAusgaben) datenPunkte += 5
  punkte += datenPunkte
  details.push({ label: 'Daten vollständig', punkte: datenPunkte, max: 10, info: datenPunkte === 10 ? 'Einnahmen & Ausgaben eingetragen' : 'Noch nicht alle Grunddaten eingetragen' })

  return { score: Math.round(punkte), details }
}

function generiereEinblicke({ einnahmen, fixkosten, sparquote, ausgabenquote }) {
  const einblicke = []
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicheEinnahme(e), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const sparBetrag = einnahmenSumme - fixSumme

  if (einnahmenSumme > 0) {
    if (sparquote >= 20) {
      einblicke.push({ typ: 'positiv', icon: Star, titel: 'Starke Sparquote!', text: `Du sparst ${pct(sparquote)} deines Einkommens — das ist ${euro(sparBetrag)} pro Monat. Die 20%-Regel gilt als Goldstandard für den Vermögensaufbau.` })
    } else if (sparquote >= 10) {
      einblicke.push({ typ: 'positiv', icon: CheckCircle, titel: `Sparquote ${pct(sparquote)}`, text: `Du sparst ${euro(sparBetrag)} pro Monat. Gut! Mit etwas mehr Disziplin bei den Ausgaben erreichst du die empfohlenen 20%.` })
    } else if (sparquote > 0) {
      const fehlend = einnahmenSumme * 0.10 - sparBetrag
      einblicke.push({ typ: 'warnung', icon: TrendingUp, titel: 'Sparquote unter 10%', text: `Du sparst aktuell ${pct(sparquote)}. Um auf 10% zu kommen, müsstest du deine Ausgaben um ca. ${euro(Math.abs(fehlend))} senken.` })
    } else if (sparquote < 0) {
      einblicke.push({ typ: 'kritisch', icon: AlertTriangle, titel: 'Ausgaben übersteigen Einnahmen!', text: `Du gibst ${euro(Math.abs(sparBetrag))} mehr aus als du einnimmst. Prüfe welche Ausgaben du reduzieren kannst.` })
    }
  }

  if (einnahmenSumme > 0 && ausgabenquote > 65) {
    const zuviel = fixSumme - einnahmenSumme * 0.65
    einblicke.push({ typ: 'warnung', icon: AlertTriangle, titel: `Ausgabenquote bei ${pct(ausgabenquote)}`, text: `Empfohlen: max. 65% des Nettoeinkommens für alle Ausgaben. Du liegst ${euro(zuviel)} darüber.` })
  } else if (einnahmenSumme > 0 && ausgabenquote <= 50) {
    einblicke.push({ typ: 'positiv', icon: CheckCircle, titel: 'Ausgabenquote im grünen Bereich', text: `Nur ${pct(ausgabenquote)} deines Einkommens gehen für Ausgaben drauf. Nutze den Spielraum für Sparziele und Investitionen.` })
  }

  const topPosten = [...fixkosten].sort((a, b) => monatlicherBetrag(b.betrag, b.intervall) - monatlicherBetrag(a.betrag, a.intervall))[0]
  if (topPosten && einnahmenSumme > 0) {
    const betrag = monatlicherBetrag(topPosten.betrag, topPosten.intervall)
    const anteil = (betrag / einnahmenSumme) * 100
    if (anteil > 25) {
      einblicke.push({ typ: 'info', icon: Info, titel: `Größter Posten: ${topPosten.name}`, text: `${euro(betrag)}/Monat — das sind ${pct(anteil)} deines Einkommens. Prüfe ob dieser Posten optimierbar ist.` })
    }
  }

  if (einnahmen.length === 0) {
    einblicke.push({ typ: 'info', icon: Lightbulb, titel: 'Tipp: Einnahmen eintragen', text: 'Trag dein Nettoeinkommen ein, um deinen Finanz-Score zu aktivieren.' })
  }
  if (fixkosten.length === 0) {
    einblicke.push({ typ: 'info', icon: Lightbulb, titel: 'Tipp: Ausgaben eintragen', text: 'Trag deine monatlichen Ausgaben ein (Fixkosten + geschätzte variable Kosten wie Lebensmittel, Freizeit etc.).' })
  }

  if (einblicke.filter(e => e.typ !== 'positiv').length === 0 && einnahmenSumme > 0) {
    einblicke.push({ typ: 'positiv', icon: Star, titel: 'Alles im grünen Bereich!', text: 'Deine Finanzen sehen sehr gut aus. Bleib dran — Konstanz ist der Schlüssel zu finanzieller Freiheit.' })
  }

  return einblicke.slice(0, 5)
}

function ScoreGauge({ score }) {
  const r = 80
  const cx = 100
  const cy = 100
  const startAngle = 210
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

  const farbe = score >= 80 ? '#2e6b52' : score >= 60 ? '#f59e0b' : score >= 40 ? '#f97316' : '#ef4444'
  const label = score >= 80 ? 'Ausgezeichnet' : score >= 60 ? 'Gut' : score >= 40 ? 'Ausbaufähig' : 'Kritisch'

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 200 160" className="w-56 h-44">
        <path d={arcPath(startAngle, totalArc, r)} fill="none" stroke="#e8dece" strokeWidth="14" strokeLinecap="round" />
        {score > 0 && (
          <path d={arcPath(startAngle, filled, r)} fill="none" stroke={farbe} strokeWidth="14" strokeLinecap="round" />
        )}
        <text x="100" y="95" textAnchor="middle" fontSize="36" fontWeight="bold" fill="#321f13">{score}</text>
        <text x="100" y="112" textAnchor="middle" fontSize="11" fill="#8f7a69">von 100 Punkten</text>
        <text x="100" y="132" textAnchor="middle" fontSize="13" fontWeight="600" fill={farbe}>{label}</text>
      </svg>
    </div>
  )
}

const EINBLICK_STILE = {
  positiv:  { bg: 'border-brand-200', bgStyle: { background: '#edf7f2' }, icon: 'text-brand-500', titel: 'text-brand-700' },
  warnung:  { bg: 'bg-amber-50 border-amber-200', bgStyle: {}, icon: 'text-amber-600', titel: 'text-amber-800' },
  kritisch: { bg: 'bg-red-50 border-red-200', bgStyle: {}, icon: 'text-red-600', titel: 'text-red-800' },
  info:     { bg: 'border-navy-100', bgStyle: { background: '#faf8f4' }, icon: 'text-navy-400', titel: 'text-navy-700' },
}

export default function FinanzScore({ fixkosten, einnahmen }) {
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicheEinnahme(e), 0)
  const fixAusgaben = fixkosten.filter(f => !istSparEintrag(f))
  const fixSpareinlagen = fixkosten.filter(f => istSparEintrag(f))
  const fixSumme = fixAusgaben.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const fixSparSumme = fixSpareinlagen.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const sparBetrag = einnahmenSumme - fixSumme
  const sparquote = einnahmenSumme > 0 ? ((sparBetrag + fixSparSumme) / einnahmenSumme) * 100 : 0
  const ausgabenquote = einnahmenSumme > 0 ? (fixSumme / einnahmenSumme) * 100 : 0

  const { score, details } = berechneScore({
    sparquote, ausgabenquote,
    hatEinnahmen: einnahmen.length > 0,
    hatAusgaben: fixkosten.length > 0,
  })

  const einblicke = generiereEinblicke({ einnahmen, fixkosten, sparquote, ausgabenquote })

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-1">Mein Finanz-Score</h2>
        <p className="text-sm text-navy-400">Wie weit bist du auf dem Weg zur finanziellen Freiheit?</p>
      </div>

      <div className="card flex flex-col sm:flex-row items-center gap-6">
        <ScoreGauge score={score} />
        <div className="flex-1 w-full space-y-3">
          {details.map((d, i) => (
            <div key={i}>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-navy-700 font-medium">{d.label}</span>
                <span className="text-navy-400">{d.punkte}/{d.max} Pkt · {d.info}</span>
              </div>
              <div className="w-full rounded-full h-1.5" style={{ background: '#e8dece' }}>
                <div
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{ width: `${(d.punkte / d.max) * 100}%`, background: '#2e6b52' }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="font-serif font-semibold text-navy-700 mb-3 flex items-center gap-2">
          <Lightbulb size={17} className="text-amber-500" /> Persönliche Einblicke
        </h3>
        <div className="space-y-3">
          {einblicke.map((e, i) => {
            const stil = EINBLICK_STILE[e.typ]
            return (
              <div key={i} className={`rounded-xl border p-4 ${stil.bg}`} style={stil.bgStyle}>
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

      <div className="card text-xs text-navy-500" style={{ background: '#faf8f4' }}>
        <p className="font-semibold text-navy-700 mb-2">Wie wird der Score berechnet?</p>
        <div className="grid grid-cols-2 gap-1">
          <span>• Sparquote (≥20% = max. Punkte)</span>
          <span>• Ausgabenquote (≤50% = max. Punkte)</span>
          <span>• Vollständigkeit der Daten</span>
        </div>
        <p className="mt-2">Trag alle monatlichen Ausgaben unter "Monatl. Ausgaben" ein — Fixkosten und geschätzte variable Kosten wie Lebensmittel oder Freizeit.</p>
      </div>
    </div>
  )
}
