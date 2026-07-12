import { Monitor, Moon, Sun } from 'lucide-react'

import type { ThemeMode } from '@/types/preferences'

export const themeOptions: Array<{
  icon: typeof Monitor
  label: string
  value: ThemeMode
}> = [
  { icon: Monitor, label: '跟随系统', value: 'system' },
  { icon: Sun, label: '浅色', value: 'light' },
  { icon: Moon, label: '深色', value: 'dark' },
]
