import { cn } from '@/lib/utils'
import { BRAND } from '@/lib/design-tokens'

interface GradientTextProps {
  children: React.ReactNode
  className?: string
}

export function GradientText({ children, className }: GradientTextProps) {
  return (
    <span
      className={cn(BRAND.gradientText, className)}
    >
      {children}
    </span>
  )
}
