import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Home, Car, Shield, PiggyBank, Tv, Heart, CreditCard, Baby, MoreHorizontal } from 'lucide-react'
import { FIXKOSTEN_KATEGORIEN, INTERVALL_OPTIONEN, MONATE, monatlicherBetrag } from '../data/kategorien'
import KategorieSelect from './KategorieSelect'

const LEER = { name: '', kategorie: '', betrag: '', intervall: 'monatlich', abbuchungsmonat: new Date().getMonth() + 1 }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const GRUPPE_META = {
  'Wohnen':                { icon: Home,          farbe: '#2e6b52', bg: '#edf7f2' },
  'Mobilität':             { icon: Car,           farbe: '#6b5c4d', bg: '#ede6d8' },
  'Versicherungen':        { icon: Shield,        farbe: '#321f13', bg: '#f0ece6' },
  'Vorsorge & Sparen':     { icon: PiggyBank,     farbe: '#c9a227', bg: '#fdf8ed' },
  'Abonnements & Medien':  { icon: Tv,            farbe: '#5b4fa8', bg: '#f0eeff' },
  'Gesundheit & Fitness':  { icon: Heart,         farbe: '#c0394b', bg: '#fdeef0' },
  'Kredite & Schulden':    { icon: CreditCard,    farbe: '#b84c00', bg: '#fff3eb' },
  'Kinder & Familie':      { icon: Baby,          farbe: '#1a7ea8', bg: '#e8f5fc' },
  'Sonstiges':             { icon: MoreHorizontal,farbe: '#888',    bg: '#f5f5f5' },
}

function gruppeVonKategorie(kategorieName) {
  for (const g of FIXKOSTEN_KATEGORIEN) {
    if (g.eintraege.includes(kategorieName)) return g.gruppe
  }
  return 'Sonstiges'
}

function IntervallBadge({ intervall, abbuchungsmonat }) {
  if (intervall === 'monatlich')     return <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: '#edf7f2', color: '#2e6b52', borderColor: '#c0dfd3' }}>Monatlich</span>
  if (intervall === 'quartalsweise') return <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Quartalsweise</span>
  if (intervall === 'halbjaehrlich') return <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Halbjährlich</span>
  if (intervall === 'jaehrlich')     return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Jährl. · {MONATE[(abbuchungsmonat ?? 1) - 1]}</span>
  return null
}

