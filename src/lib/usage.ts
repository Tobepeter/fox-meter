import { addDays, differenceInMinutes, format, isSameDay } from 'date-fns'
import type { TimeDisplayMode, UsageError } from '@/types/usage'

const maxRefreshDelay = 5 * 60_000

export function getRefreshDelay(interval: number, failures: number) {
  return Math.min(interval * 2 ** failures, maxRefreshDelay)
}

export function getUsageStatus(error: UsageError, stale: boolean) {
  if (
    ['auth-not-found', 'auth-invalid', 'auth-missing-token', 'unauthorized'].includes(error.code)
  ) {
    return {
      title: '需要登录',
      description: '请在终端运行 codex login，然后点击刷新',
      compact: '需要登录 · 运行 codex login',
    }
  }

  if (error.code === 'network') {
    return {
      title: '暂时无法连接',
      description: stale
        ? '当前显示上次缓存，恢复网络后会自动重试'
        : '请检查网络，FoxMeter 会自动重试',
      compact: stale ? '离线 · 正在显示缓存' : '网络异常 · 将自动重试',
    }
  }

  if (error.code === 'invoke') {
    return {
      title: '应用通信异常',
      description: '请退出并重新打开 FoxMeter',
      compact: '刷新失败 · 请重新打开应用',
    }
  }

  return {
    title: '暂时无法更新',
    description: stale
      ? '当前显示上次缓存，稍后会自动重试'
      : 'Codex usage 服务暂时不可用，将自动重试',
    compact: stale ? '服务异常 · 正在显示缓存' : '服务异常 · 将自动重试',
  }
}

export function formatWindowPeriod(windowMinutes: number) {
  const hourMinutes = 60
  const dayMinutes = 24 * hourMinutes
  const fiveHourMinutes = 5 * hourMinutes
  const weekMinutes = 7 * dayMinutes

  if (windowMinutes === fiveHourMinutes) return '5小时'
  if (windowMinutes === weekMinutes) return '每周'
  if (windowMinutes >= dayMinutes && windowMinutes % dayMinutes === 0) {
    return `${windowMinutes / dayMinutes}天`
  }
  if (windowMinutes >= hourMinutes && windowMinutes % hourMinutes === 0) {
    return `${windowMinutes / hourMinutes}小时`
  }
  return `${windowMinutes}分钟`
}

export function formatResetTime(timestamp: number, now: number, mode: TimeDisplayMode) {
  const resetAt = new Date(timestamp * 1000)
  const current = new Date(now)

  if (mode === 'exact') {
    if (isSameDay(resetAt, current)) return `今天 ${format(resetAt, 'HH:mm')}`
    if (isSameDay(resetAt, addDays(current, 1))) return `明天 ${format(resetAt, 'HH:mm')}`
    return format(resetAt, 'M月d日 HH:mm')
  }

  const totalMinutes = Math.max(0, differenceInMinutes(resetAt, current))
  if (totalMinutes === 0) return resetAt.getTime() > now ? '1分钟后' : '即将重置'

  const days = Math.floor(totalMinutes / 1440)
  const hours = Math.floor((totalMinutes % 1440) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days}天${hours}小时后`
  if (hours > 0) return `${hours}小时${minutes}分钟后`
  return `${minutes}分钟后`
}
