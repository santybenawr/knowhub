'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'

// Next can retain scroll when the same hash is selected again. Keep in-page
// navigation useful after the visitor scrolls away from that section.
export function SectionLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  return <Link href={href} {...props} onClick={(event) => {
    onClick?.(event)
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return
    if (window.location.pathname === '/' && href.startsWith('/#')) {
      const section = document.getElementById(href.slice(2))
      if (section) {
        event.preventDefault()
        section.scrollIntoView({ block: 'start', behavior: 'auto' })
      }
    }
  }} />
}
