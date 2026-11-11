'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { BookOpen, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

type TradeDirection = 'BUY' | 'SELL'
type TradeOutcome = 'WIN' | 'LOSS' | 'BE'

type JournalTrade = {
  id: string
  pair: string
  direction: TradeDirection
  entry: number
  exit: number
  entryDisplay?: string
  exitDisplay?: string
  outcome: TradeOutcome
  pips: number
  notes: string
  createdAt: string
}

const JOURNAL_STORAGE_KEY = 'trade-smart-live-journal-v1'

function isJournalTrade(value: unknown): value is JournalTrade {
  if (!value || typeof value !== 'object') return false

  const trade = value as Partial<JournalTrade>
  return typeof trade.id === 'string'
    && typeof trade.pair === 'string'
    && (trade.direction === 'BUY' || trade.direction === 'SELL')
    && Number.isFinite(trade.entry)
    && Number.isFinite(trade.exit)
    && (trade.entryDisplay === undefined || typeof trade.entryDisplay === 'string')
    && (trade.exitDisplay === undefined || typeof trade.exitDisplay === 'string')
    && (trade.outcome === 'WIN' || trade.outcome === 'LOSS' || trade.outcome === 'BE')
    && Number.isFinite(trade.pips)
    && typeof trade.notes === 'string'
    && typeof trade.createdAt === 'string'
    && Number.isFinite(Date.parse(trade.createdAt))
}

function readTrades(value: string | null): JournalTrade[] {
  if (!value) return []

  try {
    const parsed: unknown = JSON.parse(value)
    return Array.isArray(parsed) ? parsed.filter(isJournalTrade) : []
  } catch {
    return []
  }
}

function getPipSize(pair: string) {
  const normalizedPair = pair.toUpperCase().replace(/[^A-Z]/g, '')
  if (normalizedPair.includes('XAU')) return 0.1
  if (normalizedPair.includes('JPY') || normalizedPair.includes('XAG')) return 0.01
  return 0.0001
}

function formatPips(value: number) {
  const formatted = value.toFixed(1)
  return value > 0 ? `+${formatted}` : formatted
}

