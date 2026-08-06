import { useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { monatlicherBetrag, monatlicheEinnahme, istSparEintrag, MONATE } from '../data/kategorien'
import { TrendingUp, List, PiggyBank, Target, Calendar, AlertCircle, Home, ChevronDown, ChevronUp } from 'lucide-react'

function istMieterAktiv(m) {
  if (!m.mietbeginn) return false
  const h = new Date().toISOString().slice(0, 10)
  if (m.mietbeginn > h) return false
  if (m.mietende && m.mietende < h) return false
  return true
}

function aktuelleMietwerte(mieter) {
  const heute = new Date().toISOString().slice(0, 10)
  const staffeln = (mieter.mietstaffeln || []).filter(s => s.datum <= heute).sort((a, b) => b.datum.localeCompare(a.datum))
  if (staffeln.length > 0) return staffeln[0]
  return { kaltmiete: mieter.kaltmiete || 0, nebenkosten: mieter.nebenkosten || 0 }
}

function kreditZinsen(k) {
  return Math.round(((+k.betrag || 0) * (+k.zinssatz || 0) / 100 / 12) * 100) / 100
}
function kreditTilgung(k) {
  return Math.round(((+k.betrag || 0) * (+k.tilgung || 0) / 100 / 12) * 100) / 100
}

function immoKennzahlen(immo) {
  const kredite = immo.kredite?.length > 0 ? immo.kredite : (immo.finanzierung ? [immo.finanzierung] : [])
  const aktiveMieter = (immo.mieter || []).filter(m => istMieterAktiv(m))
  const kaltmiete = aktiveMieter.reduce((s, m) => s + (aktuelleMietwerte(m)?.kaltmiete || 0), 0)
  const zinsen = kredite.reduce((s, k) => s + kreditZinsen(k), 0)
  const tilgung = kredite.reduce((s, k) => s + kreditTilgung(k), 0)
  const hausgeld = kredite.reduce((s, k) => s + (+k.hausgeld || 0), 0)
  const belastung = zinsen + tilgung + hausgeld
  return { kaltmiete, zinsen, tilgung, hausgeld, belastung, cashflow: kaltmiete - belastung }
}

function ImmobilienUebersicht({ immobilien }) {
  const [offen, setOffen] = useState(false)
  if (!immobilien || immobilien.length === 0) return null

  const kennzahlen = immobilien.map(immo => ({ immo, ...immoKennzahlen(immo) }))
  const gesamt = kennzahlen.reduce((s, k) => ({
    kaltmiete: s.kaltmiete + k.kaltmiete,
    belastung: s.belastung + k.belastung,
    zinsen: s.zinsen + k.zinsen,
    tilgung: s.tilgung + k.tilgung,
    hausgeld: s.hausgeld + k.hausgeld,
    cashflow: s.cashflow + k.cashflow,
  }), { kaltmiete: 0, belastung: 0, zinsen: 0, tilgung: 0, hausgeld: 0, cashflow: 0 })

  const positivCount = kennzahlen.filter(k => k.cashflow >= 0).length

  return (
    <div className="card">
      <button className="w-full flex items-center justify-between" onClick={() => setOffen(!offen)}>
        <h3 className="font-serif font-semibold text-navy-700 flex items-center gap-2">
          <Home size={16} className="text-brand-500" />
          Immobilien-Übersicht ({immobilien.length} Objekte)
        </h3>
        {offen ? <ChevronUp size={16} className="text-navy-400" /> : <ChevronDown size={16} className="text-navy-400" />}
      </button>

      {/* Gesamt-Cashflow immer sichtbar */}
      <div className="mt-3 grid grid-cols-3 gap-3">
        <div className="rounded-xl p-3 text-center" style={{ background: '#edf7f2' }}>
          <p className="text-xs text-navy-400 mb-1">Mieteinnahmen</p>
          <p className="text-base font-bold text-brand-600">{euro(gesamt.kaltmiete)}</p>
          <p className="text-xs text-navy-400">/ Mo.</p>
        </div>
        <div className="rounded-xl p-3 text-center" style={{ background: '#ede6d8' }}>
          <p className="text-xs text-navy-400 mb-1">Kreditbelastung</p>
          <p className="text-base font-bold text-navy-700">{euro(gesamt.belastung)}</p>
          <p className="text-xs text-navy-400">/ Mo.</p>
        </div>
        <div className={`rounded-xl p-3 text-center ${gesamt.cashflow >= 0 ? '' : 'bg-red-50'}`}
          style={gesamt.cashflow >= 0 ? { background: '#f0eeff' } : {}}>
          <p className="text-xs text-navy-400 mb-1">Gesamt-Cashflow</p>
          <p className={`text-base font-bold ${gesamt.cashflow >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
            {gesamt.cashflow >= 0 ? '+' : ''}{euro(gesamt.cashflow)}
          </p>
          <p className="text-xs text-navy-400">/ Mo.</p>
        </div>
      </div>

      {positivCount < immobilien.length && (
        <p className="text-xs text-amber-600 mt-2">
          ⚠ {immobilien.length - positivCount} von {immobilien.length} Objekten mit negativem Cashflow
        </p>
      )}

      {/* Detailtabelle aufklappbar */}
      {offen && (
        <div className="mt-4 space-y-2">
          <div className="text-xs text-navy-400 grid grid-cols-4 gap-2 px-1 font-medium">
            <span>Objekt</span>
            <span className="text-right">Miete</span>
            <span className="text-right">Belastung</span>
            <span className="text-right">Cashflow</span>
          </div>
          {kennzahlen.map(({ immo, kaltmiete, belastung, cashflow }) => (
            <div key={immo.id} className="grid grid-cols-4 gap-2 px-1 py-2 rounded-lg text-sm border"
              style={{ borderColor: '#f0e8dc', background: '#faf8f4' }}>
              <span className="font-medium text-navy-700 truncate">{immo.name || 'Objekt'}</span>
              <span className="text-right text-brand-600 font-semibold">{euro(kaltmiete)}</span>
              <span className="text-right text-navy-600">{euro(belastung)}</span>
              <span className={`text-right font-bold ${cashflow >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
                {cashflow >= 0 ? '+' : ''}{euro(cashflow)}
              </span>
            </div>
          ))}
          <div className="grid grid-cols-4 gap-2 px-1 py-2 rounded-lg text-sm font-bold border-t-2 mt-1"
            style={{ borderColor: '#6b5c4d' }}>
            <span className="text-navy-700">Gesamt</span>
            <span className="text-right text-brand-600">{euro(gesamt.kaltmiete)}</span>
            <span className="text-right text-navy-600">{euro(gesamt.belastung)}</span>
            <span className={`text-right ${gesamt.cashflow >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
              {gesamt.cashflow >= 0 ? '+' : ''}{euro(gesamt.cashflow)}
            </span>
          </div>
          {gesamt.zinsen > 0 && (
            <p className="text-xs text-navy-400 mt-1 px-1">
              Belastung = Zinsen ({euro(gesamt.zinsen)}) + Tilgung ({euro(gesamt.tilgung)}) + Hausgeld ({euro(gesamt.hausgeld)})
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

// Abos/Vereine nutzen dasselbe Intervall-Schema wie Versicherungen (monatlich/vierteljaehrlich/halbjaehrlich/jaehrlich)
function jahresbetragTracker(v) {
  const b = parseFloat(v.beitrag) || 0
  if (v.intervall === 'monatlich')        return b * 12
  if (v.intervall === 'halbjaehrlich')    return b * 2
  if (v.intervall === 'vierteljaehrlich') return b * 4
  return b
}
function monatsbetragTracker(v) { return jahresbetragTracker(v) / 12 }

function AusgabenListe({ fixkosten, abos = [], vereine = [] }) {
  const [ausgeklappt, setAusgeklappt] = useState(false)
  const nachKat = {}
  fixkosten.forEach(f => {
    const key = f.kategorie || 'Sonstiges'
    nachKat[key] = (nachKat[key] || 0) + monatlicherBetrag(f.betrag, f.intervall)
  })
  const gesamt = Object.values(nachKat).reduce((s, v) => s + v, 0)
  const sortiert = Object.entries(nachKat)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)

  const LIMIT = 10
  const sichtbar = ausgeklappt ? sortiert : sortiert.slice(0, LIMIT)
  const FARBEN = ['#2e6b52', '#4a3929', '#6b5c4d', '#c9a227', '#4a8a72', '#f97316', '#a855f7', '#ef4444', '#64748b', '#0d9488']

  return (
    <div className="space-y-2">
      {sichtbar.map(({ name, value }, i) => {
        const pct = gesamt > 0 ? (value / gesamt) * 100 : 0
        return (
          <div key={name}>
            <div className="flex justify-between text-xs mb-1">
              <span className="text-navy-700 font-medium truncate max-w-[55%]">{name}</span>
              <span className="text-navy-500 shrink-0 ml-2">{euro(value)} · {pct.toFixed(0)}%</span>
            </div>
            <div className="w-full rounded-full h-2" style={{ background: '#e8dece' }}>
              <div className="h-2 rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: FARBEN[i % FARBEN.length] }} />
            </div>
          </div>
        )
      })}
      {sortiert.length > LIMIT && (
        <button
          onClick={() => setAusgeklappt(!ausgeklappt)}
          className="text-xs text-brand-500 hover:text-brand-600 font-medium mt-1 flex items-center gap-1"
        >
          {ausgeklappt ? '▲ Weniger anzeigen' : `▼ Alle ${sortiert.length} Kategorien anzeigen`}
        </button>
      )}
    </div>
  )
}

function JahresKostenKalender({ fixkosten }) {
  const jaehrlich = fixkosten.filter(f => f.intervall === 'jaehrlich' && f.abbuchungsmonat)
  if (jaehrlich.length === 0) return null

  const jetzt = new Date()
  const aktuellerMonat = jetzt.getMonth() + 1

  const kommendeMonate = Array.from({ length: 12 }, (_, i) => {
    const monat = ((aktuellerMonat - 1 + i) % 12) + 1
    return monat
  })

  const eintraege = kommendeMonate
    .map(monat => {
      const kosten = jaehrlich.filter(f => f.abbuchungsmonat === monat)
      if (kosten.length === 0) return null
      const summe = kosten.reduce((s, f) => s + f.betrag, 0)
      const monate = monat - aktuellerMonat
      const differenz = monate >= 0 ? monate : monate + 12
      return { monat, name: MONATE[monat - 1], kosten, summe, differenz }
    })
    .filter(Boolean)

  if (eintraege.length === 0) return null

  return (
    <div className="card">
      <h3 className="font-serif font-semibold text-navy-700 mb-4 flex items-center gap-2">
        <Calendar size={16} className="text-amber-500" />
        Anstehende Jahreskosten
      </h3>
      <div className="space-y-2">
        {eintraege.map(({ monat, name, kosten, summe, differenz }) => {
          const bald = differenz <= 1
          const dieserMonat = differenz === 0
          return (
            <div
              key={monat}
              className={`rounded-xl border px-4 py-3 ${dieserMonat ? 'bg-red-50 border-red-200' : bald ? 'bg-amber-50 border-amber-200' : 'border-navy-100'}`}
              style={!dieserMonat && !bald ? { background: '#faf8f4' } : {}}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  {dieserMonat && <AlertCircle size={14} className="text-red-500 shrink-0" />}
                  <div>
                    <p className={`text-sm font-semibold ${dieserMonat ? 'text-red-800' : bald ? 'text-amber-800' : 'text-navy-700'}`}>
                      {name}
                      {dieserMonat && <span className="ml-2 text-xs font-medium bg-red-200 text-red-800 px-1.5 py-0.5 rounded-full">Diesen Monat</span>}
                      {bald && !dieserMonat && <span className="ml-2 text-xs font-medium bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded-full">Nächsten Monat</span>}
                    </p>
                    <p className="text-xs text-navy-400 mt-0.5">{kosten.map(k => k.name).join(', ')}</p>
                  </div>
                </div>
                <span className={`text-sm font-bold shrink-0 ${dieserMonat ? 'text-red-700' : bald ? 'text-amber-700' : 'text-navy-700'}`}>
                  {euro(summe)}
                </span>
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-navy-400 mt-3">
        Gesamt pro Jahr: <strong className="text-navy-600">{euro(jaehrlich.reduce((s, f) => s + f.betrag, 0))}</strong>
      </p>
    </div>
  )
}

export default function Dashboard({ fixkosten, einnahmen, abos = [], vereine = [], immobilien = [] }) {
  const fixAusgaben = fixkosten.filter(f => !istSparEintrag(f))
  const fixSpareinlagen = fixkosten.filter(f => istSparEintrag(f))
  const fixSumme = fixAusgaben.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const fixSparSumme = fixSpareinlagen.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  // Vereine & Abos sind seit der Zusammenführung Teil von fixkosten
  const gesamtAusgaben = fixSumme
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicheEinnahme(e), 0)
  const sparBetrag = einnahmenSumme - gesamtAusgaben
  const sparquote = einnahmenSumme > 0 ? ((sparBetrag + fixSparSumme) / einnahmenSumme) * 100 : 0

  const MONATE_KURZ = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez']
  const jahresChart = MONATE_KURZ.map((name, i) => {
    const monatNr = i + 1
    const sonderInkl = einnahmen
      .filter(e => e.typ === 'sondereinnahme' && e.monat === monatNr)
      .reduce((s, e) => s + e.betrag, 0)
    const jahresKosten = fixkosten
      .filter(f => f.intervall === 'jaehrlich' && f.abbuchungsmonat === monatNr)
      .reduce((s, f) => s + f.betrag, 0)
    const monatlicheFixkosten = fixkosten
      .filter(f => f.intervall !== 'jaehrlich')
      .reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
    return {
      monat: name,
      Einnahmen: +(einnahmenSumme + sonderInkl).toFixed(2),
      Ausgaben: +(monatlicheFixkosten + jahresKosten).toFixed(2),
    }
  })

  return (
    <div className="space-y-6">
      <h2 className="section-title mb-0">Dashboard</h2>

      {/* KPI Cards */}
      <div className="flex flex-col gap-3">
        <div className="card flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0" style={{ background: '#edf7f2' }}>
            <TrendingUp size={20} className="text-brand-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-navy-400 truncate">Einnahmen / Mo.</p>
            <p className="text-lg font-bold text-brand-600 truncate">{euro(einnahmenSumme)}</p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0" style={{ background: '#ede6d8' }}>
            <List size={20} className="text-navy-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-navy-400 truncate">Ausgaben / Mo.</p>
            <p className="text-lg font-bold text-navy-700 truncate">{euro(gesamtAusgaben)}</p>
          </div>
        </div>

        <div className={`card flex items-center gap-3 ${sparBetrag < 0 ? 'border-red-200 bg-red-50' : ''}`}>
          <div className={`rounded-lg p-2.5 shrink-0 ${sparBetrag < 0 ? 'bg-red-100' : ''}`}
            style={sparBetrag >= 0 ? { background: '#edf7f2' } : {}}>
            <PiggyBank size={20} className={sparBetrag < 0 ? 'text-red-600' : 'text-brand-500'} />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-navy-400 truncate">Spare ich / Mo.</p>
            <p className={`text-lg font-bold truncate ${sparBetrag < 0 ? 'text-red-600' : 'text-brand-600'}`}>
              {euro(sparBetrag)}
            </p>
          </div>
        </div>

        <div className="card flex items-center gap-3">
          <div className="rounded-lg p-2.5 shrink-0 bg-brand-500/10">
            <Target size={20} className="text-brand-500" />
          </div>
          <div className="min-w-0">
            <p className="text-xs text-navy-400 truncate">Sparquote</p>
            <p className={`text-lg font-bold truncate ${sparquote < 0 ? 'text-red-600' : sparquote < 10 ? 'text-amber-600' : 'text-brand-600'}`}>
              {einnahmenSumme > 0 ? `${sparquote.toFixed(1)}%` : '–'}
            </p>
          </div>
        </div>
      </div>

      {einnahmen.length === 0 && fixkosten.length === 0 && (
        <div className="card text-center py-10 border-dashed">
          <p className="font-serif text-lg text-navy-600 mb-2">Noch keine Daten</p>
          <p className="text-sm text-navy-400">Trag zuerst deine Einnahmen und monatlichen Ausgaben ein.</p>
        </div>
      )}

      <JahresKostenKalender fixkosten={fixkosten} />

      {(einnahmen.length > 0 || fixkosten.length > 0) && (
        <div className="space-y-6">
          <div className="card">
            <h3 className="font-serif font-semibold text-navy-700 mb-1">Einnahmen vs. Ausgaben</h3>
            <p className="text-xs text-navy-400 mb-4">Gesamtes Jahr — inkl. Sondereinnahmen und Jahreskosten</p>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={jahresChart} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e8dece" />
                <XAxis dataKey="monat" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}k` : `${v}€`} />
                <Tooltip formatter={(v) => euro(v)} />
                <Legend />
                <Bar dataKey="Einnahmen" fill="#2e6b52" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Ausgaben" fill="#6b5c4d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {(fixkosten.length > 0 || abos.length > 0 || vereine.length > 0) && (
            <div className="card">
              <h3 className="font-serif font-semibold text-navy-700 mb-4">Ausgaben nach Kategorie</h3>
              <AusgabenListe fixkosten={fixkosten} abos={abos} vereine={vereine} />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
