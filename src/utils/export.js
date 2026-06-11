import * as XLSX from 'xlsx'
import { monatlicherBetrag, INTERVALL_OPTIONEN } from '../data/kategorien'

export function exportiereAlsExcel(fixkosten, variableKosten) {
  const wb = XLSX.utils.book_new()

  // --- Fixkosten Sheet ---
  const fixData = [
    ['Name', 'Kategorie', 'Betrag (€)', 'Intervall', 'Monatlich (€)'],
    ...fixkosten.map(f => [
      f.name,
      f.kategorie,
      f.betrag,
      INTERVALL_OPTIONEN.find(o => o.wert === f.intervall)?.label ?? f.intervall,
      +monatlicherBetrag(f.betrag, f.intervall).toFixed(2),
    ]),
    [],
    ['', '', '', 'Summe monatlich (€)', +fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0).toFixed(2)],
  ]
  const wsFixkosten = XLSX.utils.aoa_to_sheet(fixData)
  wsFixkosten['!cols'] = [{ wch: 30 }, { wch: 25 }, { wch: 14 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsFixkosten, 'Fixkosten')

  // --- Variable Kosten Sheet ---
  const varData = [
    ['Datum', 'Name', 'Kategorie', 'Betrag (€)'],
    ...variableKosten.map(v => [v.datum, v.name, v.kategorie, v.betrag]),
    [],
    ['', '', 'Summe (€)', +variableKosten.reduce((s, v) => s + v.betrag, 0).toFixed(2)],
  ]
  const wsVariabel = XLSX.utils.aoa_to_sheet(varData)
  wsVariabel['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 25 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsVariabel, 'Variable Kosten')

  // --- Monatsübersicht Sheet ---
  const monate = {}
  variableKosten.forEach(v => {
    const m = v.datum.slice(0, 7)
    if (!monate[m]) monate[m] = 0
    monate[m] += v.betrag
  })
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const uebersichtData = [
    ['Monat', 'Fixkosten (€)', 'Variable Kosten (€)', 'Gesamt (€)'],
    ...Object.entries(monate).sort().map(([m, varSum]) => [
      m,
      +fixSumme.toFixed(2),
      +varSum.toFixed(2),
      +(fixSumme + varSum).toFixed(2),
    ]),
  ]
  const wsUebersicht = XLSX.utils.aoa_to_sheet(uebersichtData)
  wsUebersicht['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 22 }, { wch: 14 }]
  XLSX.utils.book_append_sheet(wb, wsUebersicht, 'Monatsübersicht')

  XLSX.writeFile(wb, 'Haushaltsbuch_Kapitalwegweiser.xlsx')
}
