'use client'
import { SEED, stateSchema, type DemoState } from './data'

const KEY = 'knowhub-public-demo-v1'
let state = SEED
let storageWarning = ''
let initialized = false
const listeners = new Set<() => void>()
function emit() {
  listeners.forEach((listener) => listener())
}
export function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export function getSnapshot() {
  return state
}
export function getReady() {
  return initialized
}
export function getServerReady() {
  return false
}
export function getServerSnapshot() {
  return SEED
}
export function getStorageWarning() {
  return storageWarning
}
export function initialize() {
  if (initialized) return
  initialized = true
  try {
    const stored = sessionStorage.getItem(KEY)
    if (stored) state = stateSchema.parse(JSON.parse(stored))
  } catch {
    storageWarning =
      'No pudimos recuperar la sesión. Puedes explorar la demo; los cambios pueden perderse al recargar.'
  }
  emit()
}
export function update(change: (current: DemoState) => DemoState) {
  state = stateSchema.parse(change(state))
  try {
    sessionStorage.setItem(KEY, JSON.stringify(state))
    storageWarning = ''
  } catch {
    storageWarning =
      'El navegador no pudo guardar la sesión. Conservaremos los cambios mientras esta página siga abierta.'
  }
  emit()
}
export function reset() {
  update(() => structuredClone(SEED))
}
