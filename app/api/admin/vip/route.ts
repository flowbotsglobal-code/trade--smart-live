import { NextResponse } from 'next/server'
import { isAdminRequest } from '@/lib/server/admin-auth'
import { grantVip } from '@/lib/server/membership'
import { AdminConfigError } from '@/lib/server/firebase-admin'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: Request) {
  if (!isAdminRequest(request)) return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  const body = await request.json().catch(() => null) as { deviceId?: string; email?: string; days?: number } | null
  const deviceId = body?.deviceId ? normalizeDeviceId(body.deviceId) : ''
  const email = body?.email?.trim().toLowerCase() ?? ''
  const days = Number.isInteger(body?.days) && body!.days! > 0 && body!.days! <= 365 ? body!.days! : 30

  if (deviceId && !isValidDeviceId(deviceId)) return NextResponse.json({ error: 'Device ID must look like TSL-XXXXXXXX.' }, { status: 400 })
  if (email && !EMAIL_PATTERN.test(email)) return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
  if (!deviceId && !email) return NextResponse.json({ error: 'Enter a Device ID or email.' }, { status: 400 })

  try {
    const granted = await grantVip({ deviceId: deviceId || undefined, email: email || undefined, days, source: 'admin' })
    if (!granted.length) return NextResponse.json({ error: 'No device is registered with that email yet. Use the Device ID instead.' }, { status: 404 })
    return NextResponse.json({ ok: true, granted })
  } catch (error) {
    const status = error instanceof AdminConfigError ? 503 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Activation failed.' }, { status })
  }
}
