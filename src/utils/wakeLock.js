import { useCallback, useEffect, useRef, useState } from 'react'

// Screen Wake Lock — keeps the display awake during Cook Mode. Works on
// localhost/HTTPS in supporting browsers; re-acquires after tab visibility changes.
export function useWakeLock() {
  const sentinel = useRef(null)
  const [active, setActive] = useState(false)
  const [supported] = useState(() => typeof navigator !== 'undefined' && 'wakeLock' in navigator)

  const request = useCallback(async () => {
    if (!supported) return false
    try {
      sentinel.current = await navigator.wakeLock.request('screen')
      setActive(true)
      sentinel.current.addEventListener('release', () => setActive(false))
      return true
    } catch {
      setActive(false)
      return false
    }
  }, [supported])

  const release = useCallback(async () => {
    try { await sentinel.current?.release() } catch { /* ignore */ }
    sentinel.current = null
    setActive(false)
  }, [])

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible' && sentinel.current === null && active) request()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      sentinel.current?.release().catch(() => {})
    }
  }, [active, request])

  return { active, supported, request, release }
}
