import type { CSSProperties } from 'react'
import { m } from 'motion/react'
import { PolarAngleAxis, RadialBar, RadialBarChart } from 'recharts'
import { ChartContainer, type ChartConfig } from '@/components/ui/chart'
import { formatResetTime } from '@/lib/usage'
import type { TimeDisplayMode, UsageWindow } from '@/types/usage'

const chartConfig = {
  remaining: {
    label: '剩余',
    color: 'var(--meter-color)',
  },
} satisfies ChartConfig

function UsageRing(props: UsageRingProps) {
  const { value, state, label, period, empty } = props
  const data = [{ remaining: value }]

  return (
    <div
      className={`usage-ring usage-ring--${state}`}
      role="img"
      aria-label={label}
      style={{ '--meter-color': getMeterColor(state) } as CSSProperties}
    >
      <ChartContainer
        config={chartConfig}
        className="usage-ring__chart"
        initialDimension={{ width: 96, height: 96 }}
        aria-hidden="true"
      >
        <RadialBarChart
          data={data}
          startAngle={90}
          endAngle={-270}
          innerRadius={39}
          outerRadius={48}
          accessibilityLayer={false}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} dataKey="remaining" tick={false} />
          <RadialBar
            dataKey="remaining"
            fill="var(--meter-color)"
            background={{ fill: 'var(--meter-track)' }}
            cornerRadius={8}
            isAnimationActive
            animationDuration={460}
            animationEasing="ease-out"
          />
        </RadialBarChart>
      </ChartContainer>
      <div className="usage-ring__content">
        <strong className="usage-ring__value">
          {empty ? '—' : value}
          {!empty && <small>%</small>}
        </strong>
        <span className="usage-ring__period">{period}</span>
      </div>
    </div>
  )
}

type MeterState = 'normal' | 'warning' | 'danger'

function getMeterState(remaining: number): MeterState {
  if (remaining <= 15) return 'danger'
  if (remaining <= 35) return 'warning'
  return 'normal'
}

function getMeterColor(state: MeterState) {
  if (state === 'danger') return 'var(--meter-danger)'
  if (state === 'warning') return 'var(--meter-warning)'
  return 'var(--meter-normal)'
}

export function UsageMetric(props: UsageMetricProps) {
  const { period, window, now, timeDisplayMode } = props
  const remaining = Math.round(window?.remainingPercent ?? 0)
  const resetText = window ? formatResetTime(window.resetsAt, now, timeDisplayMode) : '暂无数据'
  const state = getMeterState(remaining)
  const label = `${period}剩余`

  return (
    <m.section layout className={`usage-metric${window ? '' : ' usage-metric--empty'}`}>
      <UsageRing
        value={remaining}
        state={state}
        label={`${label} ${window ? `${remaining}%` : '暂无数据'}`}
        period={period}
        empty={!window}
      />
      <m.span layout="position" className="usage-metric__reset">
        {resetText}
      </m.span>
    </m.section>
  )
}

type UsageRingProps = {
  value: number
  state: MeterState
  label: string
  period: string
  empty: boolean
}

type UsageMetricProps = {
  period: string
  window?: UsageWindow
  now: number
  timeDisplayMode: TimeDisplayMode
}
