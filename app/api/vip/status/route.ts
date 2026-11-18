import { NextResponse } from 'next/server'
import { getMemberStatus } from '@/lib/server/membership'
import { AdminConfigError } from '@/lib/server/firebase-admin'
import { isValidDeviceId, normalizeDeviceId } from '@/lib/device-id'

export async function GET(request: Request) {
  const deviceId = normalizeDeviceId(new URL(request.url).searchParams.get('deviceId') ?? '')
  if (!isValidDeviceId(deviceId)) return NextResponse.json({ error: 'Invalid device ID.' }, { status: 400 })
  try {
    return NextResponse.json(await getMemberStatus(deviceId))
  } catch (error) {
    const status = error instanceof AdminConfigError ? 503 : 500
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Status lookup failed.' }, { status })
  }
}
