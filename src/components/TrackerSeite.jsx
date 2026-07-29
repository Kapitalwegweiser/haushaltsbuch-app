import { useState } from 'react'
import { Plus, X, Edit2, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'

function jahresbetrag(v) {
  const b = parseFloat(v.beitrag) || 0
  if (v.intervall === 'monatlich')        return b * 12
  if (v.intervall === 'halbjaehrlich')    return b * 2
  if (v.intervall === 'vierteljaehrlich') return b * 4
  return b
}

function monatsbetrag(v) { return jahresbetrag(v) / 12 }

const LEER = { name: '', anbieter: '', beitrag: '', intervall: 'monatlich', notizen: '' }

// Generische Tracker-Seite für einfache, wiederkehrende Posten (Abos, Vereine, ...)
export default function TrackerSeite({
  items, setItems,
  titel, ueberschrift, anbieterLabel, kategorienOptionen,
  leerTitel, leerText, farbe = '#2e6b52', bg = '#edf7f2', icon: Icon,
}) {
  const [formOffen, setFormOffen]     = useState(false)
  const [editId, setEditId]           = useState(null)
  const [form, setForm]               = useState(LEER)
  const [aufgeklappt, setAufgeklappt] = useState(null)

  const gesamtJahr  = items.reduce((s, v) => s + jahresbetrag(v), 0)
  const gesamtMonat = gesamtJahr / 12

  function oeffneNeu() {
    const leer = { ...LEER, anbieter: kategorienOptionen?.[0] ?? '' }
    setForm(leer); setEditId(null); setFormOffen(true)
  }
  function oeffneEdit(v) { setForm({ ...LEER, ...v }); setEditId(v.id); setFormOffen(true) }

  function speichern() {
    if (!form.name.trim()) return
    if (editId) {
      setItems(vs => vs.map(v => v.id === editId ? { ...form, id: editId } : v))
    } else {
      setItems(vs => [...vs, { ...form, id: Date.now().toString() }])
    }
    setFormOffen(false)
  }

  function loeschen(id) { setItems(vs => vs.filter(v => v.id !== id)); setAufgeklappt(null) }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Übersicht</p>
          <h2 className="section-title mb-0">{ueberschrift}</h2>
        </div>
        <button onClick={oeffneNeu} className="btn-primary flex items-center gap-1.5 text-sm px-4 py-2">
          <Plus size={16} /> Hinzufügen
        </button>
      </div>

      {/* KPIs */}
      <div className="flex flex-col gap-3">
        <div className="card text-center" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">{titel}</p>
          <p className="text-2xl font-semibold text-navy-800">{items.length}</p>
        </div>
        <div className="card text-center" style={{ background: bg, borderLeft: `4px solid ${farbe}`, borderRadius: '12px' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Monatlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtMonat.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</p>
        </div>
        <div className="card text-center" style={{ background: '#f7f3ed' }}>
          <p className="text-xs text-navy-400 uppercase tracking-widest mb-2">Jährlich</p>
          <p className="text-2xl font-semibold text-navy-800">{gesamtJahr.toLocaleString('de-DE', { maximumFractionDigits: 0 })} €</p>
        </div>
      </div>

      {/* Liste */}
      {items.length === 0 ? (
        <div className="card text-center py-12">
          {Icon && <Icon size={32} className="text-navy-200 mx-auto mb-3" />}
          <p className="text-navy-500 font-medium mb-1">{leerTitel}</p>
          <p className="text-navy-400 text-sm">{leerText}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map(v => {
            const offen  = aufgeklappt === v.id
            const jahrB  = jahresbetrag(v)
            const monatB = monatsbetrag(v)
            return (
              <div key={v.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <button className="w-full text-left px-5 py-4" onClick={() => setAufgeklappt(offen ? null : v.id)}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg }}>
                        {Icon && <Icon size={17} style={{ color: farbe }} />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-navy-800 truncate">{v.name}</p>
                        <p className="text-xs text-navy-400 truncate">{v.anbieter || anbieterLabel}</p>
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
      )}

      {items.length > 0 && (
        <button onClick={oeffneNeu}
          className="w-full py-3 rounded-xl text-sm text-navy-400 hover:text-navy-600 transition-colors"
          style={{ border: '1px dashed #d8ccb8', background: 'none' }}>
          <Plus size={15} className="inline mr-1.5" /> Weitere{titel === 'Vereine' ? 'n' : 's'} {titel.slice(0, -1)} hinzufügen
        </button>
      )}

      {/* Formular-Modal */}
      {formOffen && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4" style={{ background: 'rgba(30,20,10,0.4)' }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b" style={{ borderColor: '#e8dece' }}>
              <h3 className="font-serif text-lg font-semibold text-navy-800">
                {editId ? 'Eintrag bearbeiten' : 'Neuer Eintrag'}
              </h3>
              <button onClick={() => setFormOffen(false)} className="text-navy-400 hover:text-navy-600"><X size={20} /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label">Bezeichnung *</label>
                <input className="input" placeholder="z. B. Netflix, TSV Eintracht"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} autoFocus />
              </div>
              <div>
                <label className="label">{anbieterLabel}</label>
                {kategorienOptionen ? (
                  <select className="input" value={form.anbieter} onChange={e => setForm(f => ({ ...f, anbieter: e.target.value }))}>
                    {kategorienOptionen.map(k => <option key={k} value={k}>{k}</option>)}
                  </select>
                ) : (
                  <input className="input" placeholder="z. B. Netflix GmbH, Vereinsname…"
                    value={form.anbieter} onChange={e => setForm(f => ({ ...f, anbieter: e.target.value }))} />
                )}
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

              {form.beitrag && (
                <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={{ background: bg }}>
                  <span className="text-sm text-navy-600">Monatliche Belastung</span>
                  <span className="text-sm font-semibold" style={{ color: farbe }}>
                    {monatsbetrag(form).toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </span>
                </div>
              )}

              <div>
                <label className="label">Notizen <span className="text-navy-400 font-normal">(optional)</span></label>
                <textarea className="input" rows={2} placeholder="Besonderheiten, Mitgliedsnummer…"
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
                style={{ background: farbe }}>
                {editId ? 'Speichern' : 'Hinzufügen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
