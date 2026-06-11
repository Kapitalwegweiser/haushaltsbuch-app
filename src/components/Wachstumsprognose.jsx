import { useState, useMemo } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { monatlicherBetrag } from '../data/kategorien'
import { TrendingUp, Info, PiggyBank, Landmark, Sparkles } from 'lucide-react'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
}

const heute = () => new Date().toISOString().slice(0, 7)
const RENDITE = 0.07 // 7% p.a. — FTSE All-World historischer Durchschnitt

function berechneWachstum(monatlichSpar, jahre) {
  const monate = jahre * 12
  const monatsRendite = Math.pow(1 + RENDITE, 1 / 12) - 1
  const punkte = []

  for (let j = 0; j <= jahre; j++) {
    const m = j * 12
    const eingezahlt = monatlichSpar * m
    // Zukünftiger Wert eines monatlichen Sparplans: FV = PMT * ((1+r)^n - 1) / r
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
    <div className="bg-white border border-navy-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-navy-800 mb-2">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }} className="flex justify-between gap-4">
          <span>{p.name}:</span>
          <span className="font-semibold">{euro(p.value)}</span>
        </p>
      ))}
      {payload.length === 2 && (
        <p className="text-emerald-600 font-semibold mt-1 border-t border-navy-100 pt-1 flex justify-between gap-4">
          <span>Zinsgewinn:</span>
          <span>{euro(payload[1].value - payload[0].value)}</span>
        </p>
      )}
    </div>
  )
}

export default function Wachstumsprognose({ einnahmen, fixkosten, variableKosten }) {
  const monat = heute()

  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const varSumme = variableKosten.filter(v => v.datum.startsWith(monat)).reduce((s, v) => s + v.betrag, 0)
  const berechnetesSpar = Math.max(0, Math.round(einnahmenSumme - fixSumme - varSumme))

  const [monatlichSpar, setMonatlichSpar] = useState(berechnetesSpar || 300)
  const [jahre, setJahre] = useState(20)

  const daten = useMemo(() => berechneWachstum(monatlichSpar, jahre), [monatlichSpar, jahre])
  const endwert = daten[daten.length - 1]

  // Nur jeden 5. Datenpunkt beschriften (ab Jahr 5) für saubere X-Achse
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
        <p className="text-sm text-navy-500">Was aus deiner Sparquote werden kann — basierend auf einem global gestreuten ETF.</p>
      </div>

      {/* Einstellungen */}
      <div className="card space-y-5">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label mb-0">Monatliche Sparrate</label>
            <span className="text-lg font-bold text-navy-700">{euro(monatlichSpar)}</span>
          </div>
          <input
            type="range"
            min="25"
            max="5000"
            step="25"
            value={monatlichSpar}
            onChange={e => setMonatlichSpar(+e.target.value)}
            className="w-full accent-navy-600"
          />
          <div className="flex justify-between text-xs text-navy-400 mt-1">
            <span>25 €</span>
            <span>5.000 €</span>
          </div>
          {berechnetesSpar > 0 && (
            <button
              onClick={() => setMonatlichSpar(berechnetesSpar)}
              className="mt-2 text-xs text-navy-500 hover:text-navy-700 underline underline-offset-2"
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
            type="range"
            min="1"
            max="40"
            step="1"
            value={jahre}
            onChange={e => setJahre(+e.target.value)}
            className="w-full accent-navy-600"
          />
          <div className="flex justify-between text-xs text-navy-400 mt-1">
            <span>1 Jahr</span>
            <span>40 Jahre</span>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-navy-50 rounded-xl px-3 py-2 text-xs text-navy-600">
          <Info size={14} className="shrink-0 text-navy-400" />
          Angenommene Rendite: <span className="font-semibold">7% p.a.</span> — historischer Durchschnitt des <span className="font-semibold">FTSE All-World</span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center">
          <div className="flex justify-center mb-2"><PiggyBank size={20} className="text-navy-400" /></div>
          <p className="text-xs text-navy-500 mb-1">Eingezahlt</p>
          <p className="text-base font-bold text-navy-700">{euro(endwert.eingezahlt)}</p>
        </div>
        <div className="card text-center">
          <div className="flex justify-center mb-2"><TrendingUp size={20} className="text-emerald-500" /></div>
          <p className="text-xs text-navy-500 mb-1">Zinsgewinn</p>
          <p className="text-base font-bold text-emerald-600">{euro(endwert.zinsgewinn)}</p>
        </div>
        <div className="card text-center bg-navy-700">
          <div className="flex justify-center mb-2"><Sparkles size={20} className="text-gold" /></div>
          <p className="text-xs text-navy-300 mb-1">Endkapital</p>
          <p className="text-base font-bold text-white">{euro(endwert.mitZinseszins)}</p>
        </div>
      </div>

      {/* Motivations-Banner */}
      <div className="card bg-gradient-to-r from-navy-700 to-navy-600 text-white">
        <div className="flex items-start gap-3">
          <Sparkles size={22} className="text-gold shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">
              {euro(monatlichSpar)} / Monat → {euro(endwert.mitZinseszins)} in {jahre} Jahren
            </p>
            <p className="text-navy-200 text-sm mt-0.5">
              Der Zinseszins arbeitet für dich: {euro(endwert.zinsgewinn)} Gewinn auf {euro(endwert.eingezahlt)} Einzahlung
              {' '}({endwert.eingezahlt > 0 ? `+${Math.round((endwert.zinsgewinn / endwert.eingezahlt) * 100)}%` : ''}).
            </p>
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">Kapitalentwicklung über {jahre} Jahre</h3>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={daten} margin={{ top: 4, right: 4, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gradEingezahlt" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2d5a8e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2d5a8e" stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="gradZins" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="jahr" tick={{ fontSize: 11 }} tickFormatter={xTickFormatter} />
            <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Area type="monotone" dataKey="eingezahlt" name="Eingezahlt" stroke="#2d5a8e" strokeWidth={2} fill="url(#gradEingezahlt)" />
            <Area type="monotone" dataKey="mitZinseszins" name="Mit Zinseszins (FTSE All-World)" stroke="#10b981" strokeWidth={2} fill="url(#gradZins)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Disclaimer */}
      <div className="rounded-xl border border-navy-200 bg-navy-50 p-4 text-xs text-navy-500 leading-relaxed">
        <span className="font-semibold text-navy-700">⚠️ Hinweis:</span> Diese Prognose dient ausschließlich zur Veranschaulichung des Zinseszins-Effekts und stellt keine Anlageberatung dar. Die angenommenen 7% p.a. basieren auf historischen Durchschnittsrenditen des FTSE All-World Index. Vergangene Renditen sind keine Garantie für zukünftige Ergebnisse. Bitte konsultiere einen unabhängigen Finanzberater für persönliche Anlageentscheidungen.
      </div>
    </div>
  )
}
