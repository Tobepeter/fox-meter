export type FloatingPausePreset = 'ten-minutes' | 'one-hour'

export type FloatingPause = {
  preset: FloatingPausePreset
  resumesAt: number
}

export type FloatingState = {
  floating: boolean
  pause: FloatingPause | null
}

export type WindowMode = 'expanded' | 'mini'
