import { getUsageStatus } from '@/lib/usage'
import type { UsageError } from '@/types/usage'

export function UsageStatus(props: UsageStatusProps) {
  const { error, stale, compact = false } = props
  const status = getUsageStatus(error, stale)

  if (compact) {
    return (
      <div className="mini-status" role="status">
        <span className="status-dot" />
        <span>{status.compact}</span>
      </div>
    )
  }

  return (
    <section className="status-message" role="status">
      <span className="status-dot" />
      <div>
        <strong>{status.title}</strong>
        <p>{status.description}</p>
      </div>
    </section>
  )
}

type UsageStatusProps = {
  error: UsageError
  stale: boolean
  compact?: boolean
}
