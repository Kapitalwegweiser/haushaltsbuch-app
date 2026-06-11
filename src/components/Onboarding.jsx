import { useState } from 'react'
import { ArrowRight, CheckCircle, TrendingUp, Home, BarChart2 } from 'lucide-react'
import { INTERVALL_OPTIONEN, monatlicherBetrag } from '../data/kategorien'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const EINNAHMEN_OPTIONEN = [
  'Gehalt / Lohn (netto)',
  'Selbstständigkeit / Freelance',
  'Nebenjob',
  'Mieteinnahmen',
  'Dividenden / Zinsen',
  'Sonstiges',
]

export default function Onboarding({ onAbschliessen, setEinnahmen, setFixkosten }) {
  const [schritt, setSchritt] = useState(0)

  // Einnahmen
  const [einnahmenName, setEinnahmenName] = useState('Gehalt / Lohn (netto)')
  const [einnahmenBetrag, setEinnahmenBetrag] = useState('')
  const [einnahmenIntervall, setEinnahmenIntervall] = useState('monatlich')
  const [einnahmenFehler, setEinnahmenFehler] = useState('')

  // Fixkosten (optional)
  const [fixName, setFixName] = useState('')
  const [fixBetrag, setFixBetrag] = useState('')
  const [fixIntervall, setFixIntervall] = useState('monatlich')
  const [fixListe, setFixListe] = useState([])

  function weiterZuSchritt1() {
    if (!einnahmenBetrag || isNaN(einnahmenBetrag) || +einnahmenBetrag <= 0) {
      setEinnahmenFehler('Bitte gib einen gültigen Betrag ein.')
      return
    }
    setEinnahmenFehler('')
    // Einnahmen direkt speichern
    setEinnahmen([{
      id: Date.now().toString(),
      name: einnahmenName,
      betrag: +einnahmenBetrag,
      intervall: einnahmenIntervall,
    }])
    setSchritt(2)
  }

  function fixHinzufuegen() {
    if (!fixName.trim() || !fixBetrag || isNaN(fixBetrag) || +fixBetrag <= 0) return
    setFixListe([...fixListe, { id: Date.now().toString(), name: fixName, betrag: +fixBetrag, intervall: fixIntervall, kategorie: 'Sonstiges' }])
    setFixName('')
    setFixBetrag('')
    setFixIntervall('monatlich')
  }

  function abschliessen() {
    if (fixListe.length > 0) setFixkosten(fixListe)
    onAbschliessen()
  }

  const monatlichesEinkommen = einnahmenBetrag && !isNaN(einnahmenBetrag)
    ? monatlicherBetrag(+einnahmenBetrag, einnahmenIntervall)
    : 0

  const fixSumme = fixListe.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)

  const SCHRITTE = [
    { nr: 1, label: 'Einnahmen' },
    { nr: 2, label: 'Fixkosten' },
    { nr: 3, label: 'Los geht\'s' },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-navy-900/95 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-navy-800 px-6 py-5">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-white font-bold text-lg">Kapitalwegweiser</h1>
            <span className="text-navy-300 text-xs">Haushaltsbuch</span>
          </div>
          {/* Fortschrittsbalken */}
          {schritt > 0 && (
            <div className="flex gap-2 items-center">
              {SCHRITTE.map((s, i) => (
                <div key={s.nr} className="flex items-center gap-2 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${schritt > i ? 'bg-gold text-white' : schritt === i ? 'bg-white text-navy-800' : 'bg-navy-600 text-navy-300'}`}>
                    {schritt > i ? <CheckCircle size={14} /> : s.nr}
                  </div>
                  <span className={`text-xs hidden sm:block ${schritt === i ? 'text-white font-medium' : 'text-navy-400'}`}>{s.label}</span>
                  {i < SCHRITTE.length - 1 && <div className={`flex-1 h-0.5 ${schritt > i ? 'bg-gold' : 'bg-navy-600'}`} />}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Inhalt */}
        <div className="px-6 py-7">

          {/* ── Schritt 0: Willkommen ── */}
          {schritt === 0 && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-navy-100 rounded-2xl flex items-center justify-center mx-auto">
                <BarChart2 size={32} className="text-navy-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-navy-800">Willkommen!</h2>
                <p className="text-navy-500 mt-2 leading-relaxed">
                  Dein persönlicher Finanzbegleiter von Kapitalwegweiser. In 2 Minuten hast du deine Finanzen im Blick.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="bg-navy-50 rounded-xl p-3">
                  <TrendingUp size={20} className="text-emerald-500 mx-auto mb-1" />
                  <span className="text-navy-600 font-medium">Einnahmen tracken</span>
                </div>
                <div className="bg-navy-50 rounded-xl p-3">
                  <Home size={20} className="text-navy-500 mx-auto mb-1" />
                  <span className="text-navy-600 font-medium">Fixkosten erfassen</span>
                </div>
                <div className="bg-navy-50 rounded-xl p-3">
                  <BarChart2 size={20} className="text-gold mx-auto mb-1" />
                  <span className="text-navy-600 font-medium">Finanz-Score sehen</span>
                </div>
              </div>
              <div className="bg-navy-50 border border-navy-200 rounded-xl p-3 text-xs text-navy-600 leading-relaxed text-left">
                <p><span className="font-semibold text-navy-700">📌 Fixkosten</span> — Ausgaben die jeden Monat gleich bleiben: Miete, Versicherungen, Abos, Auto.</p>
                <p className="mt-1.5"><span className="font-semibold text-navy-700">📌 Variable Kosten</span> — Ausgaben die jeden Monat schwanken: Einkaufen, Tanken, Essen gehen, Freizeit.</p>
              </div>
              <button className="btn-primary w-full justify-center py-3 text-base" onClick={() => setSchritt(1)}>
                Jetzt starten <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* ── Schritt 1: Einnahmen ── */}
          {schritt === 1 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy-800">Was verdienst du netto?</h2>
                <p className="text-navy-500 text-sm mt-1">Das ist die Grundlage für deinen Finanz-Score und alle Auswertungen.</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="label">Einnahmequelle</label>
                  <select className="input" value={einnahmenName} onChange={e => setEinnahmenName(e.target.value)}>
                    {EINNAHMEN_OPTIONEN.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Betrag (€)</label>
                    <input
                      className={`input text-lg font-semibold ${einnahmenFehler ? 'border-red-400' : ''}`}
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0,00"
                      value={einnahmenBetrag}
                      onChange={e => { setEinnahmenBetrag(e.target.value); setEinnahmenFehler('') }}
                      autoFocus
                    />
                    {einnahmenFehler && <p className="text-red-500 text-xs mt-1">{einnahmenFehler}</p>}
                  </div>
                  <div>
                    <label className="label">Intervall</label>
                    <select className="input" value={einnahmenIntervall} onChange={e => setEinnahmenIntervall(e.target.value)}>
                      {INTERVALL_OPTIONEN.map(o => <option key={o.wert} value={o.wert}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {monatlichesEinkommen > 0 && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                    <p className="text-emerald-700 font-semibold text-lg">{euro(monatlichesEinkommen)} / Monat</p>
                    <p className="text-emerald-600 text-xs mt-0.5">monatliches Nettoeinkommen</p>
                  </div>
                )}
              </div>
              <button className="btn-primary w-full justify-center py-3 text-base" onClick={weiterZuSchritt1}>
                Weiter <ArrowRight size={17} />
              </button>
            </div>
          )}

          {/* ── Schritt 2: Fixkosten (optional) ── */}
          {schritt === 2 && (
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-navy-800">Fixkosten eintragen</h2>
                <p className="text-navy-500 text-sm mt-1">Optional — du kannst das auch später machen. Trag ruhig schon die wichtigsten ein.</p>
                <div className="bg-navy-50 border border-navy-200 rounded-xl p-3 mt-3 text-xs text-navy-600 leading-relaxed">
                  <span className="font-semibold text-navy-700">💡 Was sind Fixkosten?</span><br />
                  Fixkosten sind Ausgaben, die jeden Monat gleich bleiben — unabhängig davon, was du tust. Dazu gehören z.B. Miete, Versicherungen, Handy-Vertrag, Netflix oder dein Auto-Leasing. Du zahlst sie immer, egal ob du viel oder wenig ausgibst.
                </div>
              </div>

              {/* Schnell-Eintrag */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Bezeichnung</label>
                  <input
                    className="input"
                    placeholder="z.B. Miete"
                    value={fixName}
                    onChange={e => setFixName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fixHinzufuegen()}
                  />
                </div>
                <div>
                  <label className="label">Betrag (€)</label>
                  <input
                    className="input"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0,00"
                    value={fixBetrag}
                    onChange={e => setFixBetrag(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && fixHinzufuegen()}
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select className="input flex-1" value={fixIntervall} onChange={e => setFixIntervall(e.target.value)}>
                  {INTERVALL_OPTIONEN.map(o => <option key={o.wert} value={o.wert}>{o.label}</option>)}
                </select>
                <button className="btn-secondary shrink-0" onClick={fixHinzufuegen}>+ Hinzufügen</button>
              </div>

              {/* Liste */}
              {fixListe.length > 0 && (
                <div className="bg-navy-50 rounded-xl p-3 space-y-2 max-h-36 overflow-y-auto">
                  {fixListe.map(f => (
                    <div key={f.id} className="flex justify-between items-center text-sm">
                      <span className="text-navy-700 font-medium">{f.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-navy-500">{euro(monatlicherBetrag(f.betrag, f.intervall))}/Mo.</span>
                        <button onClick={() => setFixListe(fixListe.filter(x => x.id !== f.id))} className="text-red-400 hover:text-red-600 text-xs">✕</button>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-navy-200 pt-2 flex justify-between text-sm font-semibold">
                    <span className="text-navy-700">Gesamt / Monat</span>
                    <span className="text-navy-800">{euro(fixSumme)}</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button className="btn-secondary flex-1 justify-center" onClick={abschliessen}>
                  Überspringen
                </button>
                <button className="btn-primary flex-1 justify-center py-3" onClick={() => setSchritt(3)}>
                  Weiter <ArrowRight size={17} />
                </button>
              </div>
            </div>
          )}

          {/* ── Schritt 3: Fertig ── */}
          {schritt === 3 && (
            <div className="text-center space-y-5">
              <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-emerald-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-navy-800">Alles bereit!</h2>
                <p className="text-navy-500 mt-2 leading-relaxed">
                  Dein Haushaltsbuch ist eingerichtet. Dein Finanz-Score wartet auf dich — schau ihn dir gleich an!
                </p>
              </div>
              {monatlichesEinkommen > 0 && (
                <div className="bg-navy-50 rounded-xl p-4 text-left space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-navy-500">Monatliches Einkommen</span>
                    <span className="font-semibold text-emerald-700">{euro(monatlichesEinkommen)}</span>
                  </div>
                  {fixSumme > 0 && (
                    <div className="flex justify-between">
                      <span className="text-navy-500">Fixkosten / Monat</span>
                      <span className="font-semibold text-navy-700">{euro(fixSumme)}</span>
                    </div>
                  )}
                  {fixSumme > 0 && (
                    <div className="flex justify-between border-t border-navy-200 pt-2">
                      <span className="text-navy-500">Verbleibt frei</span>
                      <span className={`font-bold ${monatlichesEinkommen - fixSumme >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {euro(monatlichesEinkommen - fixSumme)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              <button className="btn-primary w-full justify-center py-3 text-base" onClick={abschliessen}>
                Zur App <ArrowRight size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
