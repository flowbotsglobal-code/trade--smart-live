import { NextResponse } from 'next/server'
import { isValidAdminPin } from '@/lib/server/admin-auth'

export async function POST(request: Request) {
  if (!process.env.VIP_ADMIN_PIN) return NextResponse.json({ ok: false, error: 'VIP_ADMIN_PIN is not configured.' }, { status: 503 })
  const body = await request.json().catch(() => null) as { pin?: string } | null
  if (!isValidAdminPin(body?.pin)) return NextResponse.json({ ok: false }, { status: 401 })
  return NextResponse.json({ ok: true })
}
