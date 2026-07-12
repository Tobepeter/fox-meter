import type { ComponentProps, PropsWithChildren } from 'react'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type ToolButtonProps = PropsWithChildren<
  ComponentProps<typeof Button> & {
    label: string
    active?: boolean
  }
>

export function ToolButton(props: ToolButtonProps) {
  const { label, active, className, children, ...buttonProps } = props

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          className={cn('tool-button', className)}
          data-active={active || undefined}
          {...buttonProps}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={7}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
