export const FIXKOSTEN_KATEGORIEN = [
  { gruppe: 'Wohnen', eintraege: ['Miete', 'Hypothek / Kredit', 'Nebenkosten (Strom, Gas, Wasser)', 'Hausratversicherung', 'Gebäudeversicherung', 'Rundfunkbeitrag (GEZ)', 'Internet & Telefon', 'Handy-Vertrag'] },
  { gruppe: 'Mobilität', eintraege: ['Kfz-Versicherung', 'Kfz-Steuer', 'Leasing-Rate', 'Autokredit', 'ÖPNV-Ticket / Monatsabo', 'Fahrkarte / Jobticket'] },
  { gruppe: 'Versicherungen', eintraege: ['Krankenversicherung', 'Private Krankenversicherung (PKV)', 'Pflegeversicherung', 'Haftpflichtversicherung', 'Berufsunfähigkeitsversicherung', 'Lebensversicherung', 'Unfallversicherung', 'Rechtsschutzversicherung', 'Reisekrankenversicherung'] },
  { gruppe: 'Vorsorge & Sparen', eintraege: ['Riester-Rente', 'Rürup-Rente', 'Betriebliche Altersvorsorge', 'ETF-Sparplan', 'Aktien-Sparplan', 'Tagesgeld-Sparplan', 'Bausparvertrag'] },
  { gruppe: 'Abonnements & Medien', eintraege: ['Netflix', 'Disney+', 'Amazon Prime', 'Spotify', 'Apple Music', 'YouTube Premium', 'Zeitschriften-Abo', 'Zeitung'] },
  { gruppe: 'Gesundheit & Fitness', eintraege: ['Fitnessstudio', 'Krankenzusatzversicherung', 'Physiotherapie', 'Medikamente (regelmäßig)'] },
  { gruppe: 'Kredite & Schulden', eintraege: ['Ratenkredit', 'Studienkredit', 'Konsumentenkredit', 'Kreditkartengebühr'] },
  { gruppe: 'Kinder & Familie', eintraege: ['Kita / Kindergarten', 'Schulmaterial / Nachhilfe', 'Vereinsbeitrag', 'Unterhalt'] },
  { gruppe: 'Sonstiges', eintraege: ['Sonstiges'] },
]

export const VARIABLE_KATEGORIEN = [
  { gruppe: 'Ernährung', eintraege: ['Lebensmittel / Einkauf', 'Restaurant / Essen gehen', 'Café / Kaffee', 'Takeaway / Lieferservice', 'Bäckerei'] },
  { gruppe: 'Mobilität', eintraege: ['Tanken', 'Parkgebühren', 'Taxi / Uber', 'Bahn / Zug', 'Fahrrad-Reparatur'] },
  { gruppe: 'Einkaufen', eintraege: ['Kleidung', 'Schuhe', 'Elektronik', 'Haushaltswaren', 'Drogerie / Kosmetik', 'Bücher'] },
  { gruppe: 'Freizeit & Unterhaltung', eintraege: ['Kino', 'Konzert / Theater', 'Sport / Hobby', 'Urlaub / Reise', 'Hotel', 'Ausflug'] },
  { gruppe: 'Gesundheit', eintraege: ['Apotheke / Medikamente', 'Arztbesuch', 'Zahnarzt', 'Optiker'] },
  { gruppe: 'Haushalt', eintraege: ['Reinigungsmittel', 'Reparaturen', 'Gartenarbeit', 'Möbel / Einrichtung'] },
  { gruppe: 'Persönliches', eintraege: ['Friseur', 'Kosmetik / Beauty', 'Geschenke', 'Spenden'] },
  { gruppe: 'Bildung', eintraege: ['Kurs / Weiterbildung', 'Bücher / Fachliteratur', 'Online-Kurs'] },
  { gruppe: 'Sonstiges', eintraege: ['Sonstiges'] },
]

export const INTERVALL_OPTIONEN = [
  { wert: 'monatlich', label: 'Monatlich', faktor: 1 },
  { wert: 'quartalsweise', label: 'Quartalsweise', faktor: 1 / 3 },
  { wert: 'halbjaehrlich', label: 'Halbjährlich', faktor: 1 / 6 },
  { wert: 'jaehrlich', label: 'Jährlich', faktor: 1 / 12 },
]

export function monatlicherBetrag(betrag, intervall) {
  const opt = INTERVALL_OPTIONEN.find(o => o.wert === intervall)
  return betrag * (opt?.faktor ?? 1)
}
