import { AdaptiveText } from '@/components/common/adaptive-text'
import { ThemeToggle } from '@/components/theme/theme-toggle'
import { Badge } from '@/components/ui/badge'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { refreshOptions } from '@/lib/preferences'
import type { ThemeMode } from '@/types/preferences'
import type { TimeDisplayMode } from '@/types/usage'

type SettingsPanelProps = {
  email: string
  plan: string
  balance: string | null
  refreshInterval: number
  theme: ThemeMode
  timeDisplayMode: TimeDisplayMode
  onRefreshIntervalChange: (value: number) => void
  onThemeChange: (value: ThemeMode) => void
  onTimeDisplayModeChange: (value: TimeDisplayMode) => void
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    email,
    plan,
    balance,
    refreshInterval,
    theme,
    timeDisplayMode,
    onRefreshIntervalChange,
    onThemeChange,
    onTimeDisplayModeChange,
  } = props

  return (
    <section className="settings-panel" aria-label="设置面板">
      <div className="settings-account">
        <div className="settings-account__email-slot">
          <AdaptiveText className="settings-account__email" minSize={12} maxSize={14} tooltip>
            {email}
          </AdaptiveText>
        </div>
      </div>
      <div className="settings-account__meta">
        <Badge variant="secondary" className="settings-plan-badge">
          {plan}
        </Badge>
        {balance && (
          <span className="settings-balance">
            <span className="settings-balance__label">Credit</span>
            {balance}
          </span>
        )}
      </div>
      <div className="settings-field settings-inline-field settings-refresh-field">
        <span className="settings-field__label">刷新时间</span>
        <ToggleGroup
          type="single"
          value={String(refreshInterval)}
          variant="outline"
          size="sm"
          spacing={0}
          aria-label="刷新时间"
          className="settings-refresh-toggle"
          onValueChange={(value) => {
            if (value) onRefreshIntervalChange(Number(value))
          }}
        >
          {refreshOptions.map((option) => (
            <ToggleGroupItem key={option.value} value={String(option.value)}>
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <div className="settings-secondary-row">
        <div className="settings-field settings-inline-field">
          <span className="settings-field__label">深浅色</span>
          <ThemeToggle value={theme} onValueChange={onThemeChange} />
        </div>
        <div className="settings-field settings-inline-field">
          <span className="settings-field__label">时间展示</span>
          <ToggleGroup
            type="single"
            value={timeDisplayMode}
            variant="outline"
            size="sm"
            spacing={0}
            aria-label="时间展示"
            className="settings-time-toggle"
            onValueChange={(value) => {
              if (value) onTimeDisplayModeChange(value as TimeDisplayMode)
            }}
          >
            <ToggleGroupItem value="remaining">剩余时间</ToggleGroupItem>
            <ToggleGroupItem value="exact">重置时刻</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </div>
    </section>
  )
}
