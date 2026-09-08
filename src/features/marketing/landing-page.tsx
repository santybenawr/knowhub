import Image from 'next/image'
import { ArrowDown, ArrowDownRight, ArrowRight, ArrowUpRight, AudioLines, Check, FileText, Fingerprint, Link2, NotebookPen, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Logo } from '@/components/shared/logo'
import { SourceDemo } from './source-demo'
import { questions } from './landing-content'
import s from './landing.module.css'

export function LandingPage({ prelaunch = false }: { prelaunch?: boolean }) {
  const ctaHref = prelaunch ? '#demo' : '/signup'
  const ctaLabel = prelaunch ? 'Explorar demo' : 'Crear mi cuenta'
  return (
    <>
      <section className={s.hero} aria-labelledby="hero-title">
        <div className={s.heroInner}>
          <div className={s.heroCopy}>
            <div className={s.eyebrow}><span className={s.statusDot} />{prelaunch ? 'PRÓXIMAMENTE' : 'TU CONOCIMIENTO, CONECTADO'}<span className={s.eyebrowDivider} />CONOCE KNOWHUB</div>
            <h1 id="hero-title">Menos buscar.<br /><span>Más conectar.</span></h1>
            <p className={s.heroDescription}>Tus documentos, notas y reuniones, conectados.<br className={s.desktopBreak} /> Una nueva forma de encontrar respuestas<br className={s.desktopBreak} /> en todo lo que ya sabes.</p>
            <div className={s.heroActions}><Button asChild size="lg" className={s.primaryCta}><a href={ctaHref}>{ctaLabel}<ArrowUpRight size={20} aria-hidden /></a></Button><a href="#universo" className={s.textCta}>Descubre lo que viene <ArrowDown size={16} aria-hidden /></a></div>
            <p className={s.heroNote}><span /> {prelaunch ? 'Un primer vistazo. Sin cuenta, sin esperas.' : 'Tu próximo gran hallazgo empieza aquí.'}</p>
          </div>
          <div className={s.heroVisual} data-ambient>
            <div className={s.visualOrbit} aria-hidden />
            <Image src="/marketing/memory-sculpture.webp" width={960} height={960} alt="Escultura de cristal violeta entrelazado, símbolo de ideas que se conectan" priority unoptimized className={s.heroArt} sizes="(max-width: 700px) 100vw, 55vw" />
            <span className={`${s.floatingLabel} ${s.documentLabel}`}><span className={s.floatIcon}><FileText size={17} aria-hidden /></span><span>Lo que lees<small>Documentos</small></span><Plus size={13} aria-hidden /></span>
            <span className={`${s.floatingLabel} ${s.noteLabel}`}><span className={s.floatIcon}><NotebookPen size={17} aria-hidden /></span><span>Lo que imaginas<small>Notas e ideas</small></span></span>
            <span className={`${s.floatingLabel} ${s.audioLabel}`}><span className={s.floatIcon}><AudioLines size={17} aria-hidden /></span><span>Lo que escuchas<small>Reuniones</small></span><span className={s.miniWave} aria-hidden><i /><i /><i /><i /><i /></span></span>
            <div className={s.visualCaption}><span>INFORMACIÓN → CONOCIMIENTO</span><span>KN / 001</span></div>
          </div>
        </div>
        <div className={s.heroRail}><span>HECHO PARA MENTES<br />QUE NO DEJAN DE CREAR.</span><div><FileText aria-hidden size={19} />Documentos</div><Plus className={s.railPlus} size={16} aria-hidden /><div><NotebookPen aria-hidden size={19} />Notas</div><Plus className={s.railPlus} size={16} aria-hidden /><div><AudioLines aria-hidden size={19} />Reuniones</div><a href="#universo" aria-label="Descubrir el universo KnowHub"><ArrowDown size={20} aria-hidden /></a></div>
      </section>

      <section id="universo" className={s.universe} aria-labelledby="universe-title">
        <div className={s.sectionHeading} data-reveal><span className={s.sectionIndex}>01 — TODO EN UN MISMO LUGAR</span><div className={s.headingRow}><h2 id="universe-title">Tu cabeza es para crear.<br /><span>El resto, déjaselo a KnowHub.</span></h2><p>Esa idea en una nota. Ese dato en un PDF.<br />Esa decisión en una reunión.<br /><strong>Por fin, parte de la misma conversación.</strong></p></div></div>
        <div className={s.captureGrid}>
          <article className={`${s.captureCard} ${s.documentCard}`} data-reveal><div className={s.captureCardTop}><span>01 / LEE</span><FileText size={21} aria-hidden /></div><div className={s.documentPreview} aria-hidden><span className={s.paperTitle}>El comienzo de algo grande</span><div className={s.paperRule} /><div className={s.paperLines}><i /><i /><i /></div><span className={s.paperHighlight}>Aquí está la idea que buscabas.</span><div className={s.paperLines}><i /><i /></div><span className={s.paperFoot}>PROYECTO OMEGA <span>01 / 04</span></span></div><div className={s.cardCopy}><h3>Mucho más que archivos.</h3><p>Reúne tus documentos y encuentra las ideas que importan dentro de ellos.</p><span>PDF · DOCX · TXT</span></div></article>
          <article className={`${s.captureCard} ${s.noteCard}`} data-reveal><div className={s.captureCardTop}><span>02 / CREA</span><NotebookPen size={21} aria-hidden /></div><div className={s.notePreview} aria-hidden><span>Una idea para mañana<span>↗</span></span><p>¿Y si conectamos<br />lo que ya sabemos<br /><em>con lo que viene?</em></p><span className={s.noteTag}><span /> Próxima gran idea</span></div><div className={s.cardCopy}><h3>Las ideas no avisan.</h3><p>Captura una nota en el momento y dale un lugar dentro de tu proyecto.</p><span>NOTAS · IDEAS · CONTEXTO</span></div></article>
          <article className={`${s.captureCard} ${s.meetingCard}`} data-reveal><div className={s.captureCardTop}><span>03 / ESCUCHA</span><AudioLines size={21} aria-hidden /></div><div className={s.meetingPreview} aria-hidden><span className={s.meetingPreviewLabel}><i /> Reunión de equipo</span><div className={s.featureWave}>{Array.from({ length: 34 }, (_, i) => <i key={i} style={{ height: `${12 + ((i * 19 + 8) % 58)}px` }} />)}</div><div className={s.meetingDecision}><Check size={15} /><span>Una decisión, con su contexto.</span></div></div><div className={s.cardCopy}><h3>Que quede la conversación.</h3><p>Conserva reuniones y transcripciones. Vuelve a las decisiones cuando las necesites.</p><span>AUDIO · TEXTO · DECISIONES</span></div></article>
        </div>
      </section>

      <section id="demo" className={s.demoSection} aria-labelledby="demo-title">
        <div className={s.demoIntro} data-reveal><span className={s.sectionIndex}>02 — DEL «¿DÓNDE ESTABA?» AL «AQUÍ ESTÁ»</span><h2 id="demo-title">No solo una respuesta.<br /><span>El momento que la explica.</span></h2><p>Haz una pregunta. Encuentra una respuesta.<br />Sigue la fuente hasta el instante en que todo quedó claro.</p><span className={s.tryLabel}><ArrowDownRight size={17} aria-hidden /> Pruébalo. La siguiente conexión la haces tú.</span></div>
        <SourceDemo />
        <div className={s.demoCaption}><span><Fingerprint size={16} aria-hidden /> El valor está en poder volver al origen.</span><span>Contenido ficticio · Recorrido ilustrativo</span></div>
      </section>

      <section className={s.flowSection} aria-labelledby="flow-title">
        <div className={s.flowHeading} data-reveal><span className={s.sectionIndex}>03 — MENOS FRICCIÓN, MÁS IDEAS</span><h2 id="flow-title">De información suelta<br />a conocimiento <span>conectado.</span></h2></div>
        <div className={s.flowSteps}>
          <article data-reveal><span className={s.flowNumber}>01<ArrowRight size={21} aria-hidden /></span><FileText size={23} aria-hidden /><h3>Captura.</h3><p>Un documento, una nota o una reunión. Todo empieza con lo que ya tienes.</p></article>
          <article data-reveal><span className={s.flowNumber}>02<ArrowRight size={21} aria-hidden /></span><Link2 size={23} aria-hidden /><h3>Conecta.</h3><p>Organiza tus fuentes por proyecto y mantén juntas las piezas de cada idea.</p></article>
          <article data-reveal><span className={s.flowNumber}>03<ArrowRight size={21} aria-hidden /></span><Search size={23} aria-hidden /><h3>Pregunta.</h3><p>Consulta tu información con tus propias palabras y encuentra un punto de partida.</p></article>
          <article data-reveal><span className={s.flowNumber}>04<Check size={21} aria-hidden /></span><Fingerprint size={23} aria-hidden /><h3>Vuelve al origen.</h3><p>Abre las fuentes, revisa el contexto y construye tu propio criterio.</p></article>
        </div>
      </section>

      <section className={s.manifesto} aria-label="Nuestra idea" data-reveal><span className={s.manifestoMark}><Logo className={s.manifestoLogo} /></span><span className={s.sectionIndex}>PARA LO QUE ESTÁS CONSTRUYENDO.</span><p>Tu próximo proyecto.<br />La clase que te cambió el chip.<br />La idea que todavía <span>no tiene nombre.</span></p><span className={s.manifestoFoot}>DALE A LO QUE SABES UN LUGAR PARA CRECER.</span></section>

      <section id="preguntas" className={s.faqSection} aria-labelledby="faq-title"><div data-reveal><span className={s.sectionIndex}>04 — UN POCO MÁS DE CONTEXTO</span><h2 id="faq-title">Seguro tienes<br /><span>preguntas.</span></h2><p>Empecemos por estas.</p></div><div className={s.faqList}>{questions.map((item) => <details key={item.question}><summary>{item.question}<Plus size={20} aria-hidden /></summary><p>{item.answer}</p></details>)}</div></section>

      <section className={s.closing} aria-labelledby="closing-title" data-reveal><div className={s.closingLine} aria-hidden /><span className={s.eyebrow}><span className={s.statusDot} />{prelaunch ? 'ESTO APENAS COMIENZA' : 'TU CONOCIMIENTO TE ESPERA'}</span><h2 id="closing-title">Lo próximo que conectes<br />puede <span>cambiarlo todo.</span></h2><p>{prelaunch ? 'Estamos preparando un nuevo lugar para todo lo que sabes.' : 'Empieza a darle un lugar a tus documentos, notas y reuniones.'}</p><Button asChild size="lg" className={s.primaryCta}><a href={ctaHref}>{ctaLabel}<ArrowUpRight size={20} aria-hidden /></a></Button><span className={s.closingNote}>{prelaunch ? 'KnowHub · Próximamente' : 'KnowHub · Tu conocimiento, conectado.'}<Sparkles size={13} aria-hidden /></span></section>
    </>
  )
}
