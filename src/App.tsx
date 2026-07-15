import { useEffect } from 'react'
import { setTheme as setNativeTheme } from '@tauri-apps/api/app'
import { Pin, RefreshCw, Settings } from 'lucide-react'
import { AnimatePresence, domMax, LayoutGroup, LazyMotion, m, MotionConfig } from 'motion/react'
import { useTheme } from 'next-themes'
import { SettingsPanel } from '@/components/settings-panel'
import { ToolButton } from '@/components/tool-button'
import { UsageDashboard } from '@/components/usage-dashboard'
import { usePreferences } from '@/hooks/use-preferences'
import { usageMockEnabled, useUsage } from '@/hooks/use-usage'
import { useWindowControls } from '@/hooks/use-window-controls'
import { isTauri } from '@/lib/platform'
import appIcon from './assets/app-icon.png'
import './App.css'
import './styles/theme.css'

export default function App() {
  const { setTheme } = useTheme()
  const { preferences, ready: preferencesReady, updatePreferences } = usePreferences()
  const { snapshot, refreshing, now, refresh, loadMock } = useUsage({
    refreshInterval: preferences.refreshInterval,
  })
  const { floating, settingsOpen, toggleFloating, toggleSettings, hideSettings, startWindowDrag } =
    useWindowControls()

  useEffect(() => {
    if (!preferencesReady) return

    setTheme(preferences.theme)
    if (isTauri) {
      void setNativeTheme(preferences.theme === 'system' ? null : preferences.theme).catch(
        () => undefined,
      )
    }
  }, [preferences.theme, preferencesReady, setTheme])

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if (event.metaKey && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        void refresh()
        return
      }
      if (event.metaKey && event.key === ',') {
        event.preventDefault()
        if (!event.repeat) toggleSettings()
        return
      }
      if (event.key === 'Escape' && settingsOpen) {
        event.preventDefault()
        hideSettings()
      }
    }

    window.addEventListener('keydown', handleShortcut)
    return () => window.removeEventListener('keydown', handleShortcut)
  }, [hideSettings, refresh, settingsOpen, toggleSettings])

  const plan = snapshot?.account?.plan?.replace('_', ' ') ?? 'Codex'
  const balance = snapshot?.credits?.unlimited
    ? '不限量'
    : snapshot?.credits?.balance != null
      ? `$${snapshot.credits.balance.toFixed(2)}`
      : null

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.32, ease: [0.33, 1, 0.68, 1] }}>
        <LayoutGroup id="app-layout">
          <main className="app-shell">
            <h1 className="sr-only">FoxMeter</h1>
            <div className="window-drag-region" onMouseDown={startWindowDrag} aria-hidden="true" />

            <m.aside layout className="interaction-rail" onMouseDown={startWindowDrag}>
              <m.img layout src={appIcon} alt="" className="app-mark" draggable={false} />
              <m.nav layout="position" className="toolbar" aria-label="窗口操作">
                <ToolButton
                  type="button"
                  label={floating ? '取消置顶' : '置顶窗口'}
                  aria-label={floating ? '取消置顶' : '置顶窗口'}
                  active={floating}
                  onClick={toggleFloating}
                >
                  <Pin className="pin-icon" aria-hidden="true" />
                </ToolButton>
                <ToolButton
                  type="button"
                  label="刷新用量"
                  aria-label="刷新用量"
                  disabled={refreshing}
                  onClick={refresh}
                >
                  <RefreshCw className={refreshing ? 'spin' : ''} aria-hidden="true" />
                </ToolButton>
                <ToolButton
                  type="button"
                  label={settingsOpen ? '返回额度' : '设置'}
                  aria-label={settingsOpen ? '返回额度' : '设置'}
                  aria-expanded={settingsOpen}
                  active={settingsOpen}
                  onClick={toggleSettings}
                >
                  <Settings aria-hidden="true" />
                </ToolButton>
              </m.nav>
            </m.aside>

            <section className="content-stage">
              <AnimatePresence initial={false} mode="popLayout">
                {settingsOpen ? (
                  <m.div
                    key="settings"
                    className="settings-stage"
                    initial={{ opacity: 0, y: 8, scale: 0.985 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.985 }}
                  >
                    <SettingsPanel
                      email={snapshot?.account?.email ?? '未读取账号'}
                      plan={plan}
                      balance={balance}
                      refreshInterval={preferences.refreshInterval}
                      theme={preferences.theme}
                      timeDisplayMode={preferences.timeDisplayMode}
                      onRefreshIntervalChange={(refreshInterval) =>
                        updatePreferences({ refreshInterval })
                      }
                      onThemeChange={(theme) => {
                        setTheme(theme)
                        updatePreferences({ theme })
                      }}
                      onTimeDisplayModeChange={(timeDisplayMode) =>
                        updatePreferences({ timeDisplayMode })
                      }
                    />
                  </m.div>
                ) : (
                  <m.div
                    layout
                    key="dashboard"
                    className="dashboard-stage"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 6 }}
                  >
                    {usageMockEnabled && (
                      <div className="usage-mock-controls" aria-label="额度 Mock 场景">
                        <button type="button" onClick={() => loadMock('single')}>
                          加载 1 个
                        </button>
                        <button type="button" onClick={() => loadMock('double')}>
                          加载 2 个
                        </button>
                      </div>
                    )}
                    <UsageDashboard
                      snapshot={snapshot}
                      loading={snapshot === null}
                      now={now}
                      timeDisplayMode={preferences.timeDisplayMode}
                    />
                  </m.div>
                )}
              </AnimatePresence>
            </section>
          </main>
        </LayoutGroup>
      </MotionConfig>
    </LazyMotion>
  )
}
