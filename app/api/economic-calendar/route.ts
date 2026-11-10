import { NextResponse } from 'next/server'

export const revalidate = 900

type FeedEvent = {
  title?: string
  country?: string
  date?: string
  time?: string
  impact?: string
  forecast?: string
  previous?: string
}

function currentWeekBounds() {
  const now = new Date()
  const start = new Date(now)
  const day = start.getDay()
  start.setDate(start.getDate() - (day === 0 ? 6 : day - 1))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 7)
  return { start, end }
}

export async function GET() {
  try {
    const response = await fetch('https://nfs.faireconomy.media/ff_calendar_thisweek.json', { next: { revalidate: 900 } })
    if (!response.ok) throw new Error(`Calendar feed returned ${response.status}`)
    const feed = await response.json() as FeedEvent[]
    const { start, end } = currentWeekBounds()
    const events = feed.flatMap((event) => {
      if (!event.date || !event.title) return []
      const date = new Date(event.date)
      if (Number.isNaN(date.getTime()) || date < start || date >= end) return []
      const impact = event.impact?.toLowerCase() === 'high' ? 'HIGH' : event.impact?.toLowerCase() === 'medium' ? 'MEDIUM' : 'LOW'
      return [{
        id: `${event.date}-${event.country}-${event.title}`,
        title: event.title,
        currency: event.country || 'USD',
        releaseAt: date.toISOString(),
        impact,
        forecast: event.forecast || '—',
        previous: event.previous || '—',
      }]
    })
    return NextResponse.json({ events, source: 'Forex Factory public calendar', weekStart: start.toISOString(), weekEnd: end.toISOString() })
  } catch (error) {
    console.error('[v0] Economic calendar feed failed:', error)
    return NextResponse.json({ events: [], error: 'Live economic calendar is temporarily unavailable.' }, { status: 503 })
  }
}