function formatTradeDate(value: string) {
  return new Intl.DateTimeFormat('en-NG', {
    timeZone: 'Africa/Lagos',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

const outcomeStyles: Record<TradeOutcome, string> = {
  WIN: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  LOSS: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  BE: 'border-slate-500/40 bg-slate-700/40 text-slate-200',
}

export default function JournalTab() {
  const [trades, setTrades] = useState<JournalTrade[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [storageUnavailable, setStorageUnavailable] = useState(false)

  useEffect(() => {
    try {
      setTrades(readTrades(window.localStorage.getItem(JOURNAL_STORAGE_KEY)))
    } catch {
      setStorageUnavailable(true)
    }
    setHasLoaded(true)

    const syncAcrossTabs = (event: StorageEvent) => {
      if (event.key === JOURNAL_STORAGE_KEY) setTrades(readTrades(event.newValue))
    }
    window.addEventListener('storage', syncAcrossTabs)
    return () => window.removeEventListener('storage', syncAcrossTabs)
  }, [])

  useEffect(() => {
    if (!hasLoaded) return

    try {
      window.localStorage.setItem(JOURNAL_STORAGE_KEY, JSON.stringify(trades))
    } catch {
      setStorageUnavailable(true)
    }
  }, [hasLoaded, trades])

  const metrics = useMemo(() => {
    const decisiveTrades = trades.filter((trade) => trade.outcome !== 'BE')
    const wins = trades.filter((trade) => trade.outcome === 'WIN').length
    const totalPips = trades.reduce((total, trade) => total + trade.pips, 0)

    return {
      winRate: decisiveTrades.length ? Math.round((wins / decisiveTrades.length) * 100) : 0,
      totalPips,
      totalTrades: trades.length,
    }
  }, [trades])

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    const formData = new FormData(form)
    const pair = String(formData.get('pair') ?? '').trim().toUpperCase()
    const direction = String(formData.get('direction') ?? 'BUY') as TradeDirection
    const entryDisplay = String(formData.get('entry') ?? '').trim()
    const exitDisplay = String(formData.get('exit') ?? '').trim()
    const entry = Number(entryDisplay)
    const exit = Number(exitDisplay)
    const notes = String(formData.get('notes') ?? '').trim()

    if (!pair || !Number.isFinite(entry) || entry <= 0 || !Number.isFinite(exit) || exit <= 0) {
      setFormError('Enter a pair and valid entry and exit prices.')
      return
    }

    const priceMove = direction === 'BUY' ? exit - entry : entry - exit
    const pips = Number((priceMove / getPipSize(pair)).toFixed(1))
    const trade: JournalTrade = {
      id: crypto.randomUUID(),
      pair,
      direction,
      entry,
      exit,
      entryDisplay,
      exitDisplay,
      outcome: pips > 0 ? 'WIN' : pips < 0 ? 'LOSS' : 'BE',
      pips,
      notes,
      createdAt: new Date().toISOString(),
    }

    setTrades((currentTrades) => [trade, ...currentTrades])
    setFormError('')
    form.reset()
    setFormOpen(false)
  }

  function removeTrade(id: string) {
    setTrades((currentTrades) => currentTrades.filter((trade) => trade.id !== id))
  }

  return (
    <div className="min-w-0 flex flex-col gap-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Free journal</p>
          <h2 className="mt-1 text-xl font-bold leading-tight text-white">Free Trade Journal</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-200">Track your trades, calculate PnL, and build discipline.</p>
        </div>
        <BookOpen aria-hidden="true" className="mt-1 size-5 shrink-0 text-cyan-300" />
      </header>

      <section aria-label="Journal summary" className="grid grid-cols-3 gap-2">
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-[10px] font-semibold leading-tight text-slate-300">Win Rate</p>
          <p className="mt-2 font-mono text-lg font-bold text-white">{metrics.winRate}%</p>
          <p className="mt-1 text-[9px] leading-tight text-slate-400">BE excluded</p>
        </article>
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-[10px] font-semibold leading-tight text-slate-300">Total Pips Gained</p>
          <p className={`mt-2 truncate font-mono text-lg font-bold ${metrics.totalPips >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatPips(metrics.totalPips)}</p>
          <p className="mt-1 text-[9px] leading-tight text-slate-400">All logged trades</p>
        </article>
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-[10px] font-semibold leading-tight text-slate-300">Total Trades Logged</p>
          <p className="mt-2 font-mono text-lg font-bold text-white">{metrics.totalTrades}</p>
          <p className="mt-1 text-[9px] leading-tight text-slate-400">Saved on this device</p>
        </article>
      </section>

      <section aria-labelledby="journal-form-heading">
        <Button
          type="button"
          variant="outline"
          aria-expanded={formOpen}
          aria-controls="journal-trade-form"
          onClick={() => { setFormOpen((open) => !open); setFormError('') }}
          className="min-h-11 w-full justify-center border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
        >
          <Plus data-icon="inline-start" aria-hidden="true" />
          {formOpen ? 'Close trade form' : 'Log a trade'}
        </Button>

        {formOpen && (
          <form id="journal-trade-form" onSubmit={handleSubmit} className="mt-4 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
            <h3 id="journal-form-heading" className="text-base font-bold text-white">Add trade</h3>
            <p className="mt-1 text-xs leading-relaxed text-slate-300">Pips use standard sizing: 0.0001 FX, 0.01 JPY/XAG, and 0.1 XAU.</p>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                Asset / Pair
                <input name="pair" required maxLength={18} placeholder="EUR/USD or XAU/USD" autoComplete="off" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                Direction
                <select name="direction" defaultValue="BUY" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30">
                  <option value="BUY">BUY</option>
                  <option value="SELL">SELL</option>
                </select>
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                Entry Price
                <input name="entry" type="text" inputMode="decimal" maxLength={20} required placeholder="0.0000" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                Exit Price
                <input name="exit" type="text" inputMode="decimal" maxLength={20} required placeholder="0.0000" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
              </label>

              <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200 sm:col-span-2">
                Trade Notes
                <textarea name="notes" maxLength={500} rows={3} placeholder="What did you notice? What would you repeat or improve?" className="min-h-24 min-w-0 resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base leading-relaxed text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
              </label>
            </div>

            {formError && <p role="alert" className="mt-3 text-sm font-medium text-rose-200">{formError}</p>}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} className="min-h-11 border-slate-700 text-slate-200 hover:bg-slate-800">Cancel</Button>
              <Button type="submit" className="min-h-11 bg-cyan-400 px-5 font-bold text-slate-950 hover:bg-cyan-300">Save trade</Button>
            </div>
          </form>
        )}
      </section>

      {storageUnavailable && <p role="status" className="rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">Local storage is unavailable in this browser. Trades will only remain until you close this page.</p>}

      <section aria-labelledby="trade-history-heading">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 id="trade-history-heading" className="text-base font-bold text-white">Trade History</h3>
          <span className="text-xs font-medium text-slate-300">{metrics.totalTrades} {metrics.totalTrades === 1 ? 'trade' : 'trades'}</span>
        </div>

        {!hasLoaded ? (
          <p role="status" className="rounded-xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">Loading your journal…</p>
        ) : trades.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/50 p-6 text-center">
            <BookOpen aria-hidden="true" className="mx-auto size-8 text-slate-400" />
            <p className="mt-3 font-semibold text-slate-100">No trades logged yet</p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">Add your first trade to start tracking performance.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {trades.map((trade) => (
              <article key={trade.id} className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-4">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-base font-bold text-white">{trade.pair}</h4>
                    <p className="mt-1 text-xs text-slate-300">{trade.direction} <span aria-hidden="true">·</span> {formatTradeDate(trade.createdAt)}</p>
                  </div>
                  <span aria-label={`Trade result: ${trade.outcome === 'BE' ? 'breakeven' : trade.outcome.toLowerCase()}`} className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${outcomeStyles[trade.outcome]}`}>
                    {trade.outcome}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-sm">
                  <p className="text-slate-300">Entry <span className="ml-1 font-mono font-semibold text-slate-100">{trade.entryDisplay ?? String(trade.entry)}</span></p>
                  <p className="text-slate-300">Exit <span className="ml-1 font-mono font-semibold text-slate-100">{trade.exitDisplay ?? String(trade.exit)}</span></p>
                  <p className="text-slate-300">Pips <span className={`ml-1 font-mono font-bold ${trade.pips >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatPips(trade.pips)}</span></p>
                  <Button type="button" variant="ghost" size="sm" onClick={() => removeTrade(trade.id)} aria-label={`Delete ${trade.pair} trade`} className="h-7 justify-self-end px-2 text-slate-300 hover:text-rose-200">
                    <Trash2 data-icon="inline-start" aria-hidden="true" />
                    Delete
                  </Button>
                </div>

                {trade.notes && <p className="mt-3 break-words border-t border-slate-800 pt-3 text-sm leading-relaxed text-slate-200">{trade.notes}</p>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
