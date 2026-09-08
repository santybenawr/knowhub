import { LandingShell } from '@/features/marketing/landing-shell'

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return <LandingShell>{children}</LandingShell>
}
