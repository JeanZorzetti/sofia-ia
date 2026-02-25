import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { Footer } from '@/components/landing/Footer'

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <a href="#main-content" className="skip-nav">Pular para conteúdo principal</a>
      <LandingNavbar />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
    </div>
  )
}
