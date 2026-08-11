import { useState } from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { getFloatingPauseBadge } from '@/lib/window'
import type { FloatingPausePreset, FloatingState } from '@/types/window'

const pauseOptions: Array<{ label: string; preset: FloatingPausePreset; default?: boolean }> = [
  { label: '10 分钟', preset: 'ten-minutes' },
  { label: '1 小时', preset: 'one-hour', default: true },
]

export function FloatingButton(props: FloatingButtonProps) {
  const { state, onDisable, onPause, onToggle } = props
  const [menuOpen, setMenuOpen] = useState(false)
  const pause = state.pause

  const label = state.floating ? '取消置顶 1 小时' : '恢复置顶'

  function handleMenuOpenChange(open: boolean) {
    setMenuOpen(state.floating ? open : false)
  }

  function handleToggle() {
    setMenuOpen(false)
    onToggle()
  }

  function handlePause(preset: FloatingPausePreset) {
    setMenuOpen(false)
    onPause(preset)
  }

  function handleDisable() {
    setMenuOpen(false)
    onDisable()
  }

  return (
    <HoverCard
      open={state.floating && menuOpen}
      onOpenChange={handleMenuOpenChange}
      openDelay={300}
      closeDelay={160}
    >
      <HoverCardTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="tool-button"
          data-active={state.floating || undefined}
          aria-label={label}
          onClick={handleToggle}
          onPointerDown={(event) => {
            if (event.pointerType === 'mouse') event.preventDefault()
          }}
          onContextMenu={(event) => event.preventDefault()}
        >
          <Pin className="pin-icon" aria-hidden="true" />
          {pause && (
            <Badge variant="secondary" className="floating-duration-badge" aria-hidden="true">
              {getFloatingPauseBadge(pause.preset)}
            </Badge>
          )}
        </Button>
      </HoverCardTrigger>

      <HoverCardContent side="right" sideOffset={7} align="center" className="floating-hover-menu">
        {pauseOptions.map((option) => (
          <button key={option.preset} type="button" onClick={() => handlePause(option.preset)}>
            {option.label}
            {option.default && <span className="floating-hover-menu__default">默认</span>}
          </button>
        ))}
        <button type="button" onClick={handleDisable}>
          不限时
        </button>
      </HoverCardContent>
    </HoverCard>
  )
}

export type FloatingButtonProps = {
  state: FloatingState
  onDisable: () => void
  onPause: (preset: FloatingPausePreset) => void
  onToggle: () => void
}
