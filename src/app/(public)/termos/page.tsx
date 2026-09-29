import type { Metadata } from 'next'
import { TermsDocument } from '@/components/legal/terms-document'
import { CURRENT_TERMS_VERSION, TERMS } from '@/lib/terms'

export const metadata: Metadata = {
  title: 'Termos de Uso — Polaris IA',
  description: 'Termos de uso da plataforma Polaris IA. Leia antes de utilizar nossos serviços.',
  alternates: { canonical: 'https://polarisia.com.br/termos' },
}

export default function TermosPage() {
  return <TermsDocument terms={TERMS[CURRENT_TERMS_VERSION]} />
}
