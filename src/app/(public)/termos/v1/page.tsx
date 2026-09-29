import type { Metadata } from 'next'
import { TermsDocument } from '@/components/legal/terms-document'
import { TERMS } from '@/lib/terms'

// Permanent copy of the terms accepted until 2026-09-29 (spec 013, FR-004a).
export const metadata: Metadata = {
  title: 'Termos de Uso (versão 1) — Polaris IA',
  description: 'Versão anterior dos termos de uso da Polaris IA, mantida para consulta.',
  alternates: { canonical: 'https://polarisia.com.br/termos/v1' },
  robots: { index: false, follow: true },
}

export default function TermosV1Page() {
  return <TermsDocument terms={TERMS.v1} />
}
