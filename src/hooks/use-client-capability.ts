'use client'

import { useSyncExternalStore } from 'react'

/**
 * Reads a browser capability without a setState-in-effect hydration dance.
 *
 * `useSyncExternalStore` is the primitive React provides for exactly this:
 * the server snapshot is the optimistic value, and the client snapshot takes
 * over on hydration with no cascading render.
 */
const noopSubscribe = () => () => undefined

export function useClientValue<T>(getClientValue: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getClientValue, () => serverValue)
}

/** Subscribes to a media query, e.g. `(prefers-color-scheme: dark)`. */
export function useMediaQuery(query: string, serverValue = false): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => serverValue,
  )
}
