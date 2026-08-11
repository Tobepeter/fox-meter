import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import { getInvoke, isTauri } from '@/lib/platform'
import { createFloatingPause, miniWindowSize } from '@/lib/window'
import type { FloatingPausePreset, FloatingState, WindowMode } from '@/types/window'

const initialFloatingState: FloatingState = { floating: true, pause: null }
const contentFadeDuration = 140

export function useWindowControls() {
  const [floatingState, setFloatingState] = useState(initialFloatingState)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [windowMode, setWindowMode] = useState<WindowMode>('expanded')
  const [windowContentVisible, setWindowContentVisible] = useState(true)
  const [windowModeTransitioning, setWindowModeTransitioning] = useState(false)
  const windowModeTransitioningRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function readFloatingState() {
      const invoke = await getInvoke()
      if (!invoke) return
      try {
        const current = await invoke<FloatingState>('get_floating_state')
        if (!cancelled) setFloatingState(current)
      } catch {
        // 系统状态不可用时保留默认置顶值
      }
    }

    void readFloatingState()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!isTauri) return

    let disposed = false
    let unlisten: (() => void) | undefined

    void listen<FloatingState>('floating-state', (event) => setFloatingState(event.payload))
      .then((cleanup) => {
        if (disposed) cleanup()
        else unlisten = cleanup
      })
      .catch(() => {
        // 自动恢复事件不可用时仍由本地计时兜底
      })

    return () => {
      disposed = true
      unlisten?.()
    }
  }, [])

  const setFloating = useCallback(async (enabled: boolean) => {
    const invoke = await getInvoke()
    try {
      const next = invoke
        ? await invoke<FloatingState>('set_floating', { enabled })
        : { floating: enabled, pause: null }
      setFloatingState(next)
    } catch {
      // 后端已回滚窗口状态，前端保持原值
    }
  }, [])

  const pauseFloating = useCallback(async (preset: FloatingPausePreset) => {
    const invoke = await getInvoke()
    try {
      const next = invoke
        ? await invoke<FloatingState>('pause_floating', { preset })
        : { floating: false, pause: createFloatingPause(preset) }
      setFloatingState(next)
    } catch {
      // 后端已回滚窗口状态，前端保持原值
    }
  }, [])

  const toggleFloating = useCallback(() => {
    if (floatingState.floating) return pauseFloating('one-hour')
    return setFloating(true)
  }, [floatingState.floating, pauseFloating, setFloating])

  const disableFloating = useCallback(() => setFloating(false), [setFloating])

  useEffect(() => {
    const resumesAt = floatingState.pause?.resumesAt
    if (!resumesAt) return

    const delay = Math.max(0, resumesAt - Date.now())
    const timer = window.setTimeout(() => void setFloating(true), delay)
    return () => window.clearTimeout(timer)
  }, [floatingState.pause?.resumesAt, setFloating])

  const startWindowDrag = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (event.button !== 0 || target.closest('button, select, input')) return

    event.preventDefault()
    window.getSelection()?.removeAllRanges()
    if (isTauri) void tauriInvoke('start_window_drag')
  }, [])

  const dragWindow = useCallback(() => {
    if (isTauri) void tauriInvoke('start_window_drag')
  }, [])

  const applyWindowMode = useCallback(async (mode: WindowMode, animated: boolean) => {
    const invoke = await getInvoke()
    if (invoke) {
      await invoke('set_window_mode', {
        mini: mode === 'mini',
        miniSize: miniWindowSize,
        animated,
      })
      return
    }

    if (animated) await new Promise((resolve) => window.setTimeout(resolve, 220))
  }, [])

  const changeWindowMode = useCallback(
    async (nextMode: WindowMode) => {
      if (windowModeTransitioningRef.current || windowMode === nextMode) return

      const animated = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      windowModeTransitioningRef.current = true
      setWindowModeTransitioning(true)
      setWindowContentVisible(false)

      try {
        const resize = applyWindowMode(nextMode, animated).then(
          () => ({ ok: true as const }),
          (error: unknown) => ({ ok: false as const, error }),
        )
        if (animated) {
          await new Promise((resolve) => window.setTimeout(resolve, contentFadeDuration))
        }
        setWindowMode(nextMode)
        await new Promise((resolve) => window.requestAnimationFrame(resolve))
        setWindowContentVisible(true)

        const result = await resize
        if (!result.ok) throw result.error
      } catch {
        setWindowMode(windowMode)
        setWindowContentVisible(true)
      } finally {
        windowModeTransitioningRef.current = false
        setWindowModeTransitioning(false)
      }
    },
    [applyWindowMode, windowMode],
  )

  const enterMiniMode = useCallback(() => changeWindowMode('mini'), [changeWindowMode])
  const exitMiniMode = useCallback(() => changeWindowMode('expanded'), [changeWindowMode])

  const toggleSettings = useCallback(() => setSettingsOpen((current) => !current), [])
  const showSettings = useCallback(() => setSettingsOpen(true), [])
  const hideSettings = useCallback(() => setSettingsOpen(false), [])

  return {
    floatingState,
    settingsOpen,
    windowMode,
    windowContentVisible,
    windowModeTransitioning,
    disableFloating,
    dragWindow,
    enterMiniMode,
    exitMiniMode,
    pauseFloating,
    toggleFloating,
    toggleSettings,
    showSettings,
    hideSettings,
    startWindowDrag,
  }
}
