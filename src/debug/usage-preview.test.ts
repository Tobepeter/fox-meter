import { describe, expect, it } from 'vitest'
import { createUsageMock } from '@/debug/usage-mock'
import { createPreviewSnapshot } from '@/debug/usage-preview'

describe('usage preview states', () => {
  it('creates single and double window mock responses', () => {
    const single = createUsageMock('single')
    const double = createUsageMock('double')

    expect(single.limits.primary?.windowMinutes).toBe(10_080)
    expect(single.limits.secondary).toBeUndefined()
    expect(double.limits.primary?.remainingPercent).toBe(73)
    expect(double.limits.secondary?.remainingPercent).toBe(42)
  })

  it('creates an unauthenticated state without usage data', () => {
    const snapshot = createPreviewSnapshot('auth')

    expect(snapshot.error?.code).toBe('auth-not-found')
    expect(snapshot.limits).toEqual({})
    expect(snapshot.source).toBe('none')
  })

  it('keeps cached usage in the offline state', () => {
    const snapshot = createPreviewSnapshot('offline')

    expect(snapshot.error?.code).toBe('network')
    expect(snapshot.limits.primary?.remainingPercent).toBe(73)
    expect(snapshot.source).toBe('cache')
  })
})
