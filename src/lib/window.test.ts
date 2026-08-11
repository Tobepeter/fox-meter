import { describe, expect, it } from 'vitest'

import { createFloatingPause, getFloatingPauseBadge, getMiniValueFontSize } from '@/lib/window'

describe('window controls', () => {
  it('creates relative floating pauses', () => {
    const now = new Date(2026, 7, 6, 13, 20).getTime()

    expect(createFloatingPause('ten-minutes', now).resumesAt).toBe(now + 10 * 60_000)
    expect(createFloatingPause('one-hour', now).resumesAt).toBe(now + 60 * 60_000)
  })

  it('provides compact preset badges', () => {
    expect(getFloatingPauseBadge('ten-minutes')).toBe('10m')
    expect(getFloatingPauseBadge('one-hour')).toBe('1h')
  })

  it('fits Mini values to their measured width', () => {
    expect(getMiniValueFontSize(40, 46)).toBe(23)
    expect(getMiniValueFontSize(52, 46)).toBe(20.3)
    expect(getMiniValueFontSize(80, 46)).toBe(18)
  })
})
