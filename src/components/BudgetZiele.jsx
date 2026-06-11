import { useState } from 'react'
import { Check, Trash2, Edit2, X } from 'lucide-react'
import { VARIABLE_KATEGORIEN } from '../data/kategorien'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const heute = () => new Date().toISOString().slice(0, 7)

function Fortschrittsbalken({ ist, soll }) {
  const prozent = soll > 0 ? Math.min((ist / soll) * 100, 100) : 0
  const farbe = prozent < 70 ? 'bg-emerald-500' : prozent < 90 ? 'bg-amber-400' : 'bg-red-500'
  return (
    <div className="w-full bg-navy-100 rounded-full h-2 mt-1">
      <div className={`h-2 rounded-full transition-all duration-300 ${farbe}`} style={{ width: `${prozent}%` }} />
    </div>
  )
}

const LEER = { kategorie: '', betrag: '' }

export default function BudgetZiele({ budgets, setBudgets, variableKosten }) {
  const [formular, setFormular] = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})

  const aktuellerMonat = heute()

  const alleKategorien = VARIABLE_KATEGORIEN.flatMap(g => g.eintraege).filter(k => k !== 'Sonstiges')

  function validiere() {
    const f = {}
    if (!formular.kategorie) f.kategorie = 'Pflichtfeld'
    if (!formular.betrag || isNaN(formular.betrag) || +formular.betrag <= 0) f.betrag = 'Gültigen Betrag eingeben'
    return f
  }

  function speichern() {
    const f = validiere()
    if (Object.keys(f).length) { setFehler(f); return }
    const eintrag = { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString() }
    if (bearbeitungId) {
      setBudgets(budgets.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      // Kein Duplikat
      if (budgets.find(b => b.kategorie === formular.kategorie && b.id !== bearbeitungId)) {
        setFehler({ kategorie: 'Budget für diese Kategorie bereits vorhanden' }); return
      }
      setBudgets([...budgets, eintrag])
    }
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  function bearbeiten(b) {
    setFormular({ ...b, betrag: b.betrag.toString() })
    setBearbeitungId(b.id)
    setFehler({})
  }

  function ausgabenFuerKategorie(kategorie) {
    return variableKosten
      .filter(v => v.datum.startsWith(aktuellerMonat) && v.kategorie === kategorie)
      .reduce((s, v) => s + v.betrag, 0)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-1">Budget-Ziele</h2>
        <p className="text-sm text-navy-500">Setze monatliche Obergrenzen für variable Ausgaben-Kategorien.</p>
      </div>

      {/* Formular */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">{bearbeitungId ? 'Budget bearbeiten' : 'Neues Budget setzen'}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Kategorie</label>
            <select
              className={`input ${fehler.kategorie ? 'border-red-400' : ''}`}
              value={formular.kategorie}
              onChange={e => setFormular({ ...formular, kategorie: e.target.value })}
            >
              <option value="">Kategorie wählen...</option>
              {VARIABLE_KATEGORIEN.map(gruppe => (
                <optgroup key={gruppe.gruppe} label={gruppe.gruppe}>
                  {gruppe.eintraege.filter(k => k !== 'Sonstiges').map(k => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </optgroup>
              ))}
              <option value="Sonstiges">Sonstiges</option>
            </select>
            {fehler.kategorie && <p className="text-red-500 text-xs mt-1">{fehler.kategorie}</p>}
          </div>
          <div>
            <label className="label">Budget pro Monat (€)</label>
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
        </div>
        <div className="flex gap-2 mt-4">
          <button className="btn-primary" onClick={speichern}>
            <Check size={15} /> {bearbeitungId ? 'Speichern' : 'Budget setzen'}
          </button>
          {bearbeitungId && (
            <button className="btn-secondary" onClick={() => { setFormular(LEER); setBearbeitungId(null); setFehler({}) }}>
              <X size={15} /> Abbrechen
            </button>
          )}
        </div>
      </div>

      {/* Budget-Übersicht */}
      {budgets.length === 0 ? (
        <div className="card text-center text-navy-400 py-8">Noch keine Budget-Ziele gesetzt.</div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-navy-500 font-medium uppercase tracking-wide">Aktueller Monat: {aktuellerMonat}</p>
          {budgets.map(b => {
            const ist = ausgabenFuerKategorie(b.kategorie)
            const prozent = b.betrag > 0 ? (ist / b.betrag) * 100 : 0
            const verbleibend = b.betrag - ist
            const ueberschritten = verbleibend < 0
            return (
              <div key={b.id} className="card">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-navy-800 truncate">{b.kategorie}</span>
                      <span className={`text-sm font-semibold ml-2 shrink-0 ${ueberschritten ? 'text-red-600' : prozent >= 90 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {euro(ist)} / {euro(b.betrag)}
                      </span>
                    </div>
                    <Fortschrittsbalken ist={ist} soll={b.betrag} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-navy-400">{prozent.toFixed(0)}% genutzt</span>
                      <span className={`text-xs font-medium ${ueberschritten ? 'text-red-600' : 'text-navy-500'}`}>
                        {ueberschritten ? `${euro(Math.abs(verbleibend))} überschritten` : `${euro(verbleibend)} verbleibend`}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0 ml-2">
                    <button onClick={() => bearbeiten(b)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                    <button onClick={() => setBudgets(budgets.filter(x => x.id !== b.id))} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
