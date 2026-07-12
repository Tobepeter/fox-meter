import { describe, expect, it } from 'vitest'

import { normalizePreferences } from '@/lib/preferences'

describe('preferences', () => {
  it('fills defaults for missing values', () => {
    expect(normalizePreferences({})).toEqual({
      floating: true,
      refreshInterval: 60_000,
      theme: 'system',
      timeDisplayMode: 'remaining',
    })
  })

  it('keeps supported preference values', () => {
    expect(
      normalizePreferences({
        floating: false,
        refreshInterval: 120_000,
        theme: 'dark',
        timeDisplayMode: 'exact',
      }),
    ).toEqual({
      floating: false,
      refreshInterval: 120_000,
      theme: 'dark',
      timeDisplayMode: 'exact',
    })
  })

  it('rejects unsupported values', () => {
    expect(
      normalizePreferences({
        refreshInterval: 42,
        theme: 'sepia',
        timeDisplayMode: 'calendar',
      }),
    ).toMatchObject({
      refreshInterval: 60_000,
      theme: 'system',
      timeDisplayMode: 'remaining',
    })
  })
})
