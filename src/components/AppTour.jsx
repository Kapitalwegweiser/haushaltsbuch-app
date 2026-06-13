import { useState } from 'react'
import {
  LayoutDashboard, TrendingUp, List, Award, BarChart2,
  Building2, X, ChevronRight, ChevronLeft, Sparkles,
} from 'lucide-react'

const SCHRITTE = [
  {
    icon: Sparkles,
    farbe: '#2e6b52',
    hintergrund: '#edf7f2',
    titel: 'Willkommen beim Kapitalwegweiser!',
    text: 'In wenigen Schritten zeigen wir dir, was du hier alles verwalten und planen kannst. Du kannst die Tour jederzeit überspringen.',
    bild: null,
    willkommen: true,
  },
  {
    icon: LayoutDashboard,
    farbe: '#2e6b52',
    hintergrund: '#edf7f2',
    titel: 'Dashboard',
    bereich: 'Budgetplanung → Dashboard',
    text: 'Dein persönlicher Überblick auf einen Blick: monatliche Einnahmen, Ausgaben, dein aktueller Finanz-Score und wie sich dein Vermögen entwickelt.',
    punkte: ['Einnahmen vs. Ausgaben im Vergleich', 'Top-Kostenpositionen', 'Sparquote und freies Budget'],
  },
  {
    icon: TrendingUp,
    farbe: '#2e6b52',
    hintergrund: '#edf7f2',
    titel: 'Einnahmen',
    bereich: 'Budgetplanung → Einnahmen',
    text: 'Pflege hier alle deine regelmäßigen und einmaligen Einnahmen — Gehalt, Mieteinnahmen, Nebenverdienste und mehr.',
    punkte: ['Monatlich, jährlich oder einmalig', 'Kategorien wie Gehalt, Kapital, Sonstiges', 'Automatische Jahressumme'],
  },
  {
    icon: List,
    farbe: '#6b5c4d',
    hintergrund: '#ede6d8',
    titel: 'Monatliche Ausgaben',
    bereich: 'Budgetplanung → Monatl. Ausgaben',
    text: 'Trage deine fixen Kosten ein — Miete, Versicherungen, Abos, Strom. So weißt du genau, was jeden Monat automatisch abgeht.',
    punkte: ['Feste Kosten im Überblick', 'Gesamtbelastung auf einen Blick', 'Vergleich mit deinen Einnahmen'],
  },
  {
    icon: Award,
    farbe: '#c9a227',
    hintergrund: '#fdf8ed',
    titel: 'Finanz-Score',
    bereich: 'Budgetplanung → Finanz-Score',
    text: 'Dein persönlicher Finanz-Score zeigt dir, wie gut du finanziell aufgestellt bist — mit konkreten Hinweisen, was du verbessern kannst.',
    punkte: ['Score von 0 bis 100', 'Sparquote, Ausgabenstruktur, Puffer', 'Persönliche Handlungsempfehlungen'],
  },
  {
    icon: BarChart2,
    farbe: '#2e6b52',
    hintergrund: '#edf7f2',
    titel: 'Wachstumsprognose',
    bereich: 'Budgetplanung → Wachstum',
    text: 'Sieh, wie sich dein Vermögen über die nächsten Jahre entwickelt — inklusive Zinseszins-Effekt. Du kannst Laufzeit und Zinssatz selbst einstellen.',
    punkte: ['Langfristige Vermögensentwicklung', 'Zinseszins-Rechner', 'Motivationsblick in die Zukunft'],
  },
  {
    icon: Building2,
    farbe: '#321f13',
    hintergrund: '#f0ebe3',
    titel: 'Immobilien',
    bereich: 'Immobilien → Meine Immobilien',
    text: 'Verwalte deine Immobilien vollständig: Mieter, Finanzierung, Instandhaltung, Steuerunterlagen und Eigentümerversammlungen — alles an einem Ort.',
    punkte: ['Mieter & Mietverträge', 'Cashflow und Rendite', 'Steuerunterlagen für Anlage V'],
  },
]

export default function AppTour({ onSchliessen, userName }) {
  const [schritt, setSchritt] = useState(0)

  const aktuell = SCHRITTE[schritt]
  const istLetzter = schritt === SCHRITTE.length - 1
  const istErster = schritt === 0
  const Icon = aktuell.icon

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(30,20,10,0.45)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-md rounded-3xl shadow-2xl overflow-hidden" style={{ background: '#faf8f4' }}>

        {/* Schließen */}
        <button
          onClick={onSchliessen}
          className="absolute top-4 right-4 text-navy-400 hover:text-navy-600 transition-colors z-10"
          title="Tour überspringen"
        >
          <X size={20} />
        </button>

        {/* Icon-Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: aktuell.hintergrund }}
          >
            <Icon size={30} style={{ color: aktuell.farbe }} />
          </div>

          {aktuell.bereich && (
            <p className="text-xs uppercase tracking-widest font-semibold mb-2" style={{ color: aktuell.farbe }}>
              {aktuell.bereich}
            </p>
          )}

          <h2 className="font-serif text-2xl font-semibold text-navy-800 mb-3 leading-snug">
            {aktuell.willkommen && userName ? `Hallo ${userName}! 👋` : aktuell.titel}
          </h2>
          <p className="text-navy-500 text-sm leading-relaxed">
            {aktuell.text}
          </p>
        </div>

        {/* Punkte */}
        {aktuell.punkte && (
          <div className="mx-6 mb-6 rounded-2xl p-4 space-y-2" style={{ background: aktuell.hintergrund }}>
            {aktuell.punkte.map((p, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: aktuell.farbe }} />
                <span className="text-sm text-navy-600">{p}</span>
              </div>
            ))}
          </div>
        )}

        {/* Fortschritt + Navigation */}
        <div className="px-6 pb-7 flex items-center justify-between gap-4">

          {/* Punkte-Indikator */}
          <div className="flex items-center gap-1.5">
            {SCHRITTE.map((_, i) => (
              <div
                key={i}
                className="rounded-full transition-all"
                style={{
                  width: i === schritt ? 20 : 6,
                  height: 6,
                  background: i === schritt ? '#2e6b52' : '#d8ccb8',
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-2">
            {!istErster && (
              <button
                onClick={() => setSchritt(s => s - 1)}
                className="flex items-center gap-1 text-sm text-navy-500 hover:text-navy-700 px-3 py-2 rounded-xl hover:bg-navy-50 transition-colors"
              >
                <ChevronLeft size={16} /> Zurück
              </button>
            )}
            <button
              onClick={() => istLetzter ? onSchliessen() : setSchritt(s => s + 1)}
              className="flex items-center gap-1.5 text-sm font-semibold px-5 py-2.5 rounded-xl text-white transition-all"
              style={{ background: '#2e6b52' }}
            >
              {istLetzter ? 'Los geht\'s!' : 'Weiter'}
              {!istLetzter && <ChevronRight size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
