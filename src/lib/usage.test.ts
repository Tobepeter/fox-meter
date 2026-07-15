import { describe, expect, it } from 'vitest'
import { formatResetTime, formatWindowPeriod, getRefreshDelay, getUsageStatus } from '@/lib/usage'

const now = 1_800_000_000_000
const nowSeconds = now / 1000

describe('usage formatters', () => {
  it('formats reset time as remaining or exact time', () => {
    expect(formatResetTime(nowSeconds + 3 * 60 * 60 + 20 * 60, now, 'remaining')).toBe(
      '3小时20分钟后',
    )
    expect(formatResetTime(nowSeconds + 26 * 60 * 60, now, 'remaining')).toBe('1天2小时后')
    expect(formatResetTime(nowSeconds + 70 * 60, now, 'exact')).toMatch(/^(今天|明天) \d{2}:\d{2}$/)
  })

  it('formats known and fallback usage windows', () => {
    expect(formatWindowPeriod(300)).toBe('5小时')
    expect(formatWindowPeriod(10_080)).toBe('每周')
    expect(formatWindowPeriod(2_880)).toBe('2天')
    expect(formatWindowPeriod(720)).toBe('12小时')
    expect(formatWindowPeriod(90)).toBe('90分钟')
  })

  it('caps refresh backoff at five minutes', () => {
    expect(getRefreshDelay(60_000, 0)).toBe(60_000)
    expect(getRefreshDelay(60_000, 2)).toBe(240_000)
    expect(getRefreshDelay(60_000, 4)).toBe(300_000)
  })

  it('turns protocol errors into actionable status copy', () => {
    expect(getUsageStatus({ code: 'unauthorized', message: 'raw' }, true).title).toBe('需要登录')
    expect(getUsageStatus({ code: 'network', message: 'raw' }, true).compact).toBe(
      '离线 · 正在显示缓存',
    )
  })
})
