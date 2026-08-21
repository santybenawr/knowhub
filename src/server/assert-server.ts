/**
 * Guard for modules that must never reach the browser bundle.
 *
 * The `server-only` package would be the idiomatic choice, but it throws when
 * imported from plain Node (migration scripts, Vitest), which is exactly where
 * this code also needs to run. A runtime check gives the same loud failure if
 * a server module is ever pulled into a Client Component.
 */
export function assertServerOnly(moduleName: string): void {
  if (typeof window !== 'undefined') {
    throw new Error(
      `[knowhub] ${moduleName} is server-only and must not be imported from a Client Component.`,
    )
  }
}
