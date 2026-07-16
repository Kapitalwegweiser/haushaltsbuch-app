import { useState, useRef } from 'react'
import { Plus, X, Edit2, Shield, Heart, Car, Home, Umbrella, FileText,
         ChevronDown, ChevronUp, Trash2, Upload, ExternalLink,
         AlertTriangle, Info, Sparkles, Loader2 } from 'lucide-react'
import { hochladenDatei, oeffneDatei, loescheDatei } from '../lib/storage'
import { supabase } from '../lib/supabase'

async function analysierePolice(pfad) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(
    `https://ygcmfrwgailmjanoyozm.supabase.co/functions/v1/analysiere-police`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ pfad }),
    }
  )
  const json = await res.json()
  if (!res.ok) throw new Error(json.error || 'Analyse fehlgeschlagen')
  return json.zusammenfassung
}

const KATEGORIEN = [
  { id: 'kranken',      label: 'Krankenversicherung',    gruppe: 'Personenversicherungen', icon: Heart,    farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'bu',           label: 'Berufsunfähigkeit',       gruppe: 'Personenversicherungen', icon: Shield,   farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'leben',        label: 'Lebensversicherung',      gruppe: 'Personenversicherungen', icon: Heart,    farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'unfall',       label: 'Unfallversicherung',      gruppe: 'Personenversicherungen', icon: Shield,   farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'haftpflicht',  label: 'Haftpflichtversicherung', gruppe: 'Sachversicherungen',     icon: Umbrella, farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'hausrat',      label: 'Hausratversicherung',     gruppe: 'Sachversicherungen',     icon: Home,     farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'kfz',          label: 'Kfz-Versicherung',        gruppe: 'Sachversicherungen',     icon: Car,      farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'gebaude',      label: 'Gebäudeversicherung',     gruppe: 'Sachversicherungen',     icon: Home,     farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'rechtsschutz', label: 'Rechtsschutzversicherung',gruppe: 'Sachversicherungen',     icon: FileText, farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'sonstiges',    label: 'Sonstiges',               gruppe: 'Sonstige',              icon: Shield,   farbe: '#888',    bg: '#f0ece6' },
]

const GRUPPEN = ['Personenversicherungen', 'Sachversicherungen', 'Sonstige']

function kategorieInfo(id) {
  return KATEGORIEN.find(k => k.id === id) || KATEGORIEN[KATEGORIEN.length - 1]
}

function jahresbeitrag(v) {
  const b = parseFloat(v.beitrag) || 0
  if (v.intervall === 'monatlich')        return b * 12
  if (v.intervall === 'halbjaehrlich')    return b * 2
  if (v.intervall === 'vierteljaehrlich') return b * 4
  return b
}

function monatsbeitrag(v) { return jahresbeitrag(v) / 12 }

// ── Optimierungshinweise ──────────────────────────────────────────────────────
const KFZ_LIMITS = { haftpflicht: 400, teilkasko: 600, vollkasko: 1200 }
const KRANKEN_LIMITS = { gkv: 900, pkv: 6000 }
const HAUSRAT_LIMIT = 250
const HAFTPFLICHT_LIMIT = 150

