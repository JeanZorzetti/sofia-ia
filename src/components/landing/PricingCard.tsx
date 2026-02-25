import Link from 'next/link'
import { CheckCircle, Star } from 'lucide-react'
import { BRAND, STATUS_COLORS } from '@/lib/design-tokens'

export interface PricingPlan {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  cta: string
  ctaHref: string
  highlight?: boolean
  badge?: string | null
}

export function PricingCard({ name, price, period, description, features, cta, ctaHref, highlight, badge }: PricingPlan) {
  return (
    <div
      className={`rounded-2xl p-7 relative flex flex-col ${
        highlight ? BRAND.highlightCard : 'glass-card'
      }`}
    >
      {badge && (
        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex items-center gap-1 px-3 py-1 ${BRAND.highlightBadge} rounded-full text-xs font-medium text-white whitespace-nowrap`}>
          <Star className="w-3 h-3" />
          {badge}
        </div>
      )}

      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-1">{name}</h3>
        <p className="text-white/50 text-sm mb-4">{description}</p>
        <div className="flex items-baseline gap-1">
          <span className={`font-bold text-white ${price === 'Custom' ? 'text-3xl' : 'text-4xl'}`}>
            {price}
          </span>
          {period && <span className="text-white/40 text-sm">{period}</span>}
        </div>
      </div>

      <ul className="space-y-3 mb-8 flex-1">
        {features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-foreground-secondary">
            <CheckCircle className={`w-4 h-4 ${STATUS_COLORS.success} flex-shrink-0`} />
            {feature}
          </li>
        ))}
      </ul>

      <Link
        href={ctaHref}
        className={`block text-center py-3 px-6 rounded-xl font-medium transition-all ${
          highlight ? BRAND.highlightButton : BRAND.mutedButton
        }`}
      >
        {cta}
      </Link>
    </div>
  )
}
