import { useEffect, useRef } from 'react'

/**
 * Calls callback when the document becomes visible again (tab focus).
 * Keeps customer/admin lists aligned with the DB without websockets.
 */
export function useRefetchOnFocus(callback) {
  const saved = useRef(callback)
  saved.current = callback
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') saved.current()
    }
    document.addEventListener('visibilitychange', handler)
    return () => document.removeEventListener('visibilitychange', handler)
  }, [])
}
