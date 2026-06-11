import { useState } from 'react'

export default function KategorieSelect({ kategorien, value, onChange, placeholder = 'Kategorie wählen...' }) {
  const [freitext, setFreitext] = useState(false)
  const [eigenerWert, setEigenerWert] = useState('')

  const alleEintraege = kategorien.flatMap(k => k.eintraege)
  const istSonstiges = value === 'Sonstiges' || freitext

  function handleSelect(e) {
    const val = e.target.value
    if (val === '__sonstiges__') {
      setFreitext(true)
      onChange('')
    } else {
      setFreitext(false)
      onChange(val)
    }
  }

  function handleFreitext(e) {
    setEigenerWert(e.target.value)
    onChange(e.target.value)
  }

  if (freitext) {
    return (
      <div className="flex gap-2">
        <input
          className="input flex-1"
          placeholder="Eigene Bezeichnung eingeben..."
          value={eigenerWert}
          onChange={handleFreitext}
          autoFocus
        />
        <button
          type="button"
          onClick={() => { setFreitext(false); setEigenerWert(''); onChange('') }}
          className="text-xs text-navy-400 hover:text-navy-600 whitespace-nowrap"
        >
          ← Zurück
        </button>
      </div>
    )
  }

  return (
    <select className="input" value={value || ''} onChange={handleSelect}>
      <option value="">{placeholder}</option>
      {kategorien.map(gruppe => (
        <optgroup key={gruppe.gruppe} label={gruppe.gruppe}>
          {gruppe.eintraege.map(eintrag => (
            eintrag === 'Sonstiges'
              ? <option key="sonstiges" value="__sonstiges__">Sonstiges (eigene Eingabe)</option>
              : <option key={eintrag} value={eintrag}>{eintrag}</option>
          ))}
        </optgroup>
      ))}
    </select>
  )
}
