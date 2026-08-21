import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={cn('shrink-0', className)} role="img" aria-label="KnowHub">
      <rect width="64" height="64" rx="14" className="fill-brand" />
      <path d="M20 18v28" stroke="white" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M44 18v10a8 8 0 0 1-8 8H20"
        stroke="white"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="44" cy="44" r="5" className="fill-accent" />
    </svg>
  )
}
