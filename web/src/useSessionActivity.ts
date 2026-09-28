import { useEffect } from 'react'

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
      void fetch('/api/identity/account/activity', { method: 'POST', keepalive: true })
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
