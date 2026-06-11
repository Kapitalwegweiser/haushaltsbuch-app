import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts'
import { monatlicherBetrag } from '../data/kategorien'
import { TrendingDown, Home, CreditCard, FileDown, TrendingUp, PiggyBank, Target } from 'lucide-react'
import { exportiereAlsExcel } from '../utils/export'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const FARBEN = ['#1e3a5f', '#2d5a8e', '#4d7faf', '#7da4c8', '#b3c9e1', '#c9a227', '#a07d10', '#d4b83a', '#e8d080', '#6b8e9f']
const heute = () => new Date().toISOString().slice(0, 7)

function BudgetBalken({ ist, soll, kategorie }) {
  const prozent = soll > 0 ? Math.min((ist / soll) * 100, 100) : 0
  const farbe = prozent < 70 ? 'bg-emerald-500' : prozent < 90 ? 'bg-amber-400' : 'bg-red-500'
  const ueberschritten = ist > soll
  return (
    <div className="mb-3">
      <div className="flex justify-between text-xs mb-1">
        <span className="text-navy-700 font-medium truncate max-w-[140px]">{kategorie}</span>
        <span className={`font-semibold ${ueberschritten ? 'text-red-600' : 'text-navy-600'}`}>
          {euro(ist)} / {euro(soll)}
        </span>
      </div>
      <div className="w-full bg-navy-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all duration-300 ${farbe}`} style={{ width: `${prozent}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard({ fixkosten, variableKosten, einnahmen, budgets }) {
  const aktuellerMonat = heute()

  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const varSumme = variableKosten
    .filter(v => v.datum.startsWith(aktuellerMonat))
    .reduce((s, v) => s + v.betrag, 0)
  const gesamtAusgaben = fixSumme + varSumme
  const gesamtEinnahmen = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const verfuegbar = gesamtEinnahmen - gesamtAusgaben
  const sparquote = gesamtEinnahmen > 0 ? (verfuegbar / gesamtEinnahmen) * 100 : 0

  // Fixkosten nach Kategorien
  const fixNachKat = {}
  fixkosten.forEach(f => {
    const key = f.kategorie || 'Sonstiges'
    fixNachKat[key] = (fixNachKat[key] || 0) + monatlicherBetrag(f.betrag, f.intervall)
  })
  const fixKatData = Object.entries(fixNachKat)
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value)

  // Variable Kosten nach Kategorien
  const varNachKat = {}
  variableKosten
    .filter(v => v.datum.startsWith(aktuellerMonat))
    .forEach(v => {
      const key = v.kategorie || 'Sonstiges'
      varNachKat[key] = (varNachKat[key] || 0) + v.betrag
    })
  const varKatData = Object.entries(varNachKat)
    .map(([name, value]) => ({ name, value: +value.toFixed(2) }))
    .sort((a, b) => b.value - a.value)

  // Monatstrend
  const letzteMonateKeys = Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    return d.toISOString().slice(0, 7)
  })
  const monatsTrend = letzteMonateKeys.map(m => {
    const varSum = variableKosten.filter(v => v.datum.startsWith(m)).reduce((s, v) => s + v.betrag, 0)
    const einSum = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
    return { monat: m.slice(5) + '/' + m.slice(2, 4), fixkosten: +fixSumme.toFixed(2), variabel: +varSum.toFixed(2), einnahmen: +einSum.toFixed(2) }
  })

  // Budgets mit aktuellen Ausgaben
  const budgetsMitIst = budgets.map(b => ({
    ...b,
    ist: variableKosten
      .filter(v => v.datum.startsWith(aktuellerMonat) && v.kategorie === b.kategorie)
      .reduce((s, v) => s + v.betrag, 0)
  }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Dashboard</h2>
        <button className="btn-secondary text-sm" onClick={() => exportiereAlsExcel(fixkosten, variableKosten)}>
          <FileDown size={15} /> Excel Export
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="card flex items-center gap-3">
          <div className="bg-emerald-50 rounded-lg p-2.5 shrink-0"><TrendingUp size={20} className="text-emerald-600" /></div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Einnahmen / Mo.</p>
            <p className="text-lg font-bold text-emerald-700 truncate">{euro(gesamtEinnahmen)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-navy-100 rounded-lg p-2.5 shrink-0"><Home size={20} className="text-navy-600" /></div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Fixkosten / Mo.</p>
            <p className="text-lg font-bold text-navy-800 truncate">{euro(fixSumme)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-amber-50 rounded-lg p-2.5 shrink-0"><TrendingDown size={20} className="text-gold" /></div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Variabel {aktuellerMonat}</p>
            <p className="text-lg font-bold text-navy-800 truncate">{euro(varSumme)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-navy-600 rounded-lg p-2.5 shrink-0"><CreditCard size={20} className="text-white" /></div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Gesamt Ausgaben</p>
            <p className="text-lg font-bold text-navy-800 truncate">{euro(gesamtAusgaben)}</p>
          </div>
        </div>
        <div className={`card flex items-center gap-3 ${verfuegbar < 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`rounded-lg p-2.5 shrink-0 ${verfuegbar < 0 ? 'bg-red-100' : 'bg-emerald-50'}`}>
            <PiggyBank size={20} className={verfuegbar < 0 ? 'text-red-600' : 'text-emerald-600'} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Verfügbar</p>
            <p className={`text-lg font-bold truncate ${verfuegbar < 0 ? 'text-red-600' : 'text-emerald-700'}`}>{euro(verfuegbar)}</p>
          </div>
        </div>
        <div className="card flex items-center gap-3">
          <div className="bg-navy-100 rounded-lg p-2.5 shrink-0"><Target size={20} className="text-navy-600" /></div>
          <div className="min-w-0">
            <p className="text-xs text-navy-500 truncate">Sparquote</p>
            <p className={`text-lg font-bold truncate ${sparquote < 0 ? 'text-red-600' : sparquote < 10 ? 'text-amber-600' : 'text-emerald-700'}`}>
              {gesamtEinnahmen > 0 ? `${sparquote.toFixed(1)}%` : '–'}
            </p>
          </div>
        </div>
      </div>

      {/* Budget-Ziele */}
      {budgetsMitIst.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-navy-700 mb-4 flex items-center gap-2"><Target size={16} /> Budget-Ziele – {aktuellerMonat}</h3>
          {budgetsMitIst.map(b => (
            <BudgetBalken key={b.id} ist={b.ist} soll={b.betrag} kategorie={b.kategorie} />
          ))}
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="font-semibold text-navy-700 mb-4">Fixkosten nach Kategorie</h3>
          {fixKatData.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-8">Noch keine Fixkosten eingetragen.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={fixKatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {fixKatData.map((_, i) => <Cell key={i} fill={FARBEN[i % FARBEN.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => euro(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card">
          <h3 className="font-semibold text-navy-700 mb-4">Variable Kosten nach Kategorie</h3>
          {varKatData.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-8">Noch keine variablen Kosten für diesen Monat.</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={varKatData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {varKatData.map((_, i) => <Cell key={i} fill={FARBEN[i % FARBEN.length]} />)}
                </Pie>
                <Tooltip formatter={(v) => euro(v)} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Monatstrend */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">Ausgaben der letzten 6 Monate</h3>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monatsTrend} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="monat" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} tickFormatter={v => `${v}€`} />
            <Tooltip formatter={(v) => euro(v)} />
            <Legend />
            <Bar dataKey="einnahmen" name="Einnahmen" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="fixkosten" name="Fixkosten" fill="#1e3a5f" radius={[4, 4, 0, 0]} />
            <Bar dataKey="variabel" name="Variabel" fill="#c9a227" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
