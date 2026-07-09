import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Mail, Lock, BarChart2, Eye, EyeOff, ArrowRight, ArrowLeft, User, CheckCircle } from 'lucide-react'

export default function LoginSeite() {
  const [modus, setModus] = useState('login') // 'login' | 'register' | 'vergessen' | 'bestaetigung'
  const [email, setEmail] = useState('')
  const [passwort, setPasswort] = useState('')
  const [name, setName] = useState('')
  const [zeigePW, setZeigePW] = useState(false)
  const [laden, setLaden] = useState(false)
  const [fehler, setFehler] = useState('')

  // Referral-Code aus URL lesen und für spätere Verarbeitung nach Login speichern
  const refCode = new URLSearchParams(window.location.search).get('ref')
  if (refCode) localStorage.setItem('kw_referral', refCode)

  function reset() { setFehler('') }

  async function handleLogin(e) {
    e.preventDefault(); reset(); setLaden(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: passwort })
    if (error) setFehler('E-Mail oder Passwort falsch. Bitte prüfe deine Eingabe.')
    setLaden(false)
  }

  async function handleRegister(e) {
    e.preventDefault(); reset(); setLaden(true)
    if (passwort.length < 6) { setFehler('Passwort muss mindestens 6 Zeichen haben.'); setLaden(false); return }
    const { error } = await supabase.auth.signUp({
      email,
      password: passwort,
      options: {
        data: { full_name: name.trim() || null },
      },
    })
    if (error) setFehler(error.message)
    else setModus('bestaetigung')
    setLaden(false)
  }

  async function handleVergessen(e) {
    e.preventDefault(); reset(); setLaden(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) setFehler(error.message)
    else setModus('bestaetigung')
    setLaden(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f7f3ed' }}>
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border" style={{ background: '#fff', borderColor: '#d8ccb8' }}>
            <BarChart2 size={32} style={{ color: '#2e6b52' }} />
          </div>
          <h1 className="font-serif text-navy-700 text-3xl font-semibold tracking-wide">Kapitalwegweiser</h1>
          <p className="text-navy-400 text-xs mt-2 uppercase tracking-widest">Dein unabhängiger Kompass für Finanzen & Vermögen</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-md border border-navy-100 p-6">

          {/* ── Login ── */}
          {modus === 'login' && (
            <>
              <h2 className="text-xl font-bold text-navy-800 mb-5">Willkommen zurück</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="label">E-Mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9" type="email" placeholder="deine@email.de"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </div>
                </div>
                <div>
                  <label className="label">Passwort</label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9 pr-10" type={zeigePW ? 'text' : 'password'}
                      placeholder="••••••••" value={passwort} onChange={e => setPasswort(e.target.value)} required />
                    <button type="button" onClick={() => setZeigePW(!zeigePW)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600">
                      {zeigePW ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {fehler && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>}
                <button type="submit" disabled={laden} className="btn-primary w-full justify-center py-3 text-base mt-2">
                  {laden ? 'Anmelden...' : <><ArrowRight size={17} /> Einloggen</>}
                </button>
              </form>
              <div className="mt-4 flex flex-col gap-2 text-center text-sm">
                <button onClick={() => { setModus('vergessen'); reset() }} className="text-navy-500 hover:text-navy-700">
                  Passwort vergessen?
                </button>
                <p className="text-navy-400">
                  Noch kein Konto?{' '}
                  <button onClick={() => { setModus('register'); reset() }} className="text-navy-700 font-semibold hover:underline">
                    Jetzt registrieren
                  </button>
                </p>
              </div>
            </>
          )}

          {/* ── Registrierung ── */}
          {modus === 'register' && (
            <>
              <h2 className="text-xl font-bold text-navy-800 mb-1">Konto erstellen</h2>
              {refCode ? (
                <div className="flex items-center gap-2 rounded-lg px-3 py-2 mb-4 text-sm" style={{ background: '#edf7f2', borderLeft: '3px solid #2e6b52' }}>
                  <CheckCircle size={15} style={{ color: '#2e6b52', flexShrink: 0 }} />
                  <p className="text-navy-700"><strong>Du wurdest eingeladen!</strong> Du erhältst 10% Rabatt auf dein erstes Coaching-Paket.</p>
                </div>
              ) : (
                <p className="text-navy-500 text-sm mb-5">Kostenlos — deine Daten gehören nur dir.</p>
              )}
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="label">Dein Name <span className="text-navy-400 font-normal">(optional)</span></label>
                  <div className="relative">
                    <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9" type="text" placeholder="z. B. Max Mustermann"
                      value={name} onChange={e => setName(e.target.value)} autoFocus />
                  </div>
                  <p className="text-navy-400 text-xs mt-1">So wirst du in Zukunft genannt.</p>
                </div>
                <div>
                  <label className="label">E-Mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9" type="email" placeholder="deine@email.de"
                      value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                </div>
                <div>
                  <label className="label">Passwort <span className="text-navy-400 font-normal">(min. 6 Zeichen)</span></label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9 pr-10" type={zeigePW ? 'text' : 'password'}
                      placeholder="••••••••" value={passwort} onChange={e => setPasswort(e.target.value)} required />
                    <button type="button" onClick={() => setZeigePW(!zeigePW)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600">
                      {zeigePW ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>
                {fehler && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>}
                <button type="submit" disabled={laden} className="btn-primary w-full justify-center py-3 text-base mt-2">
                  {laden ? 'Registrieren...' : <><ArrowRight size={17} /> Konto erstellen</>}
                </button>
              </form>
              <button onClick={() => { setModus('login'); reset() }}
                className="mt-4 flex items-center gap-1 text-sm text-navy-500 hover:text-navy-700 mx-auto">
                <ArrowLeft size={14} /> Zurück zum Login
              </button>
            </>
          )}

          {/* ── Passwort vergessen ── */}
          {modus === 'vergessen' && (
            <>
              <h2 className="text-xl font-bold text-navy-800 mb-1">Passwort zurücksetzen</h2>
              <p className="text-navy-500 text-sm mb-5">Wir senden dir einen Link per E-Mail.</p>
              <form onSubmit={handleVergessen} className="space-y-4">
                <div>
                  <label className="label">E-Mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-400" />
                    <input className="input pl-9" type="email" placeholder="deine@email.de"
                      value={email} onChange={e => setEmail(e.target.value)} required autoFocus />
                  </div>
                </div>
                {fehler && <p className="text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-3 py-2">{fehler}</p>}
                <button type="submit" disabled={laden} className="btn-primary w-full justify-center py-3 text-base">
                  {laden ? 'Sende...' : <><ArrowRight size={17} /> Reset-Link senden</>}
                </button>
              </form>
              <button onClick={() => { setModus('login'); reset() }}
                className="mt-4 flex items-center gap-1 text-sm text-navy-500 hover:text-navy-700 mx-auto">
                <ArrowLeft size={14} /> Zurück zum Login
              </button>
            </>
          )}

          {/* ── Bestätigung ── */}
          {modus === 'bestaetigung' && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4 border" style={{ background: '#edf7f2', borderColor: '#a8d5be' }}>
                <CheckCircle size={28} style={{ color: '#2e6b52' }} />
              </div>
              <h2 className="text-xl font-bold text-navy-800 mb-2">Fast geschafft!</h2>
              <p className="text-navy-500 text-sm leading-relaxed mb-6">
                Wir haben dir eine E-Mail an <span className="font-semibold text-navy-700">{email}</span> geschickt.
                Bitte klicke auf den Bestätigungslink — danach kannst du dich einloggen.
              </p>
              <div className="rounded-xl p-4 text-left text-sm mb-4" style={{ background: '#f7f3ed', borderLeft: '4px solid #2e6b52' }}>
                <p className="text-navy-600 font-semibold mb-1">Kein E-Mail erhalten?</p>
                <p className="text-navy-400">Schau bitte auch in deinem Spam-Ordner nach. Die E-Mail kommt von <span className="font-medium">Kapitalwegweiser</span>.</p>
              </div>
              <button onClick={() => { setModus('login'); reset() }}
                className="flex items-center gap-1 text-sm text-navy-500 hover:text-navy-700 mx-auto">
                <ArrowLeft size={14} /> Zum Login
              </button>
            </div>
          )}

        </div>

        <p className="text-center text-navy-400 text-xs mt-6 uppercase tracking-widest">
          © Kapitalwegweiser · EU-Server · DSGVO-konform
        </p>
      </div>
    </div>
  )
}
