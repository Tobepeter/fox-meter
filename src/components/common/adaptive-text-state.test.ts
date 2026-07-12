import { describe, expect, it } from 'vitest'

import { isTextTruncated, validateTextSizeRange } from './adaptive-text-state'

describe('AdaptiveText constraints', () => {
  it('only truncates when text still overflows at the minimum size', () => {
    expect(isTextTruncated({ clientWidth: 120, fontSize: 12, minSize: 12, scrollWidth: 148 })).toBe(
      true,
    )
    expect(isTextTruncated({ clientWidth: 120, fontSize: 14, minSize: 12, scrollWidth: 148 })).toBe(
      false,
    )
    expect(isTextTruncated({ clientWidth: 120, fontSize: 12, minSize: 12, scrollWidth: 120 })).toBe(
      false,
    )
  })

  it('rejects invalid font size ranges', () => {
    expect(() => validateTextSizeRange(16, 12)).toThrow(RangeError)
    expect(() => validateTextSizeRange(0, 12)).toThrow(RangeError)
    expect(() => validateTextSizeRange(12, 16)).not.toThrow()
  })
})
