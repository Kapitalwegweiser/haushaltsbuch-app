import { useState } from 'react'
import { Check, X, Trash2, Edit2, ShoppingCart, Fuel, UtensilsCrossed, Coffee, ShoppingBag, Plus, Zap } from 'lucide-react'
import { VARIABLE_KATEGORIEN } from '../data/kategorien'
import KategorieSelect from './KategorieSelect'

const heute = () => new Date().toISOString().slice(0, 10)
const LEER = { name: '', kategorie: '', betrag: '', datum: heute() }

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const STANDARD_SCHNELLEINGABEN = [
  { label: 'Einkaufen', kategorie: 'Lebensmittel / Einkauf', icon: ShoppingCart },
  { label: 'Tanken', kategorie: 'Tanken', icon: Fuel },
  { label: 'Essen gehen', kategorie: 'Restaurant / Essen gehen', icon: UtensilsCrossed },
  { label: 'Café', kategorie: 'Café / Kaffee', icon: Coffee },
  { label: 'Drogerie', kategorie: 'Drogerie / Kosmetik', icon: ShoppingBag },
]

// ── Betrag-Popup ─────────────────────────────────────────────────────
function SchnelleingabePopup({ eintrag, onClose, onSpeichern }) {
  const [betrag, setBetrag] = useState('')
  const [fehler, setFehler] = useState('')

  const Icon = eintrag.icon || Zap

  function submit() {
    if (!betrag || isNaN(betrag) || +betrag <= 0) { setFehler('Bitte einen gültigen Betrag eingeben'); return }
    onSpeichern({ name: eintrag.label, kategorie: eintrag.kategorie, betrag: +betrag, datum: heute(), id: Date.now().toString() })
    onClose()
  }

  function handleKey(e) {
    if (e.key === 'Enter') submit()
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-navy-400 hover:text-navy-700"><X size={18} /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-navy-100 rounded-xl p-3">
            <Icon size={22} className="text-navy-600" />
          </div>
          <div>
            <h3 className="font-bold text-navy-800 text-lg">{eintrag.label}</h3>
            <p className="text-xs text-navy-500">{eintrag.kategorie}</p>
          </div>
        </div>
        <label className="label">Betrag (€)</label>
        <input
          className={`input text-2xl font-semibold text-center py-3 ${fehler ? 'border-red-400' : ''}`}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder="0,00"
          value={betrag}
          onChange={e => { setBetrag(e.target.value); setFehler('') }}
          onKeyDown={handleKey}
          autoFocus
        />
        {fehler && <p className="text-red-500 text-xs mt-1">{fehler}</p>}
        <button className="btn-primary w-full justify-center mt-4 py-3 text-base" onClick={submit}>
          <Check size={17} /> Eintragen
        </button>
      </div>
    </div>
  )
}

