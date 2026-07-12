import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import { getInvoke, isTauri } from '@/lib/platform'

export function useWindowControls() {
  const [floating, setFloating] = useState(true)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function readFloating() {
      const invoke = await getInvoke()
      if (!invoke) return
      try {
        const current = await invoke<boolean>('get_floating')
        if (!cancelled) setFloating(current)
      } catch {
        // 系统状态不可用时保留默认置顶值
      }
    }

    void readFloating()
    return () => {
      cancelled = true
    }
  }, [])

  const toggleFloating = useCallback(async () => {
    const enabled = !floating
    const invoke = await getInvoke()
    try {
      if (invoke) await invoke('set_floating', { enabled })
      setFloating(enabled)
    } catch {
      // 后端已回滚窗口状态，前端保持原值
    }
  }, [floating])

  const startWindowDrag = useCallback((event: MouseEvent<HTMLElement>) => {
    const target = event.target as HTMLElement
    if (event.button !== 0 || target.closest('button, select, input')) return

    event.preventDefault()
    window.getSelection()?.removeAllRanges()
    if (isTauri) void tauriInvoke('start_window_drag')
  }, [])

  const toggleSettings = useCallback(() => setSettingsOpen((current) => !current), [])
  const showSettings = useCallback(() => setSettingsOpen(true), [])
  const hideSettings = useCallback(() => setSettingsOpen(false), [])

  return {
    floating,
    settingsOpen,
    toggleFloating,
    toggleSettings,
    showSettings,
    hideSettings,
    startWindowDrag,
  }
}
