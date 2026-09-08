'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import s from './landing.module.css'

export function MotionStage({ children }: { children: React.ReactNode }) {
  const stage = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const root = stage.current
    if (!root) return
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const syncPreference = () => { root.dataset.reduced = String(media.matches) }
    const syncVisibility = () => { root.dataset.suspended = String(document.hidden) }
    syncPreference()
    syncVisibility()
    media.addEventListener('change', syncPreference)
    document.addEventListener('visibilitychange', syncVisibility)

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.target.hasAttribute('data-ambient')) {
          (entry.target as HTMLElement).dataset.offscreen = String(!entry.isIntersecting)
        } else if (entry.isIntersecting) {
          entry.target.setAttribute('data-entered', 'true')
          observer.unobserve(entry.target)
        }
      }
    }, { threshold: 0.12 })
    root.querySelectorAll('[data-reveal], [data-ambient]').forEach((el) => observer.observe(el))
    return () => {
      media.removeEventListener('change', syncPreference)
      document.removeEventListener('visibilitychange', syncVisibility)
      observer.disconnect()
    }
  }, [])

  return (
    <div className={s.stage} ref={stage} data-paused={paused}>
      {children}
      <button className={s.motionToggle} onClick={() => setPaused(!paused)} aria-pressed={paused} aria-label={paused ? 'Reanudar animaciones' : 'Pausar animaciones'}>
        {paused ? <Play size={13} aria-hidden /> : <Pause size={13} aria-hidden />}
        <span>{paused ? 'Reanudar' : 'Pausar movimiento'}</span>
      </button>
    </div>
  )
}
