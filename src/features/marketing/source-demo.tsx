'use client'

import { useRef, useState } from 'react'
import { ArrowDown, ArrowUpRight, Check, ChevronRight, FileText, Folder, MessageSquare, RotateCcw, Sparkles, AudioLines, NotebookPen, CornerDownRight } from 'lucide-react'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { sourceExample as example } from './landing-content'
import s from './landing.module.css'

export function SourceDemo() {
  const [step, setStep] = useState<'question' | 'answer' | 'source'>('question')
  const sourceHeading = useRef<HTMLHeadingElement>(null)

  function showSource() {
    setStep('source')
    requestAnimationFrame(() => {
      sourceHeading.current?.focus({ preventScroll: true })
      sourceHeading.current?.scrollIntoView({ block: 'center', behavior: 'auto' })
    })
  }

  return (
    <div className={s.demoWindow}>
      <div className={s.windowBar}>
        <div className={s.windowDots} aria-hidden><i /><i /><i /></div>
        <span><Logo className={s.tinyLogo} /> KnowHub / {example.project}</span>
        <span className={s.demoLabel}>Ejemplo ilustrativo</span>
      </div>
      <div className={s.demoGrid}>
        <aside className={s.demoSidebar} aria-label="Contexto del ejemplo">
          <span className={s.sidebarHeading}>TU ESPACIO</span>
          <div><Folder size={16} aria-hidden /> Biblioteca</div>
          <div><AudioLines size={16} aria-hidden /> Reuniones</div>
          <div className={s.sidebarActive}><Sparkles size={16} aria-hidden /> Pregúntale a KnowHub</div>
          <span className={s.sidebarHeading}>PROYECTO OMEGA</span>
          <div><FileText size={15} aria-hidden /> Propuesta comercial</div>
          <div><NotebookPen size={15} aria-hidden /> Notas del proyecto</div>
          <div className={s.sidebarSource}><AudioLines size={15} aria-hidden /> Reunión de equipo <span /></div>
          <p>Tus ideas.<br />Con todo su contexto.</p>
        </aside>

        <div className={s.demoConversation}>
          <div className={s.demoPath}><span>Pregunta</span><ChevronRight size={13} aria-hidden /><span data-active={step !== 'question'}>Respuesta</span><ChevronRight size={13} aria-hidden /><span data-active={step === 'source'}>Fuente</span></div>
          <div className={s.questionBubble}><MessageSquare size={16} aria-hidden />{example.question}</div>

          <div className={s.answerArea} aria-live="polite" aria-atomic="true">
            {step === 'question' ? (
              <div className={s.demoInvitation}>
                <span className={s.aiGlyph}><Sparkles size={25} aria-hidden /></span>
                <h3>La respuesta estaba en tu reunión.</h3>
                <p>Descubre cómo encontrarla y volver al momento en que se tomó la decisión.</p>
                <Button className={s.demoAction} onClick={() => setStep('answer')}>
                  Revelar respuesta <ArrowUpRight size={16} aria-hidden />
                </Button>
              </div>
            ) : (
              <div className={s.answerContent}>
                <div className={s.answerAuthor}><Sparkles size={18} aria-hidden /><span>KnowHub</span><span className={s.answerTag}>Respuesta del ejemplo</span></div>
                <p>{example.answer} <button onClick={showSource} className={s.inlineCitation} aria-label="Abrir fuente 1, minuto 01:38">[1]</button></p>
                <button className={s.sourceLink} onClick={showSource} aria-expanded={step === 'source'} aria-controls="demo-source">
                  <AudioLines size={18} aria-hidden /><span>Reunión de equipo <small>Ir al fragmento · {example.time}</small></span><ArrowUpRight size={18} aria-hidden />
                </button>
                <div className={s.answerHint}><CornerDownRight size={15} aria-hidden /> {step === 'source' ? 'El contexto, a un clic.' : 'Abre la cita y compruébalo tú.'}</div>
              </div>
            )}
          </div>
          <div className={s.demoBottom}><span><i /> Demo local · sin IA en vivo</span><button onClick={() => { setStep('question') }} aria-label="Reiniciar demo"><RotateCcw size={13} aria-hidden /> Reiniciar</button></div>
        </div>

        <div className={s.transcriptPanel} id="demo-source" data-open={step === 'source'}>
          <div className={s.transcriptHeader}><AudioLines size={17} aria-hidden /><span>De vuelta al origen</span><ArrowDown size={14} aria-hidden /></div>
          <h3 ref={sourceHeading} tabIndex={-1}>{step === 'source' ? 'Aquí quedó la decisión.' : 'Cada respuesta tiene un contexto.'}</h3>
          <span className={s.transcriptMeta}>REUNIÓN DE EQUIPO · TRANSCRIPCIÓN</span>
          <div className={s.waveform} aria-hidden>{Array.from({ length: 42 }, (_, i) => <i key={i} style={{ height: `${8 + ((i * 17 + 7) % 37)}px` }} />)}</div>
          <div className={s.transcriptContext}><span>01:12 · Equipo</span><p>Revisemos las opciones antes de seguir.</p></div>
          <blockquote className={s.sourceQuote}>
            <span><b>{example.time}</b> {example.speaker} {step === 'source' && <Check size={14} aria-label="Fuente abierta" />}</span>
            <p>“{example.quote}”</p>
          </blockquote>
          <p className={s.sourceFootnote}>Fragmento ilustrativo. Esta demo muestra texto; no reproduce audio.</p>
        </div>
      </div>
      <noscript><div className={s.noScriptDemo}><strong>{example.question}</strong><p>{example.answer}</p><p>Fuente: {example.time} · {example.speaker}: “{example.quote}”</p></div></noscript>
    </div>
  )
}
