import { useState } from 'react'
import {
  LayoutDashboard, List, TrendingUp,
  Menu, X, Award, BarChart2, Home, Wallet,
  User, ChevronDown, ChevronRight, Building2, Receipt, LogOut, Shield, Tv, Users
} from 'lucide-react'

const BUDGET_ITEMS = [
  { id: 'dashboard',  label: 'Dashboard',         icon: LayoutDashboard },
  { id: 'score',      label: 'Finanz-Score',       icon: Award },
  { id: 'wachstum',   label: 'Wachstum',           icon: BarChart2 },
  { id: 'einnahmen',  label: 'Einnahmen',          icon: TrendingUp },
  { id: 'fixkosten',  label: 'Ausgaben',            icon: List },
]

const IMMOBILIEN_ITEMS = [
  { id: 'liste',            label: 'Meine Immobilien', icon: Building2 },
  { id: 'steueruebersicht', label: 'Steuerübersicht',  icon: Receipt },
]

const TOP_ITEMS = [
  { id: 'startseite',    label: 'Startseite',      icon: Home },
  { id: 'budget',        label: 'Budgetplanung',   icon: Wallet,    kinder: BUDGET_ITEMS },
  { id: 'immobilien',    label: 'Immobilien',      icon: Building2, kinder: IMMOBILIEN_ITEMS },
  { id: 'versicherungen',label: 'Versicherungen',  icon: Shield },
  { id: 'abos',          label: 'Abos',            icon: Tv },
  { id: 'vereine',       label: 'Vereine',         icon: Users },
]

const BOTTOM_ITEM = { id: 'profil', label: 'Profil', icon: User }

// Sidebar: etwas dunkler als Hauptinhalt, damit sie sich abhebt
const SIDEBAR_BG = '#ede6d8'
const SIDEBAR_BORDER = '#d8ccb8'
const MOBILE_BG = '#ede6d8'

function NavInhalt({ aktivesModul, setAktivesModul, aktiveSeite, setAktiveSeite, onKlick }) {
  const [offenMap, setOffenMap] = useState({
    budget: aktivesModul === 'budget',
    immobilien: aktivesModul === 'immobilien',
  })

  function toggleModul(id) {
    setOffenMap(prev => ({ ...prev, [id]: !prev[id] }))
    setAktivesModul(id)
    if (onKlick && !offenMap[id]) onKlick()
  }

  function waehleSeite(modul, seite) {
    setAktivesModul(modul)
    setAktiveSeite(seite)
    setOffenMap(prev => ({ ...prev, [modul]: true }))
    if (onKlick) onKlick()
  }

  return (
    <nav className="flex flex-col gap-0.5">
      {TOP_ITEMS.map(({ id, label, icon: Icon, kinder, bald }) => {
        const istAktiv = aktivesModul === id
        const hatKinder = !!kinder

        if (bald) {
          return (
            <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm opacity-40 cursor-not-allowed select-none text-navy-400">
              <Icon size={16} />
              <span>{label}</span>
              <span className="ml-auto text-[9px] bg-navy-200 text-navy-500 px-1.5 py-0.5 rounded-full font-semibold uppercase tracking-wide">Bald</span>
            </div>
          )
        }

        if (hatKinder) {
          const offen = offenMap[id] ?? false
          return (
            <div key={id}>
              <button
                onClick={() => toggleModul(id)}
                className={`nav-link w-full ${istAktiv ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <Icon size={16} />
                <span>{label}</span>
                <span className="ml-auto">
                  {offen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
              </button>

              {offen && (
                <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l-2 border-navy-200 pl-3">
                  {kinder.map(({ id: sid, label: slabel, icon: SIcon }) => (
                    <button
                      key={sid}
                      onClick={() => waehleSeite(id, sid)}
                      className={`nav-link text-xs py-1.5 ${aktivesModul === id && aktiveSeite === sid ? 'nav-link-active' : 'nav-link-inactive'}`}
                    >
                      <SIcon size={14} />
                      {slabel}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )
        }

        return (
          <button
            key={id}
            onClick={() => { setAktivesModul(id); if (onKlick) onKlick() }}
            className={`nav-link ${istAktiv ? 'nav-link-active' : 'nav-link-inactive'}`}
          >
            <Icon size={16} />
            {label}
          </button>
        )
      })}
    </nav>
  )
}

export default function Navigation({ aktivesModul, setAktivesModul, aktiveSeite, setAktiveSeite, abmelden }) {
  const [menuOffen, setMenuOffen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar — hell, cream */}
      <aside
        className="hidden md:flex flex-col w-60 p-5 shrink-0 border-r sticky top-0 h-screen overflow-y-auto"
        style={{ background: SIDEBAR_BG, borderColor: SIDEBAR_BORDER }}
      >
        {/* Logo */}
        <div className="mb-8 pt-1">
          <h1 className="font-serif text-navy-700 text-xl font-semibold leading-tight tracking-wide">
            Kapitalwegweiser
          </h1>
          <p className="text-navy-400 text-[10px] mt-1 uppercase tracking-widest">Mitgliederbereich</p>
        </div>

        {/* Hauptnavigation */}
        <NavInhalt
          aktivesModul={aktivesModul}
          setAktivesModul={setAktivesModul}
          aktiveSeite={aktiveSeite}
          setAktiveSeite={setAktiveSeite}
        />

        {/* Profil ganz unten */}
        <div className="mt-auto pt-4 border-t" style={{ borderColor: SIDEBAR_BORDER }}>
          <button
            onClick={() => setAktivesModul('profil')}
            className={`nav-link w-full ${aktivesModul === 'profil' ? 'nav-link-active' : 'nav-link-inactive'}`}
          >
            <User size={16} />
            <span>Profil</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Bar */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: MOBILE_BG, borderColor: SIDEBAR_BORDER }}
      >
        <span className="font-serif text-navy-700 font-semibold text-base tracking-wide">Kapitalwegweiser</span>
        <button onClick={() => setMenuOffen(!menuOffen)} className="text-navy-600 p-1">
          {menuOffen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Dropdown */}
      {menuOffen && (
        <div
          className="md:hidden fixed top-12 left-0 right-0 z-40 px-4 pb-4 shadow-md border-b"
          style={{ background: MOBILE_BG, borderColor: SIDEBAR_BORDER }}
        >
          <div className="mt-2 space-y-1">
            <NavInhalt
              aktivesModul={aktivesModul}
              setAktivesModul={setAktivesModul}
              aktiveSeite={aktiveSeite}
              setAktiveSeite={setAktiveSeite}
              onKlick={() => setMenuOffen(false)}
            />
            <div className="border-t pt-2 mt-2" style={{ borderColor: SIDEBAR_BORDER }}>
              <button
                onClick={() => { setAktivesModul('profil'); setMenuOffen(false) }}
                className={`nav-link w-full ${aktivesModul === 'profil' ? 'nav-link-active' : 'nav-link-inactive'}`}
              >
                <User size={16} /> Profil
              </button>
              {abmelden && (
                <button
                  onClick={abmelden}
                  className="nav-link w-full text-red-500 hover:bg-red-50 hover:text-red-600 mt-1"
                >
                  <LogOut size={16} /> Abmelden
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
