import 'server-only'

const MONNIFY_BASE_URL = process.env.MONNIFY_BASE_URL || 'https://api.monnify.com'
export const MONNIFY_API_KEY = process.env.NEXT_PUBLIC_MONNIFY_API_KEY || 'AAVLUB2Q3GKPFZQYKWY1ZZ8MXV1P7UVV'

export class MonnifyConfigError extends Error {}

async function getAccessToken() {
  const secret = process.env.MONNIFY_SECRET_KEY
  if (!secret) throw new MonnifyConfigError('MONNIFY_SECRET_KEY is not configured.')
  const response = await fetch(`${MONNIFY_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${MONNIFY_API_KEY}:${secret}`).toString('base64')}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as { requestSuccessful?: boolean; responseBody?: { accessToken: string } } | null
  if (!response.ok || !body?.requestSuccessful || !body.responseBody?.accessToken) throw new Error('Monnify authentication failed.')
  return body.responseBody.accessToken
}

export type MonnifyTransaction = {
  transactionReference: string
  paymentReference: string
  amountPaid: string | number
  totalPayable: string | number
  paymentStatus: string
  currency?: string
  customer?: { email?: string; name?: string }
  metaData?: Record<string, string>
}

/** Fetches the transaction from Monnify's API so payment status never relies on the client callback. */
export async function fetchMonnifyTransaction(transactionReference: string) {
  const token = await getAccessToken()
  const response = await fetch(`${MONNIFY_BASE_URL}/api/v2/transactions/${encodeURIComponent(transactionReference)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  })
  const body = await response.json().catch(() => null) as { requestSuccessful?: boolean; responseBody?: MonnifyTransaction } | null
  if (!response.ok || !body?.requestSuccessful || !body.responseBody) throw new Error('Monnify transaction lookup failed.')
  return body.responseBody
}
