import { Building2, ChevronRight, Wallet, Shield, Tv, Users } from 'lucide-react'
import { monatlicherBetrag, monatlicheEinnahme } from '../data/kategorien'

function euro(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' })
}

export default function Startseite({ user, einnahmen, fixkosten, immobilien = [], versicherungen = [], abos = [], vereine = [], setAktivesModul, setAktiveSeite }) {
  const einnahmenSumme = einnahmen.reduce((s, e) => s + monatlicheEinnahme(e), 0)
  const fixSumme = fixkosten.reduce((s, f) => s + monatlicherBetrag(f.betrag, f.intervall), 0)
  const sparBetrag = einnahmenSumme - fixSumme
  const sparquote = einnahmenSumme > 0 ? (sparBetrag / einnahmenSumme) * 100 : null

  const vorname = user.user_metadata?.full_name || user.email.split('@')[0]

  function navigiere(modul, seite) {
    setAktivesModul(modul)
    if (seite) setAktiveSeite(seite)
  }

  const sparquoteKlasse = sparquote === null ? 'text-navy-400'
    : sparquote >= 20 ? 'text-brand-500'
    : sparquote >= 10 ? 'text-amber-600'
    : 'text-red-500'

  return (
    <div className="space-y-10">

      {/* Begrüßung */}
      <div className="border-b border-navy-100 pb-6">
        <p className="text-[10px] text-navy-400 uppercase tracking-[0.12em] mb-2">Willkommen zurück</p>
        <h2 className="section-title mb-1">{vorname}</h2>
        <p className="text-sm text-navy-400">Deine persönliche Finanzübersicht auf einen Blick.</p>
      </div>

      {/* Kennzahlen */}
      {einnahmenSumme > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="card text-center">
            <p className="label mb-2">Einnahmen</p>
            <p className="text-lg font-serif font-semibold text-navy-700">{euro(einnahmenSumme)}</p>
            <p className="text-[10px] text-navy-400 mt-1 tracking-wide">pro Monat</p>
          </div>
          <div className="card text-center">
            <p className="label mb-2">Fixkosten</p>
            <p className="text-lg font-serif font-semibold text-navy-700">{euro(fixSumme)}</p>
            <p className="text-[10px] text-navy-400 mt-1 tracking-wide">pro Monat</p>
          </div>
          <div className="card text-center">
            <p className="label mb-2">Verfügbar</p>
            <p className={`text-lg font-serif font-semibold ${sparBetrag >= 0 ? 'text-brand-500' : 'text-red-500'}`}>
              {euro(sparBetrag)}
            </p>
            <p className="text-[10px] text-navy-400 mt-1 tracking-wide">pro Monat</p>
          </div>
          <div className="card text-center">
            <p className="label mb-2">Sparquote</p>
            <p className={`text-lg font-serif font-semibold ${sparquoteKlasse}`}>
              {sparquote !== null ? `${sparquote.toFixed(1)} %` : '—'}
            </p>
            <p className="text-[10px] text-navy-400 mt-1 tracking-wide">aktuell</p>
          </div>
        </div>
      )}

      {/* Module */}
      <div>
        <p className="label mb-4">Deine Module</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 auto-rows-fr">

          {/* Budgetplanung */}
          <button
            onClick={() => navigiere('budget', 'dashboard')}
            className="card text-left group transition-all duration-200 hover:shadow-md h-full"
            style={{ borderColor: '#d8ccba' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-brand-500 flex items-center justify-center shrink-0">
                <Wallet size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-base font-semibold text-navy-700">Budgetplanung</h3>
                  <ChevronRight size={15} className="text-navy-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-navy-400 leading-relaxed">Einnahmen, Fixkosten, Finanz-Score und Wachstumsprognose</p>
                <span className={`inline-block mt-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
                  einnahmenSumme > 0
                    ? 'bg-brand-500/10 text-brand-600'
                    : 'bg-navy-100 text-navy-400'
                }`}>
                  {einnahmenSumme > 0 ? 'Aktiv' : 'Noch nicht eingerichtet'}
                </span>
              </div>
            </div>
          </button>

          {/* Immobilien */}
          <button
            onClick={() => navigiere('immobilien', 'liste')}
            className="card text-left group transition-all duration-200 hover:shadow-md h-full"
            style={{ borderColor: '#d8ccba' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#6b5c4d' }}>
                <Building2 size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-base font-semibold text-navy-700">Immobilien</h3>
                  <ChevronRight size={15} className="text-navy-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-navy-400 leading-relaxed">Mietverwaltung, Finanzierung, Instandhaltung und Steuerübersicht</p>
                <span className={`inline-block mt-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
                  immobilien.length > 0 ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-100 text-navy-400'
                }`}>
                  {immobilien.length > 0 ? `${immobilien.length} Objekt${immobilien.length !== 1 ? 'e' : ''}` : 'Noch keine Objekte'}
                </span>
              </div>
            </div>
          </button>

          {/* Versicherungen */}
          <button
            onClick={() => navigiere('versicherungen')}
            className="card text-left group transition-all duration-200 hover:shadow-md h-full"
            style={{ borderColor: '#d8ccba' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#321f13' }}>
                <Shield size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-base font-semibold text-navy-700">Versicherungen</h3>
                  <ChevronRight size={15} className="text-navy-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-navy-400 leading-relaxed">Alle Policen im Überblick, Kosten und Optimierungshinweise</p>
                <span className={`inline-block mt-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
                  versicherungen.length > 0 ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-100 text-navy-400'
                }`}>
                  {versicherungen.length > 0 ? `${versicherungen.length} Versicherung${versicherungen.length !== 1 ? 'en' : ''}` : 'Noch nicht eingerichtet'}
                </span>
              </div>
            </div>
          </button>

          {/* Abos */}
          <button
            onClick={() => navigiere('abos')}
            className="card text-left group transition-all duration-200 hover:shadow-md h-full"
            style={{ borderColor: '#d8ccba' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#5b4fa8' }}>
                <Tv size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-base font-semibold text-navy-700">Abos</h3>
                  <ChevronRight size={15} className="text-navy-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-navy-400 leading-relaxed">Alle Abonnements und ihre monatlichen Kosten im Überblick</p>
                <span className={`inline-block mt-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
                  abos.length > 0 ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-100 text-navy-400'
                }`}>
                  {abos.length > 0 ? `${abos.length} Abo${abos.length !== 1 ? 's' : ''}` : 'Noch nicht eingerichtet'}
                </span>
              </div>
            </div>
          </button>

          {/* Vereine */}
          <button
            onClick={() => navigiere('vereine')}
            className="card text-left group transition-all duration-200 hover:shadow-md h-full"
            style={{ borderColor: '#d8ccba' }}
          >
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ background: '#1a7ea8' }}>
                <Users size={18} className="text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-serif text-base font-semibold text-navy-700">Vereine</h3>
                  <ChevronRight size={15} className="text-navy-300 group-hover:text-brand-500 transition-colors shrink-0" />
                </div>
                <p className="text-xs text-navy-400 leading-relaxed">Mitgliedsbeiträge und Vereine im Überblick</p>
                <span className={`inline-block mt-2.5 text-[10px] font-medium px-2 py-0.5 rounded-full tracking-wide ${
                  vereine.length > 0 ? 'bg-brand-500/10 text-brand-600' : 'bg-navy-100 text-navy-400'
                }`}>
                  {vereine.length > 0 ? `${vereine.length} Verein${vereine.length !== 1 ? 'e' : ''}` : 'Noch nicht eingerichtet'}
                </span>
              </div>
            </div>
          </button>

        </div>
      </div>

    </div>
  )
}
