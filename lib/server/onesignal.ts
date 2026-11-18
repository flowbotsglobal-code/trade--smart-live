import 'server-only'

export type SignalPush = { id?: string; pair: string; action: string; entry: string; sl: string; tp1: string }

export async function sendSignalPush(signal: SignalPush) {
  const appId = process.env.ONESIGNAL_APP_ID || process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
  const restApiKey = process.env.ONESIGNAL_REST_API_KEY
  if (!appId || !restApiKey) return { ok: false as const, error: 'OneSignal is not configured.' }

  const response = await fetch('https://api.onesignal.com/notifications?c=push', {
    method: 'POST',
    headers: { Authorization: `Key ${restApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: appId,
      target_channel: 'push',
      filters: [{ field: 'tag', key: 'vip', relation: '=', value: 'true' }],
      headings: { en: `New VIP Signal: ${signal.pair} ${signal.action}` },
      contents: { en: `Entry ${signal.entry} · SL ${signal.sl} · TP1 ${signal.tp1}` },
      url: '/?tab=Signals',
      // High priority + default system sound on every platform.
      priority: 10,
      ios_interruption_level: 'time_sensitive',
      ios_sound: 'default',
      ...(process.env.ONESIGNAL_ANDROID_CHANNEL_ID ? { android_channel_id: process.env.ONESIGNAL_ANDROID_CHANNEL_ID } : {}),
      android_visibility: 1,
      require_interaction: true,
      ttl: 86400,
      data: { type: 'vip_signal', signalId: signal.id ?? null, pair: signal.pair },
    }),
  })
  const result = await response.json().catch(() => null) as { id?: string; errors?: unknown } | null
  if (!response.ok || result?.errors) return { ok: false as const, error: 'OneSignal notification failed.', details: result?.errors }
  return { ok: true as const, notificationId: result?.id ?? null }
}
