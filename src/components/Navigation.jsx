import { LayoutDashboard, List, TrendingDown, BookOpen, TrendingUp, Target, Menu, X, Award, BarChart2 } from 'lucide-react'
import { useState } from 'react'

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'score', label: 'Finanz-Score', icon: Award, highlight: true },
  { id: 'wachstum', label: 'Wachstum', icon: BarChart2, highlight: true },
  { id: 'einnahmen', label: 'Einnahmen', icon: TrendingUp },
  { id: 'fixkosten', label: 'Fixkosten', icon: List },
  { id: 'variabel', label: 'Variable Kosten', icon: TrendingDown },
  { id: 'budgets', label: 'Budget-Ziele', icon: Target },
  { id: 'haushaltsbuch', label: 'Haushaltsbuch', icon: BookOpen },
]

export default function Navigation({ aktiveSeite, setAktiveSeite }) {
  const [menuOffen, setMenuOffen] = useState(false)

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 bg-navy-800 min-h-screen p-4 shrink-0">
        <div className="mb-8">
          <h1 className="text-white font-bold text-lg leading-tight">Kapital&shy;wegweiser</h1>
          <p className="text-navy-300 text-xs mt-1">Haushaltsbuch</p>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon, highlight }) => (
            <button
              key={id}
              onClick={() => setAktiveSeite(id)}
              className={`nav-link ${aktiveSeite === id ? 'nav-link-active' : 'nav-link-inactive'} ${highlight && aktiveSeite !== id ? 'border border-gold/40 text-gold hover:text-white' : ''}`}
            >
              <Icon size={16} />
              {label}
              {highlight && aktiveSeite !== id && <span className="ml-auto text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full font-semibold">NEU</span>}
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Top Bar */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 bg-navy-800 flex items-center justify-between px-4 py-3">
        <div>
          <span className="text-white font-bold text-base">Kapitalwegweiser</span>
          <span className="text-navy-300 text-xs ml-2">Haushaltsbuch</span>
        </div>
        <button onClick={() => setMenuOffen(!menuOffen)} className="text-white p-1">
          {menuOffen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* Mobile Dropdown Menu */}
      {menuOffen && (
        <div className="md:hidden fixed top-12 left-0 right-0 z-40 bg-navy-800 px-4 pb-4 shadow-lg">
          <nav className="flex flex-col gap-1 mt-2">
            {NAV_ITEMS.map(({ id, label, icon: Icon, highlight }) => (
              <button
                key={id}
                onClick={() => { setAktiveSeite(id); setMenuOffen(false) }}
                className={`nav-link ${aktiveSeite === id ? 'nav-link-active' : 'nav-link-inactive'} ${highlight && aktiveSeite !== id ? 'border border-gold/40 text-gold' : ''}`}
              >
                <Icon size={16} />
                {label}
                {highlight && aktiveSeite !== id && <span className="ml-auto text-[10px] bg-gold/20 text-gold px-1.5 py-0.5 rounded-full font-semibold">NEU</span>}
              </button>
            ))}
          </nav>
        </div>
      )}
    </>
  )
}
