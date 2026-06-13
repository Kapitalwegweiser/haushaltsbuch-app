import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X, Calendar, RefreshCw } from 'lucide-react'
import { FIXKOSTEN_KATEGORIEN, INTERVALL_OPTIONEN, MONATE, monatlicherBetrag } from '../data/kategorien'
import KategorieSelect from './KategorieSelect'

const LEER = { name: '', kategorie: '', betrag: '', intervall: 'monatlich', abbuchungsmonat: new Date().getMonth() + 1 }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function IntervallBadge({ intervall, abbuchungsmonat }) {
  if (intervall === 'monatlich')     return <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: '#edf7f2', color: '#2e6b52', borderColor: '#c0dfd3' }}>Monatlich</span>
  if (intervall === 'quartalsweise') return <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Quartalsweise</span>
  if (intervall === 'halbjaehrlich') return <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Halbjährlich</span>
  if (intervall === 'jaehrlich')     return <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">Jährl. · {MONATE[(abbuchungsmonat ?? 1) - 1]}</span>
  return null
}

export default function FixkostenSeite({ fixkosten, setFixkosten }) {
  const [formular, setFormular] = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})
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
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
    setFormularOffen(false)
  }

  function loeschen(id) { setFixkosten(fixkosten.filter(x => x.id !== id)) }

  function bearbeiten(eintrag) {
    setFormular({ ...eintrag, betrag: eintrag.betrag.toString(), abbuchungsmonat: eintrag.abbuchungsmonat ?? new Date().getMonth() + 1 })
    setBearbeitungId(eintrag.id)
    setFehler({})
    setFormularOffen(true)
  }

  function abbrechen() {
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
    setFormularOffen(false)
  }

  const monatlich = fixkosten.filter(f => f.intervall !== 'jaehrlich')
  const jaehrlich = fixkosten.filter(f => f.intervall === 'jaehrlich').sort((a, b) => (a.abbuchungsmonat ?? 1) - (b.abbuchungsmonat ?? 1))

  const gesamtMonatlich = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const gesamtJaehrlich = jaehrlich.reduce((s, f) => s + f.betrag, 0)

  function Zeile({ f }) {
    return (
      <tr className="border-b hover:bg-navy-50/40 transition-colors" style={{ borderColor: '#f0e8dc' }}>
        <td className="px-4 py-3">
          <p className="font-medium text-navy-700 text-sm">{f.name}</p>
          <p className="text-xs text-navy-400">{f.kategorie}</p>
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
    )
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title mb-0">Monatliche Ausgaben</h2>
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
              <input
                className={`input ${fehler.name ? 'border-red-400' : ''}`}
                placeholder="z.B. Miete, Lebensmittel, Netflix"
                value={formular.name}
                onChange={e => setFormular({ ...formular, name: e.target.value })}
                autoFocus
              />
              {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
            </div>
            <div>
              <label className="label">Kategorie</label>
              <KategorieSelect
                kategorien={FIXKOSTEN_KATEGORIEN}
                value={formular.kategorie}
                onChange={v => setFormular({ ...formular, kategorie: v })}
                placeholder="Kategorie wählen..."
              />
              {fehler.kategorie && <p className="text-red-500 text-xs mt-1">{fehler.kategorie}</p>}
            </div>
            <div>
              <label className="label">Betrag (€)</label>
              <input
                className={`input ${fehler.betrag ? 'border-red-400' : ''}`}
                type="number" min="0" step="0.01" placeholder="0,00"
                value={formular.betrag}
                onChange={e => setFormular({ ...formular, betrag: e.target.value })}
              />
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
            <button className="btn-primary" onClick={speichern}>
              <Check size={15} /> {bearbeitungId ? 'Speichern' : 'Hinzufügen'}
            </button>
            <button className="btn-secondary" onClick={abbrechen}>
              <X size={15} /> Abbrechen
            </button>
          </div>
        </div>
      )}

      {fixkosten.length === 0 && (
        <div className="card text-center border-dashed py-10">
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Ausgaben eingetragen</p>
          <p className="text-sm text-navy-400">Füge Fixkosten und geschätzte monatliche Ausgaben hinzu.</p>
        </div>
      )}

      {/* Monatliche / regelmäßige Kosten */}
      {monatlich.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
            <RefreshCw size={14} className="text-navy-400" />
            <span className="text-sm font-semibold text-navy-700">Monatlich & regelmäßig</span>
            <span className="ml-auto text-sm font-bold text-navy-700">
              {euro(monatlich.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0))}/Mo.
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {monatlich.map(f => <Zeile key={f.id} f={f} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* Jährliche Kosten */}
      {jaehrlich.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Calendar size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Jährliche Kosten</span>
            <span className="ml-auto text-sm font-bold text-amber-800">
              {euro(gesamtJaehrlich)}/Jahr · {euro(gesamtJaehrlich / 12)}/Mo.
            </span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {jaehrlich.map(f => <Zeile key={f.id} f={f} />)}
            </tbody>
          </table>
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
