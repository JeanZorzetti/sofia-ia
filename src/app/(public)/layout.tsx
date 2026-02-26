import type { Metadata } from 'next'
import { LandingNavbar } from '@/components/landing/LandingNavbar'
import { Footer } from '@/components/landing/Footer'

const OG_IMAGE = {
  url: 'https://sofiaia.roilabs.com.br/opengraph-image',
  width: 1200,
  height: 630,
  alt: 'Sofia AI — Orquestração de Agentes IA',
}

export const metadata: Metadata = {
  openGraph: { images: [OG_IMAGE] },
  twitter: { card: 'summary_large_image', images: ['https://sofiaia.roilabs.com.br/opengraph-image'] },
}

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
