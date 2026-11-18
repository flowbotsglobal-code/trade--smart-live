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

  const accent = buy
    ? 'border-emerald-400/25 shadow-[0_0_0_1px_rgba(52,211,153,0.04),0_10px_40px_-12px_rgba(16,185,129,0.35)]'
    : 'border-rose-400/25 shadow-[0_0_0_1px_rgba(251,113,133,0.04),0_10px_40px_-12px_rgba(244,63,94,0.35)]'

  return <motion.article
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.05, type: 'spring', stiffness: 380, damping: 30 }}
    className={`relative mb-3 overflow-hidden rounded-2xl border bg-[#0b0d10] ${accent}`}
  >
    <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-[3px] ${buy ? 'bg-emerald-400' : 'bg-rose-400'}`} />

    <div className="py-4 pl-5 pr-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <h2 className="truncate text-[17px] font-semibold tracking-tight text-white">{pair}</h2>
          <span className={`inline-flex shrink-0 items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-bold tracking-wider ${buy ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
            {buy ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
            {signal.direction}
          </span>
        </div>
        <time dateTime={createdAt?.toISOString()} className="shrink-0 text-[11px] font-medium tabular-nums text-zinc-500">
          {formatRelativeTime(createdAt, now, signal.time)}
        </time>
      </header>

      <p className={`mt-1 flex items-center gap-1.5 text-[11px] font-medium ${status.text}`}>
        <span aria-hidden="true" className={`size-1.5 rounded-full ${status.dot} ${signal.status === 'ACTIVE' || !signal.status ? 'animate-pulse' : ''}`} />
        {status.label}
      </p>

      <dl className="mt-4 divide-y divide-white/[0.05]" aria-label="Trade levels">
        <PriceRow label="Entry" value={signal.entry} valueClass="text-white" />
        <PriceRow label="SL" value={signal.sl} valueClass="text-rose-300" />
        <PriceRow label="TP1" value={signal.tp} valueClass="text-emerald-300" />
        {signal.tp2 ? <PriceRow label="TP2" value={signal.tp2} valueClass="text-emerald-300" /> : null}
        {signal.tp3 ? <PriceRow label="TP3" value={signal.tp3} valueClass="text-emerald-300" /> : null}
      </dl>

      <blockquote className="mt-4 border-l border-white/10 pl-3">
        <p className="text-[13.5px] italic leading-relaxed text-zinc-300">{`"${analystNote}"`}</p>
        <footer className="mt-1 text-[11px] font-medium not-italic text-zinc-500">{'— Desk analyst'}</footer>
      </blockquote>

      <div className="mt-4 flex items-center justify-between border-t border-white/[0.05] pt-3">
        <span className="text-[11px] font-medium text-zinc-500">Risk 1–2% per trade</span>
        <button
          type="button"
          onClick={() => onCopy(signal)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-xs font-semibold text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
        >
          {copied ? <><Check size={13} aria-hidden="true" className="text-emerald-300" /> Copied</> : <><Copy size={13} aria-hidden="true" /> Copy trade</>}
        </button>
      </div>
    </div>
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

  return <div className="flex items-center justify-between gap-3 py-2">
    <dt className="w-12 shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
    <dd className="flex min-w-0 items-center gap-1">
      <span className={`truncate font-mono text-[15px] font-semibold tabular-nums tracking-tight ${valueClass}`}>{value}</span>
      <button
        type="button"
        onClick={copyValue}
        aria-label={`Copy ${label} price ${value}`}
        className="grid size-7 shrink-0 place-items-center rounded-md text-zinc-600 transition-colors hover:bg-white/5 hover:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
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
