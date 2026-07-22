import { useState, useRef, useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import {
  Building2, MapPin, Maximize2, DoorOpen, Euro, Plus, ChevronLeft,
  User, Wrench, Landmark, Edit2, Trash2, Check, X, Upload, FileText,
  Calendar, AlertCircle, Home, ChevronDown, ChevronUp, Calculator, TrendingDown,
  Users, StickyNote, Download, Filter, Sparkles, Loader2, TrendingUp, Info, Receipt, AlertTriangle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import JSZip from 'jszip'
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts'
import { hochladenDatei, oeffneDatei, loescheDatei } from '../lib/storage'

// ─── Hilfsfunktionen ──────────────────────────────────────────────────────────
function euro(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function datumDE(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('de-DE')
}

function istAktiv(mieter) {
  if (!mieter.mietende) return true
  return new Date(mieter.mietende) >= new Date()
}

// Liefert die aktuell gültige Kalt-/Nebenmiete unter Berücksichtigung von Staffelmieten
// bzw. nachträglichen Mieterhöhungen (mietstaffel) — der jeweils jüngste Eintrag,
// dessen Datum bereits erreicht ist, gilt; ohne Staffel zählt die Ausgangsmiete.
function aktuelleMietwerte(mieter, heute = new Date().toISOString().slice(0, 10)) {
  const staffel = (mieter.mietstaffel || [])
    .filter(s => s.datum && s.datum <= heute)
    .sort((a, b) => b.datum.localeCompare(a.datum))
  const aktuell = staffel[0]
  return {
    kaltmiete: aktuell ? +aktuell.kaltmiete || 0 : +mieter.kaltmiete || 0,
    nebenkosten: aktuell ? +aktuell.nebenkosten || 0 : +mieter.nebenkosten || 0,
    hatStaffel: (mieter.mietstaffel || []).length > 0,
  }
}

// Annuität: monatliche Rate aus Darlehensbetrag, Zinssatz%, Tilgungssatz%
function berechneAnnuitaet(betrag, zinsPct, tilgPct) {
  if (!betrag || !zinsPct) return null
  const jahresRate = (zinsPct + (tilgPct || 1)) / 100
  return (betrag * jahresRate) / 12
}

// Tilgungsplan: Restschuld-Verlauf mit und ohne Sondertilgungen (jährliche Datenpunkte)
function berechneTilgungsplan({ startRestschuld, monatlicheRate, monatszinssatz, sondertilgungen = [] }) {
  if (!startRestschuld || !monatlicheRate || monatlicheRate <= 0) return null
  if (monatlicheRate <= startRestschuld * monatszinssatz) return null // Rate deckt nicht mal Zinsen

  const sonderSortiert = [...sondertilgungen]
    .filter(s => s.datum && s.betrag > 0)
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const startJahr = new Date().getFullYear()
  const startMonat = new Date().getMonth() // 0-11

  let rs = startRestschuld
  let rsOhne = startRestschuld
  let gesamtZinsen = 0
  let gesamtZinsenOhne = 0
  let laufzeit = 0
  const punkte = [{ label: String(startJahr), mitSonder: Math.round(rs), ohneSonder: Math.round(rsOhne) }]

  for (let monat = 1; monat <= 480 && (rs > 0 || rsOhne > 0); monat++) {
    const datum = new Date(startJahr, startMonat + monat, 1)
    const datumStr = datum.toISOString().slice(0, 7)

    // Sondertilgungen dieses Monats
    const sonderBetrag = sonderSortiert
      .filter(s => s.datum.slice(0, 7) === datumStr)
      .reduce((s, t) => s + t.betrag, 0)

    // MIT Sondertilgungen
    if (rs > 0) {
      const zinsen = rs * monatszinssatz
      const tilgung = Math.min(monatlicheRate - zinsen, rs)
      gesamtZinsen += zinsen
      rs = Math.max(0, rs - tilgung - sonderBetrag)
      if (rs === 0 && laufzeit === 0) laufzeit = monat
    }

    // OHNE Sondertilgungen
    if (rsOhne > 0) {
      const zinsenOhne = rsOhne * monatszinssatz
      const tilgungOhne = Math.min(monatlicheRate - zinsenOhne, rsOhne)
      gesamtZinsenOhne += zinsenOhne
      rsOhne = Math.max(0, rsOhne - tilgungOhne)
    }

    // Jährliche Datenpunkte
    if (monat % 12 === 0) {
      punkte.push({
        label: String(startJahr + monat / 12),
        mitSonder: Math.round(Math.max(0, rs)),
        ohneSonder: Math.round(Math.max(0, rsOhne)),
      })
    }
    if (rs <= 0 && rsOhne <= 0) break
  }

  return {
    punkte,
    gesamtZinsen: Math.round(gesamtZinsen),
    gesamtZinsenOhne: Math.round(gesamtZinsenOhne),
    zinsenErsparnis: Math.round(gesamtZinsenOhne - gesamtZinsen),
    laufzeit, // in Monaten bis rs=0
  }
}

// Tilgungsplan-Grafik
function TilgungsplanChart({ finanzierung }) {
  const fin = finanzierung || {}
  const sondertilgungen = fin.sondertilgungen || []
  const hatSonder = sondertilgungen.some(s => s.betrag > 0)

  const { plan, monatlicheRate, monatszinssatz } = useMemo(() => {
    let rate, zinssatz
    if (fin.modus === 'annuitaet' && fin.darlehensbetrag && fin.zinssatz) {
      rate = berechneAnnuitaet(+fin.darlehensbetrag, +fin.zinssatz, +fin.tilgungssatz)
      zinssatz = +fin.zinssatz / 100 / 12
    } else if (fin.zinsen && fin.tilgung) {
      rate = +fin.zinsen + +fin.tilgung
      // Zinssatz aus Zinsen und Restschuld schätzen
      const rs = +fin.restschuld || 0
      zinssatz = rs > 0 ? +fin.zinsen / rs : 0
    }
    const rs = +(fin.restschuld || fin.darlehensbetrag) || 0
    if (!rs || !rate) return { plan: null }
    return {
      plan: berechneTilgungsplan({ startRestschuld: rs, monatlicheRate: rate, monatszinssatz: zinssatz, sondertilgungen }),
      monatlicheRate: rate,
      monatszinssatz: zinssatz,
    }
  }, [fin, sondertilgungen])

  if (!plan) return null

  const laufzeitJahre = plan.laufzeit ? `${Math.ceil(plan.laufzeit / 12)} Jahre ${plan.laufzeit % 12 ? `${plan.laufzeit % 12} Mo.` : ''}`.trim() : '> 40 Jahre'

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null
    return (
      <div className="bg-white border border-navy-200 rounded-xl shadow-lg p-3 text-sm min-w-[180px]">
        <p className="font-semibold text-navy-700 mb-2">{label}</p>
        {payload.map((p, i) => (
          <div key={i} className="flex justify-between gap-4" style={{ color: p.color }}>
            <span>{p.name}</span>
            <span className="font-semibold">{Number(p.value).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <TrendingDown size={16} className="text-brand-500" />
        <h3 className="font-semibold text-navy-700">Tilgungsplan</h3>
      </div>

      {/* KPI-Karten */}
      <div className="flex flex-col gap-3">
        <div className="card text-center">
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Schuldenfrei in</p>
          <p className="text-base font-bold text-navy-700">{laufzeitJahre}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Gesamtzinsen</p>
          <p className="text-base font-bold text-red-600">
            {Number(plan.gesamtZinsen).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          </p>
        </div>
        {hatSonder && plan.zinsenErsparnis > 0 && (
          <div className="card col-span-2 text-center" style={{ background: '#edf7f2', borderColor: '#c0dfd3' }}>
            <p className="text-xs text-brand-600 uppercase tracking-widest mb-1">Ersparnis durch Sondertilgungen</p>
            <p className="text-lg font-bold text-brand-600">
              − {Number(plan.zinsenErsparnis).toLocaleString('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })} Zinsen
            </p>
          </div>
        )}
      </div>

      {/* Grafik */}
      <div className="card">
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={plan.punkte} margin={{ top: 8, right: 8, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gradOhne" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id="gradMit" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4a7d96" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#4a7d96" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis
              tick={{ fontSize: 11 }}
              tickFormatter={v => v >= 1000000 ? `${(v / 1000000).toFixed(1)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {hatSonder && (
              <Area
                type="monotone"
                dataKey="ohneSonder"
                name="Ohne Sondertilgungen"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 3"
                fill="url(#gradOhne)"
              />
            )}
            <Area
              type="monotone"
              dataKey="mitSonder"
              name={hatSonder ? 'Mit Sondertilgungen' : 'Restschuld'}
              stroke="#4a7d96"
              strokeWidth={2.5}
              fill="url(#gradMit)"
            />
          </AreaChart>
        </ResponsiveContainer>
        <p className="text-xs text-navy-400 mt-2 text-center">Restschuldentwicklung in €</p>
      </div>
    </div>
  )
}

// ─── Datumsfeld mit schnellem Jahreswechsel ───────────────────────────────────
// Normales <input type="date"> zwingt zum Durchklicken der Monate, um ins Zieljahr
// zu gelangen. Das zusätzliche Jahres-Dropdown erlaubt direktes Springen.
function KaufdatumInput({ value, onChange }) {
  const heute = new Date().getFullYear()
  const jahre = Array.from({ length: heute - 1950 + 2 }, (_, i) => heute + 1 - i)
  const aktuellesJahr = value ? value.slice(0, 4) : ''

  function jahrAendern(jahr) {
    if (!jahr) return
    const rest = value ? value.slice(4) : '-01-01'
    onChange(`${jahr}${rest}`)
  }

  return (
    <div className="flex gap-2">
      <select
        className="input"
        style={{ maxWidth: '110px' }}
        value={aktuellesJahr}
        onChange={e => jahrAendern(e.target.value)}
      >
        <option value="">Jahr…</option>
        {jahre.map(j => <option key={j} value={j}>{j}</option>)}
      </select>
      <input className="input" type="date" value={value} onChange={e => onChange(e.target.value)} />
    </div>
  )
}

// ─── Datei-Upload ─────────────────────────────────────────────────────────────
// Lädt direkt in den privaten Supabase-Storage-Bereich des Nutzers hoch, statt
// die Datei nur lokal im Browser zu halten — so bleibt sie geräteübergreifend
// abrufbar, auch nach Logout/Login oder auf einem anderen Gerät.
function DokumentUpload({ dokument, onChange, label = 'Dokument hochladen' }) {
  const ref = useRef()
  const [hochladen, setHochladen] = useState(false)
  const [fehler, setFehler] = useState('')

  async function dateiGewaehlt(file) {
    if (!file) return
    setFehler(''); setHochladen(true)
    try {
      const meta = await hochladenDatei(file)
      onChange(meta)
    } catch (err) {
      setFehler('Hochladen fehlgeschlagen: ' + (err.message || err))
    } finally {
      setHochladen(false)
    }
  }

  async function entfernen() {
    if (dokument?.pfad) await loescheDatei(dokument.pfad)
    onChange(null)
  }

  return (
    <div>
      <p className="label mb-1">{label}</p>
      {dokument ? (
        <div className="flex items-center gap-2 p-2.5 rounded-xl text-sm" style={{ background: '#f7f3ed', border: '1px solid #e8dece' }}>
          <FileText size={15} className="text-brand-500 shrink-0" />
          <span className="flex-1 truncate text-navy-700 font-medium">{dokument.name}</span>
          <button
            onClick={() => oeffneDatei(dokument.pfad)}
            className="text-brand-500 hover:text-brand-600 text-xs font-medium shrink-0 mr-2"
          >Öffnen</button>
          <button onClick={entfernen} className="text-red-400 hover:text-red-600 shrink-0"><X size={14} /></button>
        </div>
      ) : (
        <button
          type="button"
          disabled={hochladen}
          onClick={() => ref.current.click()}
          className="flex items-center gap-2 px-4 py-2.5 border-2 border-dashed border-navy-200 rounded-xl text-sm text-navy-500 hover:border-brand-400 hover:text-brand-600 transition-colors w-full disabled:opacity-60"
        >
          <Upload size={15} /><span>{hochladen ? 'Wird hochgeladen…' : 'PDF oder Bild auswählen'}</span>
        </button>
      )}
      <input ref={ref} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
        onChange={e => { if (e.target.files[0]) dateiGewaehlt(e.target.files[0]); e.target.value = '' }} />
      {!dokument && !fehler && <p className="text-xs text-navy-400 mt-1">Wird sicher in der Cloud gespeichert (max. 10 MB)</p>}
      {fehler && <p className="text-xs text-red-500 mt-1">{fehler}</p>}
    </div>
  )
}

// ─── Übersicht-Tab ─────────────────────────────────────────────────────────────
function UebersichtTab({ immobilie, onSave }) {
  const [form, setForm] = useState({ ...immobilie })
  const [bearbeiten, setBearbeiten] = useState(false)

  const f = (val, suffix = '') => val ? `${val}${suffix}` : '—'

  return (
    <div className="space-y-6">
      {!bearbeiten ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Adresse', value: immobilie.adresse || '—', icon: MapPin },
              { label: 'Kaufpreis', value: euro(immobilie.kaufpreis), icon: Euro },
              { label: 'Wohnfläche', value: f(immobilie.flaeche, ' m²'), icon: Maximize2 },
              { label: 'Zimmer', value: f(immobilie.zimmer), icon: DoorOpen },
              { label: 'Kaufdatum', value: datumDE(immobilie.kaufdatum), icon: Calendar },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="card">
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={13} className="text-navy-400" />
                  <p className="text-xs text-navy-400 uppercase tracking-widest">{label}</p>
                </div>
                <p className="text-base font-semibold text-navy-700">{value}</p>
              </div>
            ))}
          </div>
          <button className="btn-secondary" onClick={() => setBearbeiten(true)}><Edit2 size={14} /> Daten bearbeiten</button>
        </>
      ) : (
        <div className="card space-y-4">
          <h3 className="font-serif text-lg font-semibold text-navy-700">Immobilie bearbeiten</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="label">Bezeichnung</label>
              <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Adresse</label>
              <input className="input" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} />
            </div>
            <div>
              <label className="label">Wohnfläche (m²)</label>
              <input className="input" type="number" value={form.flaeche} onChange={e => setForm({ ...form, flaeche: e.target.value })} />
            </div>
            <div>
              <label className="label">Anzahl Zimmer</label>
              <input className="input" type="number" step="0.5" value={form.zimmer} onChange={e => setForm({ ...form, zimmer: e.target.value })} />
            </div>
            <div>
              <label className="label">Kaufpreis (€)</label>
              <input className="input" type="number" value={form.kaufpreis} onChange={e => setForm({ ...form, kaufpreis: e.target.value })} />
            </div>
            <div>
              <label className="label">Kaufdatum</label>
              <KaufdatumInput value={form.kaufdatum} onChange={v => setForm({ ...form, kaufdatum: v })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={() => { onSave({ ...immobilie, ...form }); setBearbeiten(false) }}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => setBearbeiten(false)}><X size={14} /> Abbrechen</button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Mieter-Tab ───────────────────────────────────────────────────────────────
const LEER_MIETER = {
  id: null, name: '', telefon: '', mietbeginn: '', mietende: '',
  kaltmiete: '', nebenkosten: '', kaution: '', dokument: null
}

function MieterFormular({ initial = LEER_MIETER, onSpeichern, onAbbrechen, titel }) {
  const [form, setForm] = useState({ ...LEER_MIETER, ...initial })

  return (
    <div className="card border-emerald-200 space-y-4">
      <h3 className="font-serif text-lg font-semibold text-navy-700">{titel}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="label">Vor- und Nachname</label>
          <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Max Mustermann" />
        </div>
        <div>
          <label className="label">Telefon (optional)</label>
          <input className="input" value={form.telefon} onChange={e => setForm({ ...form, telefon: e.target.value })} placeholder="+49 ..." />
        </div>
        <div />
        <div>
          <label className="label">Mietbeginn</label>
          <input className="input" type="date" value={form.mietbeginn} onChange={e => setForm({ ...form, mietbeginn: e.target.value })} />
        </div>
        <div>
          <label className="label">Mietende <span className="text-navy-400 font-normal normal-case">(leer = unbefristet)</span></label>
          <input className="input" type="date" value={form.mietende} onChange={e => setForm({ ...form, mietende: e.target.value })} />
        </div>
        <div>
          <label className="label">Kaltmiete (€/Mo.)</label>
          <input className="input" type="number" value={form.kaltmiete} onChange={e => setForm({ ...form, kaltmiete: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="label">Nebenkosten (€/Mo.)</label>
          <input className="input" type="number" value={form.nebenkosten} onChange={e => setForm({ ...form, nebenkosten: e.target.value })} placeholder="0" />
        </div>
        <div>
          <label className="label">Kaution (€)</label>
          <input className="input" type="number" value={form.kaution} onChange={e => setForm({ ...form, kaution: e.target.value })} placeholder="0" />
        </div>
        {form.kaltmiete && form.nebenkosten && (
          <div className="flex items-center rounded-xl px-3 py-2" style={{ background: '#edf7f2', border: '1px solid #c0dfd3' }}>
            <div>
              <p className="text-xs text-brand-600 font-medium">Warmmiete gesamt</p>
              <p className="text-base font-bold text-brand-700">{euro(+form.kaltmiete + +form.nebenkosten)}/Mo.</p>
            </div>
          </div>
        )}
      </div>
      <DokumentUpload label="Mietvertrag hochladen" dokument={form.dokument} onChange={dok => setForm({ ...form, dokument: dok })} />
      <div className="flex gap-2">
        <button className="btn-primary" onClick={() => { if (form.name) onSpeichern(form) }}><Check size={14} /> Speichern</button>
        <button className="btn-secondary" onClick={onAbbrechen}><X size={14} /> Abbrechen</button>
      </div>
    </div>
  )
}

// ─── Mietentwicklung (Staffelmiete / Mieterhöhungen) ──────────────────────────
const LEER_STAFFEL = { id: null, datum: '', kaltmiete: '', nebenkosten: '' }

function MietverlaufBlock({ mieter, onSpeichern }) {
  const [formOffen, setFormOffen] = useState(false)
  const [form, setForm] = useState(LEER_STAFFEL)
  const [bearbId, setBearbId] = useState(null)

  const staffel = mieter.mietstaffel || []
  const verlauf = [
    { datum: mieter.mietbeginn || '—', kaltmiete: +mieter.kaltmiete || 0, nebenkosten: +mieter.nebenkosten || 0, ausgang: true },
    ...staffel,
  ].filter(e => e.datum).sort((a, b) => a.datum.localeCompare(b.datum))

  const chartDaten = verlauf.map(e => ({
    datum: e.datum === '—' ? 'Start' : datumDE(e.datum),
    Kaltmiete: +e.kaltmiete || 0,
    Warmmiete: (+e.kaltmiete || 0) + (+e.nebenkosten || 0),
  }))

  function speichern() {
    if (!form.datum || !form.kaltmiete) return
    const eintrag = { ...form, kaltmiete: +form.kaltmiete, nebenkosten: +form.nebenkosten || 0, id: bearbId ?? Date.now().toString() }
    const neu = bearbId ? staffel.map(s => s.id === bearbId ? eintrag : s) : [...staffel, eintrag]
    onSpeichern(neu)
    setForm(LEER_STAFFEL); setBearbId(null); setFormOffen(false)
  }

  function loeschen(id) { onSpeichern(staffel.filter(s => s.id !== id)) }

  return (
    <div className="border-t border-navy-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-widest">Mietentwicklung</p>
        {!formOffen && (
          <button onClick={() => { setBearbId(null); setForm(LEER_STAFFEL); setFormOffen(true) }}
            className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1">
            <Plus size={13} /> Mieterhöhung
          </button>
        )}
      </div>

      {chartDaten.length > 1 && (
        <ResponsiveContainer width="100%" height={140}>
          <AreaChart data={chartDaten} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`gradMiete${mieter.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2e6b52" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2e6b52" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2eaf3" />
            <XAxis dataKey="datum" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} width={36} tickFormatter={v => `${v}€`} />
            <Tooltip formatter={v => euro(v)} />
            <Area type="stepAfter" dataKey="Kaltmiete" stroke="#2e6b52" strokeWidth={2} fill={`url(#gradMiete${mieter.id})`} />
          </AreaChart>
        </ResponsiveContainer>
      )}

      {formOffen && (
        <div className="rounded-xl p-3 space-y-3" style={{ background: '#faf8f4', border: '1px solid #e8dece' }}>
          <div className="flex flex-col gap-3">
            <div>
              <label className="label">Gültig ab</label>
              <input className="input" type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div>
              <label className="label">Neue Kaltmiete (€)</label>
              <input className="input" type="number" value={form.kaltmiete} onChange={e => setForm({ ...form, kaltmiete: e.target.value })} placeholder="0" />
            </div>
            <div className="col-span-2">
              <label className="label">Neue Nebenkosten (€) <span className="text-navy-400 font-normal normal-case">optional, sonst bleibt der bisherige Wert</span></label>
              <input className="input" type="number" value={form.nebenkosten} onChange={e => setForm({ ...form, nebenkosten: e.target.value })} placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => { setFormOffen(false); setBearbId(null) }}><X size={14} /> Abbrechen</button>
          </div>
        </div>
      )}

      {verlauf.length > 1 && (
        <div className="space-y-1.5">
          {verlauf.map((e, i) => {
            const vorher = verlauf[i - 1]
            const delta = vorher ? (+e.kaltmiete || 0) - (+vorher.kaltmiete || 0) : 0
            return (
              <div key={e.id ?? 'start'} className="flex items-center justify-between text-sm px-1">
                <span className="text-navy-500">{e.ausgang ? 'Einzug' : 'ab'} {e.datum !== '—' ? datumDE(e.datum) : ''}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-navy-700">{euro(e.kaltmiete)}/Mo.</span>
                  {i > 0 && delta !== 0 && (
                    <span className={`text-xs font-semibold ${delta > 0 ? 'text-brand-600' : 'text-red-500'}`}>
                      {delta > 0 ? '+' : ''}{euro(delta)}
                    </span>
                  )}
                  {!e.ausgang && (
                    <div className="flex gap-1">
                      <button onClick={() => { setForm({ ...e, kaltmiete: e.kaltmiete.toString(), nebenkosten: (e.nebenkosten || 0).toString() }); setBearbId(e.id); setFormOffen(true) }}
                        className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={12} /></button>
                      <button onClick={() => loeschen(e.id)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={12} /></button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function MieterTab({ immobilie, onSave }) {
  const mieterListe = immobilie.mieter || []
  const [formOffen, setFormOffen] = useState(false)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [historieOffen, setHistorieOffen] = useState(false)

  const aktive   = mieterListe.filter(m => istAktiv(m))
  const inaktive = mieterListe.filter(m => !istAktiv(m)).sort((a, b) => b.mietende?.localeCompare(a.mietende))

  function speichern(form) {
    const eintrag = { ...form, id: bearbeitungId ?? Date.now().toString() }
    const neu = bearbeitungId
      ? mieterListe.map(m => m.id === bearbeitungId ? eintrag : m)
      : [...mieterListe, eintrag]
    onSave({ ...immobilie, mieter: neu })
    setFormOffen(false)
    setBearbeitungId(null)
  }

  function loeschen(id) {
    if (!window.confirm('Mieter wirklich löschen?')) return
    onSave({ ...immobilie, mieter: mieterListe.filter(m => m.id !== id) })
  }

  function bearbeiten(m) {
    setBearbeitungId(m.id)
    setFormOffen(true)
  }

  function staffelSpeichern(mieterId, neueStaffel) {
    onSave({ ...immobilie, mieter: mieterListe.map(m => m.id === mieterId ? { ...m, mietstaffel: neueStaffel } : m) })
  }

  const bearbeiteteMieter = bearbeitungId ? mieterListe.find(m => m.id === bearbeitungId) : null

  return (
    <div className="space-y-6">
      {/* Aktive Mieter */}
      {aktive.length === 0 && !formOffen && (
        <div className="card text-center py-8 border-dashed">
          <User size={32} className="mx-auto mb-2 text-navy-300" />
          <p className="font-serif text-lg text-navy-600 mb-1">Kein aktiver Mieter</p>
          <p className="text-sm text-navy-400">Füge den aktuellen Mieter hinzu.</p>
        </div>
      )}

      {aktive.map(m => {
        const aktuell = aktuelleMietwerte(m)
        return (
        <div key={m.id} className="card space-y-4" style={{ borderLeftWidth: '4px', borderLeftColor: '#2e6b52' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-500/10 flex items-center justify-center shrink-0">
                <User size={18} className="text-brand-600" />
              </div>
              <div>
                <p className="font-semibold text-navy-700">{m.name}</p>
                {m.telefon && <p className="text-xs text-navy-500">{m.telefon}</p>}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: '#c0dfd3', color: '#1f4d3a' }}>Aktueller Mieter</span>
              <button onClick={() => bearbeiten(m)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
              <button onClick={() => loeschen(m.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
            </div>
          </div>

          {/* Mietdaten */}
          <div className="flex flex-col gap-3">
            <div className="card bg-white">
              <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Kaltmiete {aktuell.hatStaffel && <span className="text-brand-500">· aktuell</span>}</p>
              <p className="text-base font-bold text-brand-600">{euro(aktuell.kaltmiete)}/Mo.</p>
            </div>
            <div className="card bg-white">
              <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Nebenkosten</p>
              <p className="text-base font-bold text-navy-700">{euro(aktuell.nebenkosten)}/Mo.</p>
            </div>
            {(aktuell.kaltmiete || aktuell.nebenkosten) && (
              <div className="card col-span-2 sm:col-span-1" style={{ borderLeftWidth: '4px', borderLeftColor: '#2e6b52' }}>
                <p className="label mb-1">Warmmiete</p>
                <p className="text-base font-bold text-brand-600">{euro(aktuell.kaltmiete + aktuell.nebenkosten)}/Mo.</p>
              </div>
            )}
            {m.kaution && (
              <div className="card bg-white">
                <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Kaution</p>
                <p className="text-base font-bold text-navy-700">{euro(m.kaution)}</p>
              </div>
            )}
            {m.mietbeginn && (
              <div className="card bg-white">
                <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Mietbeginn</p>
                <p className="text-sm font-semibold text-navy-700">{datumDE(m.mietbeginn)}</p>
              </div>
            )}
            {m.mietende && (
              <div className="card bg-white">
                <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Mietende</p>
                <p className="text-sm font-semibold text-navy-700">{datumDE(m.mietende)}</p>
              </div>
            )}
          </div>

          {m.dokument && (
            <div className="flex items-center gap-2 p-2.5 bg-white border border-emerald-200 rounded-xl text-sm">
              <FileText size={15} className="text-brand-500 shrink-0" />
              <span className="flex-1 truncate text-navy-700 font-medium">{m.dokument.name}</span>
              <button onClick={() => oeffneDatei(m.dokument.pfad)}
                className="text-brand-500 hover:text-brand-600 text-xs font-medium shrink-0">Öffnen</button>
            </div>
          )}

          <MietverlaufBlock mieter={m} onSpeichern={neueStaffel => staffelSpeichern(m.id, neueStaffel)} />
        </div>
        )
      })}

      {/* Formular */}
      {formOffen && (
        <MieterFormular
          initial={bearbeiteteMieter || LEER_MIETER}
          titel={bearbeitungId ? 'Mieter bearbeiten' : 'Neuer Mieter'}
          onSpeichern={speichern}
          onAbbrechen={() => { setFormOffen(false); setBearbeitungId(null) }}
        />
      )}

      {!formOffen && (
        <button className="btn-primary" onClick={() => { setBearbeitungId(null); setFormOffen(true) }}>
          <Plus size={15} /> Mieter hinzufügen
        </button>
      )}

      {/* Frühere Mieter */}
      {inaktive.length > 0 && (
        <div>
          <button
            onClick={() => setHistorieOffen(!historieOffen)}
            className="flex items-center gap-2 text-sm text-navy-500 hover:text-navy-700 font-medium"
          >
            {historieOffen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
            Frühere Mieter ({inaktive.length})
          </button>

          {historieOffen && (
            <div className="mt-3 space-y-3">
              {inaktive.map(m => (
                <div key={m.id} className="card opacity-75 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-navy-100 flex items-center justify-center shrink-0">
                        <User size={16} className="text-navy-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-navy-700 text-sm">{m.name}</p>
                        <p className="text-xs text-navy-400">
                          {m.mietbeginn ? datumDE(m.mietbeginn) : '?'} – {m.mietende ? datumDE(m.mietende) : '?'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs bg-navy-100 text-navy-500 px-2 py-0.5 rounded-full">Inaktiv</span>
                      <button onClick={() => bearbeiten(m)} className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={13} /></button>
                      <button onClick={() => loeschen(m.id)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                    </div>
                  </div>
                  <div className="flex gap-4 text-xs text-navy-600">
                    {m.kaltmiete && <span>Kalt: <strong>{euro(m.kaltmiete)}</strong></span>}
                    {m.nebenkosten && <span>NK: <strong>{euro(m.nebenkosten)}</strong></span>}
                    {(m.kaltmiete || m.nebenkosten) && (
                      <span>Warm: <strong>{euro((+m.kaltmiete || 0) + (+m.nebenkosten || 0))}</strong></span>
                    )}
                  </div>
                  {m.dokument && (
                    <button onClick={() => oeffneDatei(m.dokument.pfad)}
                      className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
                      <FileText size={12} /> {m.dokument.name}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Finanzierung-Tab ─────────────────────────────────────────────────────────
const LEER_SONDERTILGUNG = { id: null, datum: '', betrag: '', beschreibung: '' }

function FinanzierungTab({ immobilie, onSave }) {
  const fin0 = immobilie.finanzierung || {}
  const [form, setForm] = useState({
    modus: 'manuell', // 'manuell' | 'annuitaet'
    hausgeld: '', zinsen: '', tilgung: '', bank: '', restschuld: '',
    // Annuitätendarlehen
    darlehensbetrag: '', zinssatz: '', tilgungssatz: '',
    sondertilgungen: [],
    ...fin0
  })
  const [bearbeiten, setBearbeiten] = useState(!fin0.zinsen && !fin0.hausgeld && !fin0.zinssatz)
  const [stFormOffen, setStFormOffen] = useState(false)
  const [stForm, setStForm] = useState(LEER_SONDERTILGUNG)
  const [stBearbId, setStBearbId] = useState(null)

  const annRate = form.modus === 'annuitaet'
    ? berechneAnnuitaet(+form.darlehensbetrag, +form.zinssatz, +form.tilgungssatz)
    : null

  const monatlicheZinsen = form.modus === 'annuitaet' && form.darlehensbetrag && form.zinssatz
    ? (+form.darlehensbetrag * +form.zinssatz / 100 / 12)
    : +form.zinsen || 0
  const monatlicheTilgung = form.modus === 'annuitaet' && annRate
    ? annRate - monatlicheZinsen
    : +form.tilgung || 0

  const sondertilgungen = form.sondertilgungen || []
  const sonderSumme = sondertilgungen.reduce((s, t) => s + (+t.betrag || 0), 0)

  // Berechnete Restschuld: eingegebene Restschuld abzgl. Sondertilgungen
  const restschuld = form.restschuld ? +form.restschuld : (form.darlehensbetrag ? +form.darlehensbetrag : null)
  const restschuldNachSonder = restschuld !== null ? Math.max(0, restschuld - sonderSumme) : null

  function speichern() {
    onSave({ ...immobilie, finanzierung: { ...form, _annRate: annRate } })
    setBearbeiten(false)
  }

  function stSpeichern() {
    if (!stForm.datum || !stForm.betrag) return
    const eintrag = { ...stForm, betrag: +stForm.betrag, id: stBearbId ?? Date.now().toString() }
    const neu = stBearbId
      ? sondertilgungen.map(s => s.id === stBearbId ? eintrag : s)
      : [...sondertilgungen, eintrag]
    const neuesFin = { ...form, sondertilgungen: neu }
    setForm(neuesFin)
    onSave({ ...immobilie, finanzierung: neuesFin })
    setStForm(LEER_SONDERTILGUNG)
    setStBearbId(null)
    setStFormOffen(false)
  }

  function stLoeschen(id) {
    const neu = sondertilgungen.filter(s => s.id !== id)
    const neuesFin = { ...form, sondertilgungen: neu }
    setForm(neuesFin)
    onSave({ ...immobilie, finanzierung: neuesFin })
  }

  // Aktiver Mieter für Cashflow — Kaltmiete inkl. evtl. Staffelmiete/Mieterhöhung
  const aktiverMieter = (immobilie.mieter || []).find(m => istAktiv(m))
  const aktiveMietwerte = aktiverMieter ? aktuelleMietwerte(aktiverMieter) : null
  const warmmiete = (aktiveMietwerte?.kaltmiete || 0) + (aktiveMietwerte?.nebenkosten || 0)
  const gesamtBelastung = monatlicheZinsen + monatlicheTilgung + (+(fin0.hausgeld || form.hausgeld) || 0)
  const cashflow = warmmiete - gesamtBelastung
  const hatCashflow = warmmiete > 0 || gesamtBelastung > 0

  const hatDaten = fin0.zinssatz || fin0.zinsen || fin0.hausgeld

  return (
    <div className="space-y-6">
      {hatDaten && !bearbeiten ? (
        <>
          {/* Cashflow-Karte */}
          {hatCashflow && (
            <div className="card" style={{ borderLeftWidth: '4px', borderLeftColor: '#321f13' }}>
              <p className="label mb-3">Monatlicher Cashflow</p>
              <div className="space-y-2 text-sm">
                {warmmiete > 0 && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-navy-400">Kaltmiete</span>
                      <span className="text-brand-600 font-medium">+ {euro(aktiveMietwerte?.kaltmiete || 0)}</span>
                    </div>
                    {aktiveMietwerte?.nebenkosten > 0 && (
                      <div className="flex justify-between">
                        <span className="text-navy-400">Nebenkosten</span>
                        <span className="text-brand-600 font-medium">+ {euro(aktiveMietwerte.nebenkosten)}</span>
                      </div>
                    )}
                  </>
                )}
                {monatlicheZinsen > 0 && <div className="flex justify-between"><span className="text-navy-400">Zinsen</span><span className="text-red-500">− {euro(monatlicheZinsen)}</span></div>}
                {monatlicheTilgung > 0 && <div className="flex justify-between"><span className="text-navy-400">Tilgung</span><span className="text-red-500">− {euro(monatlicheTilgung)}</span></div>}
                {(fin0.hausgeld || form.hausgeld) > 0 && <div className="flex justify-between"><span className="text-navy-400">Hausgeld</span><span className="text-red-500">− {euro(fin0.hausgeld || form.hausgeld)}</span></div>}
                <div className="border-t pt-2 flex justify-between font-bold text-base" style={{ borderColor: '#e8dece' }}>
                  <span className="text-navy-700">Netto-Cashflow</span>
                  <span className={cashflow >= 0 ? 'text-brand-600' : 'text-red-500'}>
                    {cashflow >= 0 ? '+' : ''}{euro(cashflow)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Darlehens-Übersicht */}
          <div className="flex flex-col gap-3">
            {fin0.modus === 'annuitaet' && fin0.darlehensbetrag && (
              <>
                <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Darlehensbetrag</p><p className="text-base font-bold text-navy-700">{euro(fin0.darlehensbetrag)}</p></div>
                <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Monatliche Rate</p><p className="text-base font-bold text-navy-700">{euro(fin0._annRate)}</p></div>
                <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Zinssatz</p><p className="text-base font-bold text-navy-700">{fin0.zinssatz} %</p></div>
                <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Tilgungssatz</p><p className="text-base font-bold text-navy-700">{fin0.tilgungssatz} %</p></div>
              </>
            )}
            {fin0.modus !== 'annuitaet' && (
              <>
                {fin0.zinsen > 0 && <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Zinsen</p><p className="text-base font-bold text-navy-700">{euro(fin0.zinsen)}/Mo.</p></div>}
                {fin0.tilgung > 0 && <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Tilgung</p><p className="text-base font-bold text-navy-700">{euro(fin0.tilgung)}/Mo.</p></div>}
              </>
            )}
            {fin0.hausgeld > 0 && <div className="card"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Hausgeld</p><p className="text-base font-bold text-navy-700">{euro(fin0.hausgeld)}/Mo.</p></div>}
            {restschuldNachSonder !== null && (
              <div className="card col-span-2" style={{ background: '#f7f3ed' }}>
                <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Aktuelle Restschuld</p>
                <p className="text-base font-bold text-navy-700">{euro(restschuldNachSonder)}</p>
                {sonderSumme > 0 && <p className="text-xs text-navy-400 mt-0.5">inkl. {euro(sonderSumme)} Sondertilgungen</p>}
              </div>
            )}
            {fin0.bank && <div className="card col-span-2"><p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Kreditgeber</p><p className="font-semibold text-navy-700">{fin0.bank}</p></div>}
          </div>

          <button className="btn-secondary" onClick={() => setBearbeiten(true)}><Edit2 size={14} /> Finanzierung bearbeiten</button>

          {/* Tilgungsplan-Grafik */}
          <TilgungsplanChart finanzierung={fin0} />
        </>
      ) : (
        /* Bearbeitungsformular */
        <div className="card space-y-5">
          <h3 className="font-serif text-lg font-semibold text-navy-700">Finanzierung eintragen</h3>

          {/* Modus-Umschalter */}
          <div>
            <label className="label mb-2">Eingabemodus</label>
            <div className="flex gap-1 p-1 rounded-xl w-fit" style={{ background: '#ede6d8' }}>
              <button
                onClick={() => setForm({ ...form, modus: 'manuell' })}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.modus !== 'annuitaet' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500'}`}
              >Manuell (€)</button>
              <button
                onClick={() => setForm({ ...form, modus: 'annuitaet' })}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${form.modus === 'annuitaet' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500'}`}
              ><Calculator size={13} /> Annuitätendarlehen</button>
            </div>
          </div>

          {form.modus === 'annuitaet' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="label">Darlehensbetrag (€)</label>
                <input className="input" type="number" value={form.darlehensbetrag} onChange={e => setForm({ ...form, darlehensbetrag: e.target.value })} placeholder="z.B. 250000" />
              </div>
              <div>
                <label className="label">Zinssatz (% p.a.)</label>
                <input className="input" type="number" step="0.01" value={form.zinssatz} onChange={e => setForm({ ...form, zinssatz: e.target.value })} placeholder="z.B. 3.5" />
              </div>
              <div>
                <label className="label">Anfänglicher Tilgungssatz (% p.a.)</label>
                <input className="input" type="number" step="0.01" value={form.tilgungssatz} onChange={e => setForm({ ...form, tilgungssatz: e.target.value })} placeholder="z.B. 2.0" />
              </div>
              {annRate && (
                <div className="sm:col-span-2 bg-brand-500/10 border border-brand-500/30 rounded-xl px-4 py-3">
                  <p className="text-xs text-brand-600 font-medium uppercase tracking-widest mb-1">Berechnete monatliche Rate</p>
                  <p className="text-2xl font-bold text-navy-700">{euro(annRate)}<span className="text-sm font-normal text-navy-400">/Mo.</span></p>
                  <div className="flex gap-4 text-xs text-navy-500 mt-1">
                    <span>davon Zinsen: <strong>{euro(+form.darlehensbetrag * +form.zinssatz / 100 / 12)}</strong></span>
                    <span>davon Tilgung: <strong>{euro(annRate - (+form.darlehensbetrag * +form.zinssatz / 100 / 12))}</strong></span>
                  </div>
                </div>
              )}
              <div className="sm:col-span-2">
                <label className="label">Aktueller Restschuldstand (€) <span className="text-navy-400 font-normal normal-case">— manuell eingeben</span></label>
                <input className="input" type="number" value={form.restschuld} onChange={e => setForm({ ...form, restschuld: e.target.value })} placeholder="0" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Zinsen (€/Mo.)</label>
                <input className="input" type="number" value={form.zinsen} onChange={e => setForm({ ...form, zinsen: e.target.value })} placeholder="0" />
              </div>
              <div>
                <label className="label">Tilgung (€/Mo.)</label>
                <input className="input" type="number" value={form.tilgung} onChange={e => setForm({ ...form, tilgung: e.target.value })} placeholder="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Aktuelle Restschuld (€)</label>
                <input className="input" type="number" value={form.restschuld} onChange={e => setForm({ ...form, restschuld: e.target.value })} placeholder="0" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Hausgeld (€/Mo.)</label>
              <input className="input" type="number" value={form.hausgeld} onChange={e => setForm({ ...form, hausgeld: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Kreditgeber / Bank</label>
              <input className="input" value={form.bank} onChange={e => setForm({ ...form, bank: e.target.value })} placeholder="z.B. Sparkasse" />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            {hatDaten && <button className="btn-secondary" onClick={() => setBearbeiten(false)}><X size={14} /> Abbrechen</button>}
          </div>
        </div>
      )}

      {/* Sondertilgungen */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-navy-700">Sondertilgungen</h3>
          {!stFormOffen && (
            <button
              onClick={() => { setStBearbId(null); setStForm(LEER_SONDERTILGUNG); setStFormOffen(true) }}
              className="text-xs text-brand-500 hover:text-brand-600 font-medium flex items-center gap-1"
            ><Plus size={13} /> Hinzufügen</button>
          )}
        </div>

        {sonderSumme > 0 && (
          <div className="card flex items-center gap-3" style={{ borderLeftWidth: '4px', borderLeftColor: '#2e6b52' }}>
            <div>
              <p className="label mb-0.5">Gesamte Sondertilgungen</p>
              <p className="text-base font-bold text-brand-600">{euro(sonderSumme)}</p>
            </div>
            {restschuld !== null && (
              <div className="ml-auto text-right">
                <p className="text-xs text-navy-400">Restschuld danach</p>
                <p className="text-base font-bold text-navy-700">{euro(restschuldNachSonder)}</p>
              </div>
            )}
          </div>
        )}

        {stFormOffen && (
          <div className="card border-brand-400 space-y-4">
            <h4 className="font-semibold text-navy-700">Sondertilgung eintragen</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Datum</label>
                <input className="input" type="date" value={stForm.datum} onChange={e => setStForm({ ...stForm, datum: e.target.value })} />
              </div>
              <div>
                <label className="label">Betrag (€)</label>
                <input className="input" type="number" value={stForm.betrag} onChange={e => setStForm({ ...stForm, betrag: e.target.value })} placeholder="0" />
              </div>
              <div className="sm:col-span-2">
                <label className="label">Beschreibung (optional)</label>
                <input className="input" value={stForm.beschreibung} onChange={e => setStForm({ ...stForm, beschreibung: e.target.value })} placeholder="z.B. Jahres-Sondertilgung 2025" />
              </div>
            </div>
            <div className="flex gap-2">
              <button className="btn-primary" onClick={stSpeichern}><Check size={14} /> Speichern</button>
              <button className="btn-secondary" onClick={() => { setStFormOffen(false); setStBearbId(null) }}><X size={14} /> Abbrechen</button>
            </div>
          </div>
        )}

        {sondertilgungen.length === 0 && !stFormOffen ? (
          <p className="text-sm text-navy-400">Noch keine Sondertilgungen eingetragen.</p>
        ) : (
          <div className="card p-0 overflow-hidden">
            {[...sondertilgungen].sort((a, b) => b.datum.localeCompare(a.datum)).map((st, i, arr) => (
              <div key={st.id} className={`px-4 py-3 flex items-center gap-3 hover:bg-navy-50/40 ${i < arr.length - 1 ? 'border-b border-navy-50' : ''}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-700">{st.beschreibung || 'Sondertilgung'}</p>
                  <p className="text-xs text-navy-400">{datumDE(st.datum)}</p>
                </div>
                <p className="text-sm font-bold text-brand-600 shrink-0">{euro(st.betrag)}</p>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setStForm({ ...st, betrag: st.betrag.toString() }); setStBearbId(st.id); setStFormOffen(true) }}
                    className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={13} /></button>
                  <button onClick={() => stLoeschen(st.id)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Instandhaltung-Tab ───────────────────────────────────────────────────────
const LEER_MASSNAHME = { id: null, datum: '', kategorie: 'Sonstiges', beschreibung: '', betrag: '', dokument: null }
const INSTANDHALTUNG_KATEGORIEN = [
  'Heizung', 'Sanitär / Bad', 'Elektrik', 'Dach', 'Fassade / Außen',
  'Böden / Parkett', 'Fenster / Türen', 'Küche', 'Garten / Außenanlage',
  'Sicherheitstechnik', 'Versicherungsschaden', 'Sonstiges'
]

function InstandhaltungTab({ immobilie, onSave }) {
  const [formOffen, setFormOffen] = useState(false)
  const [form, setForm] = useState(LEER_MASSNAHME)
  const [bearbeitungId, setBearbeitungId] = useState(null)

  const massnahmen = (immobilie.instandhaltung || []).sort((a, b) => b.datum.localeCompare(a.datum))
  const gesamtBetrag = massnahmen.reduce((s, m) => s + (Number(m.betrag) || 0), 0)
  const jahre = [...new Set(massnahmen.map(m => m.datum?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)

  function speichern() {
    if (!form.datum || !form.beschreibung) return
    const eintrag = { ...form, betrag: Number(form.betrag) || 0, id: bearbeitungId ?? Date.now().toString() }
    const liste = bearbeitungId
      ? immobilie.instandhaltung.map(m => m.id === bearbeitungId ? eintrag : m)
      : [...(immobilie.instandhaltung || []), eintrag]
    onSave({ ...immobilie, instandhaltung: liste })
    setForm(LEER_MASSNAHME); setBearbeitungId(null); setFormOffen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
        <span>Alle Maßnahmen und Rechnungen werden hier gesammelt — perfekt für die Steuererklärung.</span>
      </div>

      {massnahmen.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Maßnahmen gesamt</p>
            <p className="text-xl font-bold text-navy-700">{massnahmen.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Kosten gesamt</p>
            <p className="text-xl font-bold text-navy-700">{euro(gesamtBetrag)}</p>
          </div>
        </div>
      )}

      {!formOffen ? (
        <button className="btn-primary" onClick={() => setFormOffen(true)}><Plus size={15} /> Maßnahme eintragen</button>
      ) : (
        <div className="card border-amber-200 space-y-4">
          <h3 className="font-serif text-lg font-semibold text-navy-700">{bearbeitungId ? 'Bearbeiten' : 'Neue Maßnahme'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum</label>
              <input className="input" type="date" value={form.datum} onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.kategorie} onChange={e => setForm({ ...form, kategorie: e.target.value })}>
                {INSTANDHALTUNG_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="label">Beschreibung</label>
              <input className="input" value={form.beschreibung} onChange={e => setForm({ ...form, beschreibung: e.target.value })} placeholder="z.B. Heizungswartung durch Fa. Müller" />
            </div>
            <div>
              <label className="label">Kosten (€)</label>
              <input className="input" type="number" value={form.betrag} onChange={e => setForm({ ...form, betrag: e.target.value })} placeholder="0" />
            </div>
          </div>
          <DokumentUpload label="Rechnung hochladen" dokument={form.dokument} onChange={dok => setForm({ ...form, dokument: dok })} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => { setFormOffen(false); setForm(LEER_MASSNAHME); setBearbeitungId(null) }}><X size={14} /> Abbrechen</button>
          </div>
        </div>
      )}

      {massnahmen.length === 0 ? (
        <div className="card text-center py-8 border-dashed">
          <Wrench size={32} className="mx-auto mb-2 text-navy-300" />
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Maßnahmen</p>
          <p className="text-sm text-navy-400">Erfasse Reparaturen und Wartungen für die Steuererklärung.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jahre.map(jahr => {
            const eintraege = massnahmen.filter(m => m.datum?.startsWith(jahr))
            const jahresSumme = eintraege.reduce((s, m) => s + (Number(m.betrag) || 0), 0)
            return (
              <div key={jahr}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs text-navy-400 uppercase tracking-widest font-semibold">{jahr}</p>
                  <span className="text-xs text-navy-500 font-semibold">{euro(jahresSumme)}</span>
                </div>
                <div className="card p-0 overflow-hidden">
                  {eintraege.map((m, i) => (
                    <div key={m.id} className={`px-4 py-3 flex items-start gap-3 hover:bg-navy-50/40 ${i < eintraege.length - 1 ? 'border-b border-navy-50' : ''}`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full">{m.kategorie}</span>
                          {m.dokument?.pfad && (
                            <button onClick={() => oeffneDatei(m.dokument.pfad)}
                              className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600">
                              <FileText size={12} /> Rechnung
                            </button>
                          )}
                          {m.dokument && !m.dokument.pfad && m.dokument._fileName && (
                            <span className="flex items-center gap-1 text-xs text-navy-400"><FileText size={12} /> {m.dokument._fileName} (alte Version, nicht mehr verfügbar)</span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-navy-700 mt-1">{m.beschreibung}</p>
                        <p className="text-xs text-navy-400">{datumDE(m.datum)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-navy-700">{m.betrag ? euro(m.betrag) : '—'}</p>
                        <div className="flex gap-1 justify-end mt-1">
                          <button onClick={() => { setForm({ ...m, betrag: m.betrag?.toString() || '' }); setBearbeitungId(m.id); setFormOffen(true) }}
                            className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={13} /></button>
                          <button onClick={() => onSave({ ...immobilie, instandhaltung: immobilie.instandhaltung.filter(x => x.id !== m.id) })}
                            className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

// ─── Steuern-Tab ──────────────────────────────────────────────────────────────
const LEER_STEUER = { id: null, steuerjahr: String(new Date().getFullYear()), betrag: '', beschreibung: 'Grundsteuer B', dokument: null }

function SteuernTab({ immobilie, onSave }) {
  const [formOffen, setFormOffen] = useState(false)
  const [form, setForm] = useState(LEER_STEUER)
  const [bearbeitungId, setBearbeitungId] = useState(null)

  const eintraege = (immobilie.steuern || []).sort((a, b) => b.steuerjahr.localeCompare(a.steuerjahr))
  const gesamt = eintraege.reduce((s, e) => s + (Number(e.betrag) || 0), 0)

  function speichern() {
    if (!form.steuerjahr || !form.betrag) return
    const eintrag = { ...form, betrag: Number(form.betrag), id: bearbeitungId ?? Date.now().toString() }
    const liste = bearbeitungId
      ? immobilie.steuern.map(e => e.id === bearbeitungId ? eintrag : e)
      : [...(immobilie.steuern || []), eintrag]
    onSave({ ...immobilie, steuern: liste })
    setForm(LEER_STEUER); setBearbeitungId(null); setFormOffen(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
        <span>Trage hier die jährliche Grundsteuer ein — sie wird automatisch in der Steuerübersicht berücksichtigt.</span>
      </div>

      {eintraege.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Einträge</p>
            <p className="text-xl font-bold text-navy-700">{eintraege.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Gesamt</p>
            <p className="text-xl font-bold text-navy-700">{euro(gesamt)}</p>
          </div>
        </div>
      )}

      {!formOffen ? (
        <button className="btn-primary" onClick={() => setFormOffen(true)}><Plus size={15} /> Grundsteuer eintragen</button>
      ) : (
        <div className="card space-y-4">
          <h3 className="font-serif text-lg font-semibold text-navy-700">{bearbeitungId ? 'Bearbeiten' : 'Neue Grundsteuer'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Steuerjahr</label>
              <input className="input" type="number" min="2000" max="2099" value={form.steuerjahr}
                onChange={e => setForm({ ...form, steuerjahr: e.target.value })} placeholder="2024" />
            </div>
            <div>
              <label className="label">Betrag (€)</label>
              <input className="input" type="number" value={form.betrag}
                onChange={e => setForm({ ...form, betrag: e.target.value })} placeholder="0" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Beschreibung</label>
              <input className="input" value={form.beschreibung}
                onChange={e => setForm({ ...form, beschreibung: e.target.value })} placeholder="z.B. Grundsteuer B" />
            </div>
          </div>
          <DokumentUpload label="Grundsteuerbescheid hochladen" dokument={form.dokument} onChange={dok => setForm({ ...form, dokument: dok })} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => { setFormOffen(false); setForm(LEER_STEUER); setBearbeitungId(null) }}><X size={14} /> Abbrechen</button>
          </div>
        </div>
      )}

      {eintraege.length === 0 ? (
        <div className="card text-center py-8 border-dashed">
          <Euro size={32} className="mx-auto mb-2 text-navy-300" />
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Grundsteuer eingetragen</p>
          <p className="text-sm text-navy-400">Füge die jährlichen Grundsteuerbeträge hinzu.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-2 border-b grid grid-cols-[80px_1fr_auto] gap-3 text-xs text-navy-400 uppercase tracking-widest font-medium" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
            <span>Jahr</span>
            <span>Beschreibung</span>
            <span className="text-right">Betrag</span>
          </div>
          {eintraege.map((e, i) => (
            <div key={e.id}
              className={`px-4 py-3 grid grid-cols-[80px_1fr_auto] gap-3 items-center hover:bg-navy-50/40 ${i < eintraege.length - 1 ? 'border-b border-navy-50' : ''}`}>
              <span className="text-sm font-semibold text-navy-700">{e.steuerjahr}</span>
              <div className="min-w-0">
                <p className="text-sm text-navy-700">{e.beschreibung || '—'}</p>
                {e.dokument?.pfad && (
                  <button onClick={() => oeffneDatei(e.dokument.pfad)}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 mt-0.5">
                    <FileText size={11} /> {e.dokument.name}
                  </button>
                )}
                {e.dokument && !e.dokument.pfad && e.dokument._fileName && (
                  <span className="flex items-center gap-1 text-xs text-navy-400 mt-0.5"><FileText size={11} /> {e.dokument._fileName} (alte Version, nicht mehr verfügbar)</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-navy-700">{euro(e.betrag)}</p>
                <div className="flex gap-1 justify-end mt-1">
                  <button onClick={() => { setForm({ ...e, betrag: e.betrag?.toString() || '' }); setBearbeitungId(e.id); setFormOffen(true) }}
                    className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={13} /></button>
                  <button onClick={() => onSave({ ...immobilie, steuern: immobilie.steuern.filter(x => x.id !== e.id) })}
                    className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
          <div className="px-4 py-3 bg-navy-50 border-t border-navy-200 grid grid-cols-[80px_1fr_auto] gap-3">
            <span />
            <span className="text-sm font-semibold text-navy-700">Gesamt</span>
            <span className="text-base font-bold text-navy-700 text-right">{euro(gesamt)}</span>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Eigentümerversammlungen-Tab ──────────────────────────────────────────────
const LEER_PROTOKOLL = { id: null, datum: '', titel: '', beschluesse: '', dokument: null }

function EigentuemerTab({ immobilie, onSave }) {
  const [formOffen, setFormOffen] = useState(false)
  const [form, setForm] = useState(LEER_PROTOKOLL)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [aufgeklappt, setAufgeklappt] = useState(null)

  const protokolle = (immobilie.eigentuemerversammlungen || [])
    .sort((a, b) => b.datum.localeCompare(a.datum))

  function speichern() {
    if (!form.datum || !form.titel) return
    const eintrag = { ...form, id: bearbeitungId ?? Date.now().toString() }
    const liste = bearbeitungId
      ? protokolle.map(p => p.id === bearbeitungId ? eintrag : p)
      : [...protokolle, eintrag]
    onSave({ ...immobilie, eigentuemerversammlungen: liste })
    setForm(LEER_PROTOKOLL)
    setBearbeitungId(null)
    setFormOffen(false)
  }

  function bearbeiten(p) {
    setForm({ ...p })
    setBearbeitungId(p.id)
    setFormOffen(true)
    setAufgeklappt(null)
  }

  function loeschen(id) {
    if (!window.confirm('Protokoll wirklich löschen?')) return
    onSave({ ...immobilie, eigentuemerversammlungen: protokolle.filter(p => p.id !== id) })
    if (aufgeklappt === id) setAufgeklappt(null)
  }

  const jahre = [...new Set(protokolle.map(p => p.datum?.slice(0, 4)).filter(Boolean))].sort((a, b) => b - a)

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 bg-brand-500/10 border border-brand-500/20 rounded-xl px-4 py-3 text-sm text-brand-600">
        <Users size={15} className="shrink-0 mt-0.5" />
        <span>Protokolle der Eigentümerversammlungen — immer griffbereit, geordnet nach Jahr.</span>
      </div>

      {!formOffen ? (
        <button className="btn-primary" onClick={() => { setBearbeitungId(null); setForm(LEER_PROTOKOLL); setFormOffen(true) }}>
          <Plus size={15} /> Protokoll hinzufügen
        </button>
      ) : (
        <div className="card border-brand-400 space-y-4">
          <h3 className="font-serif text-lg font-semibold text-navy-700">
            {bearbeitungId ? 'Protokoll bearbeiten' : 'Neues Protokoll'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Datum der Versammlung</label>
              <input className="input" type="date" value={form.datum}
                onChange={e => setForm({ ...form, datum: e.target.value })} />
            </div>
            <div>
              <label className="label">Titel / Bezeichnung</label>
              <input className="input" value={form.titel}
                onChange={e => setForm({ ...form, titel: e.target.value })}
                placeholder="z.B. Jahresversammlung 2025" />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Beschlüsse / Notizen</label>
              <textarea
                className="input h-auto"
                rows={4}
                value={form.beschluesse}
                onChange={e => setForm({ ...form, beschluesse: e.target.value })}
                placeholder="Wichtige Beschlüsse, Themen, Abstimmungsergebnisse..."
                style={{ resize: 'vertical' }}
              />
            </div>
          </div>
          <DokumentUpload
            label="Protokoll hochladen (PDF)"
            dokument={form.dokument}
            onChange={dok => setForm({ ...form, dokument: dok })}
          />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => { setFormOffen(false); setForm(LEER_PROTOKOLL); setBearbeitungId(null) }}>
              <X size={14} /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {protokolle.length === 0 ? (
        <div className="card text-center py-8 border-dashed">
          <Users size={32} className="mx-auto mb-2 text-navy-300" />
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Protokolle</p>
          <p className="text-sm text-navy-400">Füge das erste Protokoll einer Eigentümerversammlung hinzu.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {jahre.map(jahr => {
            const eintraege = protokolle.filter(p => p.datum?.startsWith(jahr))
            return (
              <div key={jahr}>
                <p className="text-xs text-navy-400 uppercase tracking-widest font-semibold mb-3">
                  {jahr} · {eintraege.length} {eintraege.length === 1 ? 'Versammlung' : 'Versammlungen'}
                </p>
                <div className="space-y-2">
                  {eintraege.map(p => {
                    const offen = aufgeklappt === p.id
                    return (
                      <div key={p.id} className="card p-0 overflow-hidden">
                        {/* Kopfzeile */}
                        <button
                          onClick={() => setAufgeklappt(offen ? null : p.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-navy-50/50 transition-colors text-left"
                        >
                          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center shrink-0">
                            <StickyNote size={14} className="text-brand-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-navy-700 truncate">{p.titel}</p>
                            <p className="text-xs text-navy-400">{datumDE(p.datum)}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {p.dokument && (
                              <span className="text-xs text-brand-500 flex items-center gap-1">
                                <FileText size={12} /> PDF
                              </span>
                            )}
                            {offen ? <ChevronUp size={15} className="text-navy-400" /> : <ChevronDown size={15} className="text-navy-400" />}
                          </div>
                        </button>

                        {/* Ausgeklappter Inhalt */}
                        {offen && (
                          <div className="border-t border-navy-50 px-4 py-4 space-y-4 bg-navy-50/30">
                            {p.beschluesse && (
                              <div>
                                <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Beschlüsse / Notizen</p>
                                <p className="text-sm text-navy-700 whitespace-pre-wrap leading-relaxed">{p.beschluesse}</p>
                              </div>
                            )}
                            {p.dokument && (
                              <div>
                                <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Protokoll-Dokument</p>
                                <button
                                  onClick={() => oeffneDatei(p.dokument.pfad)}
                                  className="flex items-center gap-2 p-2.5 bg-white border border-navy-200 rounded-xl text-sm hover:border-brand-400 transition-colors"
                                >
                                  <FileText size={15} className="text-brand-500" />
                                  <span className="text-navy-700 font-medium truncate">{p.dokument.name}</span>
                                  <span className="text-brand-500 text-xs ml-auto shrink-0">Öffnen</span>
                                </button>
                              </div>
                            )}
                            <div className="flex gap-2 pt-1">
                              <button onClick={() => bearbeiten(p)}
                                className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-navy-700 font-medium">
                                <Edit2 size={12} /> Bearbeiten
                              </button>
                              <button onClick={() => loeschen(p.id)}
                                className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-600 font-medium ml-2">
                                <Trash2 size={12} /> Löschen
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Dokumente Tab ────────────────────────────────────────────────────────────
const DOKUMENT_KATEGORIEN = [
  'Energieausweis',
  'Grundriss',
  'Kaufvertrag',
  'Grundbuchauszug',
  'Teilungserklärung',
  'Hausordnung',
  'Versicherungspolice',
  'Nebenkostenabrechnung',
  'Protokoll ETV',
  'Sonstiges',
]

function DokumenteTab({ immobilie, onSave }) {
  const dokumente = immobilie.dokumente || []
  const [form, setForm] = useState({ bezeichnung: '', kategorie: '', datei: null })
  const [formOffen, setFormOffen] = useState(false)
  const [hochladen, setHochladen] = useState(false)
  const [fehler, setFehler] = useState('')
  const fileRef = useRef(null)

  async function dateiGewaehlt(file) {
    if (!file) return
    setFehler(''); setHochladen(true)
    try {
      const meta = await hochladenDatei(file)
      setForm(f => ({ ...f, datei: meta, bezeichnung: f.bezeichnung || meta.name.replace(/\.[^.]+$/, '') }))
    } catch (err) {
      setFehler('Hochladen fehlgeschlagen: ' + (err.message || err))
    } finally {
      setHochladen(false)
    }
  }

  function hinzufuegen() {
    if (!form.bezeichnung.trim() && !form.datei) return
    const neu = {
      id: Date.now().toString(),
      bezeichnung: form.bezeichnung || form.datei?.name || '',
      kategorie: form.kategorie || 'Sonstiges',
      datei: form.datei || null,
      datum: new Date().toISOString().slice(0, 10),
    }
    onSave({ ...immobilie, dokumente: [...dokumente, neu] })
    setForm({ bezeichnung: '', kategorie: '', datei: null })
    setFormOffen(false)
  }

  async function loeschen(id) {
    const dok = dokumente.find(d => d.id === id)
    if (dok?.datei?.pfad) await loescheDatei(dok.datei.pfad)
    onSave({ ...immobilie, dokumente: dokumente.filter(d => d.id !== id) })
  }

  function oeffnen(dok) {
    if (dok.datei?.pfad) oeffneDatei(dok.datei.pfad)
  }

  const nachKat = DOKUMENT_KATEGORIEN.filter(k => dokumente.some(d => d.kategorie === k))
  const sonstige = dokumente.filter(d => !DOKUMENT_KATEGORIEN.includes(d.kategorie) || d.kategorie === 'Sonstiges')

  const kategorienMitEintraegen = [
    ...DOKUMENT_KATEGORIEN.filter(k => k !== 'Sonstiges' && dokumente.some(d => d.kategorie === k)),
    ...(sonstige.length > 0 ? ['Sonstiges'] : []),
  ]

  const eintraegeJeKat = (kat) =>
    kat === 'Sonstiges'
      ? dokumente.filter(d => d.kategorie === 'Sonstiges' || !DOKUMENT_KATEGORIEN.includes(d.kategorie))
      : dokumente.filter(d => d.kategorie === kat)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-navy-600 uppercase tracking-widest">Allgemeine Unterlagen</p>
          <p className="text-xs text-navy-400 mt-0.5">{dokumente.length} Dokument{dokumente.length !== 1 ? 'e' : ''}</p>
        </div>
        {!formOffen && (
          <button className="btn-primary" onClick={() => setFormOffen(true)}>
            <Plus size={14} /> Dokument
          </button>
        )}
      </div>

      {formOffen && (
        <div className="card space-y-4">
          <h3 className="font-serif text-base font-semibold text-navy-700">Dokument hinzufügen</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bezeichnung</label>
              <input className="input" placeholder="z.B. Energieausweis 2023"
                value={form.bezeichnung}
                onChange={e => setForm({ ...form, bezeichnung: e.target.value })} />
            </div>
            <div>
              <label className="label">Kategorie</label>
              <select className="input" value={form.kategorie}
                onChange={e => setForm({ ...form, kategorie: e.target.value })}>
                <option value="">Bitte wählen…</option>
                {DOKUMENT_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="label">Datei</label>
            <div
              className="rounded-xl border-2 border-dashed flex flex-col items-center justify-center py-6 cursor-pointer transition-colors hover:border-brand-400"
              style={{ borderColor: form.datei ? '#2e6b52' : '#d8ccba', background: form.datei ? '#edf7f2' : '#faf8f4' }}
              onClick={() => !hochladen && fileRef.current?.click()}
            >
              {hochladen ? (
                <p className="text-sm text-navy-500">Wird hochgeladen…</p>
              ) : form.datei ? (
                <>
                  <FileText size={22} className="text-brand-500 mb-1.5" />
                  <p className="text-sm font-medium text-brand-700">{form.datei.name}</p>
                </>
              ) : (
                <>
                  <Upload size={22} className="text-navy-300 mb-1.5" />
                  <p className="text-sm text-navy-500">Datei auswählen</p>
                  <p className="text-xs text-navy-400 mt-0.5">PDF, JPG, PNG, …</p>
                </>
              )}
            </div>
            <input ref={fileRef} type="file" className="hidden"
              onChange={e => { if (e.target.files[0]) dateiGewaehlt(e.target.files[0]); e.target.value = '' }} />
            {fehler && <p className="text-xs text-red-500 mt-1">{fehler}</p>}
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={hinzufuegen} disabled={hochladen || (!form.bezeichnung.trim() && !form.datei)}>
              <Check size={14} /> Speichern
            </button>
            <button className="btn-secondary" onClick={() => { setForm({ bezeichnung: '', kategorie: '', datei: null }); setFormOffen(false) }}>
              <X size={14} /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {dokumente.length === 0 && !formOffen && (
        <div className="card text-center py-10 border-dashed">
          <FileText size={32} className="mx-auto mb-3 text-navy-200" />
          <p className="font-serif text-base text-navy-600 mb-1">Noch keine Unterlagen</p>
          <p className="text-xs text-navy-400">Lege Dokumente wie Energieausweis, Grundriss oder Kaufvertrag ab.</p>
        </div>
      )}

      {kategorienMitEintraegen.map(kat => (
        <div key={kat} className="space-y-2">
          <p className="text-[10px] font-semibold text-navy-400 uppercase tracking-widest">{kat}</p>
          <div className="card p-0 overflow-hidden">
            {eintraegeJeKat(kat).map((dok, i, arr) => (
              <div key={dok.id}
                className={`px-4 py-3 flex items-center gap-3 ${i < arr.length - 1 ? 'border-b' : ''}`}
                style={{ borderColor: '#f0e8dc' }}>
                <FileText size={16} className="text-brand-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-navy-700 truncate">{dok.bezeichnung}</p>
                  <p className="text-xs text-navy-400">{dok.datum}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {dok.datei?.pfad && (
                    <button onClick={() => oeffnen(dok)}
                      className="p-1.5 text-brand-500 hover:text-brand-600 rounded" title="Öffnen">
                      <Download size={14} />
                    </button>
                  )}
                  {dok.datei && !dok.datei.pfad && dok.datei._fileName && (
                    <span className="text-xs text-navy-400 flex items-center gap-1 px-1.5">
                      <FileText size={11} /> {dok.datei._fileName} (alte Version, nicht mehr verfügbar)
                    </span>
                  )}
                  <button onClick={() => loeschen(dok.id)}
                    className="p-1.5 text-red-400 hover:text-red-600 rounded">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Wirtschaftspläne-Tab ─────────────────────────────────────────────────────
const LEER_WIRTSCHAFTSPLAN = { id: null, jahr: String(new Date().getFullYear()), typ: 'jahresabrechnung', betrag: '', beschreibung: '', dokument: null }

function WirtschaftsplaeneTab({ immobilie, onSave }) {
  const [formOffen, setFormOffen] = useState(false)
  const [form, setForm] = useState(LEER_WIRTSCHAFTSPLAN)
  const [bearbeitungId, setBearbeitungId] = useState(null)

  const eintraege = (immobilie.wirtschaftsplaene || []).sort((a, b) => b.jahr.localeCompare(a.jahr))

  function speichern() {
    if (!form.jahr) return
    const eintrag = { ...form, betrag: Number(form.betrag) || 0, id: bearbeitungId ?? Date.now().toString() }
    const liste = bearbeitungId
      ? immobilie.wirtschaftsplaene.map(e => e.id === bearbeitungId ? eintrag : e)
      : [...(immobilie.wirtschaftsplaene || []), eintrag]
    onSave({ ...immobilie, wirtschaftsplaene: liste })
    setForm(LEER_WIRTSCHAFTSPLAN); setBearbeitungId(null); setFormOffen(false)
  }

  function loeschen(id) {
    onSave({ ...immobilie, wirtschaftsplaene: immobilie.wirtschaftsplaene.filter(x => x.id !== id) })
  }

  const TYP_LABEL = { wirtschaftsplan: 'Wirtschaftsplan', jahresabrechnung: 'Jahresabrechnung' }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
        <AlertCircle size={15} className="shrink-0 mt-0.5 text-amber-500" />
        <div className="space-y-1.5">
          <p className="font-medium">Steuerlich absetzbar bei Vermietung:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            <li>Verwaltungskosten (Hausverwaltung)</li>
            <li>Instandhaltungsrücklage – nur soweit sie tatsächlich für Erhaltungsmaßnahmen verausgabt wurde</li>
            <li>Betriebskosten, die nicht auf Mieter umgelegt werden können</li>
            <li>Versicherungs- und Grundsteueranteile aus der Abrechnung</li>
          </ul>
          <p className="text-xs opacity-80">Nicht abzugsfähig sind reine Rücklagenzuführungen ohne Mittelverwendung. Im Zweifel mit Steuerberater prüfen.</p>
        </div>
      </div>

      {eintraege.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Einträge</p>
            <p className="text-xl font-bold text-navy-700">{eintraege.length}</p>
          </div>
          <div className="card text-center">
            <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Summe</p>
            <p className="text-xl font-bold text-navy-700">{euro(eintraege.reduce((s, e) => s + (Number(e.betrag) || 0), 0))}</p>
          </div>
        </div>
      )}

      {!formOffen ? (
        <button className="btn-primary" onClick={() => setFormOffen(true)}><Plus size={15} /> Eintrag hinzufügen</button>
      ) : (
        <div className="card space-y-4">
          <h3 className="font-serif text-lg font-semibold text-navy-700">{bearbeitungId ? 'Bearbeiten' : 'Neuer Eintrag'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Jahr</label>
              <input className="input" type="number" min="2000" max="2099" value={form.jahr}
                onChange={e => setForm({ ...form, jahr: e.target.value })} placeholder="2024" />
            </div>
            <div>
              <label className="label">Art</label>
              <select className="input" value={form.typ} onChange={e => setForm({ ...form, typ: e.target.value })}>
                <option value="wirtschaftsplan">Wirtschaftsplan</option>
                <option value="jahresabrechnung">Jahresabrechnung</option>
              </select>
            </div>
            <div>
              <label className="label">Betrag (€) <span className="text-navy-400 font-normal normal-case">Nachzahlung/Guthaben</span></label>
              <input className="input" type="number" value={form.betrag}
                onChange={e => setForm({ ...form, betrag: e.target.value })} placeholder="0" />
            </div>
            <div>
              <label className="label">Beschreibung</label>
              <input className="input" value={form.beschreibung}
                onChange={e => setForm({ ...form, beschreibung: e.target.value })} placeholder="z.B. Jahresabrechnung 2024" />
            </div>
          </div>
          <DokumentUpload label="Dokument hochladen" dokument={form.dokument} onChange={dok => setForm({ ...form, dokument: dok })} />
          <div className="flex gap-2">
            <button className="btn-primary" onClick={speichern}><Check size={14} /> Speichern</button>
            <button className="btn-secondary" onClick={() => { setFormOffen(false); setForm(LEER_WIRTSCHAFTSPLAN); setBearbeitungId(null) }}><X size={14} /> Abbrechen</button>
          </div>
        </div>
      )}

      {eintraege.length === 0 ? (
        <div className="card text-center py-8 border-dashed">
          <FileText size={32} className="mx-auto mb-2 text-navy-300" />
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Wirtschaftspläne</p>
          <p className="text-sm text-navy-400">Erfasse Wirtschaftspläne und Jahresabrechnungen.</p>
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          {eintraege.map((e, i) => (
            <div key={e.id}
              className={`px-4 py-3 flex items-start gap-3 hover:bg-navy-50/40 ${i < eintraege.length - 1 ? 'border-b border-navy-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs bg-navy-100 text-navy-600 px-2 py-0.5 rounded-full">{TYP_LABEL[e.typ] || e.typ}</span>
                  <span className="text-xs text-navy-400">{e.jahr}</span>
                </div>
                <p className="text-sm font-medium text-navy-700 mt-1">{e.beschreibung || '—'}</p>
                {e.dokument?.pfad && (
                  <button onClick={() => oeffneDatei(e.dokument.pfad)}
                    className="flex items-center gap-1 text-xs text-brand-500 hover:text-brand-600 mt-1">
                    <FileText size={12} /> {e.dokument.name}
                  </button>
                )}
                {e.dokument && !e.dokument.pfad && e.dokument._fileName && (
                  <span className="flex items-center gap-1 text-xs text-navy-400 mt-1"><FileText size={11} /> {e.dokument._fileName} (alte Version, nicht mehr verfügbar)</span>
                )}
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-bold text-navy-700">{e.betrag ? euro(e.betrag) : '—'}</p>
                <div className="flex gap-1 justify-end mt-1">
                  <button onClick={() => { setForm({ ...e, betrag: e.betrag?.toString() || '' }); setBearbeitungId(e.id); setFormOffen(true) }}
                    className="p-1 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={13} /></button>
                  <button onClick={() => loeschen(e.id)} className="p-1 text-red-400 hover:text-red-600 rounded"><Trash2 size={13} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Detailansicht ────────────────────────────────────────────────────────────
const ADMIN_EMAIL = 'nicolai.amato@gmx.ch'

const TABS = [
  { id: 'uebersicht',        label: 'Übersicht',              icon: Home },
  { id: 'dokumente',         label: 'Unterlagen zur Immobilie', icon: FileText },
  { id: 'mieter',            label: 'Mieter',                 icon: User },
  { id: 'finanzierung',      label: 'Finanzierung',           icon: Landmark },
  { id: 'instandhaltung',    label: 'Instandhaltung',         icon: Wrench },
  { id: 'wirtschaftsplaene', label: 'Wirtschaftspläne',       icon: Calculator },
  { id: 'steuern',           label: 'Steuern',                icon: Euro },
  { id: 'steuercheck',       label: 'KI-Steuercheck',         icon: Sparkles },
  { id: 'nebenkostenabr',    label: 'NK-Abrechnung',          icon: Receipt, adminOnly: true },
  { id: 'eigentuemerversamm', label: 'Versammlungen',         icon: Users },
]

// ─── Nebenkostenabrechnung Tab ─────────────────────────────────────────────────
function NebenkostenabrechnungTab({ immobilie, onSave }) {
  const aktuellesJahr = new Date().getFullYear()
  const [jahr, setJahr] = useState(String(aktuellesJahr - 1))
  const [ausgewaehlteMieterId, setAusgewaehlteMieterId] = useState(
    (immobilie.mieter || []).find(m => !m.mietende || new Date(m.mietende) >= new Date())?.id || ''
  )
  const [pfad, setPfad] = useState('')
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [abrechnung, setAbrechnung] = useState(null)
  const fileRef = useRef(null)

  const mieterListe = (immobilie.mieter || [])
  const mieter = mieterListe.find(m => m.id === ausgewaehlteMieterId)
  const grundsteuer = (immobilie.steuern || []).find(s => String(s.steuerjahr) === jahr)

  // Wirtschaftspläne mit hochgeladener Jahresabrechnung
  const jahresabrechnungen = (immobilie.wirtschaftsplaene || []).filter(w => w.dokument?.pfad)

  async function uploadUndAnalysieren(file) {
    setLaedt(true); setFehler(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      const dateiPfad = `${userId}/${Date.now()}-${file.name}`
      const { error: upErr } = await supabase.storage.from('dokumente').upload(dateiPfad, file)
      if (upErr) throw new Error(upErr.message)
      await analysieren(dateiPfad)
    } catch (e) { setFehler(e.message); setLaedt(false) }
  }

  async function analysieren(dokumentPfad) {
    setLaedt(true); setFehler(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://ygcmfrwgailmjanoyozm.supabase.co/functions/v1/nebenkostenabrechnung',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({
            pfad: dokumentPfad,
            mieter: mieter || {},
            grundsteuer_betrag: Number(grundsteuer?.betrag) || 0,
            abrechnungsjahr: Number(jahr),
            wohnflaeche_mieter: Number(immobilie.flaeche) || null,
          }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Fehler')
      setAbrechnung(json.abrechnung)
    } catch (e) { setFehler(e.message) }
    finally { setLaedt(false) }
  }

  const euro = (n) => Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })

  return (
    <div className="space-y-5">
      <div>
        <h3 className="font-serif text-lg font-semibold text-navy-700">NK-Abrechnung erstellen</h3>
        <p className="text-xs text-navy-400 mt-0.5">KI liest die WEG-Jahresabrechnung und berechnet den Mieteranteil inkl. Grundsteuer</p>
      </div>

      {/* Einstellungen */}
      <div className="card space-y-4">
        <div>
          <label className="label">Abrechnungsjahr</label>
          <select className="input max-w-xs" value={jahr} onChange={e => { setJahr(e.target.value); setAbrechnung(null) }}>
            {Array.from({ length: 6 }, (_, i) => aktuellesJahr - 1 - i).map(j => (
              <option key={j} value={j}>{j}</option>
            ))}
          </select>
        </div>

        {mieterListe.length > 0 && (
          <div>
            <label className="label">Mieter</label>
            <select className="input" value={ausgewaehlteMieterId} onChange={e => setAusgewaehlteMieterId(e.target.value)}>
              {mieterListe.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
            {mieter && (
              <p className="text-xs text-navy-400 mt-1">
                NK-Vorauszahlung: {euro((Number(mieter.nebenkosten) || 0) * 12)} / Jahr
              </p>
            )}
          </div>
        )}

        <div>
          <label className="label">Grundsteuer {jahr}</label>
          {grundsteuer
            ? <p className="text-sm text-navy-700 font-medium">{euro(grundsteuer.betrag)} — wird automatisch einbezogen ✓</p>
            : <p className="text-xs text-amber-600">Noch nicht eingetragen — bitte unter „Steuern" ergänzen für vollständige Abrechnung</p>
          }
        </div>

        {/* WEG-Jahresabrechnung wählen */}
        <div>
          <label className="label">WEG-Jahresabrechnung (PDF)</label>
          {jahresabrechnungen.length > 0 && (
            <div className="space-y-1.5 mb-3">
              {jahresabrechnungen.map(w => (
                <button
                  key={w.id}
                  onClick={() => { setPfad(w.dokument.pfad); setAbrechnung(null) }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-left border transition-all ${pfad === w.dokument.pfad ? 'border-brand-500 bg-brand-500/5 text-brand-700' : 'border-navy-100 hover:border-navy-200 text-navy-600'}`}
                >
                  <FileText size={13} />
                  <span>{w.dokument._fileName || w.dokument.pfad?.split('/').pop()}</span>
                  <span className="ml-auto text-navy-400">{w.jahr}</span>
                </button>
              ))}
            </div>
          )}
          <button
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs border border-dashed border-navy-200 text-navy-500 hover:border-brand-500 hover:text-brand-600 transition-all"
          >
            <Upload size={13} /> Neue Jahresabrechnung hochladen
          </button>
          <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
            onChange={e => { if (e.target.files?.[0]) uploadUndAnalysieren(e.target.files[0]) }} />
        </div>

        {pfad && !laedt && (
          <button
            onClick={() => analysieren(pfad)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium text-white w-full justify-center"
            style={{ background: '#2e6b52' }}
          >
            <Receipt size={15} /> Abrechnung für {mieter?.name || 'Mieter'} erstellen
          </button>
        )}

        {laedt && (
          <div className="flex items-center gap-2 text-sm text-navy-500 justify-center py-2">
            <Loader2 size={16} className="animate-spin" /> KI analysiert Jahresabrechnung…
          </div>
        )}

        {fehler && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {fehler}
          </div>
        )}
      </div>

      {/* Ergebnis */}
      {abrechnung && (
        <div className="space-y-4">
          {/* Saldo-Banner */}
          <div className={`rounded-xl px-4 py-4 flex items-center justify-between ${abrechnung.ist_nachzahlung ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
            <div>
              <p className="text-sm font-semibold" style={{ color: abrechnung.ist_nachzahlung ? '#dc2626' : '#16a34a' }}>
                {abrechnung.ist_nachzahlung ? 'Nachzahlung fällig' : 'Guthaben für Mieter'}
              </p>
              <p className="text-xs mt-0.5" style={{ color: abrechnung.ist_nachzahlung ? '#7f1d1d' : '#166534' }}>
                Abrechnung {abrechnung.abrechnungsjahr} · {abrechnung.mieter_name} · {abrechnung.objekt}
              </p>
            </div>
            <p className="text-2xl font-bold font-serif" style={{ color: abrechnung.ist_nachzahlung ? '#dc2626' : '#16a34a' }}>
              {euro(Math.abs(abrechnung.saldo))}
            </p>
          </div>

          {/* KPIs */}
          <div className="flex flex-col gap-3">
            <div className="card text-center py-3">
              <p className="label mb-1">Umlagefähige Kosten gesamt</p>
              <p className="text-lg font-bold text-navy-700 font-serif">{euro(abrechnung.summe_umlagefaehig_gesamt)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="label mb-1">Anteil {abrechnung.mieter_name} ({abrechnung.anteil_prozent}%)</p>
              <p className="text-lg font-bold text-navy-700 font-serif">{euro(abrechnung.anteil_mieter_gesamt)}</p>
            </div>
            <div className="card text-center py-3">
              <p className="label mb-1">Vorauszahlungen geleistet</p>
              <p className="text-lg font-bold text-brand-600 font-serif">{euro(abrechnung.vorauszahlungen)}</p>
            </div>
          </div>

          {/* Kostenpositionen */}
          <div className="card p-0 overflow-hidden">
            <div className="px-4 py-2.5 border-b" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
              <div className="grid grid-cols-[1fr_auto_auto] gap-3 text-[10px] text-navy-400 uppercase tracking-widest font-semibold">
                <span>Position</span><span className="text-right">Gesamt</span><span className="text-right">Ihr Anteil</span>
              </div>
            </div>
            {(abrechnung.positionen || []).filter(p => p.umlagefaehig).map((p, i, arr) => (
              <div key={i} className={`px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-3 items-start ${i < arr.length - 1 ? 'border-b' : ''}`} style={{ borderColor: '#f0e8dc' }}>
                <div>
                  <p className="text-xs font-medium text-navy-700">{p.name}</p>
                  {p.hinweis && <p className="text-[10px] text-navy-400 mt-0.5">{p.hinweis}</p>}
                </div>
                <p className="text-xs text-navy-500 text-right shrink-0">{euro(p.gesamtbetrag)}</p>
                <p className="text-xs font-semibold text-navy-700 text-right shrink-0">{euro(p.anteil_mieter)}</p>
              </div>
            ))}
            <div className="px-4 py-3 grid grid-cols-[1fr_auto_auto] gap-3 border-t font-semibold" style={{ background: '#f7f3ed', borderColor: '#d8ccba' }}>
              <span className="text-sm text-navy-600">Summe umlagefähig</span>
              <span className="text-sm text-navy-700 text-right">{euro(abrechnung.summe_umlagefaehig_gesamt)}</span>
              <span className="text-sm text-navy-700 text-right">{euro(abrechnung.anteil_mieter_gesamt)}</span>
            </div>
          </div>

          {/* Nicht umlagefähig */}
          {abrechnung.nicht_umlagefaehige_positionen?.length > 0 && (
            <div className="rounded-xl px-4 py-3" style={{ background: '#f7f3ed', border: '1px solid #e8dece' }}>
              <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-widest mb-2">Nicht umlagefähig (trägt Eigentümer)</p>
              {abrechnung.nicht_umlagefaehige_positionen.map((p, i) => (
                <p key={i} className="text-xs text-navy-500 flex items-start gap-1.5 mb-1">
                  <span className="text-navy-300 shrink-0">—</span>
                  {typeof p === 'string' ? p : `${p.name || ''}${p.betrag_eigentuemer ? ` (${euro(p.betrag_eigentuemer)})` : ''}`}
                </p>
              ))}
            </div>
          )}

          {/* Hinweise */}
          {abrechnung.hinweise?.length > 0 && (
            <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background: '#fef9ed', border: '1px solid #fde68a' }}>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-1">Hinweise</p>
              {abrechnung.hinweise.map((h, i) => (
                <p key={i} className="text-xs text-amber-800 flex items-start gap-1.5">
                  <Info size={11} className="shrink-0 mt-0.5" />{h}
                </p>
              ))}
            </div>
          )}

          <p className="text-[10px] text-navy-400 italic text-center">
            Diese Abrechnung wurde KI-gestützt erstellt und dient als Entwurf. Bitte vor dem Versand prüfen.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── KI-Steuercheck Tab ───────────────────────────────────────────────────────
function SteuercheckTab({ immobilie, onSave }) {
  const aktuellesJahr = new Date().getFullYear()
  const [steuerjahr, setSteuerjahr] = useState(String(aktuellesJahr - 1))
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)

  const gespeicherteAnalysen = immobilie.steuercheck || {}
  const analyse = gespeicherteAnalysen[steuerjahr] || null

  async function checkStarten() {
    setLaeuft(true); setFehler(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://ygcmfrwgailmjanoyozm.supabase.co/functions/v1/steuercheck-immobilie',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ immobilie, steuerjahr }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analyse fehlgeschlagen')
      const aktualisiert = { ...gespeicherteAnalysen, [steuerjahr]: json.analyse }
      onSave({ ...immobilie, steuercheck: aktualisiert })
    } catch (err) {
      setFehler(err.message)
    } finally {
      setLaeuft(false)
    }
  }

  const jahre = Array.from({ length: 10 }, (_, i) => String(aktuellesJahr - i))

  return (
    <div className="space-y-5">
      {/* Disclaimer */}
      <div className="flex items-start gap-2 rounded-xl px-4 py-3 text-sm" style={{ background: '#fff8e6', border: '1px solid #f5dfa0' }}>
        <Info size={15} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
        <p style={{ color: '#7a5000' }}>Diese KI-Analyse ist eine Orientierungshilfe — kein Steuerberatungsersatz. Bitte mit einem Steuerberater abstimmen.</p>
      </div>

      {/* Jahresauswahl + Button */}
      <div className="card flex items-center gap-4">
        <div>
          <label className="label">Steuerjahr</label>
          <select className="input w-32" value={steuerjahr} onChange={e => setSteuerjahr(e.target.value)}>
            {jahre.map(j => <option key={j} value={j}>{j}</option>)}
          </select>
        </div>
        <div className="flex-1" />
        <button
          onClick={checkStarten}
          disabled={laeuft}
          className="btn-primary flex items-center gap-2 disabled:opacity-60 mt-4"
        >
          {laeuft ? <><Loader2 size={15} className="animate-spin" /> KI analysiert…</> : <><Sparkles size={15} /> Steuercheck {steuerjahr} starten</>}
        </button>
      </div>

      {fehler && (
        <div className="rounded-xl px-4 py-3 text-sm text-red-700 bg-red-50 border border-red-200 flex items-center gap-2">
          <AlertCircle size={14} /> {fehler}
        </div>
      )}

      {analyse && (
        <div className="space-y-4">
          {/* Ergebnis-Banner */}
          <div className={`rounded-xl px-5 py-4 flex items-center justify-between`}
            style={{
              background: analyse.ergebnis?.ueberschuss_verlust >= 0 ? '#fdecea' : '#edf7f2',
              border: `1px solid ${analyse.ergebnis?.ueberschuss_verlust >= 0 ? '#f5b8b8' : '#c5e0d4'}`
            }}>
            <div>
              <p className="text-xs uppercase tracking-wide font-semibold mb-0.5"
                style={{ color: analyse.ergebnis?.ueberschuss_verlust >= 0 ? '#7a1e1e' : '#2e6b52' }}>
                Steuerliches Ergebnis {steuerjahr}
              </p>
              <p className="font-serif text-2xl font-bold"
                style={{ color: analyse.ergebnis?.ueberschuss_verlust >= 0 ? '#7a1e1e' : '#2e6b52' }}>
                {euro(Math.abs(analyse.ergebnis?.ueberschuss_verlust || 0))}
                <span className="text-sm font-normal ml-2">
                  {analyse.ergebnis?.ueberschuss_verlust >= 0 ? 'Überschuss (zu versteuern)' : 'Verlust (verrechenbar)'}
                </span>
              </p>
            </div>
            {analyse.ergebnis?.ueberschuss_verlust >= 0
              ? <TrendingUp size={28} style={{ color: '#7a1e1e', opacity: 0.5 }} />
              : <TrendingDown size={28} style={{ color: '#2e6b52', opacity: 0.5 }} />}
          </div>

          {/* Einnahmen vs. Werbungskosten */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card text-center">
              <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-1">Mieteinnahmen</p>
              <p className="text-lg font-bold text-navy-800">{euro(analyse.einnahmen?.gesamt || 0)}</p>
            </div>
            <div className="card text-center">
              <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-1">Werbungskosten</p>
              <p className="text-lg font-bold" style={{ color: '#2e6b52' }}>{euro(analyse.ergebnis?.werbungskosten_gesamt || 0)}</p>
            </div>
          </div>

          {/* Werbungskosten Detail */}
          {analyse.werbungskosten?.length > 0 && (
            <div className="card space-y-3">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Werbungskosten im Detail</p>
              {analyse.werbungskosten.map((w, i) => (
                <div key={i} className="flex items-start justify-between gap-3 pb-3 border-b border-navy-50 last:border-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy-800">{w.kategorie}</p>
                    <p className="text-xs text-navy-400 mt-0.5">{w.erklaerung}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: '#2e6b52' }}>{euro(w.betrag)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Instandhaltung sofort absetzbar */}
          {analyse.instandhaltung_sofort?.length > 0 && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#2e6b52' }}>
                <Check size={13} /> Sofort absetzbar (Erhaltungsaufwand)
              </p>
              {analyse.instandhaltung_sofort.map((m, i) => (
                <div key={i} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#edf7f2' }}>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-navy-800">{m.beschreibung}</p>
                    <p className="text-xs text-navy-400">{m.begruendung}</p>
                  </div>
                  <p className="text-sm font-bold shrink-0" style={{ color: '#2e6b52' }}>{euro(m.betrag)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Instandhaltung verteilt */}
          {analyse.instandhaltung_verteilt?.length > 0 && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide flex items-center gap-1.5" style={{ color: '#b45309' }}>
                <Calendar size={13} /> Über mehrere Jahre zu verteilen (Herstellungsaufwand)
              </p>
              {analyse.instandhaltung_verteilt.map((m, i) => (
                <div key={i} className="rounded-lg px-3 py-2.5 space-y-1" style={{ background: '#fff8e6', border: '1px solid #f5dfa0' }}>
                  <div className="flex justify-between">
                    <p className="text-xs font-semibold text-navy-800">{m.beschreibung}</p>
                    <p className="text-sm font-bold" style={{ color: '#b45309' }}>{euro(m.betrag)}</p>
                  </div>
                  <p className="text-xs text-navy-500">{m.begruendung}</p>
                  <p className="text-xs font-medium" style={{ color: '#b45309' }}>
                    {euro(m.absetzbar_pro_jahr)} / Jahr über {m.nutzungsdauer_jahre} Jahre
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Empfehlungen */}
          {analyse.empfehlungen?.length > 0 && (
            <div className="card space-y-2">
              <p className="text-xs font-semibold text-navy-500 uppercase tracking-wide">Empfehlungen</p>
              {analyse.empfehlungen.map((e, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-navy-700">
                  <span style={{ color: '#5b4fa8' }}>→</span> {e}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-navy-400 text-center italic">{analyse.disclaimer}</p>
        </div>
      )}
    </div>
  )
}

function ImmobilieDetail({ immobilie, onSave, onZurueck, onLoeschen, userEmail }) {
  const [aktiverTab, setAktiverTab] = useState('uebersicht')
  const sichtbareTabs = TABS.filter(t => !t.adminOnly || userEmail === ADMIN_EMAIL)

  const aktiverMieter = (immobilie.mieter || []).find(m => istAktiv(m))
  const fin = immobilie.finanzierung || {}
  const monatlicheZinsen = fin.modus === 'annuitaet' && fin.darlehensbetrag && fin.zinssatz
    ? (+fin.darlehensbetrag * +fin.zinssatz / 100 / 12) : (+fin.zinsen || 0)
  const monatlicheTilgung = fin.modus === 'annuitaet' && fin._annRate
    ? fin._annRate - monatlicheZinsen : (+fin.tilgung || 0)
  const aktiveMietwerte = aktiverMieter ? aktuelleMietwerte(aktiverMieter) : null
  const warmmiete = (aktiveMietwerte?.kaltmiete || 0) + (aktiveMietwerte?.nebenkosten || 0)
  const cashflow = warmmiete - monatlicheZinsen - monatlicheTilgung - (+fin.hausgeld || 0)
  const hatCashflow = warmmiete > 0 || monatlicheZinsen > 0

  return (
    <div className="space-y-6">
      <div>
        <button onClick={onZurueck} className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-4">
          <ChevronLeft size={16} /> Alle Immobilien
        </button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="section-title mb-0">{immobilie.name || 'Immobilie'}</h2>
            {immobilie.adresse && <p className="text-sm text-navy-500 flex items-center gap-1.5 mt-1"><MapPin size={13} /> {immobilie.adresse}</p>}
          </div>
          {hatCashflow && (
            <div className="text-right shrink-0">
              <p className="text-xs text-navy-400">Cashflow/Mo.</p>
              <p className={`text-lg font-bold ${cashflow >= 0 ? 'text-brand-600' : 'text-red-500'}`}>
                {cashflow >= 0 ? '+' : ''}{euro(cashflow)}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="rounded-xl p-1" style={{ background: '#ede6d8' }}>
          <div className="flex gap-0.5">
            {sichtbareTabs.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setAktiverTab(id)}
                title={label}
                className={`flex items-center justify-center rounded-lg transition-all flex-1 py-2.5
                  ${aktiverTab === id ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-400 hover:text-navy-600 hover:bg-white/50'}`}>
                <Icon size={16} />
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs font-semibold text-navy-500 uppercase tracking-widest text-center">
          {sichtbareTabs.find(t => t.id === aktiverTab)?.label}
        </p>
      </div>

      {aktiverTab === 'uebersicht'         && <UebersichtTab     immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'mieter'             && <MieterTab         immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'finanzierung'       && <FinanzierungTab   immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'instandhaltung'     && <InstandhaltungTab immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'wirtschaftsplaene'  && <WirtschaftsplaeneTab immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'steuern'           && <SteuernTab         immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'steuercheck'       && <SteuercheckTab             immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'nebenkostenabr'   && <NebenkostenabrechnungTab   immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'dokumente'         && <DokumenteTab       immobilie={immobilie} onSave={onSave} />}
      {aktiverTab === 'eigentuemerversamm' && <EigentuemerTab    immobilie={immobilie} onSave={onSave} />}

      <div className="border-t border-navy-100 pt-6">
        <button onClick={() => { if (window.confirm('Immobilie wirklich löschen?')) onLoeschen(immobilie.id) }}
          className="flex items-center gap-2 text-sm text-red-400 hover:text-red-600">
          <Trash2 size={14} /> Immobilie löschen
        </button>
      </div>
    </div>
  )
}

// ─── Neu-Formular ─────────────────────────────────────────────────────────────
function NeuFormular({ onSpeichern, onAbbrechen }) {
  const [form, setForm] = useState({ name: '', adresse: '', flaeche: '', zimmer: '', kaufpreis: '', kaufdatum: '' })
  return (
    <div className="space-y-6">
      <div>
        <button onClick={onAbbrechen} className="flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-700 mb-4"><ChevronLeft size={16} /> Zurück</button>
        <h2 className="section-title mb-0">Neue Immobilie</h2>
      </div>
      <div className="card space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="label">Bezeichnung *</label>
            <input className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="z.B. Wohnung München Schwabing" />
          </div>
          <div className="sm:col-span-2">
            <label className="label">Adresse</label>
            <input className="input" value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} placeholder="Musterstraße 12, 80333 München" />
          </div>
          <div>
            <label className="label">Wohnfläche (m²)</label>
            <input className="input" type="number" value={form.flaeche} onChange={e => setForm({ ...form, flaeche: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="label">Anzahl Zimmer</label>
            <input className="input" type="number" step="0.5" value={form.zimmer} onChange={e => setForm({ ...form, zimmer: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="label">Kaufpreis (€)</label>
            <input className="input" type="number" value={form.kaufpreis} onChange={e => setForm({ ...form, kaufpreis: e.target.value })} placeholder="0" />
          </div>
          <div>
            <label className="label">Kaufdatum</label>
            <KaufdatumInput value={form.kaufdatum} onChange={v => setForm({ ...form, kaufdatum: v })} />
          </div>
        </div>
        <div className="flex gap-2">
          <button className="btn-primary" onClick={() => { if (form.name.trim()) onSpeichern({ name: '', adresse: '', flaeche: '', zimmer: '', kaufpreis: '', kaufdatum: '', mieter: [], finanzierung: {}, instandhaltung: [], wirtschaftsplaene: [], steuern: [], eigentuemerversammlungen: [], ...form, id: Date.now().toString() }) }}>
            <Check size={14} /> Anlegen
          </button>
          <button className="btn-secondary" onClick={onAbbrechen}><X size={14} /> Abbrechen</button>
        </div>
      </div>
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
function ImmobilienDashboard({ immobilien, onNeu, onAuswaehlen }) {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title mb-0">Immobilien</h2>
          <p className="text-sm text-navy-500 mt-1">Deine Objekte auf einen Blick</p>
        </div>
        <button className="btn-primary shrink-0" onClick={onNeu}><Plus size={15} /> Neu</button>
      </div>

      {immobilien.length === 0 ? (
        <div className="card text-center py-16 border-dashed">
          <Building2 size={48} className="mx-auto mb-3 text-navy-200" />
          <p className="font-serif text-xl text-navy-600 mb-2">Noch keine Immobilien</p>
          <p className="text-sm text-navy-400 mb-6">Füge dein erstes Objekt hinzu.</p>
          <button className="btn-primary mx-auto" onClick={onNeu}><Plus size={15} /> Erste Immobilie anlegen</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {immobilien.map(immo => {
            const aktiverMieter = (immo.mieter || []).find(m => istAktiv(m))
            const fin = immo.finanzierung || {}
            const monatlicheZinsen = fin.modus === 'annuitaet' && fin.darlehensbetrag && fin.zinssatz
              ? (+fin.darlehensbetrag * +fin.zinssatz / 100 / 12) : (+fin.zinsen || 0)
            const aktiveMietwerte = aktiverMieter ? aktuelleMietwerte(aktiverMieter) : null
            const warmmiete = (aktiveMietwerte?.kaltmiete || 0) + (aktiveMietwerte?.nebenkosten || 0)
            const monatlicheTilgung = fin.modus === 'annuitaet' && fin._annRate
              ? fin._annRate - monatlicheZinsen : (+fin.tilgung || 0)
            const cashflow = warmmiete - monatlicheZinsen - monatlicheTilgung - (+fin.hausgeld || 0)
            const hatCashflow = warmmiete > 0 || monatlicheZinsen > 0
            const hatAktiv = !!aktiverMieter

            return (
              <button key={immo.id} onClick={() => onAuswaehlen(immo.id)}
                className="card text-left hover:border-brand-500 hover:shadow-md transition-all duration-200 group">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-brand-500 flex items-center justify-center shrink-0">
                    <Building2 size={18} className="text-white" />
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${hatAktiv ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-100 text-navy-500'}`}>
                    {hatAktiv ? 'Vermietet' : 'Leerstand'}
                  </span>
                </div>
                <h3 className="font-serif text-lg font-semibold text-navy-700 mb-1 group-hover:text-brand-600 transition-colors">
                  {immo.name || 'Unbenannte Immobilie'}
                </h3>
                {immo.adresse && <p className="text-xs text-navy-400 flex items-center gap-1 mb-3"><MapPin size={11} /> {immo.adresse}</p>}
                <div className="flex gap-4 text-sm border-t border-navy-50 pt-3 mt-3">
                  {immo.flaeche && <div className="flex items-center gap-1 text-navy-600"><Maximize2 size={12} className="text-navy-400" /><span className="font-medium">{immo.flaeche} m²</span></div>}
                  {immo.zimmer && <div className="flex items-center gap-1 text-navy-600"><DoorOpen size={12} className="text-navy-400" /><span className="font-medium">{immo.zimmer} Zi.</span></div>}
                  {immo.kaufpreis && <div className="flex items-center gap-1 text-navy-600 ml-auto"><Euro size={12} className="text-navy-400" /><span className="font-medium text-xs">{Number(immo.kaufpreis).toLocaleString('de-DE')}</span></div>}
                </div>
                {hatCashflow && (
                  <div className="border-t border-navy-50 pt-3 mt-3 space-y-1">
                    {warmmiete > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-navy-400">Warmmiete</span>
                        <span className="text-brand-600 font-medium">+ {euro(warmmiete)}</span>
                      </div>
                    )}
                    {monatlicheZinsen > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-navy-400">Zinsen</span>
                        <span className="text-red-500">− {euro(monatlicheZinsen)}</span>
                      </div>
                    )}
                    {monatlicheTilgung > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-navy-400">Tilgung</span>
                        <span className="text-red-500">− {euro(monatlicheTilgung)}</span>
                      </div>
                    )}
                    {+fin.hausgeld > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-navy-400">Hausgeld</span>
                        <span className="text-red-500">− {euro(+fin.hausgeld)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs pt-1 border-t border-navy-50 font-semibold">
                      <span className="text-navy-600">Cashflow / Mo.</span>
                      <span className={cashflow >= 0 ? 'text-brand-600' : 'text-red-500'}>
                        {cashflow >= 0 ? '+' : ''}{euro(cashflow)}
                      </span>
                    </div>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────
export default function ImmobilienSeite({ immobilien: immobilienProp = [], setImmobilien }) {
  const [immobilien, setLokal] = useState(immobilienProp)
  const [ansicht, setAnsicht] = useState('dashboard')
  const { user } = useAuth()

  function set(neu) { setLokal(neu); if (setImmobilien) setImmobilien(neu) }
  function neuAnlegen(immo) { set([...immobilien, immo]); setAnsicht(immo.id) }
  function speichern(immo) { set(immobilien.map(i => i.id === immo.id ? immo : i)) }
  function loeschen(id) { set(immobilien.filter(i => i.id !== id)); setAnsicht('dashboard') }

  const aktiveImmo = immobilien.find(i => i.id === ansicht)

  if (ansicht === 'neu') return <NeuFormular onSpeichern={neuAnlegen} onAbbrechen={() => setAnsicht('dashboard')} />
  if (aktiveImmo) return <ImmobilieDetail immobilie={aktiveImmo} onSave={speichern} onZurueck={() => setAnsicht('dashboard')} onLoeschen={loeschen} userEmail={user?.email} />
  return <ImmobilienDashboard immobilien={immobilien} onNeu={() => setAnsicht('neu')} onAuswaehlen={id => setAnsicht(id)} />
}
