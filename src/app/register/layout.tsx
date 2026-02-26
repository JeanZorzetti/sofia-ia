import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Criar conta — Sofia AI',
  robots: { index: false, follow: false },
}

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
