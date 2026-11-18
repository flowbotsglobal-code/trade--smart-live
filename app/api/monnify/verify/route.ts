import { NextResponse } from 'next/server'
import { fetchMonnifyTransaction, MonnifyConfigError } from '@/lib/server/monnify'
import { recordVerifiedPayment, VIP_PRICE_NGN } from '@/lib/server/membership'
import { AdminConfigError } from '@/lib/server/firebase-admin'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { transactionReference?: string; deviceId?: string } | null
  const transactionReference = body?.transactionReference?.trim()
  const deviceId = normalizeDeviceId(body?.deviceId ?? '')
  if (!transactionReference || !isValidDeviceId(deviceId)) return NextResponse.json({ error: 'Missing transaction reference or device ID.' }, { status: 400 })

  try {
    const transaction = await fetchMonnifyTransaction(transactionReference)
    const amountPaid = Number(transaction.amountPaid)
    if (transaction.paymentStatus !== 'PAID' || amountPaid < VIP_PRICE_NGN) {
      return NextResponse.json({ ok: false, status: transaction.paymentStatus, error: 'Payment has not been confirmed yet.' }, { status: 402 })
    }
    const metaDevice = transaction.metaData?.deviceId ? normalizeDeviceId(transaction.metaData.deviceId) : null
    if (metaDevice !== deviceId) return NextResponse.json({ error: 'Payment belongs to a different device.' }, { status: 403 })

    const result = await recordVerifiedPayment({
      transactionReference: transaction.transactionReference,
      paymentReference: transaction.paymentReference,
      deviceId,
      email: transaction.customer?.email ?? null,
      amountPaid,
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    const status = error instanceof MonnifyConfigError || error instanceof AdminConfigError ? 503 : 502
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Payment verification failed.' }, { status })
  }
}
