import { useState } from 'react'
import { monatlicherBetrag, INTERVALL_OPTIONEN } from '../data/kategorien'
import { FileDown } from 'lucide-react'
import { exportiereAlsExcel } from '../utils/export'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const heute = () => new Date().toISOString().slice(0, 7)

export default function Haushaltsbuch({ fixkosten, variableKosten, einnahmen }) {
  const [monat, setMonat] = useState(heute())

  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicherBetrag(e.betrag, e.intervall), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)

  const varImMonat = variableKosten
    .filter(v => v.datum.startsWith(monat))
    .sort((a, b) => a.datum.localeCompare(b.datum))

  const varSumme = varImMonat.reduce((s, v) => s + v.betrag, 0)
  const gesamtSumme = fixSumme + varSumme

  const monate = [...new Set(variableKosten.map(v => v.datum.slice(0, 7)))].sort().reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="section-title mb-0">Haushaltsbuch</h2>
        <div className="flex items-center gap-3">
          <select className="input max-w-[160px]" value={monat} onChange={e => setMonat(e.target.value)}>
            <option value={heute()}>{heute()}</option>
            {monate.filter(m => m !== heute()).map(m => <option key={m} value={m}>{m}</option>)}
          </select>
          <button className="btn-secondary text-sm" onClick={() => exportiereAlsExcel(fixkosten, variableKosten)}>
            <FileDown size={15} /> Export
          </button>
        </div>
      </div>

      {/* Zusammenfassung */}
      <div className="flex flex-col gap-3">
        <div className="card text-center">
          <p className="text-xs text-navy-500 mb-1">Einnahmen</p>
          <p className="text-lg font-bold text-emerald-700">{euro(einnahmenSumme)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-navy-500 mb-1">Fixkosten</p>
          <p className="text-lg font-bold text-navy-700">{euro(fixSumme)}</p>
        </div>
        <div className="card text-center">
          <p className="text-xs text-navy-500 mb-1">Variabel</p>
          <p className="text-lg font-bold text-navy-700">{euro(varSumme)}</p>
        </div>
        <div className={`card text-center ${einnahmenSumme > 0 && einnahmenSumme - gesamtSumme < 0 ? 'bg-red-600' : 'bg-navy-600'}`}>
          <p className="text-xs text-navy-200 mb-1">{einnahmenSumme > 0 ? 'Verfügbar' : 'Gesamt'}</p>
          <p className="text-lg font-bold text-white">{einnahmenSumme > 0 ? euro(einnahmenSumme - gesamtSumme) : euro(gesamtSumme)}</p>
        </div>
      </div>

      {/* Fixkosten Tabelle */}
      <div>
        <h3 className="font-semibold text-navy-700 mb-2">Fixkosten (monatlich umgerechnet)</h3>
        <div className="card overflow-x-auto p-0">
          {fixkosten.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-6">Keine Fixkosten eingetragen.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 border-b border-navy-100">
                  <th className="text-left px-4 py-3 text-navy-600 font-semibold">Name</th>
                  <th className="text-left px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Kategorie</th>
                  <th className="text-right px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Original</th>
                  <th className="text-center px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Intervall</th>
                  <th className="text-right px-4 py-3 text-navy-600 font-semibold">/ Monat</th>
                </tr>
              </thead>
              <tbody>
                {fixkosten.map((f, i) => (
                  <tr key={f.id} className={`border-b border-navy-50 ${i % 2 === 0 ? '' : 'bg-navy-50/30'}`}>
                    <td className="px-4 py-3 font-medium text-navy-800">{f.name}</td>
                    <td className="px-4 py-3 text-navy-500 hidden sm:table-cell">{f.kategorie}</td>
                    <td className="px-4 py-3 text-right text-navy-500 hidden sm:table-cell">{euro(f.betrag)}</td>
                    <td className="px-4 py-3 text-center text-navy-500 hidden sm:table-cell">
                      {INTERVALL_OPTIONEN.find(o => o.wert === f.intervall)?.label}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-700">
                      {euro(monatlicherBetrag(f.betrag, f.intervall))}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-100 border-t border-navy-200">
                  <td colSpan={4} className="px-4 py-3 font-semibold text-navy-700 hidden sm:table-cell">Summe Fixkosten</td>
                  <td colSpan={1} className="px-4 py-3 font-semibold text-navy-700 sm:hidden">Summe</td>
                  <td className="px-4 py-3 text-right font-bold text-navy-800">{euro(fixSumme)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Variable Kosten Tabelle */}
      <div>
        <h3 className="font-semibold text-navy-700 mb-2">Variable Kosten – {monat}</h3>
        <div className="card overflow-x-auto p-0">
          {varImMonat.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-6">Keine variablen Kosten in diesem Monat.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-navy-50 border-b border-navy-100">
                  <th className="text-left px-4 py-3 text-navy-600 font-semibold">Datum</th>
                  <th className="text-left px-4 py-3 text-navy-600 font-semibold">Bezeichnung</th>
                  <th className="text-left px-4 py-3 text-navy-600 font-semibold hidden sm:table-cell">Kategorie</th>
                  <th className="text-right px-4 py-3 text-navy-600 font-semibold">Betrag</th>
                </tr>
              </thead>
              <tbody>
                {varImMonat.map((v, i) => (
                  <tr key={v.id} className={`border-b border-navy-50 ${i % 2 === 0 ? '' : 'bg-navy-50/30'}`}>
                    <td className="px-4 py-3 text-navy-500 whitespace-nowrap">
                      {new Date(v.datum).toLocaleDateString('de-DE')}
                    </td>
                    <td className="px-4 py-3 font-medium text-navy-800">{v.name}</td>
                    <td className="px-4 py-3 text-navy-500 hidden sm:table-cell">{v.kategorie}</td>
                    <td className="px-4 py-3 text-right font-semibold text-navy-700">{euro(v.betrag)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-navy-100 border-t border-navy-200">
                  <td colSpan={3} className="px-4 py-3 font-semibold text-navy-700 hidden sm:table-cell">Summe Variable Kosten</td>
                  <td colSpan={2} className="px-4 py-3 font-semibold text-navy-700 sm:hidden">Summe</td>
                  <td className="px-4 py-3 text-right font-bold text-navy-800">{euro(varSumme)}</td>
                </tr>
              </tfoot>
            </table>
          )}
        </div>
      </div>

      {/* Gesamtbilanz */}
      <div className="card bg-navy-800 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-navy-300 text-sm">Gesamtausgaben im {monat}</p>
            <p className="text-3xl font-bold mt-1">{euro(gesamtSumme)}</p>
          </div>
          <div className="text-right text-sm">
            <p className="text-navy-300">Fixkosten: {euro(fixSumme)}</p>
            <p className="text-navy-300">Variabel: {euro(varSumme)}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
