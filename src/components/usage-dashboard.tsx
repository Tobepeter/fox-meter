import { AnimatePresence, m } from 'motion/react'
import { UsageMetric } from '@/components/usage-display'
import { UsageStatus } from '@/components/usage-status'
import type { TimeDisplayMode, UsageSnapshot, UsageWindow } from '@/types/usage'

// 固定尺寸额度面板，设置页只替换内容，不改变窗口尺寸
export function UsageDashboard(props: UsageDashboardProps) {
  const { snapshot, loading, now, timeDisplayMode } = props
  const windows = [snapshot?.limits.primary, snapshot?.limits.secondary].filter(
    (window): window is UsageWindow => Boolean(window),
  )
  const displayWindows = windows.length > 0 ? windows : [undefined]

  return (
    <m.div layout className="dashboard-content">
      <m.div layout className="usage-list" aria-live="polite">
        <AnimatePresence initial={false} mode="sync">
          {loading ? (
            <m.div
              key="loading"
              className="usage-loading"
              role="status"
              aria-label="正在读取额度"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
            >
              <span className="usage-loading__dots" aria-hidden="true">
                {[0, 1, 2].map((index) => (
                  <m.span
                    key={index}
                    animate={{ opacity: [0.28, 1, 0.28], y: [0, -3, 0] }}
                    transition={{
                      duration: 0.9,
                      delay: index * 0.12,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                  />
                ))}
              </span>
            </m.div>
          ) : (
            displayWindows.map((window) => (
              <UsageMetric
                key={window ? window.windowMinutes : 'empty'}
                window={window}
                now={now}
                timeDisplayMode={timeDisplayMode}
              />
            ))
          )}
        </AnimatePresence>
      </m.div>

      <AnimatePresence initial={false} mode="popLayout">
        {snapshot?.error && (
          <m.div
            layout
            key="status"
            className="dashboard-footer"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
          >
            <UsageStatus error={snapshot.error} stale={snapshot.stale} compact />
          </m.div>
        )}
      </AnimatePresence>
    </m.div>
  )
}

type UsageDashboardProps = {
  snapshot: UsageSnapshot | null
  loading: boolean
  now: number
  timeDisplayMode: TimeDisplayMode
}
