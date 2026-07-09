import { useState } from 'react'
import { useReferral } from '../hooks/useReferral'
import { Copy, Check, Gift, Users, Euro, Clock, CheckCircle, Award } from 'lucide-react'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

const STATUS_CONFIG = {
  ausstehend:  { label: 'Ausstehend',  bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200'  },
  bestaetigt:  { label: 'Bestätigt',   bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200'   },
  ausbezahlt:  { label: 'Ausbezahlt',  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200'},
}

export default function EmpfehlungSeite({ user }) {
  const { code, referrals, laden } = useReferral(
    user?.id,
    user?.email,
    user?.user_metadata?.full_name
  )
  const [kopiert, setKopiert] = useState(false)

  const appUrl = window.location.origin
  const einladungsLink = code ? `${appUrl}?ref=${code}` : ''

  async function linkKopieren() {
    if (!einladungsLink) return
    await navigator.clipboard.writeText(einladungsLink)
    setKopiert(true)
    setTimeout(() => setKopiert(false), 2000)
  }

  const ausstehend = referrals.filter(r => r.status === 'ausstehend')
  const bestaetigt = referrals.filter(r => r.status === 'bestaetigt')
  const ausbezahlt = referrals.filter(r => r.status === 'ausbezahlt')

  const gesamtProvision   = referrals.reduce((s, r) => s + (r.provision || 0), 0)
  const ausbezahltSumme   = ausbezahlt.reduce((s, r) => s + (r.provision || 0), 0)
  const ausstehendSumme   = [...ausstehend, ...bestaetigt].reduce((s, r) => s + (r.provision || 0), 0)

  if (laden) {
    return <div className="card animate-pulse h-32" />
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <p className="text-xs text-navy-400 uppercase tracking-widest mb-1">Mitglieder</p>
        <h2 className="section-title mb-0">Freunde werben</h2>
      </div>

      {/* Erklärung */}
      <div className="card" style={{ borderColor: '#c9a227', background: '#fffdf5' }}>
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: '#fef3c7' }}>
            <Gift size={18} style={{ color: '#b45309' }} />
          </div>
          <div>
            <p className="font-serif font-semibold text-navy-800 mb-1">So funktioniert es</p>
            <ul className="text-sm text-navy-600 space-y-1">
              <li>• Du teilst deinen persönlichen Link mit Freunden oder Kunden</li>
              <li>• Wer sich über deinen Link registriert und ein Coaching-Paket bucht, erhält <strong>10% Rabatt</strong></li>
              <li>• Du erhältst <strong>10% des Paketpreises</strong> als Provision ausgezahlt</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Dein Einladungslink */}
      <div className="card">
        <h3 className="font-serif font-semibold text-navy-700 mb-3">Dein persönlicher Einladungslink</h3>
        {code ? (
          <>
            <div className="flex items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-3 py-2.5 mb-3">
              <span className="text-xs text-navy-600 flex-1 truncate font-mono">{einladungsLink}</span>
              <button
                onClick={linkKopieren}
                className="shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                style={kopiert ? { background: '#edf7f2', color: '#2e6b52' } : { background: '#2e6b52', color: '#fff' }}
              >
                {kopiert ? <><Check size={13} /> Kopiert!</> : <><Copy size={13} /> Kopieren</>}
              </button>
            </div>
            <p className="text-xs text-navy-400">
              Dein Code: <span className="font-bold text-navy-700 tracking-widest">{code}</span>
            </p>
          </>
        ) : (
          <p className="text-sm text-navy-400">Link wird generiert…</p>
        )}
      </div>

      {/* KPI-Karten */}
      <div className="grid grid-cols-3 gap-3">
        <div className="card text-center p-3">
          <div className="w-8 h-8 rounded-lg bg-brand-500/10 flex items-center justify-center mx-auto mb-2">
            <Users size={16} className="text-brand-500" />
          </div>
          <p className="text-lg font-bold text-navy-800">{referrals.length}</p>
          <p className="text-[10px] text-navy-400 uppercase tracking-wide mt-0.5">Empfohlen</p>
        </div>
        <div className="card text-center p-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#fef3c7' }}>
            <Clock size={16} style={{ color: '#b45309' }} />
          </div>
          <p className="text-lg font-bold text-navy-800">{euro(ausstehendSumme)}</p>
          <p className="text-[10px] text-navy-400 uppercase tracking-wide mt-0.5">Ausstehend</p>
        </div>
        <div className="card text-center p-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2" style={{ background: '#edf7f2' }}>
            <CheckCircle size={16} className="text-brand-500" />
          </div>
          <p className="text-lg font-bold text-navy-800">{euro(ausbezahltSumme)}</p>
          <p className="text-[10px] text-navy-400 uppercase tracking-wide mt-0.5">Ausbezahlt</p>
        </div>
      </div>

      {/* Empfehlungs-Liste */}
      <div className="card">
        <h3 className="font-serif font-semibold text-navy-700 mb-4 flex items-center gap-2">
          <Award size={16} className="text-amber-500" />
          Meine Empfehlungen
        </h3>

        {referrals.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center" style={{ background: '#f0eeff' }}>
              <Users size={22} style={{ color: '#5b4fa8' }} />
            </div>
            <p className="text-sm text-navy-500 font-medium">Noch keine Empfehlungen</p>
            <p className="text-xs text-navy-400 mt-1">Teile deinen Link — deine erste Empfehlung erscheint hier.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {referrals.map(r => {
              const cfg = STATUS_CONFIG[r.status] || STATUS_CONFIG.ausstehend
              const datum = new Date(r.created_at).toLocaleDateString('de-DE', { day: '2-digit', month: 'short', year: 'numeric' })
              return (
                <div key={r.id} className="flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5" style={{ background: '#faf8f4', borderColor: '#e8dece' }}>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{r.referred_email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-navy-400">{datum}</p>
                      {r.paket_name && <p className="text-xs text-navy-500">· {r.paket_name}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.provision > 0 && (
                      <span className="text-sm font-bold text-navy-700">{euro(r.provision)}</span>
                    )}
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
                      {cfg.label}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {gesamtProvision > 0 && (
        <p className="text-xs text-navy-400 text-center">
          Gesamt erworben: <strong className="text-navy-700">{euro(gesamtProvision)}</strong>
        </p>
      )}
    </div>
  )
}
