import type { AppPreferences, ThemeMode, UiPreferences } from '@/types/preferences'
import type { TimeDisplayMode } from '@/types/usage'

const browserPreferencesKey = 'fox-meter-preferences'
const themeStorageKey = 'fox-meter-theme'

export const refreshOptions = [
  { label: '30秒', value: 30_000 },
  { label: '1分钟', value: 60_000 },
  { label: '2分钟', value: 120_000 },
  { label: '5分钟', value: 300_000 },
]

export const defaultPreferences: AppPreferences = {
  floating: true,
  refreshInterval: 60_000,
  theme: 'system',
  timeDisplayMode: 'remaining',
}

export function readBrowserPreferences(storage: Storage = window.localStorage): AppPreferences {
  const saved = parsePreferences(storage.getItem(browserPreferencesKey))
  const legacyRefreshInterval = Number(storage.getItem('refresh-interval'))
  const legacyTimeDisplayMode = storage.getItem('time-display-mode')
  const nextTheme = storage.getItem(themeStorageKey)

  return normalizePreferences({
    ...saved,
    refreshInterval: saved?.refreshInterval ?? legacyRefreshInterval,
    theme: saved?.theme ?? nextTheme,
    timeDisplayMode: saved?.timeDisplayMode ?? legacyTimeDisplayMode,
  })
}

export function writeBrowserPreferences(
  preferences: AppPreferences,
  storage: Storage = window.localStorage,
) {
  storage.setItem(browserPreferencesKey, JSON.stringify(toUiPreferences(preferences)))
  storage.removeItem('refresh-interval')
  storage.removeItem('time-display-mode')
}

export function normalizePreferences(value: unknown): AppPreferences {
  const preferences = isRecord(value) ? value : {}

  return {
    floating: typeof preferences.floating === 'boolean' ? preferences.floating : true,
    refreshInterval: isRefreshInterval(preferences.refreshInterval)
      ? preferences.refreshInterval
      : defaultPreferences.refreshInterval,
    theme: isThemeMode(preferences.theme) ? preferences.theme : defaultPreferences.theme,
    timeDisplayMode: isTimeDisplayMode(preferences.timeDisplayMode)
      ? preferences.timeDisplayMode
      : defaultPreferences.timeDisplayMode,
  }
}

export function toUiPreferences(preferences: AppPreferences): UiPreferences {
  return {
    refreshInterval: preferences.refreshInterval,
    theme: preferences.theme,
    timeDisplayMode: preferences.timeDisplayMode,
  }
}

function parsePreferences(value: string | null) {
  if (!value) return null

  try {
    const parsed: unknown = JSON.parse(value)
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isRefreshInterval(value: unknown): value is number {
  return refreshOptions.some((option) => option.value === value)
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark'
}

function isTimeDisplayMode(value: unknown): value is TimeDisplayMode {
  return value === 'remaining' || value === 'exact'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
