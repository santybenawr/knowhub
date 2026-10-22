/** Explicit launch scope; the local presentation keeps its existing features. */
export function isPublicBeta(): boolean {
  return process.env.NEXT_PUBLIC_KNOWHUB_BETA === 'true'
}

export function documentUploadLimitMb(): number {
  return isPublicBeta() ? 4 : 25
}
