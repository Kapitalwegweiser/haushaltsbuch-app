import { useState } from 'react'
import { Check, X, Trash2, Edit2, Plus, RefreshCw, Star } from 'lucide-react'
import { INTERVALL_OPTIONEN, MONATE, monatlicherBetrag } from '../data/kategorien'

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

const SONDER_KATEGORIEN = [
  '13. Gehalt',
  'Urlaubsgeld',
  'Weihnachtsgeld',
  'Bonus / Prämie',
  'Steuererstattung',
  'Erbschaft / Schenkung',
  'Verkauf (Auto, Immobilie etc.)',
  'Sonstiges',
]

const LEER_REGULAER = { typ: 'regulaer', name: '', betrag: '', intervall: 'monatlich' }
const LEER_SONDER   = { typ: 'sondereinnahme', name: '', betrag: '', monat: new Date().getMonth() + 1 }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function EinnahmenSeite({ einnahmen, setEinnahmen }) {
  const [formular, setFormular] = useState(LEER_REGULAER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})
  const [formularOffen, setFormularOffen] = useState(false)

  const regulaer   = einnahmen.filter(e => e.typ !== 'sondereinnahme')
  const sonder     = einnahmen.filter(e => e.typ === 'sondereinnahme').sort((a, b) => (a.monat ?? 1) - (b.monat ?? 1))

  const gesamtMonatlich = regulaer.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const gesamtSonder    = sonder.reduce((s, e) => s + e.betrag, 0)

  function validiere() {
    const f = {}
    if (!formular.name.trim()) f.name = 'Pflichtfeld'
    if (!formular.betrag || isNaN(formular.betrag) || +formular.betrag <= 0) f.betrag = 'Gültigen Betrag eingeben'
    return f
  }

  function speichern() {
    const f = validiere()
    if (Object.keys(f).length) { setFehler(f); return }
    const eintrag = formular.typ === 'sondereinnahme'
      ? { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString(), monat: +formular.monat }
      : { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString() }

    if (bearbeitungId) {
      setEinnahmen(einnahmen.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      setEinnahmen([...einnahmen, eintrag])
    }
    setFormular(LEER_REGULAER)
    setBearbeitungId(null)
    setFehler({})
    setFormularOffen(false)
  }

  function bearbeiten(e) {
    setFormular({ ...e, betrag: e.betrag.toString(), monat: e.monat ?? new Date().getMonth() + 1 })
    setBearbeitungId(e.id)
    setFehler({})
    setFormularOffen(true)
  }

  function abbrechen() {
    setFormular(LEER_REGULAER)
    setBearbeitungId(null)
    setFehler({})
    setFormularOffen(false)
  }

  function loeschen(id) { setEinnahmen(einnahmen.filter(x => x.id !== id)) }

  function wechselTyp(typ) {
    setFormular(typ === 'sondereinnahme' ? LEER_SONDER : LEER_REGULAER)
    setFehler({})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="section-title mb-0">Einnahmen</h2>
          <p className="text-sm text-navy-400 mt-1">Regelmäßige Einnahmen + Sondereinnahmen</p>
        </div>
        <div className="text-right shrink-0 ml-4">
          <p className="label mb-0">Monatlich</p>
          <p className="text-xl font-bold text-brand-600">{euro(gesamtMonatlich)}</p>
          {gesamtSonder > 0 && (
            <p className="text-xs text-amber-600 mt-0.5">+ {euro(gesamtSonder)}/Jahr Sonder</p>
          )}
        </div>
      </div>

      {/* Formular */}
      {!formularOffen ? (
        <button className="btn-primary" onClick={() => setFormularOffen(true)}>
          <Plus size={15} /> Einnahme hinzufügen
        </button>
      ) : (
        <div className="card">
          <h3 className="font-serif text-lg font-semibold text-navy-700 mb-4">
            {bearbeitungId ? 'Eintrag bearbeiten' : 'Neue Einnahme'}
          </h3>

          {/* Typ-Umschalter */}
          {!bearbeitungId && (
            <div className="flex gap-1 p-1 rounded-lg w-fit mb-4" style={{ background: '#ede6d8' }}>
              <button
                onClick={() => wechselTyp('regulaer')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formular.typ === 'regulaer' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}
              >
                <RefreshCw size={13} className="inline mr-1.5" />Regelmäßig
              </button>
              <button
                onClick={() => wechselTyp('sondereinnahme')}
                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${formular.typ === 'sondereinnahme' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}
              >
                <Star size={13} className="inline mr-1.5" />Sondereinnahme
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bezeichnung</label>
              <select
                className={`input ${fehler.name ? 'border-red-400' : ''}`}
                value={formular.name}
                onChange={e => setFormular({ ...formular, name: e.target.value })}
              >
                <option value="">Bitte wählen...</option>
                {(formular.typ === 'sondereinnahme' ? SONDER_KATEGORIEN : EINNAHMEN_KATEGORIEN)
                  .map(k => <option key={k} value={k}>{k}</option>)}
              </select>
              {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
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

            {formular.typ === 'regulaer' && (
              <div>
                <label className="label">Intervall</label>
                <select className="input" value={formular.intervall}
                  onChange={e => setFormular({ ...formular, intervall: e.target.value })}>
                  {INTERVALL_OPTIONEN.map(o => <option key={o.wert} value={o.wert}>{o.label}</option>)}
                </select>
              </div>
            )}

            {formular.typ === 'sondereinnahme' && (
              <div>
                <label className="label">Monat der Auszahlung</label>
                <select className="input" value={formular.monat}
                  onChange={e => setFormular({ ...formular, monat: +e.target.value })}>
                  {MONATE.map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                </select>
                <p className="text-xs text-navy-400 mt-1">
                  Wird nur in diesem Monat angerechnet — kein Monatsdurchschnitt
                </p>
              </div>
            )}
          </div>

          {formular.typ === 'regulaer' && formular.betrag && !isNaN(formular.betrag) && +formular.betrag > 0 && (
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

      {einnahmen.length === 0 && (
        <div className="card text-center py-10 border-dashed">
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Einnahmen eingetragen</p>
          <p className="text-sm text-navy-400">Füge dein Gehalt und weitere Einnahmequellen hinzu.</p>
        </div>
      )}

      {/* Regelmäßige Einnahmen */}
      {regulaer.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 border-b flex items-center gap-2" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
            <RefreshCw size={14} className="text-brand-500" />
            <span className="text-sm font-semibold text-navy-700">Regelmäßige Einnahmen</span>
            <span className="ml-auto text-sm font-bold text-brand-600">{euro(gesamtMonatlich)}/Mo.</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {regulaer.map((e, i) => (
                <tr key={e.id} className={`border-b hover:bg-navy-50/40 transition-colors`} style={{ borderColor: '#f0e8dc' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-700">{e.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-navy-700 font-semibold">{euro(e.betrag)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs px-2 py-0.5 rounded-full border" style={{ background: '#edf7f2', color: '#2e6b52', borderColor: '#c0dfd3' }}>
                      {INTERVALL_OPTIONEN.find(o => o.wert === e.intervall)?.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-brand-600 font-semibold">
                    {euro(monatlicherBetrag(e.betrag, e.intervall))}/Mo.
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => bearbeiten(e)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => loeschen(e.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Sondereinnahmen */}
      {sonder.length > 0 && (
        <div className="card p-0 overflow-hidden">
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-100 flex items-center gap-2">
            <Star size={14} className="text-amber-600" />
            <span className="text-sm font-semibold text-amber-800">Sondereinnahmen</span>
            <span className="ml-auto text-sm font-bold text-amber-700">{euro(gesamtSonder)}/Jahr</span>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {sonder.map((e) => (
                <tr key={e.id} className="border-b hover:bg-navy-50/40 transition-colors" style={{ borderColor: '#f0e8dc' }}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-navy-700">{e.name}</p>
                  </td>
                  <td className="px-4 py-3 text-right text-navy-700 font-semibold">{euro(e.betrag)}</td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                      {MONATE[(e.monat ?? 1) - 1]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-amber-600">
                    einmalig
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => bearbeiten(e)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => loeschen(e.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Gesamt */}
      {einnahmen.length > 0 && (
        <div className="card flex justify-between items-center" style={{ borderLeftWidth: '4px', borderLeftColor: '#2e6b52' }}>
          <div>
            <span className="text-sm font-medium text-navy-600">Monatliche Einnahmen</span>
            {gesamtSonder > 0 && (
              <p className="text-xs text-navy-400 mt-0.5">+ {euro(gesamtSonder)}/Jahr aus Sondereinnahmen</p>
            )}
          </div>
          <span className="text-xl font-bold text-brand-600">{euro(gesamtMonatlich)}</span>
        </div>
      )}
    </div>
  )
}
