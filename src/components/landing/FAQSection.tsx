export interface FAQItem {
  question: string
  answer: string
}

interface FAQSectionProps {
  items: FAQItem[]
  title?: string
}

export function FAQSection({ items, title = 'Perguntas Frequentes' }: FAQSectionProps) {
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }

  return (
    <section className="px-6 py-20">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">{title}</h2>
        <div className="space-y-4">
          {items.map((item) => (
            <details
              key={item.question}
              className="glass-card rounded-xl p-6 group"
            >
              <summary className="cursor-pointer font-medium text-white list-none flex items-center justify-between gap-4">
                {item.question}
                <span className="text-white/40 group-open:rotate-180 transition-transform flex-shrink-0 text-lg leading-none">
                  ↓
                </span>
              </summary>
              <p className="mt-4 text-sm text-foreground-tertiary leading-relaxed">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  )
}
