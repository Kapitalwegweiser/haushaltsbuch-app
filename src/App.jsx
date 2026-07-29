import { useState, useEffect, useRef } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useCloudCollection } from './hooks/useCloudCollection'
import { useCloudJsonCollection } from './hooks/useCloudJsonCollection'
import { ABO_KATEGORIEN } from './data/kategorien'
import Navigation from './components/Navigation'
import Startseite from './components/Startseite'
import ProfilSeite from './components/ProfilSeite'
import ImmobilienSeite from './components/ImmobilienSeite'
import SteuerUebersichtSeite from './components/SteuerUebersichtSeite'
import Dashboard from './components/Dashboard'
import EinnahmenSeite from './components/EinnahmenSeite'
import FixkostenSeite from './components/FixkostenSeite'
import FinanzScore from './components/FinanzScore'
import Wachstumsprognose from './components/Wachstumsprognose'
import VersicherungenSeite from './components/VersicherungenSeite'
import TrackerSeite from './components/TrackerSeite'
import EmpfehlungSeite from './components/EmpfehlungSeite'
import { Tv, Users } from 'lucide-react'
import { verarbeiteEinladung } from './hooks/useReferral'
import Onboarding from './components/Onboarding'
import AppTour from './components/AppTour'
import LoginSeite from './components/LoginSeite'
import SyncErrorBanner from './components/SyncErrorBanner'
import { Loader2, LogOut } from 'lucide-react'

function LadeScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f7f3ed' }}>
      <div className="text-center">
        <Loader2 size={40} className="text-brand-500 animate-spin mx-auto mb-4" />
        <p className="text-navy-400 text-sm">Daten werden geladen...</p>
      </div>
    </div>
  )
}

