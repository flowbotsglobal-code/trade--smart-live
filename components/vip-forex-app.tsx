'use client'

import { AnimatePresence, motion } from 'framer-motion'
import {
  Bell,
  CalendarDays,
  Check,
  ChevronRight,
  CircleHelp,
  Copy,
  Crown,
  Gem,
  LayoutDashboard,
  LockKeyhole,
  Menu,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  TrendingDown,
  TrendingUp,
  UserRound,
  X,
  Zap,
} from 'lucide-react'
import { FormEvent, useMemo, useState } from 'react'

type Signal = {
  id: number
  pair: string
  direction: 'BUY' | 'SELL'
  entry: string
  tp: string
  sl: string
  confidence: string
  time: string
}

const starterSignals: Signal[] = [
  { id: 1, pair: 'XAU/USD', direction: 'BUY', entry: '2,648.20', tp: '2,672.50', sl: '2,635.80', confidence: '92%', time: '02 min ago' },
  { id: 2, pair: 'XAU/USD', direction: 'SELL', entry: '2,671.80', tp: '2,649.00', sl: '2,684.30', confidence: '87%', time: '18 min ago' },
]

const events = [
  { country: 'US', title: 'FOMC Statement', date: 'Today, 19:00', countdown: '02:14:36', impact: 'HIGH' },
  { country: 'US', title: 'Core CPI m/m', date: 'Tomorrow, 13:30', countdown: '20:44:36', impact: 'HIGH' },
  { country: 'EU', title: 'ECB President Lagarde Speaks', date: 'Fri, 09:00', countdown: '2d 16h', impact: 'MEDIUM' },
]

const spring = { type: 'spring' as const, stiffness: 420, damping: 28 }

