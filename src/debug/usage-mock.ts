import type { UsageSnapshot } from '@/types/usage'

export type UsageMockScenario = 'single' | 'double'

// Usage 接口 Mock
export function createUsageMock(scenario: UsageMockScenario = 'double'): UsageSnapshot {
  const now = Date.now()
  const secondary = {
    usedPercent: 58,
    remainingPercent: 42,
    windowMinutes: 10_080,
    resetsAt: Math.floor((now + 3.8 * 24 * 60 * 60 * 1000) / 1000),
  }

  return {
    checkedAt: new Date().toISOString(),
    source: 'codex-oauth',
    stale: false,
    account: { email: 'tobe@example.com', plan: 'plus' },
    limits:
      scenario === 'single'
        ? { primary: secondary }
        : {
            primary: {
              usedPercent: 27,
              remainingPercent: 73,
              windowMinutes: 300,
              resetsAt: Math.floor((now + 2.4 * 60 * 60 * 1000) / 1000),
            },
            secondary,
          },
    credits: { hasCredits: true, unlimited: false, balance: 14.8 },
  }
}

export async function requestUsageMock(scenario: UsageMockScenario, delay = 1400) {
  await new Promise((resolve) => window.setTimeout(resolve, delay))
  return createUsageMock(scenario)
}
