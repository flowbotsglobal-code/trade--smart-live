import { NextResponse } from 'next/server'

const WAT_OFFSET_MS = 60 * 60 * 1000
const CACHE_SECONDS = 3600
const COUNTRY_CURRENCIES: Record<string, string> = {
  AU: 'AUD',
  BR: 'BRL',
  CA: 'CAD',
  CH: 'CHF',
  CN: 'CNY',
  EU: 'EUR',
  GB: 'GBP',
  HK: 'HKD',
  JP: 'JPY',
  NZ: 'NZD',
  UK: 'GBP',
  US: 'USD',
  ZA: 'ZAR',
}

type FinnhubEvent = {
  country?: string
  currency?: string
  event?: string
  impact?: string | number | null
  time?: string
  date?: string
  estimate?: string | number | null
  previous?: string | number | null
  prev?: string | number | null
  unit?: string | null
}

type FinnhubCalendarResponse = FinnhubEvent[] | { economicCalendar?: FinnhubEvent[] }

function currentWATWeekBounds() {
  const nowWAT = new Date(Date.now() + WAT_OFFSET_MS)
  const daysSinceMonday = (nowWAT.getUTCDay() + 6) % 7
  const mondayAtMidnightWAT = Date.UTC(
    nowWAT.getUTCFullYear(),
    nowWAT.getUTCMonth(),
    nowWAT.getUTCDate() - daysSinceMonday,
  )
  const start = new Date(mondayAtMidnightWAT - WAT_OFFSET_MS)
  const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000)
  return { start, end }
}

function formatWATDate(date: Date) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Lagos',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

function parseFinnhubTime(value?: string) {
  if (!value) return null
  const timestamp = value.trim().replace(' ', 'T')
  const includesTimezone = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(timestamp)
  const date = new Date(includesTimezone ? timestamp : `${timestamp}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}

function isHighImpact(impact?: string | number | null) {
  const normalized = String(impact ?? '').trim().toLowerCase()
  return normalized === 'high' || normalized === '3'
}

function getCurrency(event: FinnhubEvent) {
  const explicitCurrency = event.currency?.trim().toUpperCase()
  if (explicitCurrency && /^[A-Z]{3}$/.test(explicitCurrency)) return explicitCurrency

  const unitCurrency = event.unit?.trim().toUpperCase()
  if (unitCurrency && /^[A-Z]{3}$/.test(unitCurrency)) return unitCurrency

  const country = event.country?.trim().toUpperCase() ?? ''
  return COUNTRY_CURRENCIES[country] ?? (country || '—')
}

function formatValue(value?: string | number | null) {
  if (value === null || value === undefined || String(value).trim() === '') return '—'
  return String(value)
}

export async function GET() {
  const apiKey = process.env.FINNHUB_API_KEY?.trim()
  if (!apiKey || apiKey === 'YOUR_FINNHUB_API_KEY' || apiKey === 'PASTE_YOUR_FINNHUB_KEY_HERE') {
    return NextResponse.json({ events: [], error: 'Finnhub API key is not configured.' }, { status: 503 })
  }

  try {
    const { start, end } = currentWATWeekBounds()
    const calendarUrl = new URL('https://finnhub.io/api/v1/economic-calendar')
    calendarUrl.searchParams.set('from', formatWATDate(start))
    calendarUrl.searchParams.set('to', formatWATDate(new Date(end.getTime() - 1)))

    const response = await fetch(calendarUrl, {
      headers: { 'X-Finnhub-Token': apiKey },
      next: { revalidate: CACHE_SECONDS },
    })
    if (response.status === 401 || response.status === 403) {
      return NextResponse.json({
        events: [],
        error: 'Finnhub rejected this key for the economic calendar endpoint. Verify the key and subscription access.',
      }, { status: response.status })
    }
    if (!response.ok) throw new Error(`Finnhub returned ${response.status}`)

    const payload = await response.json() as FinnhubCalendarResponse
    const feed = Array.isArray(payload) ? payload : payload.economicCalendar ?? []
    const events = feed.flatMap((event) => {
      if (!isHighImpact(event.impact) || !event.event?.trim()) return []
      const releaseAt = parseFinnhubTime(event.time ?? event.date)
      if (!releaseAt || releaseAt < start || releaseAt >= end) return []
      return [{
        id: `${releaseAt.toISOString()}-${event.country}-${event.event}`,
        title: event.event.trim(),
        currency: getCurrency(event),
        releaseAt: releaseAt.toISOString(),
        impact: 'HIGH' as const,
        forecast: formatValue(event.estimate),
        previous: formatValue(event.previous ?? event.prev),
      }]
    }).sort((first, second) => Date.parse(first.releaseAt) - Date.parse(second.releaseAt))

    return NextResponse.json({ events, source: 'Finnhub Economic Calendar', weekStart: start.toISOString(), weekEnd: end.toISOString() })
  } catch {
    console.error('[v0] Finnhub economic calendar request failed')
    return NextResponse.json({ events: [], error: 'Finnhub economic calendar is temporarily unavailable.' }, { status: 503 })
  }
}
