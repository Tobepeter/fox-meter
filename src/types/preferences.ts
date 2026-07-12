import type { TimeDisplayMode } from '@/types/usage'

export type ThemeMode = 'system' | 'light' | 'dark'

export type AppPreferences = {
  floating: boolean
  refreshInterval: number
  theme: ThemeMode
  timeDisplayMode: TimeDisplayMode
}

export type UiPreferences = Omit<AppPreferences, 'floating'>
