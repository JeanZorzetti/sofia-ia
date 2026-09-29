import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { TermsVersion } from '@/lib/terms'

export function TermsDocument({ terms }: { terms: TermsVersion }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="px-6 pt-16 pb-20">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors mb-8">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <h1 className="text-4xl font-bold mb-2">Termos de Uso</h1>
          <p className="text-foreground-tertiary text-sm mb-2">
            Versão {terms.version.slice(1)} · Última atualização: {terms.updatedAt}
          </p>
          {terms.draft && (
            <p className="text-amber-300/80 text-xs mb-10">Minuta, pendente de revisão jurídica.</p>
          )}
          {!terms.draft && <div className="mb-10" />}

          <div className="space-y-8">
            {terms.sections.map((section) => (
              <div key={section.title}>
                <h2 className="text-lg font-semibold text-white mb-3">{section.title}</h2>
                {section.highlight && (
                  <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm font-bold text-amber-200">
                    {section.highlight}
                  </p>
                )}
                <p className="text-foreground-secondary leading-relaxed text-sm whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </div>

          <div className="mt-12 p-5 glass-card rounded-xl border border-white/10">
            <p className="text-sm text-foreground-tertiary">
              Dúvidas?{' '}
              <Link href="/contato" className="text-blue-400 hover:text-blue-300 transition-colors">Entre em contato</Link>
              {' '}ou leia nossa{' '}
              <Link href="/privacidade" className="text-blue-400 hover:text-blue-300 transition-colors">Política de Privacidade</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
