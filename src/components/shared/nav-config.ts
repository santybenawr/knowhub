import { FileStack, Home, Mic, Search, Sparkles } from 'lucide-react'

/** §48/§49 — One source of truth for the desktop sidebar and the mobile bar. */
export const PRIMARY_NAV = [
  { href: '/dashboard', label: 'Inicio', icon: Home, mobile: true },
  { href: '/library', label: 'Biblioteca', icon: FileStack, mobile: true },
  { href: '/ask', label: 'Preguntar', icon: Sparkles, mobile: true, desktopLabel: 'Preguntar a KnowHub' },
  { href: '/meetings', label: 'Reuniones', icon: Mic, mobile: true },
  { href: '/search', label: 'Buscar', icon: Search, mobile: false },
] as const

export const SECONDARY_NAV = [
  { href: '/settings', label: 'Configuración' },
  { href: '/settings/members', label: 'Miembros' },
  { href: '/profile', label: 'Perfil' },
] as const
