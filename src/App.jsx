import { useState } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useCloudCollection } from './hooks/useCloudCollection'
import { useLocalStorage } from './hooks/useLocalStorage'
import Navigation from './components/Navigation'
import Dashboard from './components/Dashboard'
import EinnahmenSeite from './components/EinnahmenSeite'
import FixkostenSeite from './components/FixkostenSeite'
import VariableKostenSeite from './components/VariableKostenSeite'
import BudgetZiele from './components/BudgetZiele'
import Haushaltsbuch from './components/Haushaltsbuch'
import FinanzScore from './components/FinanzScore'
import Wachstumsprognose from './components/Wachstumsprognose'
import Onboarding from './components/Onboarding'
import LoginSeite from './components/LoginSeite'
import { LogOut, Loader2 } from 'lucide-react'

function LadeScreen() {
  return (
    <div className="min-h-screen bg-navy-900 flex items-center justify-center">
      <div className="text-center">
        <Loader2 size={40} className="text-gold animate-spin mx-auto mb-4" />
        <p className="text-navy-300 text-sm">Daten werden geladen...</p>
      </div>
    </div>
  )
}

function AppInner() {
  const { user, loading: authLoading, abmelden } = useAuth()
  const [aktiveSeite, setAktiveSeite] = useState('dashboard')
  const [onboardingAbgeschlossen, setOnboardingAbgeschlossen] = useLocalStorage('kw_onboarding_done_v3', false)

  const [einnahmen, setEinnahmen, einnahmenLaden] = useCloudCollection('einnahmen', user?.id)
  const [fixkosten, setFixkosten, fixkostenLaden] = useCloudCollection('fixkosten', user?.id)
  const [variableKosten, setVariableKosten, varLaden] = useCloudCollection('variable_kosten', user?.id)
  const [budgets, setBudgets, budgetsLaden] = useCloudCollection('budgets', user?.id)
  const [eigeneSchnelleingaben, setEigeneSchnelleingaben] = useCloudCollection('eigene_schnelleingaben', user?.id)

  if (authLoading) return <LadeScreen />
  if (!user) return <LoginSeite />

  const dataLaden = einnahmenLaden || fixkostenLaden || varLaden || budgetsLaden
  if (dataLaden) return <LadeScreen />

  const seiten = {
    dashboard:    <Dashboard fixkosten={fixkosten} variableKosten={variableKosten} einnahmen={einnahmen} budgets={budgets} />,
    score:        <FinanzScore fixkosten={fixkosten} variableKosten={variableKosten} einnahmen={einnahmen} budgets={budgets} />,
    wachstum:     <Wachstumsprognose einnahmen={einnahmen} fixkosten={fixkosten} variableKosten={variableKosten} />,
    einnahmen:    <EinnahmenSeite einnahmen={einnahmen} setEinnahmen={setEinnahmen} />,
    fixkosten:    <FixkostenSeite fixkosten={fixkosten} setFixkosten={setFixkosten} />,
    variabel:     <VariableKostenSeite variableKosten={variableKosten} setVariableKosten={setVariableKosten} eigeneSchnelleingaben={eigeneSchnelleingaben} setEigeneSchnelleingaben={setEigeneSchnelleingaben} />,
    budgets:      <BudgetZiele budgets={budgets} setBudgets={setBudgets} variableKosten={variableKosten} />,
    haushaltsbuch:<Haushaltsbuch fixkosten={fixkosten} variableKosten={variableKosten} einnahmen={einnahmen} />,
  }

  return (
    <div className="flex min-h-screen">
      {!onboardingAbgeschlossen && (
        <Onboarding
          onAbschliessen={() => setOnboardingAbgeschlossen(true)}
          setEinnahmen={setEinnahmen}
          setFixkosten={setFixkosten}
        />
      )}

      <Navigation aktiveSeite={aktiveSeite} setAktiveSeite={setAktiveSeite} />

      <main className="flex-1 p-4 md:p-8 pt-16 md:pt-8 overflow-x-hidden">
        <div className="max-w-4xl mx-auto">
          {/* Nutzer-Info + Logout */}
          <div className="hidden md:flex justify-end items-center gap-3 mb-6">
            <span className="text-xs text-navy-400">{user.email}</span>
            <button onClick={abmelden} className="flex items-center gap-1.5 text-xs text-navy-400 hover:text-navy-700 border border-navy-200 rounded-lg px-3 py-1.5 hover:bg-navy-50 transition-colors">
              <LogOut size={13} /> Abmelden
            </button>
          </div>
          {seiten[aktiveSeite]}
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
