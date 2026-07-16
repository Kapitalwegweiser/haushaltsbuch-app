import { useState, useMemo } from 'react'
import { Building2, Download, Filter, FileText, Receipt, Info, Sparkles, Loader2, TrendingUp, TrendingDown, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import JSZip from 'jszip'
import { supabase } from '../lib/supabase'

function euro(n) {
  if (!n && n !== 0) return '—'
  return Number(n).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

function datumDE(str) {
  if (!str) return '—'
  return new Date(str).toLocaleDateString('de-DE')
}

// Anlage V Positionen für jede Instandhaltungskategorie
const ANLAGE_V = {
  instandhaltung: {
    zeile: 'Zeile 40',
    bezeichnung: 'Erhaltungsaufwendungen',
    hinweis: 'Anlage V — Zeile 40 „Erhaltungsaufwendungen"',
    farbe: 'bg-brand-500/10 text-brand-600',
  },
  grundsteuer: {
    zeile: 'Zeile 14',
    bezeichnung: 'Grundsteuer',
    hinweis: 'Anlage V — Zeile 14 „Grundsteuer, Straßenreinigung, Müllabfuhr"',
    farbe: 'bg-amber-50 text-amber-700',
  },
}

// HTML-Zusammenfassung für das Finanzamt — wird in das ZIP gepackt
function erstelleHtmlZusammenfassung({ immobilie, zeitraumLabel, instandhaltung, steuern, summeGesamt }) {
  const summeIH = instandhaltung.reduce((s, m) => s + (Number(m.betrag) || 0), 0)
  const summeSt = steuern.reduce((s, e) => s + (Number(e.betrag) || 0), 0)

  const ihZeilen = instandhaltung.map((m, i) => `
    <tr style="background:${i % 2 === 0 ? '#faf8f5' : '#ffffff'}">
      <td style="padding:8px 12px;font-size:13px;color:#4a3929">${datumDE(m.datum)}</td>
      <td style="padding:8px 12px;font-size:13px;color:#321f13;font-weight:500">${m.beschreibung || '—'}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b5c4d">${m.kategorie || '—'}</td>
      <td style="padding:8px 12px;font-size:13px;color:#4a3929;text-align:right;font-weight:600">${m.betrag ? euro(m.betrag) : '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:#2e6b52">Anlage V, Zeile 40${m.dokument instanceof File || m.dokument?._fileName ? ` · Beleg: ${m.dokument instanceof File ? m.dokument.name : m.dokument._fileName}` : ''}</td>
    </tr>`).join('')

  const stZeilen = steuern.map((s, i) => `
    <tr style="background:${i % 2 === 0 ? '#faf8f5' : '#ffffff'}">
      <td style="padding:8px 12px;font-size:13px;color:#4a3929">${s.steuerjahr}</td>
      <td style="padding:8px 12px;font-size:13px;color:#321f13;font-weight:500">${s.beschreibung || 'Grundsteuer B'}</td>
      <td style="padding:8px 12px;font-size:13px;color:#6b5c4d">Grundsteuer</td>
      <td style="padding:8px 12px;font-size:13px;color:#4a3929;text-align:right;font-weight:600">${s.betrag ? euro(s.betrag) : '—'}</td>
      <td style="padding:8px 12px;font-size:11px;color:#2e6b52">Anlage V, Zeile 14${s.dokument instanceof File || s.dokument?._fileName ? ` · Bescheid: ${s.dokument instanceof File ? s.dokument.name : s.dokument._fileName}` : ''}</td>
    </tr>`).join('')

  return `<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<title>Steuerunterlagen ${zeitraumLabel} — ${immobilie.name || 'Immobilie'}</title>
<style>
  body { font-family: 'Georgia', serif; background: #f7f3ed; color: #321f13; margin: 0; padding: 40px; }
  .header { border-bottom: 2px solid #d8ccba; padding-bottom: 24px; margin-bottom: 32px; }
  .header h1 { font-size: 28px; margin: 0 0 4px 0; color: #321f13; }
  .header p { font-size: 13px; color: #6b5c4d; margin: 4px 0 0 0; }
  .meta { display: flex; gap: 32px; margin-top: 16px; }
  .meta-item { }
  .meta-item .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #8f7a69; font-family: 'Arial', sans-serif; }
  .meta-item .value { font-size: 15px; font-weight: 600; color: #321f13; margin-top: 2px; }
  .hinweis { background: #fff9ed; border: 1px solid #e8d5a0; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #7a5c1e; margin-bottom: 24px; font-family: 'Arial', sans-serif; }
  section { margin-bottom: 32px; }
  h2 { font-size: 16px; color: #321f13; border-left: 3px solid #2e6b52; padding-left: 12px; margin-bottom: 12px; }
  table { width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 4px rgba(50,31,19,0.08); }
  thead tr { background: #ede6d8; }
  thead th { padding: 10px 12px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; color: #6b5c4d; text-align: left; font-family: 'Arial', sans-serif; font-weight: 600; }
  .summe-row td { padding: 10px 12px; font-size: 13px; font-weight: 700; background: #ede6d8; border-top: 2px solid #d8ccba; }
  .gesamt { background: #2e6b52; color: white; border-radius: 8px; padding: 20px 24px; margin-top: 24px; display: flex; justify-content: space-between; align-items: center; }
  .gesamt .label { font-size: 12px; opacity: 0.8; font-family: 'Arial', sans-serif; }
  .gesamt .betrag { font-size: 24px; font-weight: 700; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #d8ccba; font-size: 11px; color: #8f7a69; font-family: 'Arial', sans-serif; }
  .tag { display: inline-block; font-size: 10px; background: #edf7f2; color: #2e6b52; border-radius: 4px; padding: 2px 7px; font-family: 'Arial', sans-serif; }
</style>
</head>
<body>
<div class="header">
  <h1>Steuerrelevante Unterlagen — Anlage V</h1>
  <p>${immobilie.name || 'Immobilie'}${immobilie.adresse ? ' · ' + immobilie.adresse : ''}</p>
  <div class="meta">
    <div class="meta-item"><div class="label">Zeitraum</div><div class="value">${zeitraumLabel}</div></div>
    <div class="meta-item"><div class="label">Erstellt am</div><div class="value">${new Date().toLocaleDateString('de-DE')}</div></div>
    <div class="meta-item"><div class="label">Gesamtkosten</div><div class="value">${euro(summeGesamt)}</div></div>
  </div>
</div>

<div class="hinweis">
  <strong>Hinweis:</strong> Dieses Dokument dient als Vorbereitung für die Steuererklärung. Alle Beträge sind in der <strong>Anlage V (Einkünfte aus Vermietung und Verpachtung)</strong> einzutragen. Bitte prüfe die aktuellen Zeilennummern im jeweiligen Steuerjahr, da sich diese ändern können.
</div>

${instandhaltung.length > 0 ? `
<section>
  <h2>Erhaltungsaufwendungen &nbsp;<span class="tag">Anlage V · Zeile 40</span></h2>
  <table>
    <thead><tr>
      <th>Datum</th><th>Beschreibung</th><th>Kategorie</th><th style="text-align:right">Betrag</th><th>Steuerposition</th>
    </tr></thead>
    <tbody>${ihZeilen}</tbody>
    <tr class="summe-row">
      <td colspan="3">Summe Erhaltungsaufwendungen</td>
      <td style="text-align:right">${euro(summeIH)}</td>
      <td></td>
    </tr>
  </table>
</section>` : ''}

${steuern.length > 0 ? `
<section>
  <h2>Grundsteuer &nbsp;<span class="tag">Anlage V · Zeile 14</span></h2>
  <table>
    <thead><tr>
      <th>Jahr</th><th>Bezeichnung</th><th>Art</th><th style="text-align:right">Betrag</th><th>Steuerposition</th>
    </tr></thead>
    <tbody>${stZeilen}</tbody>
    <tr class="summe-row">
      <td colspan="3">Summe Grundsteuer</td>
      <td style="text-align:right">${euro(summeSt)}</td>
      <td></td>
    </tr>
  </table>
</section>` : ''}

<div class="gesamt">
  <div>
    <div class="label">STEUERRELEVANTE GESAMTKOSTEN</div>
    <div style="font-size:12px;opacity:0.7;margin-top:2px;">${zeitraumLabel} · Anlage V</div>
  </div>
  <div class="betrag">${euro(summeGesamt)}</div>
</div>

<div class="footer">
  Generiert mit Kapitalwegweiser · ${new Date().toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} Uhr<br>
  Bitte alle Belege dem Steuerberater oder dem Finanzamt auf Anfrage vorlegen.
</div>
</body>
</html>`
}

function KiSteuercheckBox({ immobilie, filterJahr, setImmobilien }) {
  const gespeichert = immobilie?.steuercheck?.[filterJahr]
  const [analyse, setAnalyse] = useState(gespeichert || null)
  const [laeuft, setLaeuft] = useState(false)
  const [fehler, setFehler] = useState(null)
  const [aufgeklappt, setAufgeklappt] = useState(!!gespeichert)

  async function starten() {
    setLaeuft(true)
    setFehler(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(
        'https://ygcmfrwgailmjanoyozm.supabase.co/functions/v1/steuercheck-immobilie',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` },
          body: JSON.stringify({ immobilie, steuerjahr: Number(filterJahr) }),
        }
      )
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Analyse fehlgeschlagen')
      setAnalyse(json.analyse)
      setAufgeklappt(true)
      // Ergebnis im immobilie-Objekt persistieren
      setImmobilien(prev => prev.map(im =>
        im.id === immobilie.id
          ? { ...im, steuercheck: { ...(im.steuercheck || {}), [filterJahr]: json.analyse } }
          : im
      ))
    } catch (e) {
      setFehler(e.message)
    } finally {
      setLaeuft(false)
    }
  }

  const ergebnis = analyse?.ergebnis
  const istVerlust = ergebnis && ergebnis.ueberschuss_verlust < 0

  return (
    <div className="card space-y-4" style={{ borderColor: '#c4b5f4', borderWidth: '1.5px' }}>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#ede9fe' }}>
            <Sparkles size={15} style={{ color: '#5b4fa8' }} />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy-700">KI-Steuercheck {filterJahr}</p>
            <p className="text-[11px] text-navy-400">Automatische Analyse der steuerlichen Optimierungsmöglichkeiten</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {analyse && (
            <button onClick={() => setAufgeklappt(v => !v)} className="text-navy-400 hover:text-navy-600 p-1">
              {aufgeklappt ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          <button
            onClick={starten}
            disabled={laeuft}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-60 transition-all"
            style={{ background: laeuft ? '#8b7fc4' : '#5b4fa8' }}
          >
            {laeuft ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {laeuft ? 'Analysiert…' : analyse ? 'Neu analysieren' : 'Jetzt analysieren'}
          </button>
        </div>
      </div>

      {fehler && (
        <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-xs text-red-700">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" />
          {fehler}
        </div>
      )}

      {analyse && aufgeklappt && (
        <div className="space-y-4 pt-1">
          {/* Ergebnis-Banner */}
          {ergebnis && (
            <div className={`rounded-xl px-4 py-3 flex items-center justify-between ${istVerlust ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
              <div className="flex items-center gap-2">
                {istVerlust
                  ? <TrendingDown size={16} className="text-green-600" />
                  : <TrendingUp size={16} className="text-amber-600" />}
                <div>
                  <p className="text-xs font-semibold" style={{ color: istVerlust ? '#15803d' : '#92400e' }}>
                    {istVerlust ? 'Steuerlicher Verlust' : 'Steuerlicher Überschuss'}
                  </p>
                  <p className="text-[11px] mt-0.5" style={{ color: istVerlust ? '#166534' : '#78350f' }}>
                    {ergebnis.bewertung}
                  </p>
                </div>
              </div>
              <p className="text-lg font-bold font-serif" style={{ color: istVerlust ? '#15803d' : '#92400e' }}>
                {euro(Math.abs(ergebnis.ueberschuss_verlust))}
              </p>
            </div>
          )}

          {/* Einnahmen vs. Werbungskosten */}
          {ergebnis && (
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <p className="text-[10px] text-green-600 uppercase font-semibold tracking-wide mb-1">Einnahmen</p>
                <p className="text-base font-bold text-green-700 font-serif">{euro(ergebnis.einnahmen)}</p>
              </div>
              <div className="rounded-lg px-3 py-2.5 text-center" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
                <p className="text-[10px] text-amber-700 uppercase font-semibold tracking-wide mb-1">Werbungskosten</p>
                <p className="text-base font-bold text-amber-700 font-serif">{euro(ergebnis.werbungskosten_gesamt)}</p>
              </div>
            </div>
          )}

          {/* Werbungskosten-Aufschlüsselung */}
          {analyse.werbungskosten?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-navy-500 uppercase tracking-widest mb-2">Werbungskosten detail</p>
              <div className="space-y-1.5">
                {analyse.werbungskosten.map((w, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#f7f3ed' }}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-navy-700">{w.kategorie}</p>
                      <p className="text-[10px] text-navy-400 mt-0.5">{w.erklaerung}</p>
                    </div>
                    <p className="text-sm font-semibold text-navy-700 shrink-0">{euro(w.betrag)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sofort absetzbar */}
          {analyse.instandhaltung_sofort?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-green-700 uppercase tracking-widest mb-2">Sofort absetzbar (Erhaltungsaufwand)</p>
              <div className="space-y-1.5">
                {analyse.instandhaltung_sofort.map((m, i) => (
                  <div key={i} className="flex items-start justify-between gap-3 rounded-lg px-3 py-2" style={{ background: '#f0fdf4', border: '1px solid #dcfce7' }}>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-green-800">{m.beschreibung}</p>
                      <p className="text-[10px] text-green-600 mt-0.5">{m.begruendung}</p>
                    </div>
                    <p className="text-sm font-semibold text-green-700 shrink-0">{euro(m.betrag)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Über mehrere Jahre */}
          {analyse.instandhaltung_verteilt?.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-widest mb-2">Über mehrere Jahre zu verteilen</p>
              <div className="space-y-1.5">
                {analyse.instandhaltung_verteilt.map((m, i) => (
                  <div key={i} className="rounded-lg px-3 py-2" style={{ background: '#fffbeb', border: '1px solid #fde68a' }}>
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-medium text-amber-800">{m.beschreibung}</p>
                      <p className="text-sm font-semibold text-amber-700 shrink-0">{euro(m.betrag)}</p>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1">{m.begruendung}</p>
                    {m.nutzungsdauer_jahre > 0 && (
                      <p className="text-[10px] text-amber-700 mt-1 font-medium">
                        → {euro(m.absetzbar_pro_jahr)}/Jahr über {m.nutzungsdauer_jahre} Jahre
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empfehlungen */}
          {analyse.empfehlungen?.length > 0 && (
            <div className="rounded-xl px-4 py-3 space-y-1.5" style={{ background: '#ede9fe' }}>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: '#5b4fa8' }}>Empfehlungen</p>
              {analyse.empfehlungen.map((e, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-[10px] font-bold mt-0.5" style={{ color: '#7c3aed' }}>{i + 1}.</span>
                  <p className="text-xs text-purple-800">{e}</p>
                </div>
              ))}
            </div>
          )}

          {/* Disclaimer */}
          {analyse.disclaimer && (
            <p className="text-[10px] text-navy-400 italic text-center">{analyse.disclaimer}</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function SteuerUebersichtSeite({ immobilien = [], setImmobilien }) {
  const aktuellesJahr = new Date().getFullYear()
  const [ausgewaehlteId, setAusgewaehlteId] = useState(immobilien[0]?.id ?? '')
  const [filterModus, setFilterModus] = useState('jahr')
  const [filterJahr, setFilterJahr] = useState(String(aktuellesJahr))
  const [vonDatum, setVonDatum] = useState(`${aktuellesJahr}-01-01`)
  const [bisDatum, setBisDatum] = useState(`${aktuellesJahr}-12-31`)
  const [ladtZip, setLadtZip] = useState(false)

  const immobilie = immobilien.find(i => i.id === ausgewaehlteId)

  const alleJahre = useMemo(() => {
    const jahre = new Set()
    // Immer die letzten 5 Jahre anbieten
    for (let j = aktuellesJahr; j >= aktuellesJahr - 4; j--) jahre.add(String(j))
    if (immobilie) {
      ;(immobilie.instandhaltung || []).forEach(m => { if (m.datum) jahre.add(m.datum.slice(0, 4)) })
      ;(immobilie.steuern || []).forEach(s => { if (s.steuerjahr) jahre.add(String(s.steuerjahr)) })
    }
    return [...jahre].sort((a, b) => b - a)
  }, [immobilie, aktuellesJahr])

  const zeitraumLabel = filterModus === 'jahr'
    ? `Steuerjahr ${filterJahr}`
    : `${datumDE(vonDatum)} – ${datumDE(bisDatum)}`

  function imZeitraum(datum) {
    if (!datum) return false
    if (filterModus === 'jahr') return String(datum).startsWith(filterJahr)
    return datum >= vonDatum && datum <= bisDatum
  }

  const gefilterteInstandhaltung = useMemo(() => {
    if (!immobilie) return []
    return (immobilie.instandhaltung || [])
      .filter(m => imZeitraum(m.datum))
      .sort((a, b) => a.datum.localeCompare(b.datum))
  }, [immobilie, filterModus, filterJahr, vonDatum, bisDatum])

  const gefilterteSteuern = useMemo(() => {
    if (!immobilie) return []
    return (immobilie.steuern || [])
      .filter(s => {
        const j = String(s.steuerjahr)
        if (filterModus === 'jahr') return j === filterJahr
        return j >= vonDatum.slice(0, 4) && j <= bisDatum.slice(0, 4)
      })
      .sort((a, b) => b.steuerjahr - a.steuerjahr)
  }, [immobilie, filterModus, filterJahr, vonDatum, bisDatum])

  const summeInstandhaltung = gefilterteInstandhaltung.reduce((s, m) => s + (Number(m.betrag) || 0), 0)
  const summeSteuern = gefilterteSteuern.reduce((s, e) => s + (Number(e.betrag) || 0), 0)
  const summeGesamt = summeInstandhaltung + summeSteuern

  const ihMitBeleg = gefilterteInstandhaltung.filter(m => m.dokument instanceof File)
  const stMitBeleg = gefilterteSteuern.filter(s => s.dokument instanceof File)
  const gesamtBelege = ihMitBeleg.length + stMitBeleg.length

  async function downloadSteuerZip() {
    setLadtZip(true)
    try {
      const zip = new JSZip()
      const safe = (s) => (s || '').replace(/[^a-zA-Z0-9äöüÄÖÜß\-_]/g, '_')
      const ordnerName = `Anlage_V_${safe(immobilie.name)}_${filterModus === 'jahr' ? filterJahr : safe(zeitraumLabel)}`
      const root = zip.folder(ordnerName)

      // 1. HTML-Zusammenfassung
      const html = erstelleHtmlZusammenfassung({
        immobilie,
        zeitraumLabel,
        instandhaltung: gefilterteInstandhaltung,
        steuern: gefilterteSteuern,
        summeGesamt,
      })
      root.file('_Steuerzusammenfassung_Anlage_V.html', html)

      // 2. Erhaltungsaufwendungen (Zeile 40)
      if (ihMitBeleg.length > 0) {
        const ihOrdner = root.folder('Anlage_V_Zeile_40_Erhaltungsaufwendungen')
        for (const m of ihMitBeleg) {
          const buf = await m.dokument.arrayBuffer()
          const dateiname = `${m.datum}_${safe(m.kategorie)}_${safe(m.beschreibung)}_${m.dokument.name}`
          ihOrdner.file(dateiname, buf)
        }
      }

      // 3. Grundsteuer (Zeile 14)
      if (stMitBeleg.length > 0) {
        const stOrdner = root.folder('Anlage_V_Zeile_14_Grundsteuer')
        for (const s of stMitBeleg) {
          const buf = await s.dokument.arrayBuffer()
          const dateiname = `${s.steuerjahr}_${safe(s.beschreibung)}_${s.dokument.name}`
          stOrdner.file(dateiname, buf)
        }
      }

      const blob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${ordnerName}.zip`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setLadtZip(false)
    }
  }

  const hatErgebnisse = gefilterteInstandhaltung.length > 0 || gefilterteSteuern.length > 0

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title mb-0">Steuerübersicht</h2>
        <p className="text-sm text-navy-400 mt-1">Anlage V — Einkünfte aus Vermietung und Verpachtung</p>
      </div>

      {immobilien.length === 0 ? (
        <div className="card text-center py-12 border-dashed">
          <Building2 size={40} className="mx-auto mb-3 text-navy-200" />
          <p className="font-serif text-lg text-navy-600 mb-1">Noch keine Immobilien angelegt</p>
          <p className="text-sm text-navy-400">Lege zuerst unter „Meine Immobilien" ein Objekt an.</p>
        </div>
      ) : (
        <>
          {/* Filter-Card */}
          <div className="card space-y-5">
            <div>
              <label className="label">Immobilie</label>
              <select className="input" value={ausgewaehlteId} onChange={e => setAusgewaehlteId(e.target.value)}>
                {immobilien.map(i => (
                  <option key={i.id} value={i.id}>{i.name || 'Unbenannte Immobilie'}{i.adresse ? ` – ${i.adresse}` : ''}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Zeitraum</label>
              <div className="flex gap-1 p-1 rounded-lg w-fit mb-3" style={{ background: '#ede6d8' }}>
                <button
                  onClick={() => setFilterModus('jahr')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterModus === 'jahr' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}
                >Nach Steuerjahr</button>
                <button
                  onClick={() => setFilterModus('zeitraum')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${filterModus === 'zeitraum' ? 'bg-white text-navy-700 shadow-sm' : 'text-navy-500 hover:text-navy-700'}`}
                >Eigener Zeitraum</button>
              </div>

              {filterModus === 'jahr' ? (
                <select className="input max-w-xs" value={filterJahr} onChange={e => setFilterJahr(e.target.value)}>
                  {alleJahre.length > 0
                    ? alleJahre.map(j => <option key={j} value={j}>{j}</option>)
                    : <option value={String(aktuellesJahr)}>{aktuellesJahr}</option>
                  }
                </select>
              ) : (
                <div className="grid grid-cols-2 gap-4 max-w-sm">
                  <div><label className="label">Von</label><input className="input" type="date" value={vonDatum} onChange={e => setVonDatum(e.target.value)} /></div>
                  <div><label className="label">Bis</label><input className="input" type="date" value={bisDatum} onChange={e => setBisDatum(e.target.value)} /></div>
                </div>
              )}
            </div>
          </div>

          {/* KI-Steuercheck — immer sichtbar wenn Immobilie + Steuerjahr gewählt */}
          {immobilie && filterModus === 'jahr' && (
            <KiSteuercheckBox
              immobilie={immobilie}
              filterJahr={filterJahr}
              setImmobilien={setImmobilien || (() => {})}
            />
          )}

          {/* Kein Ergebnis */}
          {!hatErgebnisse ? (
            <div className="card text-center py-8 border-dashed">
              <Filter size={28} className="mx-auto mb-2 text-navy-200" />
              <p className="text-sm text-navy-400">Keine Einträge für den gewählten Zeitraum.</p>
            </div>
          ) : (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-3 gap-3">
                <div className="card text-center">
                  <p className="label mb-2">Erhaltungsaufwend.</p>
                  <p className="text-base font-serif font-semibold text-navy-700">{euro(summeInstandhaltung)}</p>
                  <p className="text-[10px] text-brand-500 mt-1 font-medium">Anlage V · Zeile 40</p>
                </div>
                <div className="card text-center">
                  <p className="label mb-2">Grundsteuer</p>
                  <p className="text-base font-serif font-semibold text-navy-700">{euro(summeSteuern)}</p>
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">Anlage V · Zeile 14</p>
                </div>
                <div className="card text-center" style={{ borderLeftWidth: '4px', borderLeftColor: '#6b5c4d' }}>
                  <p className="label mb-2">Werbungskosten</p>
                  <p className="text-base font-serif font-semibold text-navy-700">{euro(summeGesamt)}</p>
                  <p className="text-[10px] text-navy-400 mt-1">Anlage V gesamt</p>
                </div>
              </div>

              {/* Info-Hinweis */}
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <Info size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700 leading-relaxed">
                  Die Positionen beziehen sich auf die <strong>Anlage V</strong> der deutschen Einkommensteuererklärung. Zeilennummern können je nach Steuerjahr leicht abweichen — bitte mit aktuellem Formular abgleichen.
                </p>
              </div>

              {/* Erhaltungsaufwendungen */}
              {gefilterteInstandhaltung.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-brand-500 inline-block" />
                      <p className="text-xs font-semibold text-navy-600 uppercase tracking-widest">Erhaltungsaufwendungen</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-brand-500/10 text-brand-600">Anlage V · Zeile 40</span>
                  </div>
                  <div className="card p-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
                      <div className="grid grid-cols-[90px_1fr_auto] gap-3 text-[10px] text-navy-400 uppercase tracking-widest font-semibold">
                        <span>Datum</span><span>Maßnahme</span><span className="text-right">Betrag</span>
                      </div>
                    </div>
                    {gefilterteInstandhaltung.map((m, i) => (
                      <div key={m.id}
                        className={`px-4 py-3 grid grid-cols-[90px_1fr_auto] gap-3 items-start ${i < gefilterteInstandhaltung.length - 1 ? 'border-b' : ''}`}
                        style={{ borderColor: '#f0e8dc' }}>
                        <span className="text-xs text-navy-400 pt-0.5">{datumDE(m.datum)}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-navy-700">{m.beschreibung}</p>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-navy-400">{m.kategorie}</span>
                            <span className="text-[10px] text-brand-500 font-medium">· Zeile 40</span>
                            {m.dokument instanceof File && (
                              <button onClick={() => { const url = URL.createObjectURL(m.dokument); window.open(url) }}
                                className="flex items-center gap-1 text-[10px] text-brand-500 hover:text-brand-600">
                                <FileText size={10} /> {m.dokument.name}
                              </button>
                            )}
                            {m.dokument && !(m.dokument instanceof File) && m.dokument._fileName && (
                              <span className="flex items-center gap-1 text-[10px] text-navy-400"><FileText size={10} /> {m.dokument._fileName}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-navy-700 text-right pt-0.5">{m.betrag ? euro(m.betrag) : '—'}</span>
                      </div>
                    ))}
                    <div className="px-4 py-3 grid grid-cols-[90px_1fr_auto] gap-3 border-t" style={{ background: '#f7f3ed', borderColor: '#d8ccba' }}>
                      <span />
                      <span className="text-sm font-semibold text-navy-600">Summe Zeile 40</span>
                      <span className="text-sm font-bold text-navy-700 text-right">{euro(summeInstandhaltung)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Grundsteuer */}
              {gefilterteSteuern.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                      <p className="text-xs font-semibold text-navy-600 uppercase tracking-widest">Grundsteuer</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Anlage V · Zeile 14</span>
                  </div>
                  <div className="card p-0 overflow-hidden">
                    <div className="px-4 py-2.5 border-b" style={{ background: '#f7f3ed', borderColor: '#e8dece' }}>
                      <div className="grid grid-cols-[80px_1fr_auto] gap-3 text-[10px] text-navy-400 uppercase tracking-widest font-semibold">
                        <span>Jahr</span><span>Bezeichnung</span><span className="text-right">Betrag</span>
                      </div>
                    </div>
                    {gefilterteSteuern.map((s, i) => (
                      <div key={s.id}
                        className={`px-4 py-3 grid grid-cols-[80px_1fr_auto] gap-3 items-center ${i < gefilterteSteuern.length - 1 ? 'border-b' : ''}`}
                        style={{ borderColor: '#f0e8dc' }}>
                        <span className="text-sm font-semibold text-navy-600">{s.steuerjahr}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-navy-700">{s.beschreibung || 'Grundsteuer B'}</p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            <span className="text-[10px] text-amber-600 font-medium">Zeile 14</span>
                            {s.dokument instanceof File && (
                              <button onClick={() => { const url = URL.createObjectURL(s.dokument); window.open(url) }}
                                className="flex items-center gap-1 text-[10px] text-brand-500 hover:text-brand-600">
                                <Receipt size={10} /> {s.dokument.name}
                              </button>
                            )}
                            {s.dokument && !(s.dokument instanceof File) && s.dokument._fileName && (
                              <span className="flex items-center gap-1 text-[10px] text-navy-400"><FileText size={10} /> {s.dokument._fileName}</span>
                            )}
                          </div>
                        </div>
                        <span className="text-sm font-semibold text-navy-700 text-right">{euro(s.betrag)}</span>
                      </div>
                    ))}
                    <div className="px-4 py-3 grid grid-cols-[80px_1fr_auto] gap-3 border-t" style={{ background: '#f7f3ed', borderColor: '#d8ccba' }}>
                      <span />
                      <span className="text-sm font-semibold text-navy-600">Summe Zeile 14</span>
                      <span className="text-sm font-bold text-navy-700 text-right">{euro(summeSteuern)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Download-Box */}
              <div className="card space-y-4" style={{ borderColor: '#d8ccba' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-serif text-base font-semibold text-navy-700 mb-1">Steuerunterlagen herunterladen</h3>
                    <p className="text-xs text-navy-400 leading-relaxed">
                      ZIP-Archiv mit HTML-Zusammenfassung für das Finanzamt, inkl. Anlage-V-Positionen — und allen Belegen in separaten Unterordnern nach Steuerkategorie.
                    </p>
                  </div>
                  <span className="text-xl font-serif font-bold text-navy-700 shrink-0">{euro(summeGesamt)}</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-navy-500">
                    <FileText size={12} className="text-brand-500" />
                    <span>Steuerzusammenfassung (.html)</span>
                  </div>
                  {ihMitBeleg.length > 0 && (
                    <div className="flex items-center gap-1.5 text-navy-500">
                      <FileText size={12} className="text-brand-500" />
                      <span>{ihMitBeleg.length} Beleg{ihMitBeleg.length !== 1 ? 'e' : ''} Zeile 40</span>
                    </div>
                  )}
                  {stMitBeleg.length > 0 && (
                    <div className="flex items-center gap-1.5 text-navy-500">
                      <FileText size={12} className="text-amber-500" />
                      <span>{stMitBeleg.length} Bescheid{stMitBeleg.length !== 1 ? 'e' : ''} Zeile 14</span>
                    </div>
                  )}
                </div>

                <button
                  onClick={downloadSteuerZip}
                  disabled={ladtZip}
                  className="btn-primary w-full justify-center py-3 disabled:opacity-60"
                >
                  <Download size={16} />
                  {ladtZip
                    ? 'ZIP wird erstellt…'
                    : `${zeitraumLabel} als Steuer-ZIP herunterladen`
                  }
                </button>

                {gesamtBelege === 0 && (
                  <p className="text-[11px] text-navy-400 text-center">
                    Keine Belege hochgeladen — die Zusammenfassung wird trotzdem erstellt.
                  </p>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