function AppInner() {
  const { user, loading: authLoading, abmelden, meldetSichAb } = useAuth()
  const [aktivesModul, setAktivesModul] = useState('startseite')
  const [aktiveSeite, setAktiveSeite]   = useState('dashboard')

  // Bei Login immer zur Startseite + Referral verarbeiten
  const vorigerUser = useRef(null)
  useEffect(() => {
    if (user && !vorigerUser.current) {
      setAktivesModul('startseite')
      verarbeiteEinladung(user.id, user.email)
    }
    vorigerUser.current = user ?? null
  }, [user])

  // Onboarding & Tour — bleiben in localStorage (gerätespezifisch ist ok)
  const [onboardingAbgeschlossen, setOnboardingAbgeschlossenState] = useState(false)
  const [tourAbgeschlossen, setTourAbgeschlossenState]             = useState(false)
  const onboardingInitialisiert = useRef(false)

  useEffect(() => {
    if (user?.id && !onboardingInitialisiert.current) {
      onboardingInitialisiert.current = true
      const gespeichert = localStorage.getItem(`kw_onboarding_done_${user.id}`)
      const altKey      = localStorage.getItem('kw_onboarding_done_v3')
      setOnboardingAbgeschlossenState(gespeichert === 'true' || altKey === 'true')
      setTourAbgeschlossenState(localStorage.getItem(`kw_tour_done_${user.id}`) === 'true')
    }
  }, [user?.id])

  function setOnboardingAbgeschlossen(val) {
    setOnboardingAbgeschlossenState(val)
    if (user?.id) localStorage.setItem(`kw_onboarding_done_${user.id}`, String(val))
  }

  function tourSchliessen() {
    setTourAbgeschlossenState(true)
    if (user?.id) localStorage.setItem(`kw_tour_done_${user.id}`, 'true')
  }

  // Alle Daten über Supabase — geräteübergreifend synchron
  const [einnahmen,     setEinnahmen,     einnahmenLaden]     = useCloudCollection('einnahmen',     user?.id)
  const [fixkosten,     setFixkosten,     fixkostenLaden]     = useCloudCollection('fixkosten',     user?.id)
  const [immobilien,    setImmobilien,    immobilienLaden]    = useCloudJsonCollection('immobilien',    user?.id)
  const [versicherungen, setVersicherungen, versicherungenLaden] = useCloudJsonCollection('versicherungen', user?.id)
  const [altAbos,       setAltAbos,       altAbosLaden]       = useCloudJsonCollection('abos',          user?.id)
  const [vereine,       setVereine,       vereineLaden]        = useCloudJsonCollection('vereine',       user?.id)

  // Einmalige Migration: alte abos-Sammlung → fixkosten
  const aboMigrationDone = useRef(false)
  useEffect(() => {
    if (altAbosLaden || fixkostenLaden || aboMigrationDone.current) return
    aboMigrationDone.current = true
    if (altAbos.length === 0) return
    setFixkosten(prev => {
      const existingIds = new Set(prev.map(f => f.id))
      const toAdd = altAbos
        .filter(a => !existingIds.has(a.id))
        .map(a => ({
          id: a.id,
          name: a.name || 'Abo',
          kategorie: ABO_KATEGORIEN.has(a.anbieter) ? a.anbieter : [...ABO_KATEGORIEN][0],
          betrag: parseFloat(a.beitrag) || 0,
          intervall: a.intervall || 'monatlich',
        }))
      return toAdd.length > 0 ? [...prev, ...toAdd] : prev
    })
    setAltAbos([])
  }, [altAbosLaden, fixkostenLaden]) // eslint-disable-line react-hooks/exhaustive-deps

  if (authLoading) return <LadeScreen />
  if (!user)       return <LoginSeite />

  const dataLaden = einnahmenLaden || fixkostenLaden || immobilienLaden || versicherungenLaden || altAbosLaden || vereineLaden
  if (dataLaden) return <LadeScreen />

  // Abos = fixkosten-Einträge mit Abo-Kategorie (single source of truth)
  const abos = fixkosten
    .filter(f => ABO_KATEGORIEN.has(f.kategorie))
    .map(f => ({ id: f.id, name: f.name, anbieter: f.kategorie, beitrag: f.betrag, intervall: f.intervall, notizen: '' }))

  function setAbos(updaterOrValue) {
    setFixkosten(prev => {
      const aboIds = new Set(prev.filter(f => ABO_KATEGORIEN.has(f.kategorie)).map(f => f.id))
      const currentAbos = prev
        .filter(f => aboIds.has(f.id))
        .map(f => ({ id: f.id, name: f.name, anbieter: f.kategorie, beitrag: f.betrag, intervall: f.intervall, notizen: '' }))
      const newAbos = typeof updaterOrValue === 'function' ? updaterOrValue(currentAbos) : updaterOrValue
      const nonAbos = prev.filter(f => !aboIds.has(f.id))
      const newAboFixkosten = newAbos.map(a => ({
        id: a.id,
        name: a.name,
        kategorie: ABO_KATEGORIEN.has(a.anbieter) ? a.anbieter : [...ABO_KATEGORIEN][0],
        betrag: parseFloat(a.beitrag) || 0,
        intervall: a.intervall || 'monatlich',
      }))
      return [...nonAbos, ...newAboFixkosten]
    })
  }

  const sollteOnboardingZeigen = !onboardingAbgeschlossen && einnahmen.length === 0 && fixkosten.length === 0
  const sollTourZeigen         = onboardingAbgeschlossen && !tourAbgeschlossen

  const budgetSeiten = {
    dashboard: <Dashboard fixkosten={fixkosten} einnahmen={einnahmen} abos={abos} vereine={vereine} />,
    score:     <FinanzScore fixkosten={fixkosten} einnahmen={einnahmen} />,
    wachstum:  <Wachstumsprognose einnahmen={einnahmen} fixkosten={fixkosten} />,
    einnahmen: <EinnahmenSeite einnahmen={einnahmen} setEinnahmen={setEinnahmen} />,
    fixkosten: <FixkostenSeite fixkosten={fixkosten} setFixkosten={setFixkosten} />,
  }

  function renderInhalt() {
    switch (aktivesModul) {
      case 'startseite':
        return <Startseite user={user} einnahmen={einnahmen} fixkosten={fixkosten} immobilien={immobilien} versicherungen={versicherungen} abos={abos} vereine={vereine} setAktivesModul={setAktivesModul} setAktiveSeite={setAktiveSeite} />
      case 'budget':
        return budgetSeiten[aktiveSeite] ?? budgetSeiten.dashboard
      case 'immobilien':
        if (aktiveSeite === 'steueruebersicht') return <SteuerUebersichtSeite immobilien={immobilien} setImmobilien={setImmobilien} />
        return <ImmobilienSeite immobilien={immobilien} setImmobilien={setImmobilien} />
      case 'versicherungen':
        return <VersicherungenSeite versicherungen={versicherungen} setVersicherungen={setVersicherungen} einnahmen={einnahmen} />
      case 'abos':
        return <TrackerSeite items={abos} setItems={setAbos} titel="Abos" ueberschrift="Meine Abos"
          anbieterLabel="Kategorie" kategorienOptionen={[...ABO_KATEGORIEN]}
          leerTitel="Noch keine Abos" leerText="Füge dein erstes Abo hinzu."
          farbe="#5b4fa8" bg="#f0eeff" icon={Tv} />
      case 'vereine':
        return <TrackerSeite items={vereine} setItems={setVereine} titel="Vereine" ueberschrift="Meine Vereine"
          anbieterLabel="Verein" leerTitel="Noch keine Vereine" leerText="Füge deinen ersten Verein hinzu."
          farbe="#1a7ea8" bg="#e8f5fc" icon={Users} />
      case 'empfehlungen':
        return <EmpfehlungSeite user={user} />
      case 'profil':
        return <ProfilSeite user={user} abmelden={abmelden} meldetSichAb={meldetSichAb} />
      default:
        return <Startseite user={user} einnahmen={einnahmen} fixkosten={fixkosten} immobilien={immobilien} versicherungen={versicherungen} abos={abos} vereine={vereine} setAktivesModul={setAktivesModul} setAktiveSeite={setAktiveSeite} />
    }
  }

  return (
    <div className="flex min-h-screen">
      {sollteOnboardingZeigen && (
        <Onboarding
          onAbschliessen={() => setOnboardingAbgeschlossen(true)}
          setEinnahmen={setEinnahmen}
          setFixkosten={setFixkosten}
        />
      )}
      {!sollteOnboardingZeigen && sollTourZeigen && (
        <AppTour onSchliessen={tourSchliessen} userName={user.user_metadata?.full_name} />
      )}

      <Navigation
        aktivesModul={aktivesModul}
        setAktivesModul={setAktivesModul}
        aktiveSeite={aktiveSeite}
        setAktiveSeite={setAktiveSeite}
        abmelden={abmelden}
        meldetSichAb={meldetSichAb}
      />

      <main className="flex-1 flex flex-col overflow-x-hidden">
        <div className="hidden md:flex items-center justify-end px-8 py-3 border-b" style={{ borderColor: '#e8dece', background: '#faf8f4' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-navy-400">{user.user_metadata?.full_name || user.email}</span>
            <button
              onClick={abmelden}
              disabled={meldetSichAb}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-red-500 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100 disabled:opacity-50"
            >
              <LogOut size={13} /> {meldetSichAb ? 'Wird gespeichert…' : 'Abmelden'}
            </button>
          </div>
        </div>
        <div className="flex-1 p-4 md:p-8 pt-16 md:pt-6 overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            {renderInhalt()}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <AppInner />
      <SyncErrorBanner />
    </AuthProvider>
  )
}
