import { useState } from 'react'

export default function KategorieSelect({
  kategorien, value, onChange,
  onGruppe, kategorieGruppe,
  placeholder = 'Kategorie wählen...',
}) {
  const alleEintraege = kategorien.flatMap(k => k.eintraege).filter(e => e !== 'Sonstiges')
  const istCustom = !!kategorieGruppe && !alleEintraege.includes(value)

  const [freitext, setFreitext] = useState(istCustom)
  const [aktiveGruppe, setAktiveGruppe] = useState(kategorieGruppe || '')
  const [eigenerWert, setEigenerWert] = useState(istCustom ? value : '')

  function handleSelect(e) {
    const val = e.target.value
    if (val.startsWith('__sonstiges__')) {
      const gruppe = val.slice('__sonstiges__'.length)
      setFreitext(true)
      setAktiveGruppe(gruppe)
      setEigenerWert('')
      onChange('')
      onGruppe?.(gruppe)
    } else {
      setFreitext(false)
      setAktiveGruppe('')
      onChange(val)
      onGruppe?.(null)
    }
  }

  function handleFreitext(e) {
    setEigenerWert(e.target.value)
    onChange(e.target.value)
  }

  function zurueck() {
    setFreitext(false)
    setAktiveGruppe('')
    setEigenerWert('')
    onChange('')
    onGruppe?.(null)
  }

  if (freitext) {
    return (
      <div className="space-y-1">
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Eigene Bezeichnung eingeben..."
            value={eigenerWert}
            onChange={handleFreitext}
            autoFocus
          />
          <button type="button" onClick={zurueck}
            className="text-xs text-navy-400 hover:text-navy-600 whitespace-nowrap">
            ← Zurück
          </button>
        </div>
        {aktiveGruppe && (
          <p className="text-xs text-navy-400">Wird zugeordnet zu: <span className="font-medium text-navy-600">{aktiveGruppe}</span></p>
        )}
      </div>
    )
  }

  return (
    <select className="input" value={value || ''} onChange={handleSelect}>
      <option value="">{placeholder}</option>
      {kategorien.map(gruppe => (
        <optgroup key={gruppe.gruppe} label={gruppe.gruppe}>
          {gruppe.eintraege
            .filter(e => e !== 'Sonstiges')
            .map(eintrag => (
              <option key={eintrag} value={eintrag}>{eintrag}</option>
            ))}
          <option value={`__sonstiges__${gruppe.gruppe}`}>— Sonstiges (eigene Eingabe)</option>
        </optgroup>
      ))}
    </select>
  )
}
