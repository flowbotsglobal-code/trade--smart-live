'use client'

import { useState } from 'react'
import { ArrowDownRight, ArrowUpRight, Check, X } from 'lucide-react'

type SignalStatus = 'ACTIVE' | 'WIN' | 'LOSS'

export type TrackRecordSignal = {
  id: number
  pair: string
  direction: 'BUY' | 'SELL'
  entry: string
  sl: string
  tp1: string
  status: SignalStatus
}

type Props = {
  signals: TrackRecordSignal[]
  onClose: (id: number, status: 'WIN' | 'LOSS') => Promise<void> | void
}

export function formatPrice(raw: string) {
  const value = raw?.trim()
  if (!value) return '—'
  const normalized = value.replace(/,/g, '')
  if (!/^-?\d*\.?\d+$/.test(normalized)) return value
  const number = Number(normalized)
  if (!Number.isFinite(number)) return value
  const decimals = Math.abs(number) >= 1000 ? 2 : Math.abs(number) >= 10 ? 3 : 5
  return number.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

export function AdminTrackRecord({ signals, onClose }: Props) {
  const [pending, setPending] = useState<number | null>(null)
  const ordered = [...signals].sort((a, b) => Number(b.status === 'ACTIVE') - Number(a.status === 'ACTIVE'))
  const openCount = signals.filter((item) => item.status === 'ACTIVE').length

  async function handleClose(id: number, status: 'WIN' | 'LOSS') {
    setPending(id)
    try {
      await onClose(id, status)
    } finally {
      setPending(null)
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-zinc-500">
        <span>Position</span>
        <span className="tabular-nums">{openCount} open</span>
      </div>

      {ordered.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-500">No signals broadcast yet.</p>
      ) : (
        <ul className="divide-y divide-zinc-800/70">
          {ordered.map((item) => {
            const isBuy = item.direction === 'BUY'
            const isActive = item.status === 'ACTIVE'
            const busy = pending === item.id
            return (
              <li key={item.id} className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-4 ${isActive ? '' : 'opacity-60'}`}>
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <span aria-hidden="true" className={`mt-1 h-8 w-0.5 shrink-0 rounded-full ${isBuy ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold tracking-tight text-zinc-100">{item.pair}</p>
                      <span className={`inline-flex shrink-0 items-center gap-0.5 text-[11px] font-semibold uppercase tracking-wide ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isBuy ? <ArrowUpRight size={12} aria-hidden="true" /> : <ArrowDownRight size={12} aria-hidden="true" />}
                        {item.direction}
                      </span>
                    </div>
                    <dl className="mt-1.5 grid grid-cols-3 gap-3 font-mono text-xs tabular-nums">
                      <PriceCell label="Entry" value={item.entry} className="text-zinc-200" />
                      <PriceCell label="SL" value={item.sl} className="text-rose-300/90" />
                      <PriceCell label="TP1" value={item.tp1} className="text-emerald-300/90" />
                    </dl>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pl-3.5 sm:pl-0">
                  {isActive ? (
                    <>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleClose(item.id, 'WIN')}
                        aria-label={`Close ${item.pair} ${item.direction} as win`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-emerald-500/30 px-2.5 text-xs font-medium text-emerald-300 transition-colors hover:border-emerald-400/60 hover:bg-emerald-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 disabled:opacity-40"
                      >
                        <Check size={13} aria-hidden="true" /> Win
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => handleClose(item.id, 'LOSS')}
                        aria-label={`Close ${item.pair} ${item.direction} as loss`}
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-rose-500/30 px-2.5 text-xs font-medium text-rose-300 transition-colors hover:border-rose-400/60 hover:bg-rose-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/50 disabled:opacity-40"
                      >
                        <X size={13} aria-hidden="true" /> Loss
                      </button>
                    </>
                  ) : (
                    <span className={`inline-flex h-6 items-center rounded px-2 text-[11px] font-semibold uppercase tracking-wide ${item.status === 'WIN' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                      {item.status === 'WIN' ? 'Closed win' : 'Closed loss'}
                    </span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function PriceCell({ label, value, className }: { label: string; value: string; className: string }) {
  const formatted = formatPrice(value)
  return (
    <div className="min-w-0">
      <dt className="font-sans text-[10px] uppercase tracking-[0.12em] text-zinc-500">{label}</dt>
      <dd className={`truncate ${className}`} title={value}>{formatted}</dd>
    </div>
  )
}
