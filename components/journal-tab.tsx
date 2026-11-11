'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Toggle } from '@base-ui/react/toggle'
import { ToggleGroup } from '@base-ui/react/toggle-group'
import { BookOpen, Plus, Trash2, X } from 'lucide-react'
import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@/components/ui/button'

type TradeDirection = 'BUY' | 'SELL'
type TradeOutcome = 'WIN' | 'LOSS' | 'BE'

type JournalTrade = {
  id: string
  pair: string
  direction: TradeDirection
  entry: number
  stopLoss?: number
  takeProfit?: number
  exit: number
  entryDisplay?: string
  stopLossDisplay?: string
  takeProfitDisplay?: string
  exitDisplay?: string
  riskAmount?: number
  resultUsd?: number
  outcome: TradeOutcome
  pips: number
  notes: string
  createdAt: string
}

type TradeDraft = {
  pair: string
  direction: TradeDirection
  entry: string
  stopLoss: string
  takeProfit: string
  exit: string
  riskAmount: string
  notes: string
}

type RiskProfile = {
  riskDistance: number
  rewardRisk: number
}

const JOURNAL_STORAGE_KEY = 'trade-smart-live-journal-v1'
const EMPTY_TRADE_DRAFT: TradeDraft = {
  pair: '',
  direction: 'BUY',
  entry: '',
  stopLoss: '',
  takeProfit: '',
  exit: '',
  riskAmount: '100',
  notes: '',
}

function isJournalTrade(value: unknown): value is JournalTrade {
  if (!value || typeof value !== 'object') return false

  const trade = value as Partial<JournalTrade>
  return typeof trade.id === 'string'
    && typeof trade.pair === 'string'
    && (trade.direction === 'BUY' || trade.direction === 'SELL')
    && Number.isFinite(trade.entry)
    && Number.isFinite(trade.exit)
    && (trade.stopLoss === undefined || Number.isFinite(trade.stopLoss))
    && (trade.takeProfit === undefined || Number.isFinite(trade.takeProfit))
    && (trade.riskAmount === undefined || Number.isFinite(trade.riskAmount))
    && (trade.resultUsd === undefined || Number.isFinite(trade.resultUsd))
    && (trade.entryDisplay === undefined || typeof trade.entryDisplay === 'string')
    && (trade.stopLossDisplay === undefined || typeof trade.stopLossDisplay === 'string')
    && (trade.takeProfitDisplay === undefined || typeof trade.takeProfitDisplay === 'string')
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

function parsePositiveNumber(value: string) {
  const parsed = Number(value.trim().replaceAll(',', ''))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function getRiskProfile(direction: TradeDirection, entry: number, stopLoss: number, takeProfit: number): RiskProfile | null {
  const riskDistance = direction === 'BUY' ? entry - stopLoss : stopLoss - entry
  const rewardDistance = direction === 'BUY' ? takeProfit - entry : entry - takeProfit

  if (riskDistance <= 0 || rewardDistance <= 0) return null
  return { riskDistance, rewardRisk: rewardDistance / riskDistance }
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

function formatRewardRisk(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value) || value <= 0) return '—'
  return `1:${value.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')}`
}

function formatUsd(value: number | undefined) {
  if (value === undefined || !Number.isFinite(value)) return '—'
  if (value === 0) return '$0'

  const formatted = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(value))
  return `${value > 0 ? '+' : '−'}$${formatted}`
}

