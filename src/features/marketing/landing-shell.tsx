import Link from 'next/link'
import { ArrowUpRight } from 'lucide-react'
import { APP } from '@/config/app'
import { Logo } from '@/components/shared/logo'
import { Button } from '@/components/ui/button'
import { MotionStage } from './motion-stage'
import { SectionLink } from './section-link'
import s from './landing.module.css'

export function LandingShell({ children, prelaunch = false }: { children: React.ReactNode; prelaunch?: boolean }) {
  return (
    <MotionStage>
      <header className={s.header}>
        <div className={s.headerInner}>
          <SectionLink href="/#contenido" className={s.wordmark} aria-label="KnowHub, inicio"><Logo className={s.logo} /><span>{APP.name}<span className={s.logoDot}>.</span></span></SectionLink>
          <nav className={s.navigation} aria-label="Navegación principal">
            <SectionLink href="/#universo">El universo KnowHub</SectionLink><SectionLink href="/#demo">La experiencia</SectionLink><SectionLink href="/#preguntas">Preguntas</SectionLink>
          </nav>
          <div className={s.navAction}>
            {!prelaunch && <Link href="/login" className={s.loginLink}>Iniciar sesión</Link>}
            <Button asChild className={s.headerCta}><a href={prelaunch ? '/#demo' : '/signup'}>{prelaunch ? 'Explorar demo' : 'Crear mi cuenta'}<ArrowUpRight size={15} aria-hidden /></a></Button>
          </div>
        </div>
      </header>
      <main id="contenido">{children}</main>
      <footer className={s.footer}>
        <div className={s.footerTop}><SectionLink href="/#contenido" className={s.wordmark}><Logo className={s.logo} /><span>{APP.name}<span className={s.logoDot}>.</span></span></SectionLink><span>Una nueva forma de conectar lo que sabes.</span><a href="#contenido">Volver arriba <ArrowUpRight size={14} aria-hidden /></a></div>
        <div className={s.footerBottom}><span>© {new Date().getFullYear()} KnowHub</span><span className={s.footerStatus}><i /> {prelaunch ? 'EN CONSTRUCCIÓN. CON INTENCIÓN.' : 'TRANSFORMA INFORMACIÓN EN CONOCIMIENTO.'}</span><nav aria-label="Información legal"><Link href="/privacy">Privacidad</Link><Link href="/terms">Términos</Link></nav></div>
      </footer>
    </MotionStage>
  )
}
