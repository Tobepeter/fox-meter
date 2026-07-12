import fitty, { type FittyInstance } from 'fitty'
import {
  useLayoutEffect,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { isTextTruncated, validateTextSizeRange } from './adaptive-text-state'

export type AdaptiveTextProps = Omit<ComponentPropsWithoutRef<'span'>, 'children'> & {
  children: string
  maxSize?: number
  minSize?: number
  tooltip?: boolean | ReactNode
  tooltipSide?: ComponentPropsWithoutRef<typeof TooltipContent>['side']
  tooltipSideOffset?: number
}

// 单行文字自适应与最小字号兜底
export function AdaptiveText(props: AdaptiveTextProps) {
  const {
    children,
    className,
    maxSize = 16,
    minSize = 12,
    style,
    tabIndex,
    tooltip = false,
    tooltipSide = 'bottom',
    tooltipSideOffset = 6,
    ...spanProps
  } = props
  const textRef = useRef<HTMLSpanElement>(null)
  const [truncated, setTruncated] = useState(false)

  validateTextSizeRange(minSize, maxSize)

  useLayoutEffect(() => {
    const element = textRef.current
    if (!element) return

    let active = true
    let frame = 0
    let instance: FittyInstance | null = null

    const updateTruncated = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (!active) return

        const fontSize = Number.parseFloat(getComputedStyle(element).fontSize)
        const next = isTextTruncated({
          clientWidth: element.clientWidth,
          fontSize,
          minSize,
          scrollWidth: element.scrollWidth,
        })
        setTruncated((current) => (current === next ? current : next))
      })
    }

    const handleFit = () => updateTruncated()
    element.addEventListener('fit', handleFit)

    instance = fitty(element, {
      maxSize,
      minSize,
      multiLine: false,
    })

    const parent = element.parentElement
    const resizeObserver = new ResizeObserver(() => {
      instance?.fit()
    })
    if (parent) resizeObserver.observe(parent)

    instance.fit({ sync: true })
    updateTruncated()

    void document.fonts.ready.then(() => {
      if (!active) return
      instance?.fit({ sync: true })
      updateTruncated()
    })

    return () => {
      active = false
      cancelAnimationFrame(frame)
      resizeObserver.disconnect()
      element.removeEventListener('fit', handleFit)
      instance?.unsubscribe()
    }
  }, [maxSize, minSize])

  const tooltipContent = tooltip === true ? children : tooltip
  const hasTooltip = Boolean(tooltipContent)
  const text = (
    <span
      ref={textRef}
      className={cn(
        'inline-block min-w-0 max-w-full overflow-hidden text-ellipsis whitespace-nowrap',
        className,
      )}
      data-truncated={truncated || undefined}
      tabIndex={tabIndex ?? (truncated && hasTooltip ? 0 : undefined)}
      style={{ ...style, fontSize: `${maxSize}px` }}
      {...spanProps}
    >
      {children}
    </span>
  )

  if (!hasTooltip) return text

  return (
    <Tooltip>
      <TooltipTrigger asChild>{text}</TooltipTrigger>
      {truncated && (
        <TooltipContent side={tooltipSide} sideOffset={tooltipSideOffset}>
          {tooltipContent}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