// ── Neue Schnelleingabe erstellen ────────────────────────────────────
function NeueSchnelleingabePopup({ onClose, onSpeichern }) {
  const [name, setName] = useState('')
  const [kategorie, setKategorie] = useState('')
  const [fehler, setFehler] = useState({})

  function speichern() {
    const f = {}
    if (!name.trim()) f.name = 'Pflichtfeld'
    if (!kategorie) f.kategorie = 'Pflichtfeld'
    if (Object.keys(f).length) { setFehler(f); return }
    onSpeichern({ id: Date.now().toString(), label: name.trim(), kategorie })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-navy-900/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-navy-400 hover:text-navy-700"><X size={18} /></button>
        <div className="flex items-center gap-3 mb-5">
          <div className="bg-gold/10 rounded-xl p-3">
            <Zap size={22} className="text-gold" />
          </div>
          <div>
            <h3 className="font-bold text-navy-800 text-lg">Neue Schnelleingabe</h3>
            <p className="text-xs text-navy-500">Eigenen Button hinzufügen</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <label className="label">Bezeichnung</label>
            <input
              className={`input ${fehler.name ? 'border-red-400' : ''}`}
              placeholder="z.B. Fitnessstudio"
              value={name}
              onChange={e => { setName(e.target.value); setFehler(f => ({ ...f, name: '' })) }}
              autoFocus
            />
            {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
          </div>
          <div>
            <label className="label">Kategorie</label>
            <KategorieSelect
              kategorien={VARIABLE_KATEGORIEN}
              value={kategorie}
              onChange={v => { setKategorie(v); setFehler(f => ({ ...f, kategorie: '' })) }}
              placeholder="Kategorie wählen..."
            />
            {fehler.kategorie && <p className="text-red-500 text-xs mt-1">{fehler.kategorie}</p>}
          </div>
        </div>
        <button className="btn-primary w-full justify-center mt-5 py-3 text-base" onClick={speichern}>
          <Check size={17} /> Button erstellen
        </button>
      </div>
    </div>
  )
}

// ── Hauptkomponente ──────────────────────────────────────────────────
export default function VariableKostenSeite({ variableKosten, setVariableKosten, eigeneSchnelleingaben, setEigeneSchnelleingaben }) {
  const [formular, setFormular] = useState(LEER)
  const [bearbeitungId, setBearbeitungId] = useState(null)
  const [fehler, setFehler] = useState({})
  const [filterMonat, setFilterMonat] = useState(heute().slice(0, 7))
  const [aktivesPopup, setAktivesPopup] = useState(null)   // { quelle: 'standard'|'eigen', index }
  const [neueEingabeOffen, setNeueEingabeOffen] = useState(false)
  const [bearbeitungsModus, setBearbeitungsModus] = useState(false)

  // Alle Schnelleingaben zusammen: Standard + eigene
  const alleSchnelleingaben = [
    ...STANDARD_SCHNELLEINGABEN,
    ...eigeneSchnelleingaben,
  ]

  function validiere() {
    const f = {}
    if (!formular.name.trim()) f.name = 'Pflichtfeld'
    if (!formular.kategorie) f.kategorie = 'Pflichtfeld'
    if (!formular.betrag || isNaN(formular.betrag) || +formular.betrag <= 0) f.betrag = 'Gültigen Betrag eingeben'
    if (!formular.datum) f.datum = 'Pflichtfeld'
    return f
  }

  function speichern() {
    const f = validiere()
    if (Object.keys(f).length) { setFehler(f); return }
    const eintrag = { ...formular, betrag: +formular.betrag, id: bearbeitungId ?? Date.now().toString() }
    if (bearbeitungId) {
      setVariableKosten(variableKosten.map(x => x.id === bearbeitungId ? eintrag : x))
    } else {
      setVariableKosten([...variableKosten, eintrag])
    }
    setFormular({ ...LEER, datum: formular.datum })
    setBearbeitungId(null)
    setFehler({})
  }

  function bearbeiten(eintrag) {
    setFormular({ ...eintrag, betrag: eintrag.betrag.toString() })
    setBearbeitungId(eintrag.id)
    setFehler({})
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function abbrechen() {
    setFormular(LEER)
    setBearbeitungId(null)
    setFehler({})
  }

  const gefiltert = variableKosten
    .filter(v => !filterMonat || v.datum.startsWith(filterMonat))
    .sort((a, b) => b.datum.localeCompare(a.datum))

  const summe = gefiltert.reduce((s, v) => s + v.betrag, 0)
  const monate = [...new Set(variableKosten.map(v => v.datum.slice(0, 7)))].sort().reverse()

  const aktiverEintrag = aktivesPopup !== null ? alleSchnelleingaben[aktivesPopup] : null

  return (
    <div className="space-y-6">
      {/* Betrag-Popup */}
      {aktivesPopup !== null && aktiverEintrag && (
        <SchnelleingabePopup
          eintrag={aktiverEintrag}
          onClose={() => setAktivesPopup(null)}
          onSpeichern={e => { setVariableKosten([...variableKosten, e]); setAktivesPopup(null) }}
        />
      )}

      {/* Neue Schnelleingabe Popup */}
      {neueEingabeOffen && (
        <NeueSchnelleingabePopup
          onClose={() => setNeueEingabeOffen(false)}
          onSpeichern={neu => setEigeneSchnelleingaben([...eigeneSchnelleingaben, neu])}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="section-title mb-0">Variable Kosten</h2>
        <div className="text-right">
          <p className="text-xs text-navy-500">Summe im Monat</p>
          <p className="text-xl font-bold text-navy-700">{euro(summe)}</p>
        </div>
      </div>

      {/* Schnelleingabe */}
      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-navy-700 text-sm uppercase tracking-wide">Schnelleingabe</h3>
          {eigeneSchnelleingaben.length > 0 && (
            <button
              onClick={() => setBearbeitungsModus(!bearbeitungsModus)}
              className="text-xs text-navy-400 hover:text-navy-600"
            >
              {bearbeitungsModus ? 'Fertig' : 'Bearbeiten'}
            </button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {alleSchnelleingaben.map((s, i) => {
            const Icon = s.icon || Zap
            const istEigen = i >= STANDARD_SCHNELLEINGABEN.length
            return (
              <div key={s.id ?? s.label} className="relative shrink-0">
                <button
                  onClick={() => !bearbeitungsModus && setAktivesPopup(i)}
                  className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border transition-all shrink-0
                    ${bearbeitungsModus && istEigen
                      ? 'bg-red-50 border-red-200 text-red-400'
                      : 'bg-navy-50 hover:bg-navy-100 border-navy-200 hover:border-navy-400 text-navy-700'
                    }`}
                  style={{ width: '72px', height: '72px' }}
                >
                  <Icon size={20} className={bearbeitungsModus && istEigen ? 'text-red-300' : 'text-navy-500'} />
                  <span className="text-[11px] font-medium text-center leading-tight w-full px-1 overflow-hidden" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{s.label}</span>
                </button>
                {bearbeitungsModus && istEigen && (
                  <button
                    onClick={() => setEigeneSchnelleingaben(eigeneSchnelleingaben.filter(e => e.id !== s.id))}
                    className="absolute -top-1.5 -right-1.5 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center shadow"
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            )
          })}
          {/* + Button */}
          <button
            onClick={() => setNeueEingabeOffen(true)}
            className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-navy-300 hover:border-navy-500 hover:bg-navy-50 transition-all text-navy-400 hover:text-navy-600 shrink-0"
            style={{ width: '72px', height: '72px' }}
          >
            <Plus size={20} />
            <span className="text-[11px] font-medium text-center leading-tight">Eigener</span>
          </button>
        </div>
      </div>

      {/* Formular */}
      <div className="card">
        <h3 className="font-semibold text-navy-700 mb-4">{bearbeitungId ? 'Eintrag bearbeiten' : 'Manuell eintragen'}</h3>
        <div className="space-y-3">
          <div>
            <label className="label">Datum</label>
            <input
              className={`input w-full ${fehler.datum ? 'border-red-400' : ''}`}
              type="date"
              value={formular.datum}
              onChange={e => setFormular({ ...formular, datum: e.target.value })}
            />
            {fehler.datum && <p className="text-red-500 text-xs mt-1">{fehler.datum}</p>}
          </div>
          <div>
            <label className="label">Betrag (€)</label>
            <input
              className={`input w-full ${fehler.betrag ? 'border-red-400' : ''}`}
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              placeholder="0,00"
              value={formular.betrag}
              onChange={e => setFormular({ ...formular, betrag: e.target.value })}
            />
            {fehler.betrag && <p className="text-red-500 text-xs mt-1">{fehler.betrag}</p>}
          </div>
          <div>
            <label className="label">Kategorie</label>
            <KategorieSelect
              kategorien={VARIABLE_KATEGORIEN}
              value={formular.kategorie}
              onChange={v => setFormular({ ...formular, kategorie: v })}
              placeholder="Kategorie wählen..."
            />
            {fehler.kategorie && <p className="text-red-500 text-xs mt-1">{fehler.kategorie}</p>}
          </div>
          <div>
            <label className="label">Bezeichnung</label>
            <input
              className={`input w-full ${fehler.name ? 'border-red-400' : ''}`}
              placeholder="z.B. Einkauf Rewe"
              value={formular.name}
              onChange={e => setFormular({ ...formular, name: e.target.value })}
            />
            {fehler.name && <p className="text-red-500 text-xs mt-1">{fehler.name}</p>}
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
      </div>

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="label mb-0 shrink-0">Monat:</label>
        <select className="input max-w-[180px]" value={filterMonat} onChange={e => setFilterMonat(e.target.value)}>
          <option value="">Alle Monate</option>
          {monate.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>

      {/* Liste */}
      {gefiltert.length === 0 ? (
        <div className="card text-center text-navy-400 py-8">Keine Einträge für diesen Monat.</div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-navy-50 border-b border-navy-100">
                <th className="text-left px-4 py-3 text-navy-600 font-semibold">Datum</th>
                <th className="text-left px-4 py-3 text-navy-600 font-semibold">Bezeichnung</th>
                <th className="text-left px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Kategorie</th>
                <th className="text-right px-4 py-3 text-navy-600 font-semibold">Betrag</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {gefiltert.map((v, i) => (
                <tr key={v.id} className={`border-b border-navy-50 ${i % 2 === 0 ? '' : 'bg-navy-50/30'}`}>
                  <td className="px-4 py-3 text-navy-500 whitespace-nowrap">
                    {new Date(v.datum).toLocaleDateString('de-DE')}
                  </td>
                  <td className="px-4 py-3 font-medium text-navy-800">{v.name}</td>
                  <td className="px-4 py-3 text-navy-500 hidden sm:table-cell">{v.kategorie}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy-700">{euro(v.betrag)}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 justify-end">
                      <button onClick={() => bearbeiten(v)} className="p-1.5 text-navy-400 hover:text-navy-700 rounded"><Edit2 size={14} /></button>
                      <button onClick={() => setVariableKosten(variableKosten.filter(x => x.id !== v.id))} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-navy-100 border-t border-navy-200">
                <td colSpan={3} className="px-4 py-3 font-semibold text-navy-700 hidden sm:table-cell">Summe</td>
                <td colSpan={2} className="px-4 py-3 font-semibold text-navy-700 sm:hidden">Summe</td>
                <td className="px-4 py-3 text-right font-bold text-navy-800 text-base">{euro(summe)}</td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
