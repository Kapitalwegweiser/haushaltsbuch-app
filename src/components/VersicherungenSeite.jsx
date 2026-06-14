import { useState, useRef } from 'react'
import { Plus, X, Edit2, Shield, Heart, Car, Home, Umbrella, FileText, ChevronDown, ChevronUp, Trash2, Upload, ExternalLink } from 'lucide-react'

const KATEGORIEN = [
  { id: 'kranken',     label: 'Krankenversicherung',    gruppe: 'Personenversicherungen', icon: Heart,     farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'bu',          label: 'Berufsunfähigkeit',       gruppe: 'Personenversicherungen', icon: Shield,    farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'leben',       label: 'Lebensversicherung',      gruppe: 'Personenversicherungen', icon: Heart,     farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'unfall',      label: 'Unfallversicherung',      gruppe: 'Personenversicherungen', icon: Shield,    farbe: '#2e6b52', bg: '#edf7f2' },
  { id: 'haftpflicht', label: 'Haftpflichtversicherung', gruppe: 'Sachversicherungen',     icon: Umbrella,  farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'hausrat',     label: 'Hausratversicherung',     gruppe: 'Sachversicherungen',     icon: Home,      farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'kfz',         label: 'Kfz-Versicherung',        gruppe: 'Sachversicherungen',     icon: Car,       farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'gebaude',     label: 'Gebäudeversicherung',     gruppe: 'Sachversicherungen',     icon: Home,      farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'rechtsschutz',label: 'Rechtsschutzversicherung',gruppe: 'Sachversicherungen',     icon: FileText,  farbe: '#6b5c4d', bg: '#ede6d8' },
  { id: 'sonstiges',   label: 'Sonstiges',               gruppe: 'Sonstige',              icon: Shield,    farbe: '#888',    bg: '#f0ece6' },
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

function monatsbeitrag(v) {
  return jahresbeitrag(v) / 12
}

function kuendigungsStatus(datum) {
  if (!datum) return null
  const tage = Math.ceil((new Date(datum) - new Date()) / (1000 * 60 * 60 * 24))
  if (tage < 0)   return { label: 'Frist abgelaufen', farbe: '#7a1e1e', bg: '#fdecea' }
  if (tage <= 30) return { label: 'Jetzt kündbar',    farbe: '#7a1e1e', bg: '#fdecea' }
  if (tage <= 90) return { label: 'Bald kündbar',     farbe: '#7a5000', bg: '#fff8e6' }
  return null
}

const LEER = { name: '', anbieter: '', kategorie: 'haftpflicht', beitrag: '', intervall: 'jaehrlich', kuendigungsdatum: '', notizen: '', police: null }

export default function VersicherungenSeite({ versicherungen, setVersicherungen }) {
  const [formOffen, setFormOffen] = useState(false)
  const [editId, setEditId]       = useState(null)
  const [form, setForm]           = useState(LEER)
  const [aufgeklappt, setAufgeklappt] = useState(null)
  const [dragOver, setDragOver]   = useState(false)
  const fileRef = useRef()

  const gesamtJahr    = versicherungen.reduce((s, v) => s + jahresbeitrag(v), 0)
  const gesamtMonat   = gesamtJahr / 12

  const naechsteKuendigung = versicherungen
    .filter(v => v.kuendigungsdatum && new Date(v.kuendigungsdatum) >= new Date())
    .sort((a, b) => new Date(a.kuendigungsdatum) - new Date(b.kuendigungsdatum))[0]

  function oeffneNeu() {
    setForm(LEER)
    setEditId(null)
    setFormOffen(true)
  }

  function oeffneEdit(v) {
    setForm({ ...v, police: v.police || null })
    setEditId(v.id)
    setFormOffen(true)
  }

  function handleDatei(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = e => setForm(f => ({ ...f, police: { name: file.name, typ: file.type, data: e.target.result } }))
    reader.readAsDataURL(file)
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

  function loeschen(id) {
    setVersicherungen(vs => vs.filter(v => v.id !== id))
    setAufgeklappt(null)
  }

  function oeffnePolice(police) {
    const a = document.createElement('a')
    a.href = police.data
    a.download = police.name
    a.click()
  }

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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="card" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Versicherungen</p>
          <p className="text-2xl font-semibold text-navy-800">{versicherungen.length}</p>
        </div>
        <div className="card" style={{ background: '#edf7f2', borderLeft: '4px solid #2e6b52', borderRadius: '12px' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Monatlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtMonat.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="card" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Jährlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtJahr.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="card" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Nächste Kündigung</p>
          <p className="text-sm font-semibold text-navy-800 mt-1">
            {naechsteKuendigung
              ? new Date(naechsteKuendigung.kuendigungsdatum).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
              : '—'}
          </p>
        </div>
      </div>

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
                const status = kuendigungsStatus(v.kuendigungsdatum)
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
                            <p className="text-xs text-navy-400 truncate">{v.anbieter || kat.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          {status && (
                            <span className="text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: status.bg, color: status.farbe }}>
                              {status.label}
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-sm font-semibold text-navy-800">{monatB.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € <span className="text-xs font-normal text-navy-400">/ Mon.</span></p>
                            <p className="text-xs text-navy-400">{jahrB.toLocaleString('de-DE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} € / Jahr</p>
                          </div>
                          {offen ? <ChevronUp size={15} className="text-navy-400" /> : <ChevronDown size={15} className="text-navy-400" />}
                        </div>
                      </div>
                    </button>

                    {offen && (
                      <div className="border-t px-5 py-4 space-y-3" style={{ borderColor: '#e8dece', background: '#faf8f4' }}>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-navy-400 uppercase tracking-wide mb-0.5">Beitrag</p>
                            <p className="text-navy-700 font-medium">{parseFloat(v.beitrag || 0).toLocaleString('de-DE')} € / {v.intervall}</p>
                          </div>
                          <div>
                            <p className="text-xs text-navy-400 uppercase tracking-wide mb-0.5">Kündigungsdatum</p>
                            <p className="text-navy-700 font-medium">
                              {v.kuendigungsdatum
                                ? new Date(v.kuendigungsdatum).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })
                                : '—'}
                            </p>
                          </div>
                        </div>

                        {/* Police */}
                        <div>
                          <p className="text-xs text-navy-400 uppercase tracking-wide mb-1.5">Police / Dokument</p>
                          {v.police ? (
                            <div className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ background: '#edf7f2', border: '1px solid #c5e0d4' }}>
                              <FileText size={14} style={{ color: '#2e6b52' }} />
                              <span className="text-sm text-navy-700 flex-1 truncate">{v.police.name}</span>
                              <button onClick={() => oeffnePolice(v.police)}
                                className="flex items-center gap-1 text-xs font-medium hover:underline" style={{ color: '#2e6b52' }}>
                                <ExternalLink size={12} /> Öffnen
                              </button>
                              <button onClick={() => setVersicherungen(vs => vs.map(x => x.id === v.id ? { ...x, police: null } : x))}
                                className="text-navy-400 hover:text-red-500 ml-1">
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm text-navy-400 italic">Kein Dokument hinterlegt</p>
                          )}
                        </div>

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

              <div>
                <label className="label">Kündigungsdatum</label>
                <input className="input" type="date"
                  value={form.kuendigungsdatum} onChange={e => setForm(f => ({ ...f, kuendigungsdatum: e.target.value }))} />
                <p className="text-xs text-navy-400 mt-1">Du siehst einen Hinweis wenn das Datum naht.</p>
              </div>

              {/* Police Upload */}
              <div>
                <label className="label">Police hochladen <span className="text-navy-400 font-normal">(PDF, optional)</span></label>
                {form.police ? (
                  <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: '#edf7f2', border: '1px solid #c5e0d4' }}>
                    <FileText size={15} style={{ color: '#2e6b52' }} />
                    <span className="text-sm text-navy-700 flex-1 truncate">{form.police.name}</span>
                    <button type="button" onClick={() => setForm(f => ({ ...f, police: null }))} className="text-navy-400 hover:text-red-500">
                      <X size={15} />
                    </button>
                  </div>
                ) : (
                  <div
                    className="rounded-xl flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors"
                    style={{
                      border: `2px dashed ${dragOver ? '#2e6b52' : '#d8ccb8'}`,
                      background: dragOver ? '#edf7f2' : '#faf8f4',
                    }}
                    onClick={() => fileRef.current.click()}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => { e.preventDefault(); setDragOver(false); handleDatei(e.dataTransfer.files[0]) }}
                  >
                    <Upload size={20} className="text-navy-400" />
                    <p className="text-sm text-navy-400">Datei hier ablegen oder <span className="text-navy-600 underline">auswählen</span></p>
                    <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden"
                      onChange={e => handleDatei(e.target.files[0])} />
                  </div>
                )}
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
