import { NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { fetchMonnifyTransaction } from '@/lib/server/monnify'
import { recordVerifiedPayment, VIP_PRICE_NGN } from '@/lib/server/membership'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

/** Backup activation path if the shopper closes the tab before the client verify call runs. */
export async function POST(request: Request) {
  const secret = process.env.MONNIFY_SECRET_KEY
  if (!secret) return NextResponse.json({ error: 'Not configured.' }, { status: 503 })
  const raw = await request.text()
  const signature = request.headers.get('monnify-signature') ?? ''
  const expected = createHmac('sha512', secret).update(raw).digest('hex')
  if (signature.length !== expected.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 })
  }

  const event = JSON.parse(raw) as { eventType?: string; eventData?: { transactionReference?: string } }
  if (event.eventType !== 'SUCCESSFUL_TRANSACTION' || !event.eventData?.transactionReference) return NextResponse.json({ ok: true, ignored: true })

  const transaction = await fetchMonnifyTransaction(event.eventData.transactionReference)
  const deviceId = normalizeDeviceId(transaction.metaData?.deviceId ?? '')
  const amountPaid = Number(transaction.amountPaid)
  if (transaction.paymentStatus !== 'PAID' || amountPaid < VIP_PRICE_NGN || !isValidDeviceId(deviceId)) return NextResponse.json({ ok: true, ignored: true })

  await recordVerifiedPayment({ transactionReference: transaction.transactionReference, paymentReference: transaction.paymentReference, deviceId, email: transaction.customer?.email ?? null, amountPaid })
  return NextResponse.json({ ok: true })
}
