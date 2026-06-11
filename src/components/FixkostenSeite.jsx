import { useState } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import { FIXKOSTEN_KATEGORIEN, INTERVALL_OPTIONEN, monatlicherBetrag } from '../data/kategorien'
import KategorieSelect from './KategorieSelect'

const LEER = { name: '', kategorie: '', betrag: '', intervall: 'monatlich' }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function FixkostenSeite({ fixkosten, setFixkosten }) {
  const [formular, setFormular] = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})

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
    const eintrag = { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString() }
    if (bearbeitungId) {
      setFixkosten(fixkosten.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      setFixkosten([...fixkosten, eintrag])
    }
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  function loeschen(id) {
    setFixkosten(fixkosten.filter(x => x.id !== id))
  }

  function bearbeiten(eintrag) {
    setFormular({ ...eintrag, betrag: eintrag.betrag.toString() })
    setBearbeitungId(eintrag.id)
    setFehler({})
  }

  function abbrechen() {
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  const gesamtMonatlich = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Fixkosten</h2>
        <div className="text-right">
          <p className="text-xs text-navy-500">Monatliche Belastung</p>
          <p className="text-xl font-bold text-navy-700">{euro(gesamtMonatlich)}</p>
        </div>
      </div>

      {/* Formular */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">{bearbeitungId ? 'Eintrag bearbeiten' : 'Neuer Fixkosten-Eintrag'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input
              className={`input ${fehler.name ? 'border-red-400' : ''}`}
              placeholder="z.B. Miete Wohnung"
              value={formular.name}
              onChange={e => setFormular({ ...formular, name: e.target.value })}
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
              type="number"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={formular.betrag}
              onChange={e => setFormular({ ...formular, betrag: e.target.value })}
            />
            {fehler.betrag && <p className="text-red-500 text-xs mt-1">{fehler.betrag}</p>}
          </div>
          <div>
            <label className="label">Intervall</label>
            <select
              className="input"
              value={formular.intervall}
              onChange={e => setFormular({ ...formular, intervall: e.target.value })}
            >
              {INTERVALL_OPTIONEN.map(o => (
                <option key={o.wert} value={o.wert}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" onClick={speichern}>
            <Check size={15} /> {bearbeitungId ? 'Speichern' : 'Hinzufügen'}
          </button>
          {bearbeitungId && (
            <button className="btn-secondary" onClick={abbrechen}>
              <X size={15} /> Abbrechen
            </button>
          )}
        </div>
        {formular.betrag && !isNaN(formular.betrag) && +formular.betrag > 0 && (
          <p className="text-xs text-navy-500 mt-2">
            ≈ {euro(monatlicherBetrag(+formular.betrag, formular.intervall))} / Monat
          </p>
        )}
      </div>

      {/* Liste */}
      {fixkosten.length === 0 ? (
        <div className="card text-center text-navy-400 py-8">Noch keine Fixkosten eingetragen.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 border-b border-navy-100">
                <th className="text-left px-4 py-3 text-navy-600 font-semibold">Name</th>
                <th className="text-left px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Kategorie</th>
                <th className="text-right px-4 py-3 text-navy-600 font-semibold">Betrag</th>
                <th className="text-center px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Intervall</th>
                <th className="text-right px-4 py-3 text-navy-600 font-semibold">/ Monat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {fixkosten.map((f, i) => (
                <tr key={f.id} className={`border-b border-navy-50 ${i % 2 === 0 ? '' : 'bg-navy-50/30'}`}>
                  <td className="px-4 py-3 font-medium text-navy-800">{f.name}</td>
                  <td className="px-4 py-3 text-navy-500 hidden sm:table-cell">{f.kategorie}</td>
                  <td className="px-4 py-3 text-right text-navy-700">{euro(f.betrag)}</td>
                  <td className="px-4 py-3 text-center text-navy-500 hidden sm:table-cell">
                    {INTERVALL_OPTIONEN.find(o => o.wert === f.intervall)?.label}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-700">
                    {euro(monatlicherBetrag(f.betrag, f.intervall))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => bearbeiten(f)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => loeschen(f.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy-100 border-t border-navy-200">
                <td colSpan={4} className="px-4 py-3 font-semibold text-navy-700 hidden sm:table-cell">Gesamt monatlich</td>
                <td colSpan={2} className="px-4 py-3 font-semibold text-navy-700 sm:hidden">Gesamt / Monat</td>
                <td className="px-4 py-3 text-right font-bold text-navy-800 text-base">{euro(gesamtMonatlich)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
