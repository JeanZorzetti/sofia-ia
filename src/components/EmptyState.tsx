import Link from 'next/link'
import { LucideIcon, Inbox } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center py-16 px-6 text-center"
    >
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-white/30" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-white mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-foreground-tertiary max-w-sm mb-6">{description}</p>
      )}
      {action && (
        action.href ? (
          <Link
            href={action.href}
            className="button-luxury px-6 py-2.5 text-sm inline-flex items-center gap-2"
          >
            {action.label}
          </Link>
        ) : (
          <button
            onClick={action.onClick}
            className="button-luxury px-6 py-2.5 text-sm"
          >
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
