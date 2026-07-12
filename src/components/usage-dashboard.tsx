import { AnimatePresence, m } from 'motion/react'
import { UsageMetric } from '@/components/usage-display'
import { UsageStatus } from '@/components/usage-status'
import type { TimeDisplayMode, UsageSnapshot } from '@/types/usage'

// 固定尺寸额度面板，设置页只替换内容，不改变窗口尺寸
export function UsageDashboard(props: UsageDashboardProps) {
  const { snapshot, now, timeDisplayMode } = props

  return (
    <m.div layout className="dashboard-content">
      <m.div layout className="usage-list" aria-live="polite">
        <UsageMetric
          period="5小时"
          window={snapshot?.limits.fiveHour}
          now={now}
          timeDisplayMode={timeDisplayMode}
        />
        <UsageMetric
          period="每周"
          window={snapshot?.limits.weekly}
          now={now}
          timeDisplayMode={timeDisplayMode}
        />
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
  now: number
  timeDisplayMode: TimeDisplayMode
}