function ermittleHinweise(versicherungen, monatlichesEinkommen) {
  const hinweise = []
  const gesamtMonat = versicherungen.reduce((s, v) => s + monatsbeitrag(v), 0)
  const kategorien  = versicherungen.map(v => v.kategorie)

  // 1. Fehlende Haftpflicht
  if (!kategorien.includes('haftpflicht')) {
    hinweise.push({
      typ: 'rot',
      titel: 'Privathaftpflicht fehlt',
      text: 'Die Privathaftpflicht ist eine der wichtigsten Versicherungen — sie schützt dich vor existenzbedrohenden Schadensforderungen und kostet oft unter 60 € / Jahr.',
    })
  }

  // 2. Fehlende BU
  if (!kategorien.includes('bu')) {
    hinweise.push({
      typ: 'gelb',
      titel: 'Keine Berufsunfähigkeitsversicherung',
      text: 'Die BU gilt als wichtigste Absicherung für Berufstätige. Ohne sie droht im Ernstfall der finanzielle Absturz — prüfe ob du abgesichert bist.',
    })
  }

  // 3. Gesamtbelastung vs. Einkommen
  if (monatlichesEinkommen > 0) {
    const anteil = gesamtMonat / monatlichesEinkommen
    if (anteil > 0.15) {
      hinweise.push({
        typ: 'rot',
        titel: 'Versicherungskosten sehr hoch',
        text: `Deine Versicherungen kosten ${(anteil * 100).toFixed(0)} % deines monatlichen Einkommens. Empfohlen sind max. 10–12 %. Prüfe ob alle Policen wirklich notwendig sind.`,
      })
    } else if (anteil > 0.10) {
      hinweise.push({
        typ: 'gelb',
        titel: 'Versicherungskosten leicht erhöht',
        text: `Deine Versicherungen kosten ${(anteil * 100).toFixed(0)} % deines Einkommens. Der empfohlene Richtwert liegt bei max. 10–12 %.`,
      })
    }
  }

  // 4. Kfz zu teuer (nach Deckungsart)
  versicherungen.filter(v => v.kategorie === 'kfz').forEach(v => {
    const limit = KFZ_LIMITS[v.deckungsart] || KFZ_LIMITS.vollkasko
    const deckLabel = v.deckungsart === 'haftpflicht' ? 'Haftpflicht'
      : v.deckungsart === 'teilkasko' ? 'Teilkasko' : 'Vollkasko'
    if (jahresbeitrag(v) > limit) {
      hinweise.push({
        typ: 'gelb',
        titel: `Kfz (${deckLabel}) möglicherweise zu teuer`,
        text: `Dein Kfz-Beitrag liegt über dem Richtwert von ${limit.toLocaleString('de-DE')} € / Jahr für ${deckLabel}. Ein Vergleich könnte sich lohnen — Wechsler sparen oft 200–400 € im Jahr.`,
      })
    }
  })

  // 5. Krankenversicherung zu teuer
  versicherungen.filter(v => v.kategorie === 'kranken').forEach(v => {
    const limit = KRANKEN_LIMITS[v.krankenArt] || KRANKEN_LIMITS.pkv
    const artLabel = v.krankenArt === 'gkv' ? 'GKV' : 'PKV'
    if (jahresbeitrag(v) > limit) {
      hinweise.push({
        typ: 'gelb',
        titel: `Krankenversicherung (${artLabel}) überdurchschnittlich`,
        text: `Dein KV-Beitrag liegt über dem Richtwert von ${limit.toLocaleString('de-DE')} € / Jahr für ${artLabel}. Bei der PKV lohnt sich ein Tarifwechsel innerhalb des Anbieters zu prüfen.`,
      })
    }
  })

  // 6. Hausrat zu teuer
  versicherungen.filter(v => v.kategorie === 'hausrat').forEach(v => {
    if (jahresbeitrag(v) > HAUSRAT_LIMIT) {
      hinweise.push({
        typ: 'gelb',
        titel: 'Hausratversicherung möglicherweise zu teuer',
        text: `Dein Hausrat-Beitrag liegt über ${HAUSRAT_LIMIT} € / Jahr. Viele Anbieter bieten gleichwertige Leistungen günstiger an — ein Vergleich lohnt sich.`,
      })
    }
  })

  // 7. Haftpflicht zu teuer
  versicherungen.filter(v => v.kategorie === 'haftpflicht').forEach(v => {
    if (jahresbeitrag(v) > HAFTPFLICHT_LIMIT) {
      hinweise.push({
        typ: 'gelb',
        titel: 'Haftpflichtversicherung möglicherweise zu teuer',
        text: `Dein Haftpflicht-Beitrag liegt über ${HAFTPFLICHT_LIMIT} € / Jahr. Gute Tarife sind oft für unter 80 € / Jahr erhältlich.`,
      })
    }
  })

  // 8. Doppelte Kategorien
  const gezaehlt = {}
  kategorien.forEach(k => { gezaehlt[k] = (gezaehlt[k] || 0) + 1 })
  Object.entries(gezaehlt).forEach(([k, n]) => {
    if (n > 1) {
      const name = kategorieInfo(k).label
      hinweise.push({
        typ: 'gelb',
        titel: `Doppelte ${name}`,
        text: `Du hast ${n} Einträge unter "${name}". Prüfe ob beide wirklich notwendig sind oder ob eine davon gekündigt werden kann.`,
      })
    }
  })

  // 9. Fehlende Police
  const ohneDokument = versicherungen.filter(v => !v.police).length
  if (ohneDokument > 0 && versicherungen.length > 0) {
    hinweise.push({
      typ: 'info',
      titel: `${ohneDokument} Versicherung${ohneDokument > 1 ? 'en' : ''} ohne Police`,
      text: 'Lade deine Policen hoch, damit du sie im Schadensfall sofort zur Hand hast.',
    })
  }

  return hinweise
}