export default function FixkostenSeite({ fixkosten, setFixkosten }) {
  const [formular, setFormular]       = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler]           = useState({})
  const [formularOffen, setFormularOffen] = useState(false)

  function validiere() {
    const f = {}
    if (!formular.name.trim()) f.name = 'Pflichtfeld'
    if (!formular.kategorie) f.kategorie = 'Pflichtfeld'
    if (!formular.betrag || isNaN(formular.betrag) || +formular.betrag <= 0) f.betrag = 'Gültigen Betrag eingeben'
    return f
  }

  function speichern() {
    const f = validiere()
    if (Object.keys(f).length) { setFehler(f); return }
    const eintrag = {
      ...formular,
      betrag: +formular.betrag,
      id: bearbeitungId ?? Date.now().toString(),
      abbuchungsmonat: formular.intervall === 'jaehrlich' ? +formular.abbuchungsmonat : null,
    }
    if (bearbeitungId) {
      setFixkosten(fixkosten.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      setFixkosten([...fixkosten, eintrag])
    }
    setFormular(LEER); setBearbeitungId(null); setFehler({}); setFormularOffen(false)
  }

  function loeschen(id) { setFixkosten(fixkosten.filter(x => x.id !== id)) }

  function bearbeiten(eintrag) {
    setFormular({ ...eintrag, betrag: eintrag.betrag.toString(), abbuchungsmonat: eintrag.abbuchungsmonat ?? new Date().getMonth() + 1 })
    setBearbeitungId(eintrag.id); setFehler({}); setFormularOffen(true)
  }

  function abbrechen() {
    setFormular(LEER); setBearbeitungId(null); setFehler({}); setFormularOffen(false)
  }

  const gesamtMonatlich = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)

  // Gruppenreihenfolge aus FIXKOSTEN_KATEGORIEN
  const gruppenReihenfolge = FIXKOSTEN_KATEGORIEN.map(g => g.gruppe)

  function gruppiereNach(liste) {
    const map = {}
    for (const f of liste) {
      const g = gruppeVonKategorie(f.kategorie)
      if (!map[g]) map[g] = []
      map[g].push(f)
    }
    return gruppenReihenfolge
      .filter(g => map[g])
      .map(g => ({ gruppe: g, eintraege: map[g] }))
  }

  const alleGruppiert = gruppiereNach(fixkosten)

  function GruppenBlock({ gruppe, eintraege, istJaehrlich }) {
    const meta = GRUPPE_META[gruppe] || GRUPPE_META['Sonstiges']
    const Icon = meta.icon
    const summe = eintraege.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
    return (
      <div className="card p-0 overflow-hidden">
        <div className="px-4 py-2.5 flex items-center gap-2.5 border-b" style={{ background: meta.bg, borderColor: '#e8dece' }}>
          <div className="w-6 h-6 rounded-lg flex items-center justify-center" style={{ background: meta.bg }}>
            <Icon size={14} style={{ color: meta.farbe }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: meta.farbe }}>{gruppe}</span>
          <span className="ml-auto text-xs font-semibold" style={{ color: meta.farbe }}>
            {istJaehrlich
              ? `${euro(eintraege.reduce((s, f) => s + f.betrag, 0))} / Jahr`
              : `${euro(summe)} / Mo.`}
          </span>
        </div>
        <table className="w-full text-sm table-fixed">
          <colgroup>
            <col />
            <col style={{ width: '120px' }} />
            <col style={{ width: '150px' }} className="hidden sm:table-column" />
            <col style={{ width: '110px' }} />
            <col style={{ width: '72px' }} />
          </colgroup>
          <tbody>
            {eintraege.map(f => (
              <tr key={f.id} className="border-b hover:bg-navy-50/40 transition-colors" style={{ borderColor: '#f0e8dc' }}>
                <td className="px-4 py-3 max-w-0">
                  <p className="font-medium text-navy-700 text-sm break-words">{f.name}</p>
                  <p className="text-xs text-navy-400 break-words">{f.kategorie}</p>
                </td>
                <td className="px-4 py-3 text-right text-navy-700 text-sm font-semibold">{euro(f.betrag)}</td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <IntervallBadge intervall={f.intervall} abbuchungsmonat={f.abbuchungsmonat} />
                </td>
                <td className="px-4 py-3 text-right text-xs text-navy-500">{euro(monatlicherBetrag(f.betrag, f.intervall))}/Mo.</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1 justify-end">
                    <button onClick={() => bearbeiten(f)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                    <button onClick={() => loeschen(f.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title mb-0">Ausgaben</h2>
          <p className="text-sm text-navy-400 mt-1">Fixkosten + geschätzte monatliche Ausgaben</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="label mb-0">Monatliche Belastung</p>
          <p className="text-xl font-bold text-navy-700">{euro(gesamtMonatlich)}</p>
        </div>
      </div>

      {/* Formular */}
      {!formularOffen ? (
        <button className="btn-primary" onClick={() => setFormularOffen(true)}>
          <Plus size={15} /> Ausgabe hinzufügen
        </button>
      ) : (
        <div className="card">
          <h3 className="font-serif text-lg font-semibold text-navy-700 mb-4">
            {bearbeitungId ? 'Eintrag bearbeiten' : 'Neue Ausgabe'}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bezeichnung</label>
              <input className={`input ${fehler.name ? 'border-red-400' : ''}`}
                placeholder="z.B. Miete, Lebensmittel, Netflix"
                value={formular.name} onChange={e => setFormular({ ...formular, name: e.target.value })} autoFocus />
              {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
            </div>
            <div>
              <label className="label">Kategorie</label>
              <KategorieSelect kategorien={FIXKOSTEN_KATEGORIEN} value={formular.kategorie}
                onChange={v => setFormular({ ...formular, kategorie: v })} placeholder="Kategorie wählen..." />
              {fehler.kategorie && <p className="text-red-500 text-xs mt-1">{fehler.kategorie}</p>}
            </div>
            <div>
              <label className="label">Betrag (€)</label>
              <input className={`input ${fehler.betrag ? 'border-red-400' : ''}`}
                type="number" min="0" step="0.01" placeholder="0,00"
                value={formular.betrag} onChange={e => setFormular({ ...formular, betrag: e.target.value })} />
              {fehler.betrag && <p className="text-red-500 text-xs mt-1">{fehler.betrag}</p>}
            </div>
            <div>
              <label className="label">Intervall</label>
              <select className="input" value={formular.intervall}
                onChange={e => setFormular({ ...formular, intervall: e.target.value })}>
                {INTERVALL_OPTIONEN.map(o => <option key={o.wert} value={o.wert}>{o.label}</option>)}
              </select>
            </div>
            {formular.intervall === 'jaehrlich' && (
              <div className="sm:col-span-2">
                <label className="label">Abbuchungsmonat</label>
                <select className="input max-w-xs" value={formular.abbuchungsmonat}
                  onChange={e => setFormular({ ...formular, abbuchungsmonat: +e.target.value })}>
                  {MONATE.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <p className="text-xs text-navy-400 mt-1">In welchem Monat wird dieser Betrag abgebucht?</p>
              </div>
            )}
          </div>
          {formular.betrag && !isNaN(formular.betrag) && +formular.betrag > 0 && (
            <p className="text-xs text-navy-500 mt-3 rounded-lg px-3 py-2 inline-block" style={{ background: '#f7f3ed' }}>
              ≈ {euro(monatlicherBetrag(+formular.betrag, formular.intervall))} / Monat
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={speichern}><Check size={15} /> {bearbeitungId ? 'Speichern' : 'Hinzufügen'}</button>
            <button className="btn-secondary" onClick={abbrechen}><X size={15} /> Abbrechen</button>
          </div>
        </div>
      )}

      {fixkosten.length === 0 && (
        <div className="card text-center border-dashed py-10">
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Ausgaben eingetragen</p>
          <p className="text-sm text-navy-400">Füge Fixkosten und geschätzte monatliche Ausgaben hinzu.</p>
        </div>
      )}

      {/* Alle Ausgaben nach Kategorien gruppiert */}
      {alleGruppiert.length > 0 && (
        <div className="space-y-3">
          {alleGruppiert.map(({ gruppe, eintraege }) => (
            <GruppenBlock key={gruppe} gruppe={gruppe} eintraege={eintraege} istJaehrlich={false} />
          ))}
        </div>
      )}

      {/* Gesamt-Fußzeile */}
      {fixkosten.length > 0 && (
        <div className="card flex justify-between items-center" style={{ borderLeftWidth: '4px', borderLeftColor: '#6b5c4d' }}>
          <span className="text-sm font-medium text-navy-600">Gesamt monatliche Belastung</span>
          <span className="text-xl font-bold text-navy-700">{euro(gesamtMonatlich)}</span>
        </div>
      )}
    </div>
  )
}
