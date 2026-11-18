'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Bell, CalendarDays, Check, ChevronRight, Crown, Gem, LayoutDashboard, LockKeyhole, NotebookPen, Sparkles, UserRound, X } from 'lucide-react'
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { useRouter } from 'next/navigation'
import TipsFeed from './tips-feed'
import JournalTab from './journal-tab'
import { cn } from '@/lib/utils'
import { subscribeToSignals } from '@/lib/firestore'
import { PwaInstallButton } from './pwa-client'
import SignalCard, { type Signal } from './signal-card'
import MonnifyCheckout from './monnify-checkout'
import DeviceIdCard from './device-id-card'
import { useMembership } from '@/lib/use-membership'
import { playChime, unlockChime } from '@/lib/chime'

type Draft = Pick<Signal, 'pair' | 'direction' | 'entry' | 'tp' | 'sl'> & { tp2: string; tp3: string; notes: string }

const initialSignals: Signal[] = [
  { id: 1, pair: 'XAU/USD', direction: 'BUY', entry: '2,648.20', tp: '2,672.50', sl: '2,635.80', confidence: '92%', time: '02 min ago' },
  { id: 2, pair: 'XAU/USD', direction: 'SELL', entry: '2,671.80', tp: '2,649.00', sl: '2,684.30', confidence: '87%', time: '18 min ago' },
]
const closedSignals: Signal[] = [
  { id: 101, pair: 'XAU/USD', direction: 'BUY', entry: '2,604.20', tp: '2,628.50', sl: '2,591.80', confidence: '91%', time: 'Closed 04 Dec', status: 'WIN', pips: '+243 pips' },
  { id: 102, pair: 'EUR/USD', direction: 'SELL', entry: '1.0842', tp: '1.0788', sl: '1.0874', confidence: '86%', time: 'Closed 02 Dec', status: 'LOSS', pips: '-32 pips' },
]
const previewSignals: Signal[] = [
  { id: 'preview-xau', pair: 'XAU/USD', direction: 'BUY', entry: '2,648.20', tp: '2,672.50', sl: '2,635.80', confidence: '92%', time: 'Active now', status: 'WIN', pips: '+80 pips' },
  { id: 'preview-eur', pair: 'EUR/USD', direction: 'BUY', entry: '1.0842', tp: '1.0890', sl: '1.0810', confidence: '88%', time: 'Active now', status: 'ACTIVE' },
  { id: 'preview-gbp', pair: 'GBP/USD', direction: 'SELL', entry: '1.2710', tp: '1.2655', sl: '1.2745', confidence: '85%', time: 'Watching', status: 'ACTIVE' },
]
const events = [
  { country: 'US', title: 'FOMC Statement', date: 'Today, 19:00', countdown: '02:14:36', impact: 'HIGH' },
  { country: 'US', title: 'Core CPI m/m', date: 'Tomorrow, 13:30', countdown: '20:44:36', impact: 'HIGH' },
  { country: 'US', title: 'Nonfarm Payrolls', date: 'Fri, 13:30', countdown: '2d 16h', impact: 'HIGH' },
]
const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }
const freeBenefits = ['Basic Market Insights & Daily Tips']
const vipBenefits = [
  'Instant Lock-Screen Alerts',
  'High-Precision Gold & Forex Setups',
  'Live Trade Management',
  'Direct Analyst Notes & Risk Breakdown',
]

