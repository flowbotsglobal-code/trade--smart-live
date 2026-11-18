'use client'

import { Check, Copy, Fingerprint, Gift } from 'lucide-react'
import { useState } from 'react'
import type { Membership } from '@/lib/use-membership'

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null)
  const copy = (key: string, value: string) => {
    void navigator.clipboard?.writeText(value).then(() => { setCopied(key); window.setTimeout(() => setCopied(null), 1800) }).catch(() => undefined)
  }
  return { copied, copy }
}

export default function DeviceIdCard({ deviceId, membership }: { deviceId: string | null; membership: Membership | null }) {
  const { copied, copy } = useCopy()
  const referralLink = deviceId && typeof window !== 'undefined' ? `${window.location.origin}/?ref=${deviceId}` : ''
  const expires = membership?.vipExpiresAt ? new Date(membership.vipExpiresAt) : null
  const daysLeft = expires ? Math.max(0, Math.ceil((expires.getTime() - Date.now()) / 86_400_000)) : 0

  return <div className="flex flex-col gap-3">
    <section aria-labelledby="device-id-heading" className="rounded-2xl border border-cyan-400/40 bg-gradient-to-br from-cyan-400/10 via-blue-500/10 to-slate-900 p-5 shadow-lg shadow-cyan-950/30">
      <div className="flex items-center gap-2 text-cyan-300"><Fingerprint size={16} aria-hidden="true" /><h2 id="device-id-heading" className="text-xs font-bold uppercase tracking-[0.18em]">Your Device ID</h2></div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="min-w-0 truncate font-mono text-2xl font-bold tracking-wider text-white" aria-live="polite">{deviceId ?? 'Generating...'}</p>
        <button type="button" disabled={!deviceId} onClick={() => deviceId && copy('id', deviceId)} className="flex h-10 shrink-0 touch-manipulation items-center gap-1.5 rounded-lg bg-cyan-400 px-3 text-sm font-bold text-slate-950 transition-all active:scale-95 disabled:opacity-50">
          {copied === 'id' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === 'id' ? 'Copied' : 'Copy'}
        </button>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-300">Share this ID with support to activate or restore VIP access on this device.</p>
      <div className={`mt-4 flex items-center justify-between rounded-xl border p-3 ${membership?.isVip ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-slate-700 bg-slate-900/70'}`}>
        <span className={`text-sm font-bold ${membership?.isVip ? 'text-emerald-300' : 'text-slate-300'}`}>{membership?.isVip ? 'VIP active' : 'Free plan'}</span>
        {membership?.isVip && <span className="font-mono text-sm font-bold text-emerald-200">{daysLeft} day{daysLeft === 1 ? '' : 's'} left</span>}
      </div>
    </section>
    <section aria-labelledby="referral-heading" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="flex items-center gap-2 text-amber-300"><Gift size={16} aria-hidden="true" /><h2 id="referral-heading" className="text-xs font-bold uppercase tracking-[0.18em]">Earn ₦5,000 per referral</h2></div>
      <p className="mt-2 text-sm leading-relaxed text-slate-300">Earn ₦5,000 when a friend joins VIP with your link.</p>
      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-400">Referrals</p><p className="mt-1 font-mono text-lg font-bold text-white">{membership?.referralCount ?? 0}</p></div>
        <div className="rounded-lg border border-slate-800 bg-slate-950 p-3"><p className="text-xs text-slate-400">Earned</p><p className="mt-1 font-mono text-lg font-bold text-amber-200">₦{(membership?.referralEarnings ?? 0).toLocaleString('en-NG')}</p></div>
      </div>
      <button type="button" disabled={!referralLink} onClick={() => copy('ref', referralLink)} className="mt-3 flex h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-amber-400/40 text-sm font-bold text-amber-200 transition-all active:scale-95 disabled:opacity-50">
        {copied === 'ref' ? <Check size={15} aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}{copied === 'ref' ? 'Link copied' : 'Copy referral link'}
      </button>
    </section>
  </div>
}
