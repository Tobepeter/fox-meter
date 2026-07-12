import { useCallback, useEffect, useRef, useState } from 'react'
import { listen } from '@tauri-apps/api/event'
import { createPreviewSnapshot } from '@/debug/usage-preview'
import { getInvoke, isTauri } from '@/lib/platform'
import { createMockSnapshot, getRefreshDelay } from '@/lib/usage'
import type { UsageSnapshot } from '@/types/usage'

function createBrowserSnapshot() {
  if (!import.meta.env.DEV) return createMockSnapshot()

  const preview = new URLSearchParams(window.location.search).get('preview')
  return createPreviewSnapshot(preview)
}

export function useUsage(options: { refreshInterval: number }) {
  const [snapshot, setSnapshot] = useState<UsageSnapshot | null>(() =>
    '__TAURI_INTERNALS__' in window ? null : createBrowserSnapshot(),
  )
  const [refreshing, setRefreshing] = useState(false)
  const [now, setNow] = useState(Date.now())
  const [failureCount, setFailureCount] = useState(0)
  const [refreshCycle, setRefreshCycle] = useState(0)
  const [appVisible, setAppVisible] = useState(true)
  const inFlight = useRef(false)

  const refresh = useCallback(async () => {
    if (inFlight.current) return
    inFlight.current = true
    setRefreshing(true)

    try {
      const invoke = await getInvoke()
      const next = invoke ? await invoke<UsageSnapshot>('refresh_usage') : createBrowserSnapshot()
      setSnapshot(next)
      setFailureCount((current) => (next.error ? current + 1 : 0))
    } catch (error) {
      setFailureCount((current) => current + 1)
      setSnapshot((current) =>
        current
          ? {
              ...current,
              stale: true,
              error: {
                code: 'invoke',
                message: error instanceof Error ? error.message : String(error),
              },
            }
          : null,
      )
    } finally {
      inFlight.current = false
      setRefreshing(false)
      setRefreshCycle((current) => current + 1)
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    async function initialize() {
      const invoke = await getInvoke()
      if (invoke) {
        try {
          const cached = await invoke<UsageSnapshot | null>('read_cached_usage')
          if (!cancelled && cached) setSnapshot(cached)
        } catch {
          // 缓存不可用时继续请求实时数据
        }
      }
      if (!cancelled) await refresh()
    }

    void initialize()
    return () => {
      cancelled = true
    }
  }, [refresh])

  useEffect(() => {
    if (!isTauri) return

    let disposed = false
    let unlisten: (() => void) | undefined

    void listen<boolean>('app-visibility', (event) => {
      setAppVisible(event.payload)
      if (event.payload) void refresh()
    })
      .then((cleanup) => {
        if (disposed) cleanup()
        else unlisten = cleanup
      })
      .catch(() => {
        // 监听失败时保留默认前台轮询
      })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [refresh])

  useEffect(() => {
    const clock = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(clock)
  }, [])

  useEffect(() => {
    if (!appVisible) return

    const delay = getRefreshDelay(options.refreshInterval, failureCount)
    const timer = window.setTimeout(refresh, delay)
    return () => window.clearTimeout(timer)
  }, [appVisible, failureCount, options.refreshInterval, refresh, refreshCycle])

  useEffect(() => {
    function refreshWhenActive() {
      if (appVisible && document.visibilityState === 'visible') void refresh()
    }

    window.addEventListener('focus', refreshWhenActive)
    document.addEventListener('visibilitychange', refreshWhenActive)
    return () => {
      window.removeEventListener('focus', refreshWhenActive)
      document.removeEventListener('visibilitychange', refreshWhenActive)
    }
  }, [appVisible, refresh])

  return {
    snapshot,
    refreshing,
    now,
    refresh,
  }
}
