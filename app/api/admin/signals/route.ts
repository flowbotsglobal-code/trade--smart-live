import { NextResponse } from 'next/server'
import { FieldValue } from 'firebase-admin/firestore'
import { isAdminRequest } from '@/lib/server/admin-auth'
import { AdminConfigError, getAdminDb } from '@/lib/server/firebase-admin'
import { sendSignalPush } from '@/lib/server/onesignal'

type SignalInput = { pair?: string; action?: string; entry?: string; sl?: string; tp1?: string; tp2?: string; tp3?: string; notes?: string }
const clean = (value: unknown, max = 80) => (typeof value === 'string' ? value.trim().slice(0, max) : '')

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const body = await request.json().catch(() => null) as SignalInput | null
  const signal = {
    pair: clean(body?.pair).toUpperCase(),
    action: body?.action === 'SELL' ? 'SELL' : 'BUY',
    entry: clean(body?.entry),
    sl: clean(body?.sl),
    tp1: clean(body?.tp1),
    tp2: clean(body?.tp2),
    tp3: clean(body?.tp3),
    notes: clean(body?.notes, 1000),
  }
  if (!signal.pair || !signal.entry || !signal.sl || !signal.tp1) return NextResponse.json({ error: 'Pair, entry, SL and TP1 are required.' }, { status: 400 })

  try {
    const ref = await getAdminDb().collection('signals').add({ ...signal, status: 'ACTIVE', createdAt: FieldValue.serverTimestamp() })
    const push = await sendSignalPush({ id: ref.id, ...signal })
    return NextResponse.json({ ok: true, id: ref.id, push })
  } catch (error) {
    const status = error instanceof AdminConfigError ? 503 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Signal broadcast failed.' }, { status })
  }
}
