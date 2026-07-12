import { invoke as tauriInvoke } from '@tauri-apps/api/core'
import type { Invoke } from '@/types/usage'

export const isTauri = '__TAURI_INTERNALS__' in window

export async function getInvoke(): Promise<Invoke | null> {
  return isTauri ? tauriInvoke : null
}
