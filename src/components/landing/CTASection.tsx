import Link from 'next/link'
import { ArrowRight, Users, LucideIcon } from 'lucide-react'

interface CTASectionProps {
  icon?: LucideIcon
  title: string
  description: string
  primaryCta?: { label: string; href: string }
  secondaryCta?: { label: string; href: string; icon?: LucideIcon }
}

export function CTASection({
  icon: Icon,
  title,
  description,
  primaryCta = { label: 'Criar Conta Grátis', href: '/login' },
  secondaryCta = { label: 'Falar com Especialista', href: '/contato', icon: Users },
}: CTASectionProps) {
  const SecondaryIcon = secondaryCta.icon

  return (
    <section className="px-6 py-24 bg-background-secondary">
      <div className="max-w-3xl mx-auto text-center">
        {Icon && (
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center mx-auto mb-6">
            <Icon className="w-8 h-8 text-blue-400" />
          </div>
        )}
        <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
        <p className="text-foreground-tertiary mb-8 text-lg max-w-xl mx-auto">{description}</p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            href={primaryCta.href}
            className="button-luxury px-10 py-4 text-base inline-flex items-center gap-2 justify-center"
          >
            {primaryCta.label} <ArrowRight className="w-5 h-5" />
          </Link>
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className="px-10 py-4 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-base inline-flex items-center gap-2 justify-center"
            >
              {SecondaryIcon && <SecondaryIcon className="w-5 h-5" />}
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  )
}
