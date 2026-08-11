import type { FloatingPause, FloatingPausePreset } from '@/types/window'

export const miniWindowSize = 52
export const miniValueMaxSize = 23
export const miniValueMinSize = 18

export function getMiniValueFontSize(contentWidth: number, availableWidth: number) {
  if (contentWidth <= 0 || contentWidth <= availableWidth) return miniValueMaxSize

  const fittedSize = (miniValueMaxSize * availableWidth) / contentWidth
  return Math.max(miniValueMinSize, Math.floor(fittedSize * 10) / 10)
}

export function createFloatingPause(preset: FloatingPausePreset, now = Date.now()): FloatingPause {
  const resumesAt = new Date(now)

  if (preset === 'ten-minutes') resumesAt.setTime(now + 10 * 60_000)
  if (preset === 'one-hour') resumesAt.setTime(now + 60 * 60_000)

  return { preset, resumesAt: resumesAt.getTime() }
}

export function getFloatingPauseBadge(preset: FloatingPausePreset) {
  if (preset === 'ten-minutes') return '10m'
  return '1h'
}
