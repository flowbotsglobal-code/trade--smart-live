'use client'

import { motion } from 'framer-motion'
import { CreditCard, LoaderCircle, ShieldCheck, X } from 'lucide-react'
import { FormEvent, useEffect, useState } from 'react'

const MONNIFY_SDK_URL = 'https://sdk.monnify.com/plugin/monnify.js'
const MONNIFY_API_KEY = process.env.NEXT_PUBLIC_MONNIFY_API_KEY || 'AAVLUB2Q3GKPFZQYKWY1ZZ8MXV1P7UVV'
const MONNIFY_CONTRACT_CODE = process.env.NEXT_PUBLIC_MONNIFY_CONTRACT_CODE || '8318667671'
const VIP_AMOUNT = 15000

type MonnifyResponse = { status?: string; paymentStatus?: string; transactionReference?: string }
type MonnifySdk = { initialize: (options: Record<string, unknown>) => void }
declare global { interface Window { MonnifySDK?: MonnifySdk } }

let sdkPromise: Promise<MonnifySdk> | null = null
function loadMonnify() {
  if (window.MonnifySDK) return Promise.resolve(window.MonnifySDK)
  sdkPromise ??= new Promise<MonnifySdk>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = MONNIFY_SDK_URL
    script.async = true
    script.onload = () => (window.MonnifySDK ? resolve(window.MonnifySDK) : reject(new Error('Monnify failed to load.')))
    script.onerror = () => { sdkPromise = null; reject(new Error('Monnify failed to load.')) }
    document.body.appendChild(script)
  })
  return sdkPromise
}

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
type Phase = 'idle' | 'opening' | 'verifying' | 'error'

export default function MonnifyCheckout({ deviceId, onClose, onActivated }: { deviceId: string | null; onClose: () => void; onActivated: () => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [message, setMessage] = useState('')

  useEffect(() => { void loadMonnify().catch(() => undefined) }, [])

  async function verify(transactionReference: string) {
    setPhase('verifying')
    // Monnify can take a few seconds to mark a transfer PAID, so retry briefly before giving up.
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const response = await fetch('/api/monnify/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ transactionReference, deviceId }) }).catch(() => null)
      if (response?.ok) { onActivated(); return }
      if (response && response.status !== 402) break
      await new Promise((resolve) => window.setTimeout(resolve, 3000))
    }
    setPhase('error')
    setMessage(`We could not confirm this payment yet. Keep your reference ${transactionReference} and share your Device ID with support.`)
  }

  async function pay(event: FormEvent) {
    event.preventDefault()
    if (!deviceId) return
    setPhase('opening'); setMessage('')
    try {
      const sdk = await loadMonnify()
      sdk.initialize({
        amount: VIP_AMOUNT,
        currency: 'NGN',
        reference: `${deviceId}-${Date.now()}`,
        customerFullName: name.trim(),
        customerEmail: email.trim().toLowerCase(),
        apiKey: MONNIFY_API_KEY,
        contractCode: MONNIFY_CONTRACT_CODE,
        paymentDescription: 'Trade Smart Live VIP - 30 days',
        metadata: { deviceId },
        onLoadComplete: () => setPhase('idle'),
        onComplete: (response: MonnifyResponse) => {
          const status = response.paymentStatus || response.status
          if (response.transactionReference && (status === 'PAID' || status === 'SUCCESS' || status === 'PENDING')) void verify(response.transactionReference)
          else { setPhase('error'); setMessage('Payment was not completed. You have not been charged.') }
        },
        onClose: () => setPhase((current) => (current === 'verifying' ? current : 'idle')),
      })
    } catch {
      setPhase('error'); setMessage('Could not reach Monnify. Check your connection and try again.')
    }
  }

  const busy = phase === 'opening' || phase === 'verifying'
  return <motion.div className="fixed inset-0 z-[60] grid place-items-center bg-black/80 px-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
    <motion.form onSubmit={pay} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={spring} role="dialog" aria-modal="true" aria-labelledby="checkout-title" className="w-full max-w-[380px] rounded-2xl border border-cyan-500/30 bg-slate-950 p-5 shadow-2xl shadow-cyan-950/40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-cyan-300"><CreditCard size={18} aria-hidden="true" /><h2 id="checkout-title" className="font-bold text-white">Secure checkout</h2></div>
        <button type="button" onClick={onClose} disabled={phase === 'verifying'} aria-label="Close payment" className="grid size-9 place-items-center rounded-full text-slate-300 hover:bg-slate-800 disabled:opacity-40"><X size={18} /></button>
      </div>
      <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
        <p className="text-sm text-slate-300">Trade Smart Live VIP</p>
        <p className="mt-2 font-mono text-2xl font-bold text-white">₦15,000</p>
        <p className="mt-1 text-sm text-slate-300">30 days of VIP access</p>
        {deviceId && <p className="mt-3 border-t border-slate-800 pt-3 text-xs text-slate-400">Activates on device <span className="font-mono font-bold text-cyan-200">{deviceId}</span></p>}
      </div>
      <div className="mt-4 flex flex-col gap-3">
        <label className="text-sm text-slate-300">Full name<input required value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
        <label className="text-sm text-slate-300">Email address<input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="mt-1.5 h-11 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-sm text-white outline-none focus:border-cyan-400" /></label>
      </div>
      {message && <p role="alert" className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-relaxed text-amber-200">{message}</p>}
      <button type="submit" disabled={busy || !deviceId} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 text-sm font-bold text-slate-950 transition-all active:scale-[0.99] disabled:opacity-60">
        {busy && <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />}
        {phase === 'verifying' ? 'Confirming payment...' : phase === 'opening' ? 'Opening Monnify...' : 'Pay ₦15,000 with Monnify'}
      </button>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-xs text-slate-400"><ShieldCheck size={13} aria-hidden="true" /> Card, transfer & USSD secured by Monnify</p>
    </motion.form>
  </motion.div>
}
