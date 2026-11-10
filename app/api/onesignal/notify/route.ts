import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const appId = process.env.ONESIGNAL_APP_ID
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !restApiKey) return NextResponse.json({ error: 'OneSignal is not configured.' }, { status: 503 })
  const body = await request.json() as { pair: string; action: string; entry: string; sl: string; tp1: string }
  const response = await fetch('https://onesignal.com/api/v1/notifications', {
    method: 'POST',
    headers: { Authorization: `Key ${restApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      filters: [{ field: 'tag', key: 'vip', relation: '=', value: 'true' }],
      headings: { en: 'New VIP Signal' },
      contents: { en: `${body.pair} ${body.action} · Entry ${body.entry} · TP1 ${body.tp1}` },
      priority: 10,
      ttl: 86400,
      android_channel_id: process.env.ONESIGNAL_ANDROID_CHANNEL_ID,
      android_sound: 'trade_alert',
      ios_sound: 'trade_alert.wav',
      data: { type: 'vip_signal', pair: body.pair },
    }),
  })
  if (!response.ok) return NextResponse.json({ error: 'OneSignal notification failed.' }, { status: response.status })
  return NextResponse.json({ ok: true })
}
