import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

function genCode(name, email) {
  const raw = (name || email || 'kw').split('@')[0].replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 4) || 'KW'
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase()
  return `${raw}${suffix}`
}

export function useReferral(userId, userEmail, userName) {
  const [code, setCode] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [laden, setLaden] = useState(true)

  useEffect(() => {
    if (!userId) { setLaden(false); return }

    async function init() {
      let { data: existing } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('user_id', userId)
        .maybeSingle()

      if (!existing) {
        const newCode = genCode(userName, userEmail)
        const { data: created } = await supabase
          .from('referral_codes')
          .insert({ user_id: userId, code: newCode })
          .select('code')
          .single()
        existing = created
      }

      setCode(existing?.code ?? null)

      const { data: refs } = await supabase
        .from('referrals')
        .select('*')
        .eq('referrer_id', userId)
        .order('created_at', { ascending: false })

      setReferrals(refs || [])
      setLaden(false)
    }

    init()
  }, [userId])

  return { code, referrals, laden }
}

export async function verarbeiteEinladung(userId, userEmail) {
  const gespeicherterCode = localStorage.getItem('kw_referral')
  if (!gespeicherterCode || !userId) return

  const { data: ref } = await supabase
    .from('referral_codes')
    .select('user_id')
    .eq('code', gespeicherterCode)
    .maybeSingle()

  if (!ref || ref.user_id === userId) {
    localStorage.removeItem('kw_referral')
    return
  }

  const { data: bereitsVorhanden } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_email', userEmail)
    .maybeSingle()

  if (!bereitsVorhanden) {
    await supabase.from('referrals').insert({
      referrer_id: ref.user_id,
      referred_email: userEmail,
      status: 'ausstehend',
    })
  }

  localStorage.removeItem('kw_referral')
}
