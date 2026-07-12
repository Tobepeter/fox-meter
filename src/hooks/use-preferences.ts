import { useCallback, useEffect, useRef, useState } from 'react'

import {
  defaultPreferences,
  normalizePreferences,
  readBrowserPreferences,
  toUiPreferences,
  writeBrowserPreferences,
} from '@/lib/preferences'
import { getInvoke, isTauri } from '@/lib/platform'
import type { AppPreferences, UiPreferences } from '@/types/preferences'

export function usePreferences() {
  const initial = isTauri ? defaultPreferences : readBrowserPreferences()
  const [preferences, setPreferences] = useState(initial)
  const [ready, setReady] = useState(!isTauri)
  const currentRef = useRef(initial)
  const revisionRef = useRef(0)
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    let cancelled = false
    const initialRevision = revisionRef.current

    async function initialize() {
      const invoke = await getInvoke()
      if (!invoke) {
        if (!cancelled) setReady(true)
        return
      }

      try {
        const saved = normalizePreferences(await invoke<AppPreferences>('get_preferences'))
        if (!cancelled && revisionRef.current === initialRevision) {
          currentRef.current = saved
          setPreferences(saved)
        }
      } catch {
        // 偏好读取失败时保留安全默认值
      } finally {
        if (!cancelled) setReady(true)
      }
    }

    void initialize()
    return () => {
      cancelled = true
    }
  }, [])

  const updatePreferences = useCallback((update: Partial<UiPreferences>) => {
    const previous = currentRef.current
    const next = normalizePreferences({ ...previous, ...update })
    revisionRef.current += 1
    currentRef.current = next
    setPreferences(next)

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(async () => {
        const invoke = await getInvoke()
        if (invoke) {
          await invoke('set_preferences', { preferences: toUiPreferences(next) })
        } else {
          writeBrowserPreferences(next)
        }
      })
      .catch(() => {
        if (currentRef.current !== next) return
        currentRef.current = previous
        setPreferences(previous)
      })
  }, [])

  return { preferences, ready, updatePreferences }
}
