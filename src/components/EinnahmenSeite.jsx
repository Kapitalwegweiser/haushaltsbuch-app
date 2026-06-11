import { useState } from 'react'
import { Check, X, Trash2, Edit2 } from 'lucide-react'
import { INTERVALL_OPTIONEN, monatlicherBetrag } from '../data/kategorien'

const EINNAHMEN_KATEGORIEN = [
  'Gehalt / Lohn (netto)',
  'Selbstständigkeit / Freelance',
  'Nebenjob',
  'Mieteinnahmen',
  'Dividenden / Zinsen',
  'Kindergeld',
  'Rente / Pension',
  'Unterhalt (Einnahme)',
  'Sonstiges',
]

const LEER = { name: '', betrag: '', intervall: 'monatlich' }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function EinnahmenSeite({ einnahmen, setEinnahmen }) {
  const [formular, setFormular] = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})

  function validiere() {
    const f = {}
    if (!formular.name.trim()) f.name = 'Pflichtfeld'
    if (!formular.betrag || isNaN(formular.betrag) || +formular.betrag <= 0) f.betrag = 'Gültigen Betrag eingeben'
    return f
  }

  function speichern() {
    const f = validiere()
    if (Object.keys(f).length) { setFehler(f); return }
    const eintrag = { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString() }
    if (bearbeitungId) {
      setEinnahmen(einnahmen.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      setEinnahmen([...einnahmen, eintrag])
    }
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  function bearbeiten(e) {
    setFormular({ ...e, betrag: e.betrag.toString() })
    setBearbeitungId(e.id)
    setFehler({})
  }

  function abbrechen() {
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  const gesamtMonatlich = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Einnahmen</h2>
        <div className="text-right">
          <p className="text-xs text-navy-500">Monatliche Einnahmen</p>
          <p className="text-xl font-bold text-emerald-700">{euro(gesamtMonatlich)}</p>
        </div>
      </div>

      {/* Formular */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">{bearbeitungId ? 'Eintrag bearbeiten' : 'Neue Einnahmequelle'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Bezeichnung</label>
            <select
              className={`input ${fehler.name ? 'border-red-400' : ''}`}
              value={formular.name}
              onChange={e => setFormular({ ...formular, name: e.target.value })}
            >
              <option value="">Einnahmequelle wählen...</option>
              {EINNAHMEN_KATEGORIEN.map(k => <option key={k} value={k}>{k}</option>)}
            </select>
            {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
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
              {INTERVALL_OPTIONEN.map(o => <option key={o.wert} value={o.wert}>{o.label}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" onClick={speichern}>
            <Check size={15} /> {bearbeitungId ? 'Speichern' : 'Hinzufügen'}
          </button>
          {bearbeitungId && (
            <button className="btn-secondary" onClick={abbrechen}><X size={15} /> Abbrechen</button>
          )}
        </div>
        {formular.betrag && !isNaN(formular.betrag) && +formular.betrag > 0 && (
          <p className="text-xs text-navy-500 mt-2">
            ≈ {euro(monatlicherBetrag(+formular.betrag, formular.intervall))} / Monat
          </p>
        )}
      </div>

      {/* Liste */}
      {einnahmen.length === 0 ? (
        <div className="card text-center text-navy-400 py-8">Noch keine Einnahmen eingetragen.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-emerald-50 border-b border-emerald-100">
                <th className="text-left px-4 py-3 text-navy-600 font-semibold">Einnahmequelle</th>
                <th className="text-right px-4 py-3 text-navy-600 font-semibold">Betrag</th>
                <th className="text-center px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Intervall</th>
                <th className="text-right px-4 py-3 text-navy-600 font-semibold">/ Monat</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {einnahmen.map((e, i) => (
                <tr key={e.id} className={`border-b border-navy-50 ${i % 2 === 0 ? '' : 'bg-navy-50/30'}`}>
                  <td className="px-4 py-3 font-medium text-navy-800">{e.name}</td>
                  <td className="px-4 py-3 text-right text-navy-700">{euro(e.betrag)}</td>
                  <td className="px-4 py-3 text-center text-navy-500 hidden sm:table-cell">
                    {INTERVALL_OPTIONEN.find(o => o.wert === e.intervall)?.label}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                    {euro(monatlicherBetrag(e.betrag, e.intervall))}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => bearbeiten(e)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => setEinnahmen(einnahmen.filter(x => x.id !== e.id))} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-50 border-t border-emerald-200">
                <td colSpan={3} className="px-4 py-3 font-semibold text-navy-700 hidden sm:table-cell">Gesamt monatlich</td>
                <td colSpan={1} className="px-4 py-3 font-semibold text-navy-700 sm:hidden">Gesamt</td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700 text-base">{euro(gesamtMonatlich)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