function formatPrice(value: number | undefined, display: string | undefined) {
  if (display) return display
  return value === undefined ? '—' : value.toFixed(2)
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

const directionStyles: Record<TradeDirection, string> = {
  BUY: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  SELL: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
}

export default function JournalTab() {
  const [trades, setTrades] = useState<JournalTrade[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formError, setFormError] = useState('')
  const [storageUnavailable, setStorageUnavailable] = useState(false)
  const [draft, setDraft] = useState<TradeDraft>({ ...EMPTY_TRADE_DRAFT })

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

  const previewRiskReward = useMemo(() => {
    const entry = parsePositiveNumber(draft.entry)
    const stopLoss = parsePositiveNumber(draft.stopLoss)
    const takeProfit = parsePositiveNumber(draft.takeProfit)
    if (entry === undefined || stopLoss === undefined || takeProfit === undefined) return undefined

    return getRiskProfile(draft.direction, entry, stopLoss, takeProfit)?.rewardRisk
  }, [draft.direction, draft.entry, draft.stopLoss, draft.takeProfit])

  function updateDraft<K extends keyof TradeDraft>(field: K, value: TradeDraft[K]) {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }))
  }

  function closeForm() {
    setFormOpen(false)
    setFormError('')
    setDraft({ ...EMPTY_TRADE_DRAFT })
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const pair = draft.pair.trim().toUpperCase()
    const entry = parsePositiveNumber(draft.entry)
    const stopLoss = parsePositiveNumber(draft.stopLoss)
    const takeProfit = parsePositiveNumber(draft.takeProfit)
    const exit = parsePositiveNumber(draft.exit)
    const riskAmount = parsePositiveNumber(draft.riskAmount)

    if (!pair || entry === undefined || stopLoss === undefined || takeProfit === undefined || exit === undefined) {
      setFormError('Enter an asset pair and valid positive prices for entry, SL, TP, and exit.')
      return
    }

    if (riskAmount === undefined) {
      setFormError('Enter a positive dollar amount at risk if the stop-loss is hit.')
      return
    }

    const riskProfile = getRiskProfile(draft.direction, entry, stopLoss, takeProfit)
    if (!riskProfile) {
      setFormError(draft.direction === 'BUY'
        ? 'For a BUY, place SL below entry and TP above entry.'
        : 'For a SELL, place SL above entry and TP below entry.')
      return
    }

    const priceMove = draft.direction === 'BUY' ? exit - entry : entry - exit
    const pips = Number((priceMove / getPipSize(pair)).toFixed(1))
    const resultUsd = Number(((priceMove / riskProfile.riskDistance) * riskAmount).toFixed(2))
    const trade: JournalTrade = {
      id: crypto.randomUUID(),
      pair,
      direction: draft.direction,
      entry,
      stopLoss,
      takeProfit,
      exit,
      entryDisplay: draft.entry.trim(),
      stopLossDisplay: draft.stopLoss.trim(),
      takeProfitDisplay: draft.takeProfit.trim(),
      exitDisplay: draft.exit.trim(),
      riskAmount,
      resultUsd,
      outcome: pips > 0 ? 'WIN' : pips < 0 ? 'LOSS' : 'BE',
      pips,
      notes: draft.notes.trim(),
      createdAt: new Date().toISOString(),
    }

    setTrades((currentTrades) => [trade, ...currentTrades])
    closeForm()
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

      <section aria-label="Journal summary metrics" className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs font-semibold leading-tight text-slate-300">Win Rate</p>
          <p className="mt-2 font-mono text-lg font-bold text-white">{metrics.winRate}%</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">BE excluded</p>
        </article>
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs font-semibold leading-tight text-slate-300">Total Pips</p>
          <p className={`mt-2 truncate font-mono text-lg font-bold ${metrics.totalPips >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatPips(metrics.totalPips)}</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">All logged trades</p>
        </article>
        <article className="min-w-0 rounded-xl border border-slate-800 bg-slate-900/80 p-3">
          <p className="text-xs font-semibold leading-tight text-slate-300">Logged Trades</p>
          <p className="mt-2 font-mono text-lg font-bold text-white">{metrics.totalTrades}</p>
          <p className="mt-1 text-[10px] leading-tight text-slate-400">Saved on this device</p>
        </article>
      </section>

      <Dialog.Root
        open={formOpen}
        onOpenChange={(open) => {
          if (open) {
            setFormError('')
            setFormOpen(true)
          } else {
            closeForm()
          }
        }}
      >
        <Dialog.Trigger
          type="button"
          className="flex min-h-[3.5rem] w-full items-center justify-center gap-2 rounded-xl border border-cyan-300/40 bg-cyan-500 py-3.5 font-bold text-slate-950 shadow-[0_0_22px_rgba(6,182,212,0.28)] transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300/60"
        >
          <Plus aria-hidden="true" className="size-4" />
          Log a Trade
        </Dialog.Trigger>

        <Dialog.Portal>
          <Dialog.Backdrop className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm" />
          <Dialog.Viewport className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6">
            <Dialog.Popup className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 p-4 shadow-2xl shadow-black/60 sm:max-h-[calc(100dvh-3rem)] sm:p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Dialog.Title className="text-base font-bold text-white">Log a Trade</Dialog.Title>
                  <Dialog.Description className="mt-1 text-sm leading-relaxed text-slate-300">Record your setup and track your realized risk.</Dialog.Description>
                </div>
                <Dialog.Close aria-label="Close trade form" className="grid size-9 shrink-0 place-items-center rounded-lg border border-slate-700 text-slate-300 transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50">
                  <X aria-hidden="true" className="size-4" />
                </Dialog.Close>
              </div>

              <p className="mb-4 text-xs leading-relaxed text-slate-300">Pips use 0.0001 for most FX pairs, 0.01 for JPY/XAG, and 0.1 for XAU.</p>

              <form id="journal-trade-form" onSubmit={handleSubmit}>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Asset Pair
                    <input name="pair" value={draft.pair} onChange={(event) => updateDraft('pair', event.target.value)} required maxLength={18} placeholder="XAUUSD, EURUSD, GBPJPY" autoComplete="off" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>

                  <div className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    <span>Direction</span>
                    <ToggleGroup
                      aria-label="Trade direction"
                      value={[draft.direction]}
                      onValueChange={(value) => {
                        const nextDirection = value[0]
                        if (nextDirection === 'BUY' || nextDirection === 'SELL') updateDraft('direction', nextDirection)
                      }}
                      className="flex w-full gap-2"
                    >
                      <Toggle value="BUY" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-slate-300 transition-colors data-pressed:border-emerald-400/50 data-pressed:bg-emerald-500/15 data-pressed:text-emerald-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/40">
                        BUY
                      </Toggle>
                      <Toggle value="SELL" className="min-h-11 min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-950 px-3 text-sm font-bold text-slate-300 transition-colors data-pressed:border-rose-400/50 data-pressed:bg-rose-500/15 data-pressed:text-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/40">
                        SELL
                      </Toggle>
                    </ToggleGroup>
                  </div>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Entry Price
                    <input name="entry" value={draft.entry} onChange={(event) => updateDraft('entry', event.target.value)} type="text" inputMode="decimal" maxLength={20} required placeholder="2650.00" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Stop Loss (SL)
                    <input name="stopLoss" value={draft.stopLoss} onChange={(event) => updateDraft('stopLoss', event.target.value)} type="text" inputMode="decimal" maxLength={20} required placeholder="2648.00" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Take Profit (TP)
                    <input name="takeProfit" value={draft.takeProfit} onChange={(event) => updateDraft('takeProfit', event.target.value)} type="text" inputMode="decimal" maxLength={20} required placeholder="2655.00" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Exit Price
                    <input name="exit" value={draft.exit} onChange={(event) => updateDraft('exit', event.target.value)} type="text" inputMode="decimal" maxLength={20} required placeholder="2655.00" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200">
                    Risk at SL (USD)
                    <input name="riskAmount" value={draft.riskAmount} onChange={(event) => updateDraft('riskAmount', event.target.value)} type="text" inputMode="decimal" maxLength={14} required aria-describedby="risk-amount-help" className="h-11 min-w-0 rounded-lg border border-slate-700 bg-slate-950 px-3 font-mono text-base text-white outline-none focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                    <span id="risk-amount-help" className="text-xs font-normal leading-relaxed text-slate-400">Default $100. Result scales with your realized R multiple.</span>
                  </label>

                  <label className="grid min-w-0 gap-2 text-sm font-semibold text-slate-200 sm:col-span-2">
                    Trade Notes / Confluence
                    <textarea name="notes" value={draft.notes} onChange={(event) => updateDraft('notes', event.target.value)} maxLength={500} rows={3} placeholder="Setup, confluence, and lessons learned" className="min-h-24 min-w-0 resize-y rounded-lg border border-slate-700 bg-slate-950 px-3 py-2.5 text-base leading-relaxed text-white outline-none placeholder:text-slate-500 focus-visible:border-cyan-400 focus-visible:ring-2 focus-visible:ring-cyan-400/30" />
                  </label>
                </div>

                <p aria-live="polite" className="mt-4 rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-3 text-sm text-slate-200">
                  Planned R:R <span className="ml-2 font-mono font-bold text-cyan-200">{previewRiskReward === undefined ? '—' : formatRewardRisk(previewRiskReward)}</span>
                  {previewRiskReward === undefined && <span className="mt-1 block text-xs text-slate-400">Set entry, SL, and TP on the correct side of your direction.</span>}
                </p>

                {formError && <p role="alert" className="mt-3 text-sm font-medium text-rose-200">{formError}</p>}

                <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <Button type="button" variant="outline" onClick={closeForm} className="min-h-11 border-slate-700 text-slate-200 hover:bg-slate-800">Cancel</Button>
                  <Button type="submit" className="min-h-11 bg-cyan-400 px-5 font-bold text-slate-950 hover:bg-cyan-300">Save trade</Button>
                </div>
              </form>
            </Dialog.Popup>
          </Dialog.Viewport>
        </Dialog.Portal>
      </Dialog.Root>

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
          <div className="flex flex-col">
            {trades.map((trade) => {
              const rewardRisk = trade.stopLoss === undefined || trade.takeProfit === undefined
                ? undefined
                : getRiskProfile(trade.direction, trade.entry, trade.stopLoss, trade.takeProfit)?.rewardRisk

              return (
                <article key={trade.id} className="mb-3 min-w-0 rounded-xl border border-slate-800 bg-slate-900/90 p-4">
                  <div className="flex min-w-0 items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${directionStyles[trade.direction]}`}>{trade.direction}</span>
                      <h4 className="min-w-0 break-words text-base font-bold text-white">
                        {trade.pair} <span className="font-normal text-slate-300">@ {formatPrice(trade.entry, trade.entryDisplay)}</span>
                      </h4>
                    </div>
                    <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeTrade(trade.id)} aria-label={`Delete ${trade.pair} trade`} className="shrink-0 text-slate-400 hover:text-rose-200">
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>

                  <p className="mt-1 text-xs text-slate-400">{formatTradeDate(trade.createdAt)}</p>

                  <div className="mt-4 grid grid-cols-1 gap-2 border-t border-slate-800 pt-3 text-sm sm:grid-cols-3">
                    <p className="text-slate-400">Entry: <span className="font-mono font-semibold text-slate-100">{formatPrice(trade.entry, trade.entryDisplay)}</span></p>
                    <p className="text-slate-400">SL: <span className="font-mono font-semibold text-slate-100">{formatPrice(trade.stopLoss, trade.stopLossDisplay)}</span></p>
                    <p className="text-slate-400">TP: <span className="font-mono font-semibold text-slate-100">{formatPrice(trade.takeProfit, trade.takeProfitDisplay)}</span></p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-800 pt-3 text-sm sm:grid-cols-3">
                    <p className="text-slate-400">
                      Outcome: <span className={`font-semibold ${outcomeStyles[trade.outcome].split(' ').at(-1)}`}>{trade.outcome} ({formatPips(trade.pips)} pips)</span>
                    </p>
                    <p className="text-slate-400">R:R: <span className="font-mono font-semibold text-cyan-200">{formatRewardRisk(rewardRisk)}</span></p>
                    <p className="text-slate-400">Result: <span className={`font-mono font-bold ${trade.resultUsd === undefined ? 'text-slate-300' : trade.resultUsd >= 0 ? 'text-emerald-200' : 'text-rose-200'}`}>{formatUsd(trade.resultUsd)}</span></p>
                  </div>

                  {trade.notes && <p className="mt-3 break-words border-t border-slate-800 pt-3 text-sm leading-relaxed text-slate-200">{trade.notes}</p>}
                </article>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
