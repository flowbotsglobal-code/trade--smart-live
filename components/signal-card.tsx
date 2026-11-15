'use client'

import { motion } from 'framer-motion'
import { ArrowDownRight, ArrowUpRight, Check, Copy } from 'lucide-react'
import { useEffect, useState } from 'react'

export type Signal = {
  id: string | number
  pair: string
  direction: 'BUY' | 'SELL'
  entry: string
  tp: string
  sl: string
  tp2?: string
  tp3?: string
  notes?: string
  confidence: string
  time: string
  status?: 'ACTIVE' | 'WIN' | 'LOSS'
  pips?: string
  createdAt?: unknown
}

type SignalCardProps = {
  signal: Signal
  index: number
  copied: boolean
  onCopy: (signal: Signal) => void
}

export default function SignalCard({ signal, index, copied, onCopy }: SignalCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const buy = signal.direction === 'BUY'
  const createdAt = toDate(signal.createdAt)
  const status = signal.status ?? 'ACTIVE'
  const statusText = status === 'WIN'
    ? 'WIN — Position closed in profit'
    : status === 'LOSS'
      ? 'LOSS — Stop loss reached; protect your account'
      : 'ACTIVE — Follow your plan and manage risk'
  const analystNote = signal.notes?.trim() || 'Use proper lot size. Secure 50% at TP1.'

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  return <motion.article
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.06, type: 'spring', stiffness: 420, damping: 28 }}
    className="mb-3 rounded-2xl border border-slate-800 bg-slate-950/90 p-4 shadow-xl shadow-indigo-950/20"
  >
    <header className="flex min-w-0 items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-400">VIP signal</p>
        <h2 className="mt-1 truncate font-mono text-2xl font-black tracking-wide text-white" aria-label={signal.pair}>
          {signal.pair.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}
        </h2>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide ${buy ? 'bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-400/30' : 'bg-rose-500/15 text-rose-200 ring-1 ring-rose-400/30'}`}>
          {buy ? <ArrowUpRight size={14} aria-hidden="true" /> : <ArrowDownRight size={14} aria-hidden="true" />}
          {signal.direction}
        </span>
        <time dateTime={createdAt?.toISOString()} className="text-right font-mono text-[11px] font-semibold text-slate-300">
          {formatRelativeTime(createdAt, now, signal.time)}
        </time>
      </div>
    </header>

    <div className="mt-4 grid grid-cols-2 gap-2" aria-label="Trade execution prices">
      <PriceLevel label="ENTRY PRICE" value={signal.entry} tone="cyan" />
      <PriceLevel label="STOP LOSS (SL)" value={signal.sl} tone="rose" />
      <PriceLevel label="TAKE PROFIT 1 (TP1)" value={signal.tp} tone="emerald" />
      <PriceLevel label="TAKE PROFIT 2 (TP2)" value={signal.tp2 || 'Not set'} tone="emerald" />
    </div>

    <div className={`mt-3 rounded-xl border px-3 py-3 ${status === 'LOSS' ? 'border-rose-500/30 bg-rose-500/10' : status === 'WIN' ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-cyan-500/25 bg-cyan-500/10'}`}>
      <p className={`text-xs font-extrabold tracking-wide ${status === 'LOSS' ? 'text-rose-200' : status === 'WIN' ? 'text-emerald-200' : 'text-cyan-100'}`}>
        {statusText}
      </p>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-200">{analystNote}</p>
    </div>

    <motion.button
      type="button"
      whileTap={{ scale: 0.98 }}
      onClick={() => onCopy(signal)}
      className={`mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl text-sm font-bold transition-colors ${copied ? 'bg-white text-slate-950' : 'border border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800'}`}
    >
      {copied ? <><Check size={15} aria-hidden="true" /> Copied signal</> : <><Copy size={15} aria-hidden="true" /> Copy all trade levels</>}
    </motion.button>
  </motion.article>
}

function PriceLevel({ label, value, tone }: { label: string; value: string; tone: 'cyan' | 'rose' | 'emerald' }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')
  const valueColor = tone === 'cyan' ? 'text-cyan-100' : tone === 'rose' ? 'text-rose-200' : 'text-emerald-200'

  async function copyValue() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value)
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.setTimeout(() => setCopyState('idle'), 1600)
  }

  return <div className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
    <div className="flex min-w-0 items-center justify-between gap-1">
      <p className="min-w-0 text-[10px] font-bold leading-tight tracking-wide text-slate-300">{label}</p>
      <button type="button" onClick={copyValue} aria-label={`Copy ${label}: ${value}`} className="grid size-7 shrink-0 place-items-center rounded-md text-slate-300 transition-colors hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300">
        {copyState === 'copied' ? <Check size={14} aria-hidden="true" /> : <Copy size={13} aria-hidden="true" />}
      </button>
    </div>
    <p className={`mt-1 break-all font-mono text-base font-extrabold tracking-tight ${valueColor}`}>{value}</p>
    <span className="sr-only" aria-live="polite">{copyState === 'copied' ? `${label} copied` : copyState === 'failed' ? 'Could not copy price' : ''}</span>
  </div>
}

function toDate(value: unknown): Date | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) return value
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value)
    return Number.isFinite(date.getTime()) ? date : undefined
  }
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    const date = value.toDate()
    return date instanceof Date && Number.isFinite(date.getTime()) ? date : undefined
  }
  return undefined
}

function formatRelativeTime(date: Date | undefined, now: number, fallback: string) {
  if (!date) return `${fallback} · WAT`
  const elapsed = Math.max(0, now - date.getTime())
  if (elapsed < 60_000) return 'Just now · WAT'
  if (elapsed < 60 * 60_000) return `${Math.floor(elapsed / 60_000)} mins ago · WAT`
  if (elapsed < 24 * 60 * 60_000) return `${Math.floor(elapsed / (60 * 60_000))} hrs ago · WAT`
  if (elapsed < 7 * 24 * 60 * 60_000) return `${Math.floor(elapsed / (24 * 60 * 60_000))} days ago · WAT`
  const localTime = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date)
  return `${localTime} WAT`
}

