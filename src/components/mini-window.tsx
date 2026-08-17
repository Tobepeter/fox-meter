import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { Maximize2 } from 'lucide-react'
import { getMiniValueFontSize, miniValueMaxSize } from '@/lib/window'

const dragThreshold = 4

export function MiniWindow(props: MiniWindowProps) {
  const { periodLabel, remaining, transitioning, onDrag, onExpand } = props
  const pointerStartRef = useRef<PointerStart | null>(null)
  const valueRef = useRef<HTMLSpanElement>(null)
  const draggedRef = useRef(false)
  const hoverEnabledRef = useRef(true)
  const [showExpand, setShowExpand] = useState(false)
  const value = remaining ?? '—'

  useEffect(() => {
    const hideExpand = () => {
      hoverEnabledRef.current = true
      setShowExpand(false)
    }
    window.addEventListener('blur', hideExpand)
    return () => window.removeEventListener('blur', hideExpand)
  }, [])

  useLayoutEffect(() => {
    const element = valueRef.current
    const container = element?.parentElement
    if (!element || !container) return

    let active = true
    const fitValue = () => {
      element.style.setProperty('--mini-value-size', `${miniValueMaxSize}px`)
      const contentWidth = element.scrollWidth
      const availableWidth = container.clientWidth - 4
      const fontSize = getMiniValueFontSize(contentWidth, availableWidth)
      element.style.setProperty('--mini-value-size', `${fontSize}px`)
    }

    const resizeObserver = new ResizeObserver(fitValue)
    resizeObserver.observe(container)
    fitValue()

    void document.fonts.ready.then(() => {
      if (active) fitValue()
    })

    return () => {
      active = false
      resizeObserver.disconnect()
    }
  }, [value])

  function handlePointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0 || transitioning) return

    setShowExpand(false)
    hoverEnabledRef.current = true
    draggedRef.current = false
    pointerStartRef.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handlePointerMove(event: PointerEvent<HTMLButtonElement>) {
    const start = pointerStartRef.current
    if (!start || draggedRef.current) return

    const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y)
    if (distance < dragThreshold) return

    draggedRef.current = true
    hoverEnabledRef.current = false
    setShowExpand(false)
    pointerStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    onDrag()
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>) {
    pointerStartRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleClick() {
    const shouldExpand = !draggedRef.current
    resetPointer()
    if (shouldExpand) onExpand()
  }

  function resetPointer() {
    pointerStartRef.current = null
    draggedRef.current = false
  }

  return (
    <div className="mini-stage">
      <button
        type="button"
        className="mini-window-button"
        data-show-expand={showExpand}
        aria-label={`${periodLabel}额度剩余 ${remaining === null ? '暂无数据' : `${remaining}%`}，点击展开`}
        aria-busy={transitioning}
        onClick={handleClick}
        onBlur={() => setShowExpand(false)}
        onLostPointerCapture={() => setShowExpand(false)}
        onPointerCancel={() => {
          setShowExpand(false)
          resetPointer()
        }}
        onPointerDown={handlePointerDown}
        onPointerEnter={() => {
          if (!transitioning && hoverEnabledRef.current) setShowExpand(true)
        }}
        onPointerLeave={() => {
          hoverEnabledRef.current = true
          setShowExpand(false)
        }}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span ref={valueRef} className="mini-window-value">
          {value}
          {remaining !== null && <small>%</small>}
        </span>
        <Maximize2 className="mini-window-expand" aria-hidden="true" />
      </button>
    </div>
  )
}

type PointerStart = {
  x: number
  y: number
}

export type MiniWindowProps = {
  periodLabel: string
  remaining: number | null
  transitioning: boolean
  onDrag: () => void
  onExpand: () => void
}
