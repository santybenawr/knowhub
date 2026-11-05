'use client'

type SavePendingChanges = () => Promise<boolean>

let activeSaver: SavePendingChanges | null = null

/** The active editor registers its save barrier for controls outside the page. */
export function registerPendingChanges(saver: SavePendingChanges): () => void {
  activeSaver = saver
  return () => {
    if (activeSaver === saver) activeSaver = null
  }
}

export async function flushPendingChanges(): Promise<boolean> {
  return activeSaver ? activeSaver() : true
}
