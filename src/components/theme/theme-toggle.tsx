import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { themeOptions } from '@/components/theme/theme-options'
import type { ThemeMode } from '@/types/preferences'

type ThemeToggleProps = {
  value: ThemeMode
  onValueChange: (value: ThemeMode) => void
}

// 系统、浅色与深色分段选择
export function ThemeToggle(props: ThemeToggleProps) {
  return (
    <ToggleGroup
      type="single"
      value={props.value}
      variant="outline"
      size="sm"
      spacing={0}
      aria-label="颜色模式"
      className="theme-toggle"
      onValueChange={(value) => {
        if (value) props.onValueChange(value as ThemeMode)
      }}
    >
      {themeOptions.map((option) => {
        const Icon = option.icon

        return (
          <ToggleGroupItem
            key={option.value}
            value={option.value}
            aria-label={option.label}
            title={option.label}
            className="theme-toggle__item"
          >
            <Icon aria-hidden="true" />
          </ToggleGroupItem>
        )
      })}
    </ToggleGroup>
  )
}
