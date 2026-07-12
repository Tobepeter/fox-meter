import { describe, expect, it } from 'vitest'
import { createPreviewSnapshot } from '@/debug/usage-preview'

describe('usage preview states', () => {
  it('creates an unauthenticated state without usage data', () => {
    const snapshot = createPreviewSnapshot('auth')

    expect(snapshot.error?.code).toBe('auth-not-found')
    expect(snapshot.limits).toEqual({})
    expect(snapshot.source).toBe('none')
  })

  it('keeps cached usage in the offline state', () => {
    const snapshot = createPreviewSnapshot('offline')

    expect(snapshot.error?.code).toBe('network')
    expect(snapshot.limits.fiveHour?.remainingPercent).toBe(73)
    expect(snapshot.source).toBe('cache')
  })
})
