import type { ComponentProps, PropsWithChildren } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type ToolButtonProps = PropsWithChildren<
  ComponentProps<typeof Button> & {
    active?: boolean
  }
>

export function ToolButton(props: ToolButtonProps) {
  const { active, className, children, ...buttonProps } = props

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={cn('tool-button', className)}
      data-active={active || undefined}
      {...buttonProps}
    >
      {children}
    </Button>
  )
}
