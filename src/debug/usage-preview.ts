import { createUsageMock } from '@/debug/usage-mock'
import type { UsageSnapshot } from '@/types/usage'

export function createPreviewSnapshot(preview: string | null): UsageSnapshot {
  const snapshot = createUsageMock()
  const miniRemaining = preview?.startsWith('mini-') ? Number(preview.slice(5)) : Number.NaN

  if (Number.isFinite(miniRemaining) && miniRemaining >= 0 && miniRemaining <= 100) {
    const weekly = snapshot.limits.secondary
    if (weekly) {
      return {
        ...snapshot,
        limits: {
          ...snapshot.limits,
          secondary: {
            ...weekly,
            usedPercent: 100 - miniRemaining,
            remainingPercent: miniRemaining,
          },
        },
      }
    }
  }

  if (preview === 'auth') {
    return {
      ...snapshot,
      source: 'none',
      stale: true,
      account: undefined,
      limits: {},
      credits: undefined,
      error: {
        code: 'auth-not-found',
        message: 'preview',
      },
    }
  }

  if (preview === 'offline') {
    return {
      ...snapshot,
      source: 'cache',
      stale: true,
      error: {
        code: 'network',
        message: 'preview',
      },
    }
  }

  if (preview === 'server') {
    return {
      ...snapshot,
      source: 'none',
      stale: true,
      limits: {},
      error: {
        code: 'server',
        message: 'preview',
      },
    }
  }

  return snapshot
}
