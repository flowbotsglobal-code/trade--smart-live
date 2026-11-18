import 'server-only'
import { timingSafeEqual } from 'node:crypto'

export function isValidAdminPin(pin: unknown) {
  const expected = process.env.VIP_ADMIN_PIN
  if (!expected || typeof pin !== 'string') return false
  const a = Buffer.from(pin.trim())
  const b = Buffer.from(expected.trim())
  return a.length === b.length && timingSafeEqual(a, b)
}

export function isAdminRequest(request: Request) {
  return isValidAdminPin(request.headers.get('x-admin-pin'))
}
