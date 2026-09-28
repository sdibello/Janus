import { useEffect } from 'react'
import { identityApi } from './runtime'

const minimumIntervalMs = 5 * 60 * 1000
let lastSentAt = 0
let pending = false

export default function useSessionActivity(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return

    const recordActivity = (event: Event) => {
      if (!event.isTrusted || document.visibilityState !== 'visible' || pending) return
      const now = Date.now()
      if (now - lastSentAt < minimumIntervalMs) return

      pending = true
      void fetch(`${identityApi}/account/activity`, { method: 'POST', credentials: 'include', keepalive: true })
        .then(() => { lastSentAt = now })
        .catch(() => { /* The next interaction can retry. */ })
        .finally(() => { pending = false })
    }

    document.addEventListener('pointerdown', recordActivity)
    document.addEventListener('keydown', recordActivity)
    return () => {
      document.removeEventListener('pointerdown', recordActivity)
      document.removeEventListener('keydown', recordActivity)
    }
  }, [enabled])
}