export default function VipForexApp() {
  const [activeTab, setActiveTab] = useState('Signals')
  const [signals, setSignals] = useState(starterSignals)
  const [copiedId, setCopiedId] = useState<number | null>(null)
  const [adminOpen, setAdminOpen] = useState(false)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [newSignal, setNewSignal] = useState<{ pair: string; direction: 'BUY' | 'SELL'; entry: string; tp: string; sl: string }>({ pair: 'XAU/USD', direction: 'BUY', entry: '', tp: '', sl: '' })

  const activeSignals = useMemo(() => signals.filter((signal) => signal.direction === 'BUY'), [signals])

  function copySignal(signal: Signal) {
    setCopiedId(signal.id)
    window.setTimeout(() => setCopiedId(null), 1800)
  }

  function createSignal(event: FormEvent) {
    event.preventDefault()
    if (!newSignal.entry || !newSignal.tp || !newSignal.sl) return
    setSignals((current) => [{ ...newSignal, id: Date.now(), confidence: '91%', time: 'just now' }, ...current])
    setNewSignal({ pair: 'XAU/USD', direction: 'BUY', entry: '', tp: '', sl: '' })
    setAdminOpen(false)
    setActiveTab('Signals')
  }

  return (
    <main className="min-h-screen bg-[#08090b] text-[#f7f7f5] selection:bg-[#c8ff39] selection:text-black">
      <div className="mx-auto flex min-h-screen max-w-[520px] flex-col overflow-hidden border-x border-white/[0.05] bg-[radial-gradient(circle_at_50%_-10%,rgba(200,255,57,0.1),transparent_36%),#08090b]">
        <header className="flex items-center justify-between px-5 pb-5 pt-7">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[#c8ff39] text-black shadow-[0_0_24px_rgba(200,255,57,0.22)]"><Crown size={19} fill="currentColor" /></div>
            <div><p className="text-[11px] font-medium uppercase tracking-[0.22em] text-[#c8ff39]">VIP ROOM</p><p className="mt-0.5 text-sm font-semibold tracking-tight">Forex Signal Club</p></div>
          </div>
          <div className="flex items-center gap-2"><button aria-label="Notifications" className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400"><Bell size={17} /></button><button aria-label="Open menu" onClick={() => setAdminOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-zinc-400"><Menu size={18} /></button></div>
        </header>

        <section className="px-5 pb-5"><div className="flex items-end justify-between"><div><p className="text-sm text-zinc-500">Monday, 09 December</p><h1 className="mt-1 text-[28px] font-semibold tracking-[-0.04em]">Market Pulse <span className="text-[#c8ff39]">.</span></h1></div><div className="flex items-center gap-1.5 rounded-full border border-[#c8ff39]/20 bg-[#c8ff39]/[0.07] px-3 py-1.5 text-[10px] font-bold tracking-wider text-[#c8ff39]"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#c8ff39]" /> LIVE</div></div></section>

        <nav className="mx-5 mb-5 grid grid-cols-2 rounded-xl border border-white/[0.08] bg-white/[0.035] p-1"><button onClick={() => setActiveTab('Signals')} className={`rounded-lg py-2 text-xs font-semibold transition ${activeTab === 'Signals' ? 'bg-white/[0.1] text-white' : 'text-zinc-500'}`}>VIP Signals</button><button onClick={() => setActiveTab('Calendar')} className={`rounded-lg py-2 text-xs font-semibold transition ${activeTab === 'Calendar' ? 'bg-white/[0.1] text-white' : 'text-zinc-500'}`}>Free Calendar</button></nav>

        <div className="flex-1 px-5 pb-28">
          {activeTab === 'Signals' ? <>
            <div className="mb-4 flex items-center justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Open positions</p><p className="mt-1 text-sm text-zinc-300">{signals.length} active signals</p></div><button onClick={() => setAdminOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-[#c8ff39]/20 px-3 py-2 text-xs font-semibold text-[#c8ff39]"><Plus size={14} /> Add signal</button></div>
            <div className="space-y-3">{signals.map((signal, index) => <SignalCard key={signal.id} signal={signal} index={index} copied={copiedId === signal.id} onCopy={() => copySignal(signal)} />)}</div>
            <motion.button whileTap={{ scale: 0.98 }} onClick={() => setUpgradeOpen(true)} className="mt-5 flex w-full items-center justify-between rounded-2xl border border-[#c8ff39]/20 bg-[linear-gradient(110deg,rgba(200,255,57,0.12),rgba(200,255,57,0.03))] p-4 text-left"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-xl bg-[#c8ff39] text-black"><Gem size={17} /></div><div><p className="text-sm font-semibold">Unlock all VIP signals</p><p className="mt-0.5 text-xs text-zinc-400">Get every entry before the move</p></div></div><ChevronRight size={17} className="text-[#c8ff39]" /></motion.button>
            <div className="mt-6 grid grid-cols-3 gap-2">{[['Win rate', '89.4%'], ['This week', '+12.8%'], ['Members', '2.4k']].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><p className="text-[10px] text-zinc-500">{label}</p><p className="mt-2 text-sm font-semibold">{value}</p></div>)}</div>
          </> : <CalendarView onUpgrade={() => setUpgradeOpen(true)} />}
        </div>

        <div className="fixed bottom-0 z-20 w-full max-w-[520px] border-t border-white/[0.07] bg-[#0b0c0f]/95 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-3 backdrop-blur-xl"><div className="grid grid-cols-4">{[ ['Signals', LayoutDashboard], ['Calendar', CalendarDays], ['Tips', Sparkles], ['Profile', UserRound] ].map(([label, Icon]) => <button key={label as string} onClick={() => setActiveTab(label as string)} className={`flex flex-col items-center gap-1.5 text-[10px] font-medium transition ${activeTab === label ? 'text-[#c8ff39]' : 'text-zinc-600'}`}><Icon size={18} strokeWidth={activeTab === label ? 2.3 : 1.8} /><span>{label as string}</span></button>)}</div></div>
      </div>

      <AnimatePresence>{adminOpen && <AdminDrawer signal={newSignal} setSignal={setNewSignal} onClose={() => setAdminOpen(false)} onSubmit={createSignal} />}</AnimatePresence>
      <AnimatePresence>{upgradeOpen && <UpgradeModal billing={billing} setBilling={setBilling} onClose={() => setUpgradeOpen(false)} />}</AnimatePresence>
    </main>
  )
}

function SignalCard({ signal, index, copied, onCopy }: { signal: Signal; index: number; copied: boolean; onCopy: () => void }) {
  const isBuy = signal.direction === 'BUY'
  return <motion.article initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, ...spring }} className={`relative overflow-hidden rounded-2xl border bg-white/[0.035] p-4 ${isBuy ? 'border-[#c8ff39]/20' : 'border-[#ff5b6e]/20'}`}><div className={`absolute left-0 top-0 h-full w-[2px] ${isBuy ? 'bg-[#c8ff39]' : 'bg-[#ff5b6e]'}`} /><div className="flex items-start justify-between"><div className="flex items-center gap-3"><div className={`grid h-10 w-10 place-items-center rounded-xl ${isBuy ? 'bg-[#c8ff39]/10 text-[#c8ff39]' : 'bg-[#ff5b6e]/10 text-[#ff5b6e]'}`}>{isBuy ? <TrendingUp size={19} /> : <TrendingDown size={19} />}</div><div><div className="flex items-center gap-2"><h2 className="font-semibold tracking-tight">{signal.pair}</h2><span className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold tracking-wider ${isBuy ? 'bg-[#c8ff39]/10 text-[#c8ff39]' : 'bg-[#ff5b6e]/10 text-[#ff5b6e]'}`}>{signal.direction}</span></div><p className="mt-1 text-[11px] text-zinc-500">{signal.time} · <span className={isBuy ? 'text-[#c8ff39]' : 'text-[#ff5b6e]'}>{signal.confidence} confidence</span></p></div></div><span className="h-2 w-2 animate-pulse rounded-full bg-[#c8ff39] shadow-[0_0_10px_#c8ff39]" /></div><div className="mt-5 grid grid-cols-3 gap-2 border-y border-white/[0.06] py-3"><Level label="ENTRY" value={signal.entry} /><Level label="TAKE PROFIT" value={signal.tp} color="lime" /><Level label="STOP LOSS" value={signal.sl} color="red" /></div><motion.button whileTap={{ scale: 0.97 }} onClick={onCopy} className={`mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition ${copied ? 'bg-[#c8ff39] text-black' : 'bg-white/[0.07] text-white hover:bg-white/[0.11]'}`}>{copied ? <><Check size={15} strokeWidth={3} /> Copied to clipboard</> : <><Copy size={14} /> Copy Signal</>}</motion.button></motion.article>
}
function Level({ label, value, color }: { label: string; value: string; color?: 'lime' | 'red' }) { return <div><p className="text-[9px] font-medium tracking-wider text-zinc-600">{label}</p><p className={`mt-1 text-xs font-semibold ${color === 'lime' ? 'text-[#c8ff39]' : color === 'red' ? 'text-[#ff5b6e]' : 'text-zinc-200'}`}>{value}</p></div> }

function CalendarView({ onUpgrade }: { onUpgrade: () => void }) { return <div><div className="mb-5 flex items-end justify-between"><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">Economic calendar</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Events that move markets</h2></div><CalendarDays className="text-[#c8ff39]" size={22} /></div><div className="mb-5 flex gap-2 overflow-auto pb-1"><span className="whitespace-nowrap rounded-lg bg-[#c8ff39] px-3 py-2 text-[11px] font-bold text-black">Today</span><span className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-[11px] text-zinc-500">Tomorrow</span><span className="whitespace-nowrap rounded-lg border border-white/10 px-3 py-2 text-[11px] text-zinc-500">This week</span></div><div className="space-y-3">{events.map((event, index) => <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.07 }} key={event.title} className="rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="grid h-7 w-7 place-items-center rounded-lg bg-[#ff5b6e]/10 text-[10px] font-bold text-[#ff5b6e]">{event.country}</span><span className={`rounded-md px-1.5 py-1 text-[9px] font-bold tracking-wider ${event.impact === 'HIGH' ? 'bg-[#ff5b6e]/10 text-[#ff5b6e]' : 'bg-amber-300/10 text-amber-300'}`}>{event.impact} IMPACT</span></div><span className="font-mono text-xs text-[#ff5b6e]">{event.countdown}</span></div><p className="mt-3 font-semibold">{event.title}</p><p className="mt-1 text-xs text-zinc-500">{event.date} <span className="mx-1">·</span> USD</p></motion.div>)}</div><button onClick={onUpgrade} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 py-3 text-xs font-semibold text-zinc-400"><LockKeyhole size={14} /> Unlock analyst notes for every event</button></div> }

function AdminDrawer({ signal, setSignal, onClose, onSubmit }: { signal: typeof starterSignals[0] & { pair: string; direction: 'BUY' | 'SELL' } | { pair: string; direction: 'BUY' | 'SELL'; entry: string; tp: string; sl: string }; setSignal: (value: any) => void; onClose: () => void; onSubmit: (event: FormEvent) => void }) { return <motion.div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.aside onClick={(event) => event.stopPropagation()} initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={spring} className="ml-auto flex h-full w-full max-w-[420px] flex-col border-l border-white/10 bg-[#101114] p-5"><div className="flex items-center justify-between"><div><p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#c8ff39]">Admin tools</p><h2 className="mt-1 text-xl font-semibold">Create signal</h2></div><button onClick={onClose} aria-label="Close drawer" className="rounded-full bg-white/[0.06] p-2 text-zinc-400"><X size={18} /></button></div><form onSubmit={onSubmit} className="mt-8 space-y-4"><label className="block text-xs font-medium text-zinc-400">Pair<input value={signal.pair} onChange={(e) => setSignal({ ...signal, pair: e.target.value })} className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm outline-none focus:border-[#c8ff39]" /></label><div><p className="text-xs font-medium text-zinc-400">Direction</p><div className="mt-2 grid grid-cols-2 gap-2">{(['BUY', 'SELL'] as const).map((direction) => <button type="button" key={direction} onClick={() => setSignal({ ...signal, direction })} className={`rounded-xl border py-3 text-xs font-bold ${signal.direction === direction ? direction === 'BUY' ? 'border-[#c8ff39] bg-[#c8ff39]/10 text-[#c8ff39]' : 'border-[#ff5b6e] bg-[#ff5b6e]/10 text-[#ff5b6e]' : 'border-white/10 text-zinc-500'}`}>{direction}</button>)}</div></div><div className="grid grid-cols-3 gap-2">{[['entry', 'Entry'], ['tp', 'Take profit'], ['sl', 'Stop loss']].map(([key, label]) => <label key={key} className="text-xs font-medium text-zinc-400">{label}<input required value={(signal as any)[key]} onChange={(e) => setSignal({ ...signal, [key]: e.target.value })} placeholder="0.00" className="mt-2 h-11 w-full rounded-xl border border-white/10 bg-white/[0.04] px-2 text-xs outline-none focus:border-[#c8ff39]" /></label>)}</div><button type="submit" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#c8ff39] text-sm font-bold text-black"><Plus size={16} /> Publish signal</button></form><div className="mt-auto rounded-2xl border border-[#c8ff39]/15 bg-[#c8ff39]/[0.05] p-4"><div className="flex items-center gap-2 text-[#c8ff39]"><ShieldCheck size={16} /><span className="text-xs font-semibold">Preview mode</span></div><p className="mt-2 text-xs leading-relaxed text-zinc-500">Signals are mocked locally for Phase 1. Publishing will update the live UI instantly.</p></div></motion.aside></motion.div> }

function UpgradeModal({ billing, setBilling, onClose }: { billing: 'monthly' | 'yearly'; setBilling: (value: 'monthly' | 'yearly') => void; onClose: () => void }) { return <motion.div className="fixed inset-0 z-50 grid place-items-center bg-black/70 px-5 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div onClick={(event) => event.stopPropagation()} initial={{ opacity: 0, scale: 0.94, y: 14 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={spring} className="w-full max-w-[390px] rounded-3xl border border-white/10 bg-[#141519] p-5 shadow-2xl"><div className="flex items-start justify-between"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#c8ff39] text-black"><Zap size={20} fill="currentColor" /></div><button onClick={onClose} aria-label="Close upgrade modal" className="text-zinc-500"><X size={19} /></button></div><p className="mt-6 text-xs font-bold uppercase tracking-[0.2em] text-[#c8ff39]">VIP membership</p><h2 className="mt-2 text-2xl font-semibold tracking-tight">Trade with an edge.</h2><p className="mt-2 text-sm leading-relaxed text-zinc-500">Get high-conviction setups, analyst notes, and early entries before the market moves.</p><div className="mt-6 flex rounded-xl bg-white/[0.05] p-1"><button onClick={() => setBilling('monthly')} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${billing === 'monthly' ? 'bg-white/10 text-white' : 'text-zinc-500'}`}>Monthly</button><button onClick={() => setBilling('yearly')} className={`flex-1 rounded-lg py-2 text-xs font-semibold ${billing === 'yearly' ? 'bg-[#c8ff39] text-black' : 'text-zinc-500'}`}>Yearly <span className="ml-1 text-[9px]">-33%</span></button></div><div className="mt-5 flex items-end gap-1"><span className="text-4xl font-semibold">${billing === 'yearly' ? '19' : '29'}</span><span className="pb-1 text-sm text-zinc-500">/ month</span></div><div className="mt-5 space-y-3 text-sm text-zinc-300">{['Every VIP signal in real time', 'TP / SL levels & risk guidance', 'Analyst notes for high-impact news'].map((item) => <div key={item} className="flex items-center gap-2"><Check size={15} className="text-[#c8ff39]" /> {item}</div>)}</div><button onClick={onClose} className="mt-7 h-12 w-full rounded-xl bg-[#c8ff39] text-sm font-bold text-black shadow-[0_0_20px_rgba(200,255,57,0.15)]">Start VIP access</button><p className="mt-3 text-center text-[10px] text-zinc-600">Mock checkout · cancel anytime</p></motion.div></motion.div> }
