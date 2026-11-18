export const DEVICE_ID_STORAGE_KEY = 'trade-smart-live-device-id'
export const REFERRER_STORAGE_KEY = 'trade-smart-live-referrer'

// Unambiguous characters only (no 0/O, 1/I/L) so IDs are easy to read aloud and type.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const DEVICE_ID_PATTERN = /^TSL-[A-HJKMNP-Z2-9]{8}$/

export function normalizeDeviceId(value: string) {
  return value.trim().toUpperCase()
}

export function isValidDeviceId(value: string) {
  return DEVICE_ID_PATTERN.test(value)
}

function generateDeviceId() {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  return `TSL-${Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join('')}`
}

export function getOrCreateDeviceId() {
  const existing = window.localStorage.getItem(DEVICE_ID_STORAGE_KEY)
  if (existing && isValidDeviceId(existing)) return existing
  const id = generateDeviceId()
  window.localStorage.setItem(DEVICE_ID_STORAGE_KEY, id)
  return id
}
