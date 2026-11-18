import 'server-only'
import { cert, getApp, getApps, initializeApp, type ServiceAccount } from 'firebase-admin/app'
import { getFirestore, type Firestore } from 'firebase-admin/firestore'

let cachedDb: Firestore | null = null

function parseServiceAccount(): ServiceAccount {
  const raw = process.env.FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON
  if (!raw) throw new AdminConfigError('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not configured.')
  let parsed: Record<string, string>
  try {
    const trimmed = raw.trim()
    parsed = JSON.parse(trimmed.startsWith('{') ? trimmed : Buffer.from(trimmed, 'base64').toString('utf8'))
  } catch {
    throw new AdminConfigError('FIREBASE_ADMIN_SERVICE_ACCOUNT_JSON is not valid JSON.')
  }
  return {
    projectId: parsed.project_id,
    clientEmail: parsed.client_email,
    // Private keys pasted into env dashboards often keep literal "\n" sequences.
    privateKey: parsed.private_key?.replace(/\\n/g, '\n'),
  }
}

export class AdminConfigError extends Error {}

export function getAdminDb() {
  if (cachedDb) return cachedDb
  const app = getApps().length ? getApp() : initializeApp({ credential: cert(parseServiceAccount()) })
  cachedDb = getFirestore(app)
  return cachedDb
}
