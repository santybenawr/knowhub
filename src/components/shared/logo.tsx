import Image from 'next/image'
import { cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <Image
      src="/brand/knowhub-3d.webp"
      width={256}
      height={256}
      alt="KnowHub"
      className={cn('shrink-0 rounded-[22%] object-contain', className)}
      loading="eager"
      unoptimized
    />
  )
}
