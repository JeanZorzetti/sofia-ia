import NewsletterForm from '@/components/NewsletterForm'

interface NewsletterSectionProps {
  source?: string
  title?: string
  description?: string
}

export function NewsletterSection({
  source = 'landing',
  title = 'Newsletter de IA toda semana',
  description = 'Templates prontos, casos de uso reais e novidades sobre orquestração de agentes IA. Sem spam.',
}: NewsletterSectionProps) {
  return (
    <section className="px-6 py-16 border-t border-white/5">
      <div className="max-w-xl mx-auto">
        <NewsletterForm source={source} title={title} description={description} />
      </div>
    </section>
  )
}
