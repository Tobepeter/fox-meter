import { createMockSnapshot } from '@/lib/usage'
import type { UsageSnapshot } from '@/types/usage'

export function createPreviewSnapshot(preview: string | null): UsageSnapshot {
  const snapshot = createMockSnapshot()

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