export default function VipForexApp() {
  const router = useRouter()
  const brandTapCount = useRef(0)
  const brandTapTimer = useRef<number | null>(null)
  const [activeTab, setActiveTab] = useState('Signals')
  const [signals, setSignals] = useState<Signal[]>(initialSignals)
  const [history, setHistory] = useState<Signal[]>(closedSignals)
  const [copiedId, setCopiedId] = useState<string | number | null>(null)
  const { deviceId, membership, isVip, refresh } = useMembership()
  const [pricingOpen, setPricingOpen] = useState(false)
  const [paymentOpen, setPaymentOpen] = useState(false)
  const [pushPrompt, setPushPrompt] = useState(false)
  const signalVersionRef = useRef('')
  const knownSignalIds = useRef<Set<string> | null>(null)
  const chimeEligible = useRef(false)
  chimeEligible.current = isVip && activeTab === 'Signals'

  useEffect(() => {
    window.addEventListener('pointerdown', unlockChime, { passive: true })
    return () => window.removeEventListener('pointerdown', unlockChime)
  }, [])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === 'trade-smart-live-history' && event.newValue) { try { setHistory(JSON.parse(event.newValue)) } catch { setHistory(closedSignals) } }
    }
    const savedHistory = window.localStorage.getItem('trade-smart-live-history')
    if (savedHistory) { try { setHistory(JSON.parse(savedHistory)) } catch { setHistory(closedSignals) } }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  useEffect(() => {
    const unsubscribe = subscribeToSignals((records) => {
      const ids = new Set(records.map((record) => record.id))
      const previous = knownSignalIds.current
      // Skip the initial snapshot so existing signals don't chime on page load.
      if (previous && chimeEligible.current && records.some((record) => !previous.has(record.id) && record.status === 'ACTIVE')) playChime()
      knownSignalIds.current = ids
      const version = JSON.stringify(records.map((record) => [record.id, record.status, record.entry, record.tp1, record.sl]))
      if (version === signalVersionRef.current) return
      signalVersionRef.current = version
      setSignals(records.map((record) => ({ id: record.id, pair: record.pair, direction: record.action, entry: record.entry, tp: record.tp1, sl: record.sl, tp2: record.tp2, tp3: record.tp3, notes: record.notes, confidence: 'Live', time: 'Just now', status: record.status, createdAt: record.createdAt })))
    })
    return () => unsubscribe()
  }, [])

  const copySignal = useCallback((signal: Signal) => {
    void navigator.clipboard?.writeText(`${signal.pair} ${signal.direction} | Entry ${signal.entry} | TP ${signal.tp} | SL ${signal.sl}`).catch(() => undefined)
    setCopiedId(signal.id); window.setTimeout(() => setCopiedId(null), 1800)
  }, [])
  function completePayment() { setPaymentOpen(false); void refresh(); setPushPrompt(true) }
  function handleBrandTap() {
    brandTapCount.current += 1
    if (brandTapTimer.current) window.clearTimeout(brandTapTimer.current)
    if (brandTapCount.current >= 3) {
      brandTapCount.current = 0
      router.push('/admin')
      return
    }
    brandTapTimer.current = window.setTimeout(() => { brandTapCount.current = 0 }, 900)
  }
  const tabs = [['Signals', LayoutDashboard], ['Journal', NotebookPen], ['Tips', Sparkles], ['Profile', UserRound]] as const

  return <main className="mx-auto min-h-screen w-full max-w-md overflow-x-hidden bg-[#050814] text-slate-100 selection:bg-cyan-300 selection:text-slate-950">
    <div className="flex min-h-screen w-full flex-col overflow-x-hidden border-x border-slate-800/80 bg-[#050814]"><header className="flex items-center justify-between border-b border-[#27272a] px-4 pb-5 pt-6"><button type="button" aria-label="Trade Smart Live" onClick={handleBrandTap} className="relative z-30 pointer-events-auto flex items-center gap-3 text-left transition-transform active:scale-95"><div className="grid h-9 w-9 place-items-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-cyan-300 shadow-lg shadow-blue-950/30"><Crown size={16} /></div><div className="min-w-0 overflow-hidden"><p className="whitespace-nowrap bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-sm font-bold uppercase tracking-[0.2em] text-transparent">TRADE SMART LIVE</p><p className="mt-0.5 whitespace-nowrap bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-600 bg-clip-text text-sm font-bold text-transparent">Trade Smart Live</p></div></button><div className="flex gap-2"><button type="button" aria-label="Notifications" className="grid h-9 w-9 touch-manipulation place-items-center rounded-lg border border-slate-800/80 bg-slate-900/70 text-zinc-400 shadow-2xl shadow-indigo-950/20 transition-all active:scale-95"><Bell size={16} /></button></div></header>
      <div className="relative z-30 grid grid-cols-3 pointer-events-auto border-b border-[#27272a] bg-slate-950 p-1"><button onClick={() => setActiveTab('Signals')} className={`relative z-40 pointer-events-auto min-w-0 overflow-hidden px-1 text-center touch-manipulation whitespace-nowrap rounded-md py-2 text-[9px] font-bold tracking-tight transition-all active:scale-95 ${activeTab === 'Signals' ? 'bg-[#27272a] text-white' : 'text-slate-300'}`}><span className="hidden sm:inline">VIP Signals</span><span className="sm:hidden">Signals</span></button><button onClick={() => setActiveTab('History')} className={`relative z-40 pointer-events-auto min-w-0 overflow-hidden px-1 text-center touch-manipulation whitespace-nowrap rounded-md py-2 text-[9px] font-bold tracking-tight transition-all active:scale-95 ${activeTab === 'History' ? 'bg-[#27272a] text-white' : 'text-slate-300'}`}><span className="hidden sm:inline">Track Record</span><span className="sm:hidden">History</span></button><button onClick={() => setActiveTab('Journal')} className={`relative z-40 pointer-events-auto min-w-0 overflow-hidden px-1 text-center touch-manipulation whitespace-nowrap rounded-md py-2 text-[9px] font-bold tracking-tight transition-all active:scale-95 ${activeTab === 'Journal' ? 'bg-[#27272a] text-white' : 'text-slate-300'}`}><span className="hidden sm:inline">Journal</span><span className="sm:hidden">Journal</span></button></div>
      <section aria-label="Current tab content" className="min-w-0 flex-1 px-4 pb-28 pt-6">
        {activeTab === 'Signals' && <><div className="mb-4 flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-300">Live feed</p><p className="mt-1 text-sm text-zinc-300">{signals.length} active signals</p></div></div><div className="relative min-h-[420px]"><div className={!isVip ? 'select-none opacity-40 blur-[7px]' : ''}>{(signals.length ? signals : previewSignals).map((signal, index) => <SignalCard key={signal.id} signal={signal} index={index} copied={copiedId === signal.id} onCopy={copySignal} />)}</div>{!isVip && <div className="absolute inset-0 z-10 flex items-center justify-center px-2"><div className="mx-auto w-full max-w-[92%] rounded-2xl border border-cyan-500/30 bg-slate-900/90 p-5 text-center shadow-2xl shadow-blue-950/50"><div className="mx-auto grid h-11 w-11 place-items-center rounded-full border border-cyan-400/40 bg-cyan-400/10 text-cyan-300"><LockKeyhole size={19} /></div><h2 className="mt-3 text-lg font-bold text-white">VIP Signals Locked</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">Unlock the feed to see exact entries and live trade management.</p><button onClick={() => setPricingOpen(true)} className="mt-5 w-full rounded-xl bg-cyan-400 px-4 py-3.5 text-sm font-semibold leading-snug text-slate-950 transition-colors hover:bg-cyan-300 touch-manipulation">Unlock VIP Access for ₦15,000/mo</button></div></div>}</div></>}
        {activeTab === 'History' && <HistoryView signals={history} />}
        {activeTab === 'Journal' && <JournalTab />}
        {activeTab === 'Tips' && <TipsFeed />}
        {activeTab === 'Profile' && <div className="flex flex-col gap-3"><DeviceIdCard deviceId={deviceId} membership={membership} /><SimpleView title="Your membership" body={isVip ? 'VIP access is active. Push notifications are enabled for your account.' : 'You are currently on the Free plan.'} action={!isVip ? () => setPricingOpen(true) : undefined} /><PwaInstallButton /></div>}
      </section>
      <nav aria-label="Primary navigation" className="fixed bottom-0 left-0 right-0 z-50 pointer-events-auto border-t border-slate-800/80 bg-[#050814]/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]"><div className="mx-auto flex h-16 w-full max-w-md items-center justify-around pointer-events-auto">{tabs.map(([label, Icon]) => <button type="button" key={label} onClick={() => setActiveTab(label)} aria-current={activeTab === label ? 'page' : undefined} className={`relative z-10 flex h-full min-w-0 flex-1 touch-manipulation flex-col items-center justify-center gap-1 text-xs font-medium transition-colors ${activeTab === label ? 'text-cyan-300' : 'text-slate-300'}`}><Icon size={18} strokeWidth={activeTab === label ? 2.2 : 1.8} /><span>{label}</span></button>)}</div></nav>
    </div>
    <AnimatePresence>{pricingOpen && <PricingModal onClose={() => setPricingOpen(false)} onUnlock={() => { setPricingOpen(false); setPaymentOpen(true) }} />}</AnimatePresence>
    <AnimatePresence>{paymentOpen && <MonnifyCheckout deviceId={deviceId} onClose={() => setPaymentOpen(false)} onActivated={completePayment} />}</AnimatePresence>
    <AnimatePresence>{pushPrompt && <PushPrompt onClose={() => setPushPrompt(false)} />}</AnimatePresence>
  </main>
}

function HistoryView({ signals }: { signals: Signal[] }) { const wins = signals.filter((signal) => signal.status === 'WIN').length; const winRate = Math.round((wins / signals.length) * 100); return <div><div className="rounded-2xl border border-cyan-400/30 bg-gradient-to-r from-cyan-400/10 via-blue-500/10 to-indigo-500/10 p-5 shadow-lg shadow-cyan-950/20"><p className="font-mono text-2xl font-bold text-white">Win Rate: <span className="text-cyan-300">{winRate}%</span></p></div><div className="mt-5 space-y-3">{signals.map((signal) => { const isWin = signal.status === 'WIN'; return <article key={signal.id} className="rounded-xl border border-slate-800/80 bg-slate-900/70 p-4"><div className="flex min-w-0 items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><h3 className="truncate font-bold text-white">{signal.pair}</h3><span className={`shrink-0 rounded-md px-2 py-1 text-xs font-bold tracking-wide ${signal.direction === 'BUY' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{signal.direction}</span></div><span className={`shrink-0 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${isWin ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'}`}>{isWin ? 'WIN' : 'LOSS'}</span></div><div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-800 pt-3"><span className="font-mono text-sm font-bold text-slate-300">Entry: {signal.entry}</span><span className="text-right text-sm text-slate-400">{isWin ? 'Hit TP2' : 'Hit Stop Loss'}</span></div></article> })}</div></div> }
type EconomicEvent = { id: string; title: string; currency: string; releaseAt: string; impact: 'HIGH' | 'MEDIUM' | 'LOW'; forecast: string; previous: string }
const fetchCalendar = (url: string) => fetch(url).then((response) => response.json() as Promise<{ events: EconomicEvent[]; error?: string }>)
function formatEventTime(value: string) { const parts = new Intl.DateTimeFormat('en-NG', { timeZone: 'Africa/Lagos', weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(new Date(value)); const formatted = parts.map((part) => part.type === 'dayPeriod' ? part.value.toUpperCase() : part.value).join(''); return `${formatted} WAT` }
function explainEvent(title: string) { const name = title.toLowerCase(); if (name.includes('cpi') || name.includes('inflation')) return 'Measures inflation. Expect high gold and dollar volatility.'; if (name.includes('non-farm') || name.includes('employment') || name.includes('jobs')) return 'Shows how many jobs were added. It can move the dollar sharply.'; if (name.includes('interest rate') || name.includes('rate decision')) return 'Shows the cost of borrowing. Markets react quickly to the decision.'; if (name.includes('gdp')) return 'Measures economic growth. Stronger growth can support the currency.'; if (name.includes('fomc') || name.includes('central bank')) return 'Central bank guidance can change the direction of major currencies.'; return 'A major economic update that may create sharp market movement.' }
function CalendarView({ onUpgrade }: { onUpgrade: () => void }) { const { data, isLoading } = useSWR('/api/economic-calendar', fetchCalendar, { refreshInterval: 3600000, dedupingInterval: 3600000, revalidateOnFocus: false }); const [view, setView] = useState<'upcoming' | 'past'>('upcoming'); const redFolderEvents = (data?.events || []).filter((event) => event.impact === 'HIGH'); const now = Date.now(); const visibleEvents = redFolderEvents.filter((event) => { const releaseAt = Date.parse(event.releaseAt); return Number.isFinite(releaseAt) && (view === 'upcoming' ? releaseAt >= now : releaseAt < now) }); return <div><div className="mb-5 flex items-end justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.16em] text-rose-300">Red Folder Market Schedule</p><h2 className="mt-1 max-w-[18rem] text-xl font-bold leading-tight text-white">High-impact news only</h2></div><CalendarDays size={21} className="text-rose-300" /></div><p className="mb-5 text-sm leading-relaxed text-slate-300">Simple, live alerts for news that can move your trades.</p><div className="mb-5 grid grid-cols-2 rounded-xl border border-slate-800 bg-slate-900/70 p-1"><button onClick={() => setView('upcoming')} className={`touch-manipulation rounded-lg py-2.5 text-sm font-bold tracking-wide transition-all active:scale-[0.98] ${view === 'upcoming' ? 'bg-rose-500/15 text-rose-200' : 'text-slate-400'}`}>Upcoming Events</button><button onClick={() => setView('past')} className={`touch-manipulation rounded-lg py-2.5 text-sm font-bold tracking-wide transition-all active:scale-[0.98] ${view === 'past' ? 'bg-slate-700 text-white' : 'text-slate-400'}`}>Past Events History</button></div>{isLoading && <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-300">Loading live red folder events...</div>}{data?.error && <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-sm text-amber-200">{data.error}</div>}{!isLoading && !data?.error && visibleEvents.length === 0 && <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 text-center text-sm text-slate-300">No high-impact (Red Folder) events scheduled for this period.</div>}<div className="space-y-3">{visibleEvents.map((event) => <article key={event.id} className="rounded-xl border border-rose-500/30 bg-slate-900/70 p-4 shadow-lg shadow-rose-950/10"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div className="flex items-center gap-1.5"><span className="grid h-8 min-w-12 place-items-center rounded-md border border-rose-500/50 bg-rose-500/10 px-2 text-sm font-bold text-rose-300">{event.currency}</span><span className="rounded bg-rose-500/15 px-2 py-1 text-xs font-bold tracking-wider text-rose-300">RED FOLDER</span></div><time dateTime={event.releaseAt} className="font-mono text-xs font-bold text-slate-300">{formatEventTime(event.releaseAt)}</time></div><h3 className="mt-4 font-bold text-white">{event.title}</h3><p className="mt-1 text-sm leading-relaxed text-slate-300">{explainEvent(event.title)}</p><div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-800 pt-3 text-sm"><div><p className="text-slate-400">Expected</p><p className="mt-1 font-mono font-bold text-cyan-300">{event.forecast}</p></div><div><p className="text-slate-400">Previous</p><p className="mt-1 font-mono font-bold text-white">{event.previous}</p></div></div></article>)}</div><button onClick={onUpgrade} className="relative z-40 pointer-events-auto mt-5 flex w-full touch-manipulation items-center justify-center gap-2 rounded-lg border border-[#3f3f46] py-3 text-sm font-bold text-zinc-300 transition-all active:scale-[0.98]"><LockKeyhole size={14} /> Compare Free and VIP</button></div> }
function SimpleView({ title, body, action }: { title: string; body: string; action?: () => void }) { return <div className="rounded-xl border border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 p-5"><p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-300">Account</p><h2 className="mt-2 text-xl font-bold">{title}</h2><p className="mt-2 text-sm leading-relaxed text-slate-300">{body}</p>{action && <button onClick={action} className="relative z-40 pointer-events-auto mt-5 h-11 w-full touch-manipulation rounded-lg bg-zinc-100 text-sm font-bold text-zinc-950 transition-all active:scale-95">View VIP pricing</button>}</div> }

function AdminMetric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-[#27272a] bg-[#09090b] p-3"><p className="text-sm font-bold uppercase tracking-[0.12em] text-slate-400">{label}</p><p className="mt-2 font-mono text-lg font-bold text-zinc-100">{value}</p><p className="mt-1 text-sm text-slate-300">{detail}</p></div> }

function AdminDrawer({ draft, setDraft, subscribers, pushReach, signalCount, onClose, onSubmit }: { draft: Draft; setDraft: (draft: Draft) => void; subscribers: number; pushReach: number; signalCount: number; onClose: () => void; onSubmit: (event: FormEvent) => void }) { return <motion.div className="fixed inset-0 z-40 bg-black/75" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.aside onClick={(e) => e.stopPropagation()} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring} className="ml-auto flex h-full w-full max-w-[760px] flex-col overflow-y-auto border-l border-slate-800/80 bg-slate-900/70 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 p-5 md:p-8"><div className="flex items-center justify-between"><div><p className="text-sm font-bold uppercase tracking-[0.18em] text-slate-300">Admin tools</p><h2 className="mt-1 text-xl font-bold">Admin dashboard</h2></div><button onClick={onClose} aria-label="Close drawer" className="text-slate-300"><X size={19} /></button></div><div className="mt-7 grid grid-cols-2 gap-3 md:grid-cols-4"><AdminMetric label="Active VIP subscribers" value={String(subscribers)} detail="paid members" /><AdminMetric label="Total revenue" value={`₦${(subscribers * 15000).toLocaleString('en-NG')}`} detail={`${subscribers} × ₦15,000`} /><AdminMetric label="Signals broadcasted" value={String(signalCount)} detail="this month" /><AdminMetric label="Push reach" value={String(pushReach)} detail="subscribed devices" /></div><form onSubmit={onSubmit} className="mt-8 space-y-4"><label className="block text-sm text-zinc-400">Pair<input value={draft.pair} onChange={(e) => setDraft({ ...draft, pair: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-[#3f3f46] bg-[#09090b] px-3 text-sm outline-none focus:border-zinc-100" /></label><div><p className="text-sm text-zinc-400">Direction</p><div className="mt-2 grid grid-cols-2 gap-2">{(['BUY', 'SELL'] as const).map((direction) => <button type="button" key={direction} onClick={() => setDraft({ ...draft, direction })} className={`rounded-lg border py-3 text-sm font-bold ${draft.direction === direction ? 'border-zinc-100 bg-[#27272a] text-zinc-100' : 'border-[#3f3f46] text-slate-300'}`}>{direction}</button>)}</div></div><div className="grid grid-cols-3 gap-2">{(['entry', 'sl', 'tp', 'tp2', 'tp3'] as const).map((key) => <label key={key} className="text-sm text-zinc-400">{key.toUpperCase()}<input required value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: e.target.value })} className="mt-2 h-11 w-full rounded-lg border border-[#3f3f46] bg-[#09090b] px-2 font-mono text-sm outline-none focus:border-zinc-100" /></label>)}</div><label className="block text-sm text-zinc-400">Analyst notes<textarea value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Context, invalidation, or strategy notes" className="mt-2 min-h-24 w-full resize-none rounded-lg border border-[#3f3f46] bg-[#09090b] p-3 text-sm outline-none focus:border-zinc-100" /></label><button className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-zinc-100 text-sm font-bold text-zinc-950"><Bell size={14} /> Broadcast Signal & Push Alert</button></form></motion.aside></motion.div> }

function PricingModal({ onClose, onUnlock }: { onClose: () => void; onUnlock: () => void }) {
  return <motion.div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/75 p-4" onClick={onClose}>
    <motion.div onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="vip-pricing-title" className="my-auto flex max-h-[calc(100dvh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-cyan-500/30 bg-slate-950 shadow-2xl shadow-cyan-950/40">
      <div className="min-h-0 overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">PRICING / UPGRADE</p>
            <h2 id="vip-pricing-title" className="mt-1 text-2xl font-bold tracking-tight text-white">Go VIP</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close pricing" className="grid size-9 shrink-0 place-items-center rounded-full border border-slate-700 text-slate-300 transition-colors hover:bg-slate-800 active:bg-slate-700"><X size={18} /></button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-700 bg-slate-900/90 px-4 py-3">
          <p className="text-sm leading-relaxed text-slate-200"><span className="font-bold uppercase tracking-wide text-cyan-100">SIMPLE MONTHLY ACCESS</span> — Cancel anytime. No annual commitment.</p>
        </div>

        <p className="mt-5 flex flex-wrap items-baseline gap-x-2 font-mono text-3xl font-bold tracking-tight text-white sm:text-4xl"><span className="text-cyan-300">₦15,000</span><span className="text-base font-semibold text-slate-200"> / month</span></p>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <PlanComparisonCard title="Free" benefits={freeBenefits} />
          <PlanComparisonCard title="VIP" benefits={vipBenefits} featured />
        </div>
      </div>

      <div className="shrink-0 border-t border-cyan-500/20 bg-slate-950/95 p-4">
        <button type="button" onClick={onUnlock} aria-label="Unlock VIP Access — ₦15,000/mo" className="min-h-12 w-full touch-manipulation rounded-xl bg-gradient-to-r from-cyan-400 to-blue-500 px-3 py-3 text-center text-sm font-bold leading-snug text-slate-950 shadow-lg shadow-cyan-500/20 transition-all hover:brightness-110 active:scale-[0.99] sm:text-base">Unlock VIP Access — ₦15,000/mo</button>
      </div>
    </motion.div>
  </motion.div>
}

  type PlanComparisonCardProps = { title: string; benefits: string[]; featured?: boolean }

function PlanComparisonCard({ title, benefits, featured = false }: PlanComparisonCardProps) {
  const headingId = `pricing-${title.toLowerCase()}-heading`

  return <section aria-labelledby={headingId} className={cn('min-w-0 rounded-2xl border p-4', featured ? 'border-cyan-400/50 bg-cyan-400/5 shadow-lg shadow-cyan-950/20' : 'border-slate-700 bg-slate-900/80')}>
    <h3 id={headingId} className={cn('border-b border-slate-700 pb-3 text-base font-bold', featured ? 'text-cyan-100' : 'text-white')}>{title}</h3>
    <ul className="mt-4 flex flex-col gap-3">
      {benefits.map((benefit) => <li key={benefit} className="flex min-w-0 items-start gap-2.5 text-sm leading-relaxed text-slate-100"><Check size={16} className={`mt-0.5 shrink-0 ${featured ? 'text-cyan-300' : 'text-slate-400'}`} aria-hidden="true" /><span className="min-w-0 break-words">{benefit}</span></li>)}
    </ul>
  </section>
}
function PushPrompt({ onClose }: { onClose: () => void }) { return <motion.div className="fixed inset-x-5 bottom-24 z-[70] mx-auto max-w-[420px] rounded-xl border border-[#3f3f46] bg-[#18181b] p-4 shadow-2xl" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><div className="flex gap-3"><Bell size={18} className="mt-0.5" /><div><p className="text-sm font-bold">Enable push notifications?</p><p className="mt-1 text-sm leading-relaxed text-slate-300">Get real-time alerts when a new VIP signal is published.</p><div className="mt-3 flex gap-2"><button onClick={() => { requestPushPermission(); onClose() }} className="rounded-md bg-zinc-100 px-3 py-2 text-sm font-bold text-zinc-950">Allow notifications</button><button onClick={onClose} className="px-3 py-2 text-sm text-slate-300">Not now</button></div></div></div></motion.div> }

function requestPushPermission() {
  const w = window as typeof window & { OneSignalDeferred?: Array<(oneSignal: { Notifications: { requestPermission: () => Promise<void> } }) => void> }
  w.OneSignalDeferred = w.OneSignalDeferred || []
  w.OneSignalDeferred.push((oneSignal) => { void oneSignal.Notifications.requestPermission().catch(() => undefined) })
}
