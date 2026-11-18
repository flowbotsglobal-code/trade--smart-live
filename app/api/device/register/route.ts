import { NextResponse } from 'next/server'
import { registerDevice } from '@/lib/server/membership'
import { AdminConfigError } from '@/lib/server/firebase-admin'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { deviceId?: string; referrer?: string | null } | null
  const deviceId = normalizeDeviceId(body?.deviceId ?? '')
  if (!isValidDeviceId(deviceId)) return NextResponse.json({ error: 'Invalid device ID.' }, { status: 400 })
  try {
    return NextResponse.json(await registerDevice(deviceId, body?.referrer))
  } catch (error) {
    const status = error instanceof AdminConfigError ? 503 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Registration failed.' }, { status })
  }
}
