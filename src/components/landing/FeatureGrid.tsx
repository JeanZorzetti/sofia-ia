import { FeatureCard, FeatureCardData } from './FeatureCard'

interface FeatureGridProps {
  features: FeatureCardData[]
  cols?: 2 | 3
}

export function FeatureGrid({ features, cols = 3 }: FeatureGridProps) {
  return (
    <div className={`grid md:grid-cols-2 ${cols === 3 ? 'lg:grid-cols-3' : ''} gap-6`}>
      {features.map((feature, i) => (
        <div
          key={feature.title}
          className="animate-fade-in-up"
          style={{ animationDelay: `${i * 80}ms`, animationFillMode: 'both' }}
        >
          <FeatureCard {...feature} />
        </div>
      ))}
    </div>
  )
}
