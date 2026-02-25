import { LucideIcon } from 'lucide-react'

export interface FeatureCardData {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  color: string
}

export function FeatureCard({ icon: Icon, title, description, badge, color }: FeatureCardData) {
  return (
    <div className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${color} hover-scale`}>
      <div className="flex items-start justify-between mb-4">
        <Icon className="w-8 h-8 text-white" />
        {badge && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/60">
            {badge}
          </span>
        )}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-foreground-tertiary leading-relaxed">{description}</p>
    </div>
  )
}
