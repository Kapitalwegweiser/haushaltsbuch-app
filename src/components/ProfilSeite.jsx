import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { User, Mail, Lock, CheckCircle, AlertTriangle } from 'lucide-react'

export default function ProfilSeite({ user, abmelden }) {
  const [neuesPasswort, setNeuesPasswort] = useState('')
  const [passwortWdh, setPasswortWdh] = useState('')
  const [nameEdit, setNameEdit] = useState(user.user_metadata?.full_name || '')
  const [laden, setLaden] = useState(false)
  const [nameLaden, setNameLaden] = useState(false)
  const [erfolg, setErfolg] = useState('')
  const [fehler, setFehler] = useState('')
  const [nameErfolg, setNameErfolg] = useState('')

  const anzeigeName = user.user_metadata?.full_name || user.email.split('@')[0]

  const mitgliedSeit = new Date(user.created_at).toLocaleDateString('de-DE', {
    day: '2-digit', month: 'long', year: 'numeric'
  })

  async function nameAendern(e) {
    e.preventDefault()
    setNameLaden(true); setNameErfolg('')
    const { error } = await supabase.auth.updateUser({ data: { full_name: nameEdit.trim() } })
    if (!error) setNameErfolg('Name gespeichert!')
    setNameLaden(false)
  }

  async function passwortAendern(e) {
    e.preventDefault()
    setFehler(''); setErfolg('')
    if (neuesPasswort.length < 6) { setFehler('Passwort muss mindestens 6 Zeichen haben.'); return }
    if (neuesPasswort !== passwortWdh) { setFehler('Passwörter stimmen nicht überein.'); return }
    setLaden(true)
    const { error } = await supabase.auth.updateUser({ password: neuesPasswort })
    if (error) setFehler(error.message)
    else { setErfolg('Passwort erfolgreich geändert!'); setNeuesPasswort(''); setPasswortWdh('') }
    setLaden(false)
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Einstellungen</p>
        <h2 className="section-title mb-0">Mein Profil</h2>
      </div>

      {/* Profil-Info */}
      <div className="card space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-brand-500 flex items-center justify-center shrink-0">
            <User size={26} className="text-white" />
          </div>
          <div>
            <p className="font-serif text-lg font-semibold text-navy-900">{anzeigeName}</p>
            <p className="text-xs text-navy-400 uppercase tracking-widest">Mitglied seit {mitgliedSeit}</p>
          </div>
        </div>

        <div className="border-t border-navy-100 pt-4 space-y-3">
          <div className="flex items-center gap-3">
            <Mail size={15} className="text-navy-400 shrink-0" />
            <div>
              <p className="text-xs text-navy-400 uppercase tracking-widest">E-Mail</p>
              <p className="text-sm font-medium text-navy-800">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Lock size={15} className="text-navy-400 shrink-0" />
            <div>
              <p className="text-xs text-navy-400 uppercase tracking-widest">Passwort</p>
              <p className="text-sm font-medium text-navy-800">••••••••</p>
            </div>
          </div>
        </div>
      </div>

      {/* Name ändern */}
      <div className="card">
        <h3 className="font-serif text-lg font-semibold text-navy-900 mb-4">Anzeigename</h3>
        <form onSubmit={nameAendern} className="space-y-3">
          <div>
            <label className="label">Dein Name</label>
            <input
              className="input"
              type="text"
              placeholder="Wie sollen wir dich nennen?"
              value={nameEdit}
              onChange={e => setNameEdit(e.target.value)}
            />
          </div>
          {nameErfolg && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle size={14} /> {nameErfolg}
            </div>
          )}
          <button type="submit" disabled={nameLaden} className="btn-primary">
            {nameLaden ? 'Speichern...' : 'Name speichern'}
          </button>
        </form>
      </div>

      {/* Passwort ändern */}
      <div className="card">
        <h3 className="font-serif text-lg font-semibold text-navy-900 mb-4">Passwort ändern</h3>
        <form onSubmit={passwortAendern} className="space-y-3">
          <div>
            <label className="label">Neues Passwort</label>
            <input
              className="input"
              type="password"
              placeholder="Mindestens 6 Zeichen"
              value={neuesPasswort}
              onChange={e => setNeuesPasswort(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Passwort wiederholen</label>
            <input
              className="input"
              type="password"
              placeholder="Passwort bestätigen"
              value={passwortWdh}
              onChange={e => setPasswortWdh(e.target.value)}
            />
          </div>
          {fehler && (
            <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertTriangle size={14} /> {fehler}
            </div>
          )}
          {erfolg && (
            <div className="flex items-center gap-2 text-emerald-700 text-sm bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
              <CheckCircle size={14} /> {erfolg}
            </div>
          )}
          <button type="submit" disabled={laden} className="btn-primary">
            {laden ? 'Speichern...' : 'Passwort speichern'}
          </button>
        </form>
      </div>

      {/* Abmelden */}
      <div className="card border-red-100">
        <h3 className="font-serif text-lg font-semibold text-navy-900 mb-2">Abmelden</h3>
        <p className="text-sm text-navy-500 mb-4">Du wirst auf die Login-Seite weitergeleitet.</p>
        <button onClick={abmelden} className="btn-danger px-4 py-2 text-sm font-medium">
          Jetzt abmelden
        </button>
      </div>
    </div>
  )
}
