import './globals.css'
import { Inter } from 'next/font/google'
import { Toaster } from 'sonner'
import { DesktopProvider } from '@/contexts/DesktopContext'
import Script from 'next/script'

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
    type: 'website' as const,
    locale: 'pt_BR',
    siteName: 'Sofia AI',
    url: 'https://sofiaia.roilabs.com.br',
  },
  twitter: {
    card: 'summary_large_image' as const,
    site: '@sofiaai_br',
    creator: '@sofiaai_br',
  },
  metadataBase: new URL('https://sofiaia.roilabs.com.br'),
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const gaId = process.env.NEXT_PUBLIC_GA_ID

  return (
    <html lang="pt-BR">
      <head>
        {gaId && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${gaId}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
      </head>
      <body className={inter.className}>
        <DesktopProvider>
          {children}
          <Toaster richColors position="top-right" theme="dark" />
        </DesktopProvider>
      </body>
    </html>
  )
}
