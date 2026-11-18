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

const statusMeta = {
  ACTIVE: { label: 'Running', dot: 'bg-sky-400', text: 'text-sky-300' },
  WIN: { label: 'Closed in profit', dot: 'bg-emerald-400', text: 'text-emerald-300' },
  LOSS: { label: 'Stopped out', dot: 'bg-rose-400', text: 'text-rose-300' },
} as const

export default function SignalCard({ signal, index, copied, onCopy }: SignalCardProps) {
  const [now, setNow] = useState(() => Date.now())
  const buy = signal.direction === 'BUY'
  const createdAt = toDate(signal.createdAt)
  const status = statusMeta[signal.status ?? 'ACTIVE']
  const analystNote = signal.notes?.trim() || 'Use proper lot size. Secure 50% at TP1 and move SL to entry.'
  const pair = formatPair(signal.pair)

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => window.clearInterval(interval)
  }, [])

  const isLive = !signal.status || signal.status === 'ACTIVE'

  return <motion.article
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.04, type: 'spring', stiffness: 380, damping: 32 }}
    className={`mb-3 rounded-xl border bg-[#0a0c0f] px-4 py-3.5 ${buy ? 'border-emerald-400/20' : 'border-rose-400/20'}`}
  >
    <header className="flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2">
        <h2 className="truncate text-[16px] font-bold tracking-tight text-white">{pair}</h2>
        <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-full px-2 py-0.5 text-[10.5px] font-bold tracking-wider ${buy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>
          {buy ? <ArrowUpRight size={11} aria-hidden="true" /> : <ArrowDownRight size={11} aria-hidden="true" />}
          {signal.direction}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <span className="flex items-center gap-1.5 text-[11px] font-medium tabular-nums text-zinc-500">
          <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot} ${isLive ? 'animate-pulse' : ''}`} />
          <span className="sr-only">{status.label}, </span>
          <time dateTime={createdAt?.toISOString()}>{formatRelativeTime(createdAt, now, signal.time)}</time>
        </span>
        <button
          type="button"
          onClick={() => onCopy(signal)}
          aria-label={copied ? 'Setup copied' : `Copy ${pair} ${signal.direction} setup`}
          title="Copy setup"
          className="-mr-1.5 grid size-8 place-items-center rounded-md text-zinc-500 transition-colors hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {copied ? <Check size={14} aria-hidden="true" className="text-emerald-300" /> : <Copy size={14} aria-hidden="true" />}
        </button>
      </div>
    </header>

    <dl className="mt-2.5 divide-y divide-white/5 border-y border-white/5" aria-label="Trade levels">
      <PriceRow label="Entry" value={signal.entry} valueClass="text-zinc-100" />
      <PriceRow label="Stop Loss" value={signal.sl} valueClass="text-rose-300/90" />
      <PriceRow label="TP 1" value={signal.tp} valueClass="text-emerald-300/90" />
      {signal.tp2 ? <PriceRow label="TP 2" value={signal.tp2} valueClass="text-emerald-300/90" /> : null}
      {signal.tp3 ? <PriceRow label="TP 3" value={signal.tp3} valueClass="text-emerald-300/90" /> : null}
    </dl>

    <p className={`mt-3 border-l-2 pl-3 text-[13px] leading-relaxed text-zinc-400 ${buy ? 'border-emerald-400/40' : 'border-rose-400/40'}`}>
      {analystNote}
    </p>
  </motion.article>
}

function PriceRow({ label, value, valueClass }: { label: string; value: string; valueClass: string }) {
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle')

  async function copyValue() {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(value.replace(/,/g, ''))
      setCopyState('copied')
    } catch {
      setCopyState('failed')
    }
    window.setTimeout(() => setCopyState('idle'), 1500)
  }

  return <div className="flex items-center justify-between gap-3 py-1.5">
    <dt className="shrink-0 text-[13px] font-medium text-zinc-500">{label}</dt>
    <dd className="flex min-w-0 items-center gap-0.5">
      <span title={value} className={`truncate font-mono text-[14.5px] font-medium tabular-nums ${valueClass}`}>{value}</span>
      <button
        type="button"
        onClick={copyValue}
        aria-label={`Copy ${label} price ${value}`}
        className="-mr-1.5 grid size-7 shrink-0 place-items-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
      >
        {copyState === 'copied' ? <Check size={12} aria-hidden="true" className="text-emerald-300" /> : <Copy size={12} aria-hidden="true" />}
      </button>
      <span className="sr-only" aria-live="polite">{copyState === 'copied' ? `${label} copied` : copyState === 'failed' ? 'Could not copy price' : ''}</span>
    </dd>
  </div>
}

function formatPair(pair: string) {
  const clean = pair.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  return clean.length === 6 ? `${clean.slice(0, 3)}/${clean.slice(3)}` : pair.toUpperCase()
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
  if (elapsed < 60 * 60_000) return `${Math.floor(elapsed / 60_000)}m ago · WAT`
  if (elapsed < 24 * 60 * 60_000) return `${Math.floor(elapsed / (60 * 60_000))}h ago · WAT`
  if (elapsed < 7 * 24 * 60 * 60_000) return `${Math.floor(elapsed / (24 * 60 * 60_000))}d ago · WAT`
  const localTime = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(date)
  return `${localTime} WAT`
}
