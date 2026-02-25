import { PricingCard, PricingPlan } from './PricingCard'

interface PricingGridProps {
  plans: PricingPlan[]
}

export function PricingGrid({ plans }: PricingGridProps) {
  return (
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((plan, i) => (
          <div
            key={plan.name}
            className="animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
          >
            <PricingCard {...plan} />
          </div>
        ))}
      </div>
      <p className="text-center text-white/30 text-sm mt-8">
        Todos os planos incluem SSL, backups automáticos e atualizações gratuitas.
      </p>
    </>
  )
}
