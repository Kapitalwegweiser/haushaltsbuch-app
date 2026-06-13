import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { monatlicherBetrag, monatlicheEinnahme } from '../data/kategorien'
import { TrendingUp, Info, PiggyBank, Sparkles } from 'lucide-react'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

const RENDITE = 0.07

function berechneWachstum(monatlichSpar, jahre) {
  const monatsRendite = Math.pow(1 + RENDITE, 1 / 12) - 1
  const punkte = []

  for (let j = 0; j <= jahre; j++) {
    const m = j * 12
    const eingezahlt = monatlichSpar * m
    const mitZinseszins = m === 0 ? 0 : monatlichSpar * ((Math.pow(1 + monatsRendite, m) - 1) / monatsRendite)
    punkte.push({
      jahr: j === 0 ? 'Heute' : `Jahr ${j}`,
      eingezahlt: Math.round(eingezahlt),
      mitZinseszins: Math.round(mitZinseszins),
      zinsgewinn: Math.round(mitZinseszins - eingezahlt),
    })
  }
  return punkte
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card text-sm" style={{ padding: '12px 16px', minWidth: 180 }}>
      <p className="font-serif font-semibold text-navy-700 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-semibold">{euro(p.value)}</span>
        </p>
      ))}
      {payload.length === 2 && (
        <p className="text-brand-600 font-semibold mt-1 border-t pt-1 flex justify-between gap-4" style={{ borderColor: '#e8dece' }}>
          <span>Zinsgewinn:</span>
          <span>{euro(payload[1].value - payload[0].value)}</span>
        </p>
      )}
    </div>
  )
}

export default function Wachstumsprognose({ einnahmen, fixkosten }) {
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicheEinnahme(e), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const berechnetesSpar = Math.max(0, Math.round(einnahmenSumme - fixSumme))

  const [monatlichSpar, setMonatlichSpar] = useState(berechnetesSpar || 300)
  const [jahre, setJahre] = useState(20)

  const daten = useMemo(() => berechneWachstum(monatlichSpar, jahre), [monatlichSpar, jahre])
  const endwert = daten[daten.length - 1]

  const xTickFormatter = (val) => {
    if (val === 'Heute') return 'Heute'
    const num = parseInt(val.replace('Jahr ', ''))
    if (jahre <= 10) return num % 2 === 0 ? val : ''
    return num % 5 === 0 ? val : ''
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-1">Wachstumsprognose</h2>
        <p className="text-sm text-navy-400">Was aus deiner Sparquote werden kann — basierend auf einem global gestreuten ETF.</p>
      </div>

      {/* Einstellungen */}
      <div className="card space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Monatliche Sparrate</label>
            <span className="text-lg font-bold text-navy-700">{euro(monatlichSpar)}</span>
          </div>
          <input
            type="range" min="25" max="5000" step="25"
            value={monatlichSpar}
            onChange={e => setMonatlichSpar(+e.target.value)}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-navy-400 mt-1">
            <span>25 €</span><span>5.000 €</span>
          </div>
          {berechnetesSpar > 0 && (
            <button
              onClick={() => setMonatlichSpar(berechnetesSpar)}
              className="mt-2 text-xs text-brand-500 hover:text-brand-600 underline underline-offset-2"
            >
              Aus meiner Sparquote übernehmen ({euro(berechnetesSpar)} / Monat)
            </button>
          )}
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Anlagehorizont</label>
            <span className="text-lg font-bold text-navy-700">{jahre} Jahre</span>
          </div>
          <input
            type="range" min="1" max="40" step="1"
            value={jahre}
            onChange={e => setJahre(+e.target.value)}
            className="w-full accent-brand-500"
          />
          <div className="flex justify-between text-xs text-navy-400 mt-1">
            <span>1 Jahr</span><span>40 Jahre</span>
          </div>
        </div>

        <div className="flex items-center gap-2 rounded-xl px-3 py-2 text-xs text-navy-600" style={{ background: '#f7f3ed' }}>
          <Info size={14} className="shrink-0 text-navy-400" />
          Angenommene Rendite: <span className="font-semibold">7% p.a.</span> — historischer Durchschnitt des <span className="font-semibold">FTSE All-World</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="flex justify-center mb-2"><PiggyBank size={20} className="text-navy-400" /></div>
          <p className="label mb-1">Eingezahlt</p>
          <p className="text-base font-bold text-navy-700">{euro(endwert.eingezahlt)}</p>
        </div>
        <div className="card text-center">
          <div className="flex justify-center mb-2"><TrendingUp size={20} className="text-brand-500" /></div>
          <p className="label mb-1">Zinsgewinn</p>
          <p className="text-base font-bold text-brand-600">{euro(endwert.zinsgewinn)}</p>
        </div>
        <div className="card text-center" style={{ borderColor: '#c9a227', borderWidth: '1.5px' }}>
          <div className="flex justify-center mb-2"><Sparkles size={20} style={{ color: '#c9a227' }} /></div>
          <p className="label mb-1">Endkapital</p>
          <p className="text-base font-bold text-navy-700">{euro(endwert.mitZinseszins)}</p>
        </div>
      </div>

      {/* Motivations-Banner */}
      <div className="card flex items-start gap-4" style={{ borderLeftWidth: '4px', borderLeftColor: '#2e6b52' }}>
        <Sparkles size={18} style={{ color: '#c9a227' }} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-serif font-semibold text-navy-700">
            {euro(monatlichSpar)} / Monat → {euro(endwert.mitZinseszins)} in {jahre} Jahren
          </p>
          <p className="text-sm text-navy-400 mt-0.5">
            Zinseszins: {euro(endwert.zinsgewinn)} Gewinn auf {euro(endwert.eingezahlt)} Einzahlung
            {endwert.eingezahlt > 0 ? ` (+${Math.round((endwert.zinsgewinn / endwert.eingezahlt) * 100)}%)` : ''}
          </p>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="font-serif font-semibold text-navy-700 mb-4">Kapitalentwicklung über {jahre} Jahre</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={daten} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gradEingezahlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6b5c4d" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6b5c4d" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradZins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2e6b52" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#2e6b52" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e8dece" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} tickFormatter={xTickFormatter} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="eingezahlt" name="Eingezahlt" stroke="#6b5c4d" strokeWidth={2} fill="url(#gradEingezahlt)" />
            <Area type="monotone" dataKey="mitZinseszins" name="Mit Zinseszins (FTSE All-World)" stroke="#2e6b52" strokeWidth={2} fill="url(#gradZins)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border p-4 text-xs text-navy-500 leading-relaxed" style={{ background: '#faf8f4', borderColor: '#e8dece' }}>
        <span className="font-semibold text-navy-600">Hinweis:</span> Diese Prognose dient ausschließlich zur Veranschaulichung des Zinseszins-Effekts und stellt keine Anlageberatung dar. Die angenommenen 7% p.a. basieren auf historischen Durchschnittsrenditen des FTSE All-World Index. Vergangene Renditen sind keine Garantie für zukünftige Ergebnisse. Bitte konsultiere einen unabhängigen Finanzberater für persönliche Anlageentscheidungen.
      </div>
    </div>
  )
}
