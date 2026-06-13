import { useState, useEffect, useRef, useCallback } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useCloudCollection } from './hooks/useCloudCollection'
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
import Onboarding from './components/Onboarding'
import LoginSeite from './components/LoginSeite'
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

// File-Objekte können nicht in JSON serialisiert werden — Namen merken, Datei entfernen
function serializeImmobilien(liste) {
  return liste.map(immo => ({
    ...immo,
    mieter: (immo.mieter || []).map(m => ({
      ...m,
      dokument: m.dokument instanceof File ? { _fileName: m.dokument.name } : m.dokument,
    })),
    instandhaltung: (immo.instandhaltung || []).map(i => ({
      ...i,
      dokument: i.dokument instanceof File ? { _fileName: i.dokument.name } : i.dokument,
    })),
    dokumente: (immo.dokumente || []).map(d => ({
      ...d,
      datei: d.datei instanceof File ? { _fileName: d.datei.name } : d.datei,
    })),
  }))
}

function AppInner() {
  const { user, loading: authLoading, abmelden } = useAuth()
  const [aktivesModul, setAktivesModul] = useState('startseite')
  const [aktiveSeite, setAktiveSeite] = useState('dashboard')

  // Bei jedem Login immer zur Startseite — verhindert Verbleib auf letzter Seite
  const vorigerUser = useRef(null)
  useEffect(() => {
    if (user && !vorigerUser.current) {
      setAktivesModul('startseite')
    }
    vorigerUser.current = user ?? null
  }, [user])

  // Onboarding: direkt aus localStorage lesen/schreiben nach User-ID (nicht über Hook mit dynamischem Key)
  const [onboardingAbgeschlossen, setOnboardingAbgeschlossenState] = useState(false)
  const onboardingInitialisiert = useRef(false)

  useEffect(() => {
    if (user?.id && !onboardingInitialisiert.current) {
      onboardingInitialisiert.current = true
      const key = `kw_onboarding_done_${user.id}`
      const gespeichert = localStorage.getItem(key)
      // Auch alten globalen Key prüfen (Migration)
      const altKey = localStorage.getItem('kw_onboarding_done_v3')
      setOnboardingAbgeschlossenState(gespeichert === 'true' || altKey === 'true')
    }
  }, [user?.id])

  function setOnboardingAbgeschlossen(val) {
    setOnboardingAbgeschlossenState(val)
    if (user?.id) {
      localStorage.setItem(`kw_onboarding_done_${user.id}`, String(val))
    }
  }

  // Immobilien: in localStorage pro User gespeichert
  const [immobilien, setImmobilienState] = useState([])
  const immobilienInitialisiert = useRef(false)

  useEffect(() => {
    if (user?.id && !immobilienInitialisiert.current) {
      immobilienInitialisiert.current = true
      const key = `kw_immobilien_${user.id}`
      try {
        const gespeichert = localStorage.getItem(key)
        if (gespeichert) setImmobilienState(JSON.parse(gespeichert))
      } catch { /* ignore */ }
    }
  }, [user?.id])

  const setImmobilien = useCallback((neu) => {
    const liste = typeof neu === 'function' ? neu(immobilien) : neu
    setImmobilienState(liste)
    if (user?.id) {
      try {
        localStorage.setItem(`kw_immobilien_${user.id}`, JSON.stringify(serializeImmobilien(liste)))
      } catch { /* ignore */ }
    }
  }, [user?.id, immobilien])

  const [einnahmen, setEinnahmen, einnahmenLaden] = useCloudCollection('einnahmen', user?.id)
  const [fixkosten, setFixkosten, fixkostenLaden] = useCloudCollection('fixkosten', user?.id)

  if (authLoading) return <LadeScreen />
  if (!user) return <LoginSeite />

  const dataLaden = einnahmenLaden || fixkostenLaden
  if (dataLaden) return <LadeScreen />

  // Falls der User schon Daten hat, Onboarding automatisch überspringen
  const sollteOnboardingZeigen = !onboardingAbgeschlossen && einnahmen.length === 0 && fixkosten.length === 0

  const budgetSeiten = {
    dashboard: <Dashboard fixkosten={fixkosten} einnahmen={einnahmen} />,
    score:     <FinanzScore fixkosten={fixkosten} einnahmen={einnahmen} />,
    wachstum:  <Wachstumsprognose einnahmen={einnahmen} fixkosten={fixkosten} />,
    einnahmen: <EinnahmenSeite einnahmen={einnahmen} setEinnahmen={setEinnahmen} />,
    fixkosten: <FixkostenSeite fixkosten={fixkosten} setFixkosten={setFixkosten} />,
  }

  function renderInhalt() {
    switch (aktivesModul) {
      case 'startseite':
        return <Startseite user={user} einnahmen={einnahmen} fixkosten={fixkosten} immobilien={immobilien} setAktivesModul={setAktivesModul} setAktiveSeite={setAktiveSeite} />
      case 'budget':
        return budgetSeiten[aktiveSeite] ?? budgetSeiten.dashboard
      case 'immobilien':
        if (aktiveSeite === 'steueruebersicht')
          return <SteuerUebersichtSeite immobilien={immobilien} />
        // 'liste' oder jeder andere Wert → Immobilienliste/Detail
        return <ImmobilienSeite immobilien={immobilien} setImmobilien={setImmobilien} />
      case 'profil':
        return <ProfilSeite user={user} abmelden={abmelden} />
      default:
        return <Startseite user={user} einnahmen={einnahmen} fixkosten={fixkosten} immobilien={immobilien} setAktivesModul={setAktivesModul} setAktiveSeite={setAktiveSeite} />
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

      <Navigation
        aktivesModul={aktivesModul}
        setAktivesModul={setAktivesModul}
        aktiveSeite={aktiveSeite}
        setAktiveSeite={setAktiveSeite}
        abmelden={abmelden}
      />

      <main className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top-Bar mit Logout */}
        <div className="hidden md:flex items-center justify-end px-8 py-3 border-b" style={{ borderColor: '#e8dece', background: '#faf8f4' }}>
          <div className="flex items-center gap-3">
            <span className="text-xs text-navy-400">{user.user_metadata?.full_name || user.email}</span>
            <button
              onClick={abmelden}
              className="flex items-center gap-1.5 text-xs text-navy-500 hover:text-red-500 transition-colors font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-transparent hover:border-red-100"
            >
              <LogOut size={13} />
              Abmelden
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
    </AuthProvider>
  )
}