const HINWEIS_STYLE = {
  rot:  { bg: '#fdecea', border: '#f5b8b8', icon: AlertTriangle, farbe: '#7a1e1e', label: 'Handeln' },
  gelb: { bg: '#fff8e6', border: '#f5dfa0', icon: AlertTriangle, farbe: '#7a5000', label: 'Prüfen'  },
  info: { bg: '#edf7f2', border: '#c5e0d4', icon: Info,          farbe: '#2e6b52', label: 'Hinweis' },
}

const LEER = {
  name: '', anbieter: '', kategorie: 'haftpflicht', beitrag: '', intervall: 'jaehrlich',
  notizen: '', police: null, deckungsart: 'vollkasko', krankenArt: 'pkv',
}

export default function VersicherungenSeite({ versicherungen, setVersicherungen, einnahmen = [] }) {
  const [formOffen, setFormOffen]     = useState(false)
  const [editId, setEditId]           = useState(null)
  const [form, setForm]               = useState(LEER)
  const [aufgeklappt, setAufgeklappt] = useState(null)
  const [dragOver, setDragOver]       = useState(false)
  const [hochladen, setHochladen]       = useState(false)
  const [uploadFehler, setUploadFehler] = useState('')
  const [analyseLaeuft, setAnalyseLaeuft] = useState(false)
  const [analyseFehler, setAnalyseFehler] = useState({})
  const fileRef = useRef()

  const gesamtJahr  = versicherungen.reduce((s, v) => s + jahresbeitrag(v), 0)
  const gesamtMonat = gesamtJahr / 12

  const monatlichesEinkommen = einnahmen.reduce((s, e) => {
    const b = parseFloat(e.betrag) || 0
    if (e.intervall === 'jaehrlich') return s + b / 12
    if (e.intervall === 'einmalig')  return s
    return s + b
  }, 0)

  const hinweise = ermittleHinweise(versicherungen, monatlichesEinkommen)
  const [hinweiseOffen, setHinweiseOffen] = useState(true)

  function oeffneNeu() { setForm(LEER); setEditId(null); setFormOffen(true) }
  function oeffneEdit(v) { setForm({ ...LEER, ...v }); setEditId(v.id); setFormOffen(true) }

  async function handleDatei(file) {
    if (!file) return
    setUploadFehler(''); setHochladen(true)
    try {
      const meta = await hochladenDatei(file)
      setForm(f => ({ ...f, police: meta, zusammenfassung: null }))
    } catch (err) {
      setUploadFehler('Hochladen fehlgeschlagen: ' + (err.message || err))
    } finally {
      setHochladen(false)
    }
  }

  async function analyseStarten(pfad) {
    setAnalyseLaeuft(true)
    try {
      const zusammenfassung = await analysierePolice(pfad)
      setForm(f => ({ ...f, zusammenfassung }))
    } catch {
      // Fehler still ignorieren
    } finally {
      setAnalyseLaeuft(false)
    }
  }

  async function analyseStartenKarte(v) {
    setAnalyseLaeuft(v.id)
    setAnalyseFehler(f => ({ ...f, [v.id]: null }))
    try {
      const zusammenfassung = await analysierePolice(v.police.pfad)
      setVersicherungen(vs => vs.map(x => x.id === v.id ? { ...x, zusammenfassung } : x))
    } catch (err) {
      setAnalyseFehler(f => ({ ...f, [v.id]: err.message || 'Analyse fehlgeschlagen' }))
    } finally {
      setAnalyseLaeuft(null)
    }
  }

  async function policeEntfernen() {
    if (form.police?.pfad) await loescheDatei(form.police.pfad)
    setForm(f => ({ ...f, police: null }))
  }

  function speichern() {
    if (!form.name.trim()) return
    if (editId) {
      setVersicherungen(vs => vs.map(v => v.id === editId ? { ...form, id: editId } : v))
    } else {
      setVersicherungen(vs => [...vs, { ...form, id: Date.now().toString() }])
    }
    setFormOffen(false)
  }

  function loeschen(id) { setVersicherungen(vs => vs.filter(v => v.id !== id)); setAufgeklappt(null) }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Übersicht</p>
          <h2 className="section-title mb-0">Meine Versicherungen</h2>
        </div>
        <button onClick={oeffneNeu} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Versicherungen</p>
          <p className="text-2xl font-semibold text-navy-800">{versicherungen.length}</p>
        </div>
        <div className="card text-center" style={{ background: '#edf7f2', borderLeft: '4px solid #2e6b52', borderRadius: '12px' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Monatlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtMonat.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="card text-center" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Jährlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtJahr.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</p>
        </div>
      </div>

      {/* Optimierungshinweise */}
      {hinweise.length > 0 && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <button
            className="w-full flex items-center justify-between px-5 py-4"
            onClick={() => setHinweiseOffen(o => !o)}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} style={{ color: '#c9a227' }} />
              <span className="font-semibold text-navy-700 text-sm">
                Optimierungshinweise
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fff8e6', color: '#7a5000' }}>
                {hinweise.length}
              </span>
            </div>
            {hinweiseOffen ? <ChevronUp size={15} className="text-navy-400" /> : <ChevronDown size={15} className="text-navy-400" />}
          </button>

          {hinweiseOffen && (
            <div className="border-t divide-y" style={{ borderColor: '#e8dece' }}>
              {hinweise.map((h, i) => {
                const s = HINWEIS_STYLE[h.typ]
                const HIcon = s.icon
                return (
                  <div key={i} className="px-5 py-3.5 flex gap-3" style={{ background: s.bg }}>
                    <HIcon size={16} style={{ color: s.farbe, marginTop: 2, flexShrink: 0 }} />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="text-sm font-semibold" style={{ color: s.farbe }}>{h.titel}</p>
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                          style={{ background: 'rgba(255,255,255,0.6)', color: s.farbe }}>
                          {s.label}
                        </span>
                      </div>
                      <p className="text-xs leading-relaxed" style={{ color: s.farbe, opacity: 0.85 }}>{h.text}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Liste gruppiert */}
      {versicherungen.length === 0 ? (
        <div className="card text-center py-12">
          <Shield size={32} className="text-navy-200 mx-auto mb-3" />
          <p className="text-navy-500 font-medium mb-1">Noch keine Versicherungen</p>
          <p className="text-navy-400 text-sm">Füge deine erste Versicherung hinzu.</p>
        </div>
      ) : (
        GRUPPEN.map(gruppe => {
          const items = versicherungen.filter(v => kategorieInfo(v.kategorie).gruppe === gruppe)
          if (items.length === 0) return null
          return (
            <div key={gruppe} className="space-y-2">
              <p className="text-xs font-semibold text-navy-400 uppercase tracking-widest">{gruppe}</p>
              {items.map(v => {
                const kat    = kategorieInfo(v.kategorie)
                const Icon   = kat.icon
                const offen  = aufgeklappt === v.id
                const jahrB  = jahresbeitrag(v)
                const monatB = monatsbeitrag(v)
                return (
                  <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <button className="w-full text-left px-5 py-4" onClick={() => setAufgeklappt(offen ? null : v.id)}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: kat.bg }}>
                            <Icon size={17} style={{ color: kat.farbe }} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-navy-800 truncate">{v.name}</p>
                            <p className="text-xs text-navy-400 truncate">
                              {v.anbieter || kat.label}
                              {v.kategorie === 'kfz' && v.deckungsart && ` · ${v.deckungsart === 'haftpflicht' ? 'Haftpflicht' : v.deckungsart === 'teilkasko' ? 'Teilkasko' : 'Vollkasko'}`}
                              {v.kategorie === 'kranken' && v.krankenArt && ` · ${v.krankenArt === 'gkv' ? 'GKV' : 'PKV'}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className="text-sm font-semibold text-navy-800">{monatB.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € <span className="text-xs font-normal text-navy-400">/ Mon.</span></p>
                            <p className="text-xs text-navy-400">{jahrB.toLocaleString('de-DE', { maximumFractionDigits: 0 })} € / Jahr</p>
                          </div>
                          {offen ? <ChevronUp size={15} className="text-navy-400" /> : <ChevronDown size={15} className="text-navy-400" />}
                        </div>
                      </div>
                    </button>

                    {offen && (
                      <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#e8dece', background: '#faf8f4' }}>
                        <div className="text-sm">
                          <p className="text-xs text-navy-400 uppercase tracking-wide mb-0.5">Beitrag</p>
                          <p className="text-navy-700 font-medium">{parseFloat(v.beitrag || 0).toLocaleString('de-DE')} € / {v.intervall}</p>
                        </div>

                        {/* Police */}
                        <div>
                          <p className="text-xs text-navy-400 uppercase tracking-wide mb-1.5">Police / Dokument</p>
                          {v.police ? (
                            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#edf7f2', border: '1px solid #c5e0d4' }}>
                              <FileText size={14} style={{ color: '#2e6b52' }} />
                              <span className="text-sm text-navy-700 flex-1 truncate">{v.police.name}</span>
                              <button onClick={() => oeffneDatei(v.police.pfad)}
                                className="flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: '#2e6b52' }}>
                                <ExternalLink size={12} /> Öffnen
                              </button>
                              <button onClick={async () => { if (v.police?.pfad) await loescheDatei(v.police.pfad); setVersicherungen(vs => vs.map(x => x.id === v.id ? { ...x, police: null } : x)) }}
                                className="text-navy-400 hover:text-red-500 ml-1"><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm text-navy-400 italic">Kein Dokument hinterlegt</p>
                          )}
                        </div>

                        {/* KI-Zusammenfassung */}
                        {v.police?.pfad && (
                          <div className="space-y-2">
                            {/* Analyse-Button — immer sichtbar wenn Police vorhanden */}
                            <button
                              onClick={() => analyseStartenKarte(v)}
                              disabled={analyseLaeuft === v.id}
                              className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-60"
                              style={{ background: '#f0eeff', color: '#5b4fa8', border: '1px solid #c8c0f0' }}
                            >
                              {analyseLaeuft === v.id
                                ? <><Loader2 size={12} className="animate-spin" /> KI liest Police…</>
                                : <><Sparkles size={12} /> {v.zusammenfassung ? 'Erneut analysieren' : 'Police von KI analysieren lassen'}</>}
                            </button>

                            {/* Fehler */}
                            {analyseFehler[v.id] && (
                              <p className="text-xs text-red-500 flex items-center gap-1">
                                <AlertTriangle size={11} /> {analyseFehler[v.id]}
                              </p>
                            )}

                            {/* Ergebnis */}
                            {v.zusammenfassung && (
                              <div className="rounded-xl px-3 py-3 space-y-2" style={{ background: '#f0eeff', border: '1px solid #c8c0f0' }}>
                                <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#5b4fa8' }}>
                                  <Sparkles size={11} /> KI-Zusammenfassung
                                </p>

                                {/* Was ist versichert */}
                                {v.zusammenfassung.deckung && (
                                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                    <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">Was ist versichert</p>
                                    <p className="text-xs text-navy-800">{v.zusammenfassung.deckung}</p>
                                  </div>
                                )}

                                {/* Versicherungssummen */}
                                {(v.zusammenfassung.summen?.length > 0 || v.zusammenfassung.summe) && (
                                  <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                    <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-1">Versicherungssumme</p>
                                    {v.zusammenfassung.summen?.length > 0
                                      ? <div className="space-y-0.5">
                                          {v.zusammenfassung.summen.map((s, i) => (
                                            <div key={i} className="flex justify-between text-xs">
                                              <span className="text-navy-500">{s.label}</span>
                                              <span className="font-semibold text-navy-800">{s.wert}</span>
                                            </div>
                                          ))}
                                        </div>
                                      : <p className="text-xs font-semibold text-navy-800">{v.zusammenfassung.summe}</p>
                                    }
                                  </div>
                                )}

                                {/* Prämie + Selbstbehalt nebeneinander */}
                                <div className="grid grid-cols-2 gap-2">
                                  {v.zusammenfassung.praemie && (
                                    <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                      <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-1">Jahresprämie</p>
                                      <p className="text-xs font-semibold text-navy-800">{v.zusammenfassung.praemie}</p>
                                    </div>
                                  )}
                                  {(v.zusammenfassung.selbstbehalte?.length > 0 || v.zusammenfassung.selbstbehalt) && (
                                    <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                      <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-1">Selbstbehalt</p>
                                      {v.zusammenfassung.selbstbehalte?.length > 0
                                        ? <div className="space-y-0.5">
                                            {v.zusammenfassung.selbstbehalte.map((s, i) => (
                                              <div key={i} className="flex justify-between text-xs">
                                                <span className="text-navy-500">{s.label}</span>
                                                <span className="font-semibold text-navy-800">{s.wert}</span>
                                              </div>
                                            ))}
                                          </div>
                                        : <p className="text-xs font-semibold text-navy-800">{v.zusammenfassung.selbstbehalt}</p>
                                      }
                                    </div>
                                  )}
                                </div>

                                {/* Versichert mit abweichendem Selbstbehalt */}
                                {v.zusammenfassung.sonderselbstbehalte?.length > 0 && (
                                  <div className="rounded-lg px-3 py-2.5" style={{ background: '#fff8e6', border: '1px solid #f5dfa0' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7a5000' }}>Versichert — abweichender Selbstbehalt</p>
                                    <ul className="space-y-1">
                                      {v.zusammenfassung.sonderselbstbehalte.map((s, i) => (
                                        <li key={i} className="flex justify-between text-xs" style={{ color: '#7a5000' }}>
                                          <span>{s.position}</span>
                                          <span className="font-semibold shrink-0 ml-2">{s.selbstbehalt}</span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Nicht versichert */}
                                {v.zusammenfassung.ausschluesse?.length > 0 && (
                                  <div className="rounded-lg px-3 py-2.5" style={{ background: '#fdecea', border: '1px solid #f5b8b8' }}>
                                    <p className="text-[10px] font-semibold uppercase tracking-wide mb-1.5" style={{ color: '#7a1e1e' }}>Nicht versichert</p>
                                    <ul className="space-y-1">
                                      {v.zusammenfassung.ausschluesse.map((a, i) => (
                                        <li key={i} className="text-xs flex items-center gap-1.5" style={{ color: '#7a1e1e' }}>
                                          <span className="shrink-0">✕</span> {a}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}

                                {/* Fälligkeit + Kündigung */}
                                {(v.zusammenfassung.faelligkeit || v.zusammenfassung.kuendigung) && (
                                  <div className="grid grid-cols-2 gap-2">
                                    {v.zusammenfassung.faelligkeit && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                        <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">Fälligkeit</p>
                                        <p className="text-xs text-navy-800">{v.zusammenfassung.faelligkeit}</p>
                                      </div>
                                    )}
                                    {v.zusammenfassung.kuendigung && (
                                      <div className="rounded-lg px-3 py-2" style={{ background: 'rgba(255,255,255,0.6)' }}>
                                        <p className="text-[10px] text-navy-400 uppercase tracking-wide mb-0.5">Kündigung</p>
                                        <p className="text-xs text-navy-800">{v.zusammenfassung.kuendigung}</p>
                                      </div>
                                    )}
                                  </div>
                                )}

                                {/* Sonstiger Hinweis */}
                                {v.zusammenfassung.hinweis && (
                                  <div className="rounded-lg px-3 py-2 flex items-start gap-1.5" style={{ background: '#fff8e6', border: '1px solid #f5dfa0' }}>
                                    <AlertTriangle size={11} className="shrink-0 mt-0.5" style={{ color: '#b45309' }} />
                                    <p className="text-xs" style={{ color: '#7a5000' }}>{v.zusammenfassung.hinweis}</p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        )}

                        {v.notizen && (
                          <div>
                            <p className="text-xs text-navy-400 uppercase tracking-wide mb-0.5">Notizen</p>
                            <p className="text-sm text-navy-600">{v.notizen}</p>
                          </div>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={() => oeffneEdit(v)}
                            className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-navy-700 px-3 py-1.5 rounded-lg border border-navy-100 hover:bg-white transition-colors">
                            <Edit2 size={13} /> Bearbeiten
                          </button>
                          <button onClick={() => loeschen(v.id)}
                            className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 px-3 py-1.5 rounded-lg border border-red-100 hover:bg-red-50 transition-colors">
                            <Trash2 size={13} /> Löschen
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )
        })
      )}

      {versicherungen.length > 0 && (
        <button onClick={oeffneNeu}
          className="w-full py-3 rounded-xl text-sm text-navy-400 hover:text-navy-600 transition-colors"
          style={{ border: '1px dashed #d8ccb8', background: 'none' }}>
          <Plus size={15} className="inline mr-1.5" /> Weitere Versicherung hinzufügen
        </button>
      )}

      {/* Formular-Modal */}
      {formOffen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(30,20,10,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: '#e8dece' }}>
              <h3 className="font-serif text-lg font-semibold text-navy-800">
                {editId ? 'Versicherung bearbeiten' : 'Neue Versicherung'}
              </h3>
              <button onClick={() => setFormOffen(false)} className="text-navy-400 hover:text-navy-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Bezeichnung *</label>
                <input className="input" placeholder="z. B. Meine Krankenversicherung"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="label">Kategorie</label>
                <select className="input" value={form.kategorie} onChange={e => setForm(f => ({ ...f, kategorie: e.target.value }))}>
                  {KATEGORIEN.map(k => <option key={k.id} value={k.id}>{k.label}</option>)}
                </select>
              </div>

              {/* Kfz: Deckungsart */}
              {form.kategorie === 'kfz' && (
                <div>
                  <label className="label">Deckungsart</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'haftpflicht', label: 'Haftpflicht' },
                      { id: 'teilkasko',   label: 'Teilkasko'   },
                      { id: 'vollkasko',   label: 'Vollkasko'   },
                    ].map(d => (
                      <button key={d.id} type="button"
                        onClick={() => setForm(f => ({ ...f, deckungsart: d.id }))}
                        className="py-2 rounded-xl text-sm font-medium transition-all border"
                        style={{
                          background: form.deckungsart === d.id ? '#2e6b52' : '#fff',
                          color: form.deckungsart === d.id ? '#fff' : '#5a4a3a',
                          borderColor: form.deckungsart === d.id ? '#2e6b52' : '#d8ccb8',
                        }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-navy-400 mt-1">
                    Richtwert: Haftpflicht &lt; 400 € · Teilkasko &lt; 600 € · Vollkasko &lt; 1.200 € / Jahr
                  </p>
                </div>
              )}

              {/* Kranken: GKV / PKV */}
              {form.kategorie === 'kranken' && (
                <div>
                  <label className="label">Art der Krankenversicherung</label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: 'gkv', label: 'Gesetzlich (GKV)' },
                      { id: 'pkv', label: 'Privat (PKV)'     },
                    ].map(d => (
                      <button key={d.id} type="button"
                        onClick={() => setForm(f => ({ ...f, krankenArt: d.id }))}
                        className="py-2 rounded-xl text-sm font-medium transition-all border"
                        style={{
                          background: form.krankenArt === d.id ? '#2e6b52' : '#fff',
                          color: form.krankenArt === d.id ? '#fff' : '#5a4a3a',
                          borderColor: form.krankenArt === d.id ? '#2e6b52' : '#d8ccb8',
                        }}>
                        {d.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-navy-400 mt-1">
                    Richtwert: GKV &lt; 900 € · PKV &lt; 6.000 € / Jahr
                  </p>
                </div>
              )}

              <div>
                <label className="label">Anbieter</label>
                <input className="input" placeholder="z. B. Allianz, AOK, HUK…"
                  value={form.anbieter} onChange={e => setForm(f => ({ ...f, anbieter: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Beitrag (€)</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.beitrag} onChange={e => setForm(f => ({ ...f, beitrag: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Intervall</label>
                  <select className="input" value={form.intervall} onChange={e => setForm(f => ({ ...f, intervall: e.target.value }))}>
                    <option value="monatlich">Monatlich</option>
                    <option value="vierteljaehrlich">Vierteljährlich</option>
                    <option value="halbjaehrlich">Halbjährlich</option>
                    <option value="jaehrlich">Jährlich</option>
                  </select>
                </div>
              </div>

              {/* Monatliche Belastung Vorschau */}
              {form.beitrag && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: '#edf7f2' }}>
                  <span className="text-sm text-navy-600">Monatliche Belastung</span>
                  <span className="text-sm font-semibold" style={{ color: '#2e6b52' }}>
                    {monatsbeitrag(form).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}

              {/* Police Upload */}
              <div>
                <label className="label">Police hochladen <span className="text-navy-400 font-normal">(PDF, optional)</span></label>
                {form.police ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#edf7f2', border: '1px solid #c5e0d4' }}>
                      <FileText size={15} style={{ color: '#2e6b52' }} />
                      <span className="text-sm text-navy-700 flex-1 truncate">{form.police.name}</span>
                      <button type="button" onClick={policeEntfernen} className="text-navy-400 hover:text-red-500">
                        <X size={15} />
                      </button>
                    </div>
                    {form.police.typ === 'application/pdf' && !form.zusammenfassung && (
                      <button
                        type="button"
                        onClick={() => analyseStarten(form.police.pfad)}
                        disabled={analyseLaeuft}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
                        style={{ background: '#f0eeff', color: '#5b4fa8', border: '1px solid #c8c0f0' }}
                      >
                        {analyseLaeuft ? <><Loader2 size={12} className="animate-spin" /> Analysiere…</> : <><Sparkles size={12} /> Police von KI analysieren lassen</>}
                      </button>
                    )}
                    {form.zusammenfassung && (
                      <div className="rounded-xl px-3 py-2.5 space-y-1" style={{ background: '#f0eeff', border: '1px solid #c8c0f0' }}>
                        <p className="text-xs font-semibold flex items-center gap-1" style={{ color: '#5b4fa8' }}>
                          <Sparkles size={11} /> KI-Zusammenfassung
                        </p>
                        {form.zusammenfassung.deckung && <p className="text-xs text-navy-700"><strong>Deckung:</strong> {form.zusammenfassung.deckung}</p>}
                        {form.zusammenfassung.summe && <p className="text-xs text-navy-700"><strong>Summe:</strong> {form.zusammenfassung.summe}</p>}
                        {form.zusammenfassung.selbstbehalt && <p className="text-xs text-navy-700"><strong>Selbstbehalt:</strong> {form.zusammenfassung.selbstbehalt}</p>}
                        {form.zusammenfassung.hinweis && <p className="text-xs text-navy-500 italic">{form.zusammenfassung.hinweis}</p>}
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors"
                    style={{ border: `2px dashed ${dragOver ? '#2e6b52' : '#d8ccb8'}`, background: dragOver ? '#edf7f2' : '#faf8f4' }}
                    onClick={() => !hochladen && fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleDatei(e.dataTransfer.files[0]) }}
                  >
                    <Upload size={20} className="text-navy-400" />
                    <p className="text-sm text-navy-400">
                      {hochladen ? 'Wird hochgeladen…' : <>Datei hier ablegen oder <span className="text-navy-600 underline">auswählen</span></>}
                    </p>
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => { handleDatei(e.target.files[0]); e.target.value = '' }} />
                  </div>
                )}
                {uploadFehler && <p className="text-xs text-red-500 mt-1">{uploadFehler}</p>}
              </div>

              <div>
                <label className="label">Notizen <span className="text-navy-400 font-normal">(optional)</span></label>
                <textarea className="input" rows={2} placeholder="Policennummer, Besonderheiten…"
                  value={form.notizen} onChange={e => setForm(f => ({ ...f, notizen: e.target.value }))} />
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-2">
              <button onClick={() => setFormOffen(false)}
                className="flex-1 py-2.5 rounded-xl text-sm text-navy-500 border border-navy-100 hover:bg-navy-50 transition-colors">
                Abbrechen
              </button>
              <button onClick={speichern}
                className="flex-1 py-2.5 rounded-xl text-sm text-white font-semibold transition-colors"
                style={{ background: '#2e6b52' }}>
                {editId ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
