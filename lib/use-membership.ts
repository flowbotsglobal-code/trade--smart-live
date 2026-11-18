'use client'

import { useEffect, useState } from 'react'
import useSWR from 'swr'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from './firebase'
import { getOrCreateDeviceId, isValidDeviceId, normalizeDeviceId, REFERRER_STORAGE_KEY } from './device-id'

export type Membership = { deviceId: string; isVip: boolean; vipExpiresAt: string | null; email: string | null; referralCount: number; referralEarnings: number }

const fetchStatus = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' })
  if (!response.ok) throw new Error('Status unavailable')
  return response.json() as Promise<Membership>
}

type OneSignalUser = { login: (id: string) => Promise<void>; User: { addTag: (key: string, value: string) => void } }
function syncPushTags(deviceId: string, isVip: boolean) {
  const w = window as typeof window & { OneSignalDeferred?: Array<(oneSignal: OneSignalUser) => void> }
  w.OneSignalDeferred = w.OneSignalDeferred || []
  w.OneSignalDeferred.push(async (oneSignal) => {
    await oneSignal.login(deviceId).catch(() => undefined)
    oneSignal.User.addTag('vip', isVip ? 'true' : 'false')
  })
}

export function useMembership() {
  const [deviceId, setDeviceId] = useState<string | null>(null)

  useEffect(() => {
    const ref = new URLSearchParams(window.location.search).get('ref')
    if (ref && isValidDeviceId(normalizeDeviceId(ref)) && !window.localStorage.getItem(REFERRER_STORAGE_KEY)) {
      window.localStorage.setItem(REFERRER_STORAGE_KEY, normalizeDeviceId(ref))
    }
    const id = getOrCreateDeviceId()
    setDeviceId(id)
    void fetch('/api/device/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ deviceId: id, referrer: window.localStorage.getItem(REFERRER_STORAGE_KEY) }),
    }).catch(() => undefined)
  }, [])

  const { data, mutate } = useSWR(deviceId ? `/api/vip/status?deviceId=${deviceId}` : null, fetchStatus, { refreshInterval: 20000, revalidateOnFocus: true })

  // Firestore listener pushes admin activations instantly; the SWR poll above is the fallback.
  useEffect(() => {
    if (!deviceId) return
    return onSnapshot(doc(db, 'vip_members', deviceId), () => { void mutate() }, () => undefined)
  }, [deviceId, mutate])

  const isVip = Boolean(data?.isVip)
  useEffect(() => { if (deviceId) syncPushTags(deviceId, isVip) }, [deviceId, isVip])

  return { deviceId, membership: data ?? null, isVip, refresh: mutate }
}
