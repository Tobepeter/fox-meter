export type UsageWindow = {
  usedPercent: number
  remainingPercent: number
  windowMinutes: number
  resetsAt: number
}

export type TimeDisplayMode = 'remaining' | 'exact'

export type UsageSnapshot = {
  checkedAt: string
  source: 'codex-oauth' | 'cache' | 'none'
  stale: boolean
  account?: { email?: string; plan?: string }
  limits: { fiveHour?: UsageWindow; weekly?: UsageWindow }
  credits?: { hasCredits: boolean; unlimited: boolean; balance?: number }
  error?: UsageError
}

export type UsageError = {
  code: string
  message: string
}

export type Invoke = <T>(command: string, args?: Record<string, unknown>) => Promise<T>
