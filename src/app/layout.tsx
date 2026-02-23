import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { DesktopProvider } from '@/contexts/DesktopContext'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Sofia AI — Plataforma de Orquestração de Agentes IA',
  description: 'Crie equipes de agentes IA que trabalham juntos. Orquestrações visuais, Knowledge Base com RAG, IDE multi-modelo e integração com WhatsApp. Self-hosted.',
  keywords: ['agentes ia', 'orquestração', 'multi-agente', 'rag', 'knowledge base', 'ia para empresas'],
  icons: {
    icon: '/logo-icon.svg',
    shortcut: '/logo-icon.svg',
    apple: '/logo-icon.svg',
  },
  openGraph: {
    images: [{ url: '/logo.svg', width: 180, height: 48, alt: 'Sofia AI' }],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <DesktopProvider>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
        </DesktopProvider>
      </body>
    </html>
  )
}
