export type TextFitMetrics = {
  clientWidth: number
  fontSize: number
  minSize: number
  scrollWidth: number
}

export function isTextTruncated(metrics: TextFitMetrics) {
  const atMinSize = metrics.fontSize <= metrics.minSize + 0.1
  return atMinSize && metrics.scrollWidth > metrics.clientWidth
}

export function validateTextSizeRange(minSize: number, maxSize: number) {
  if (!Number.isFinite(minSize) || !Number.isFinite(maxSize)) {
    throw new RangeError('AdaptiveText 字号必须是有限数值')
  }

  if (minSize <= 0 || maxSize < minSize) {
    throw new RangeError('AdaptiveText 需要满足 0 < minSize <= maxSize')
  }
}
