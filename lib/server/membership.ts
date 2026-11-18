import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { getAdminDb } from './firebase-admin'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

export const MEMBERS = 'vip_members'
export const VIP_PRICE_NGN = 15000
export const REFERRAL_COMMISSION_NGN = 5000
const DAY_MS = 86_400_000

export type MemberStatus = { deviceId: string; isVip: boolean; vipExpiresAt: string | null; email: string | null; referralCount: number; referralEarnings: number }

function toStatus(deviceId: string, data: FirebaseFirestore.DocumentData | undefined): MemberStatus {
  const expires = data?.vipExpiresAt instanceof Timestamp ? data.vipExpiresAt.toMillis() : null
  return {
    deviceId,
    isVip: Boolean(data?.isVip && expires && expires > Date.now()),
    vipExpiresAt: expires ? new Date(expires).toISOString() : null,
    email: data?.email ?? null,
    referralCount: data?.referralCount ?? 0,
    referralEarnings: data?.referralEarnings ?? 0,
  }
}

export async function registerDevice(rawDeviceId: string, rawReferrer?: string | null) {
  const deviceId = normalizeDeviceId(rawDeviceId)
  if (!isValidDeviceId(deviceId)) throw new Error('Invalid device ID.')
  const referrer = rawReferrer ? normalizeDeviceId(rawReferrer) : null
  const ref = getAdminDb().collection(MEMBERS).doc(deviceId)
  await getAdminDb().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (snap.exists) {
      tx.update(ref, { lastSeenAt: FieldValue.serverTimestamp() })
      return
    }
    tx.set(ref, {
      deviceId,
      isVip: false,
      vipExpiresAt: null,
      email: null,
      referredBy: referrer && referrer !== deviceId && isValidDeviceId(referrer) ? referrer : null,
      referralCount: 0,
      referralEarnings: 0,
      createdAt: FieldValue.serverTimestamp(),
      lastSeenAt: FieldValue.serverTimestamp(),
    })
  })
  return getMemberStatus(deviceId)
}

export async function getMemberStatus(rawDeviceId: string) {
  const deviceId = normalizeDeviceId(rawDeviceId)
  const snap = await getAdminDb().collection(MEMBERS).doc(deviceId).get()
  return toStatus(deviceId, snap.data())
}

function extendExpiry(current: unknown, days: number) {
  const now = Date.now()
  const base = current instanceof Timestamp && current.toMillis() > now ? current.toMillis() : now
  return Timestamp.fromMillis(base + days * DAY_MS)
}

/** Grants VIP by device ID, or by email across every device registered with that email. */
export async function grantVip({ deviceId, email, days = 30, source }: { deviceId?: string; email?: string; days?: number; source: 'admin' | 'monnify' }) {
  const db = getAdminDb()
  const normalizedEmail = email?.trim().toLowerCase() || null
  let refs: FirebaseFirestore.DocumentReference[] = []
  if (deviceId) {
    const id = normalizeDeviceId(deviceId)
    if (!isValidDeviceId(id)) throw new Error('Invalid device ID.')
    refs = [db.collection(MEMBERS).doc(id)]
  } else if (normalizedEmail) {
    const matches = await db.collection(MEMBERS).where('email', '==', normalizedEmail).get()
    refs = matches.docs.map((item) => item.ref)
  }
  if (!refs.length) return []

  return db.runTransaction(async (tx) => {
    const snaps = await Promise.all(refs.map((ref) => tx.get(ref)))
    return snaps.map((snap) => {
      const vipExpiresAt = extendExpiry(snap.data()?.vipExpiresAt, days)
      const update: Record<string, unknown> = { deviceId: snap.id, isVip: true, vipExpiresAt, vipSource: source, vipActivatedAt: FieldValue.serverTimestamp() }
      if (normalizedEmail) update.email = normalizedEmail
      if (!snap.exists) Object.assign(update, { referralCount: 0, referralEarnings: 0, referredBy: null, createdAt: FieldValue.serverTimestamp() })
      tx.set(snap.ref, update, { merge: true })
      return { deviceId: snap.id, vipExpiresAt: vipExpiresAt.toDate().toISOString() }
    })
  })
}

/**
 * Records a verified Monnify payment exactly once (keyed by transaction reference),
 * activates 30 days of VIP and credits the referrer's ₦5,000 commission.
 */
export async function recordVerifiedPayment({ transactionReference, paymentReference, deviceId: rawDeviceId, email, amountPaid }: { transactionReference: string; paymentReference: string; deviceId: string; email: string | null; amountPaid: number }) {
  const db = getAdminDb()
  const deviceId = normalizeDeviceId(rawDeviceId)
  if (!isValidDeviceId(deviceId)) throw new Error('Invalid device ID.')
  const paymentRef = db.collection('payments').doc(transactionReference.replace(/\//g, '_'))
  const memberRef = db.collection(MEMBERS).doc(deviceId)

  return db.runTransaction(async (tx) => {
    const [paymentSnap, memberSnap] = await Promise.all([tx.get(paymentRef), tx.get(memberRef)])
    if (paymentSnap.exists) return { alreadyProcessed: true, commission: null as null | { referrer: string; amount: number } }

    const member = memberSnap.data()
    const referrer: string | null = member?.referredBy ?? null
    const referrerRef = referrer ? db.collection(MEMBERS).doc(referrer) : null
    const referrerSnap = referrerRef ? await tx.get(referrerRef) : null
    const priorPayments = await tx.get(db.collection('payments').where('deviceId', '==', deviceId).limit(1))
    const isFirstPayment = priorPayments.empty

    const vipExpiresAt = extendExpiry(member?.vipExpiresAt, 30)
    tx.set(paymentRef, { transactionReference, paymentReference, deviceId, email, amountPaid, provider: 'monnify', status: 'PAID', createdAt: FieldValue.serverTimestamp() })
    tx.set(memberRef, { deviceId, isVip: true, vipExpiresAt, vipSource: 'monnify', vipActivatedAt: FieldValue.serverTimestamp(), ...(email ? { email: email.toLowerCase() } : {}) }, { merge: true })

    let commission: null | { referrer: string; amount: number } = null
    if (referrerRef && referrerSnap?.exists && isFirstPayment) {
      tx.set(db.collection('referral_commissions').doc(paymentRef.id), { referrer, referee: deviceId, transactionReference, amount: REFERRAL_COMMISSION_NGN, currency: 'NGN', status: 'PENDING_PAYOUT', createdAt: FieldValue.serverTimestamp() })
      tx.update(referrerRef, { referralCount: FieldValue.increment(1), referralEarnings: FieldValue.increment(REFERRAL_COMMISSION_NGN) })
      commission = { referrer: referrer!, amount: REFERRAL_COMMISSION_NGN }
    }
    return { alreadyProcessed: false, commission, vipExpiresAt: vipExpiresAt.toDate().toISOString() }
  })
}
