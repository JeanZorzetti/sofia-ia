import { cn } from '@/lib/utils'

interface SectionWrapperProps {
  children: React.ReactNode
  className?: string
  id?: string
  alt?: boolean
}

export function SectionWrapper({ children, className, id, alt }: SectionWrapperProps) {
  return (
    <section
      id={id}
      className={cn(
        'px-6 py-20 md:py-28',
        alt && 'bg-background-secondary',
        className
      )}
    >
      <div className="max-w-7xl mx-auto">{children}</div>
    </section>
  )
}

export function SectionHeader({
  title,
  description,
  className,
}: {
  title: React.ReactNode
  description?: string
  className?: string
}) {
  return (
    <div className={cn('text-center mb-16', className)}>
      <h2 className="text-3xl md:text-4xl font-bold mb-4">{title}</h2>
      {description && (
        <p className="text-foreground-tertiary max-w-xl mx-auto">{description}</p>
      )}
    </div>
  )
}
