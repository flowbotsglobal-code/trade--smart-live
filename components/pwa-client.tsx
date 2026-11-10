'use client'

import { useEffect, useState } from 'react'

export default function PwaClient() {
  useEffect(() => {
    if ('serviceWorker' in navigator) { navigator.serviceWorker.register('/sw.js').then((registration) => registration.update()).catch(() => undefined) }
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID
    if (!appId) return
    const script = document.createElement('script')
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js'
    script.defer = true
    document.head.appendChild(script)
    const oneSignalWindow = window as typeof window & { OneSignalDeferred?: Array<(oneSignal: { init: (config: Record<string, unknown>) => Promise<void> }) => void> }
    oneSignalWindow.OneSignalDeferred = oneSignalWindow.OneSignalDeferred || []
    oneSignalWindow.OneSignalDeferred.push(async (oneSignal) => {
      await oneSignal.init({ appId, allowLocalhostAsSecureOrigin: true, notifyButton: { enable: false } })
    })
    return () => script.remove()
  }, [])
  return null
}

export function PwaInstallButton() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  useEffect(() => {
    const onPrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])
  if (!installPrompt) return null
  return <button onClick={async () => { await installPrompt.prompt(); setInstallPrompt(null) }} className="mt-4 h-11 w-full rounded-lg border border-cyan-400/40 bg-cyan-400/10 text-sm font-bold tracking-wide text-cyan-200 active:scale-95">Install App</button>
}

type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }
